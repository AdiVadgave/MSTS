import * as React from "react";
import {
  Wallet,
  FileText,
  AlertCircle,
  MoreHorizontal,
  CreditCard,
  MessageSquareWarning,
  Download,
  CalendarRange,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { FilterSelect } from "@/components/common/FilterSelect";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SourceTag } from "@/components/common/SourceTag";
import { StatCard } from "@/components/common/StatCard";
import { DateRangeDialog, type DateRangeValue } from "@/components/common/DateRangeDialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInvoices, useInvoiceAction, useSpendByCountry } from "@/hooks/api";
import { COUNTRIES } from "@/mocks/catalog";
import { downloadDocumentPDF } from "@/lib/download";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Invoice } from "@/lib/types";
import { toast } from "sonner";
import { exportBrandOf, type ExportBrand } from "@/lib/brand";
import { useAppStore } from "@/app/store";

function invoicePDF(i: Invoice, brand?: ExportBrand) {
  downloadDocumentPDF(`${i.number}.pdf`, {
    title: `Invoice ${i.number}`,
    meta: [
      ["Period", i.period],
      ["Issued", formatDate(i.issuedAt)],
      ["Due", formatDate(i.dueAt)],
      ["Status", i.status],
    ],
    lineItems: [
      { label: "Net toll charges", value: formatCurrency(i.amount - i.vatAmount) },
      { label: "VAT (21%)", value: formatCurrency(i.vatAmount) },
    ],
    total: { label: "Total due", value: formatCurrency(i.amount) },
    brand,
  });
}

function ConsolidatedInvoice({
  byCountry,
}: {
  byCountry: { country: string; spend: number }[];
}) {
  const rows = byCountry.slice(0, 5);
  const total = rows.reduce((s, r) => s + r.spend, 0);
  const name = (cc: string) => COUNTRIES.find((c) => c.code === cc)?.name ?? cc;
  return (
    <div className="rounded-2xl bg-card p-6 shadow-[0_30px_60px_-24px_rgba(26,23,18,0.45)] ring-1 ring-shell-ink/10">
      <div className="mb-2 flex items-start justify-between border-b-2 border-shell-ink pb-4">
        <div>
          <p className="font-display text-lg font-extrabold">Consolidated toll invoice</p>
          <p className="font-mono text-xs text-muted-foreground">FLEET-4471 · March 2026</p>
        </div>
        <p className="text-right font-mono text-xs text-muted-foreground">
          18 vehicles
          <br />
          {rows.length} countries
        </p>
      </div>
      {rows.map((r) => (
        <div
          key={r.country}
          className="flex items-center justify-between border-b border-shell-ink/10 py-2.5 text-sm"
        >
          <span className="flex items-center gap-2.5">
            <span className="rounded bg-shell-ink px-1.5 py-0.5 font-display text-xs font-black text-shell-yellow">
              {r.country}
            </span>
            {name(r.country)}
          </span>
          <span className="font-mono">{formatCurrency(r.spend)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between pt-4 font-display text-lg font-extrabold">
        <span>Total due</span>
        <span className="text-shell-red">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const { activeBrand } = useAppStore();
  const exportBrand = exportBrandOf(activeBrand);
  const [status, setStatus] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState("-issuedAt");
  // Optional period filter (issue date within from/to) — applied server-side.
  const [period, setPeriod] = React.useState<DateRangeValue | null>(null);
  const [periodOpen, setPeriodOpen] = React.useState(false);
  const { data, isLoading } = useInvoices({
    status,
    page,
    pageSize: 10,
    sort,
    from: period?.from,
    to: period?.to,
  });
  const { data: byCountry } = useSpendByCountry();
  const action = useInvoiceAction();
  const [stmtOpen, setStmtOpen] = React.useState(false);

  const act = async (id: string, a: "pay" | "dispute", label: string) => {
    await action.mutateAsync({ id, action: a });
    toast.success(label);
  };

  // Generate the consolidated account statement for the chosen period.
  const generateStatement = (range: DateRangeValue) => {
    const list = byCountry ?? [];
    const total = list.reduce((s, r) => s + r.spend, 0);
    const period = `${formatDate(range.from)} – ${formatDate(range.to)}`;
    downloadDocumentPDF(`statement-FLEET-4471_${range.from}_to_${range.to}.pdf`, {
      title: "Account statement",
      meta: [
        ["Account", "FLEET-4471"],
        ["Period", period],
        ["Generated", formatDate(new Date())],
      ],
      lineItems: list.map((r) => ({
        label: COUNTRIES.find((c) => c.code === r.country)?.name ?? r.country,
        value: formatCurrency(r.spend),
      })),
      total: { label: "Total", value: formatCurrency(total) },
      brand: exportBrand,
    });
    toast.success("Account statement downloaded", {
      description: `${period} · statement-FLEET-4471.pdf`,
    });
    setStmtOpen(false);
  };

  // Roll-up across the loaded page for the KPI tiles.
  const rows = data?.rows ?? [];
  const open = rows.filter((i) => i.status === "open").reduce((s, i) => s + i.amount, 0);
  const overdue = rows.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const paid = rows.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  const columns: Column<Invoice>[] = [
    {
      key: "number",
      header: "Invoice",
      sortable: true,
      cell: (i) => (
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-secondary text-muted-foreground">
            <FileText className="size-4" />
          </span>
          <div>
            <p className="font-semibold">{i.number}</p>
            <p className="text-xs text-muted-foreground">{i.period}</p>
          </div>
        </div>
      ),
    },
    { key: "issuedAt", header: "Issued", sortable: true, cell: (i) => formatDate(i.issuedAt) },
    { key: "dueAt", header: "Due", sortable: true, cell: (i) => formatDate(i.dueAt) },
    { key: "vatAmount", header: "VAT", align: "right", cell: (i) => <span className="text-muted-foreground">{formatCurrency(i.vatAmount)}</span> },
    { key: "amount", header: "Amount", align: "right", sortable: true, cell: (i) => <span className="font-semibold tabular-nums">{formatCurrency(i.amount)}</span> },
    { key: "status", header: "Status", cell: (i) => <StatusBadge status={i.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (i) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm"><MoreHorizontal className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                invoicePDF(i, exportBrand);
                toast.success(`${i.number}.pdf downloaded`);
              }}
            >
              <Download /> Download PDF
            </DropdownMenuItem>
            {i.status !== "paid" && (
              <DropdownMenuItem onClick={() => act(i.id, "pay", `${i.number} marked paid`)}>
                <CreditCard /> Mark as paid
              </DropdownMenuItem>
            )}
            {i.status !== "disputed" && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => act(i.id, "dispute", `Dispute opened for ${i.number}`)}
              >
                <MessageSquareWarning /> Dispute invoice
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Accounts receivable"
        title="Invoices & AR"
        description="One consolidated toll invoice per period — split any way you need."
        badge={<SourceTag source="MyMST" />}
        actions={
          <Button variant="outline" onClick={() => setStmtOpen(true)}>
            <Download /> Statement
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.1fr] lg:items-stretch">
        <ConsolidatedInvoice byCountry={byCountry ?? []} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <StatCard label="Open balance" value={formatCurrency(open)} icon={Wallet} accent="primary" hint="unpaid" />
          <StatCard label="Overdue" value={formatCurrency(overdue)} icon={AlertCircle} accent="destructive" />
          <StatCard label="Paid (page)" value={formatCurrency(paid)} icon={CreditCard} accent="success" />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        getRowId={(i) => i.id}
        total={data?.total ?? 0}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        sort={sort}
        onSortChange={setSort}
        emptyTitle="No invoices"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: "all", label: "All statuses" },
                { value: "open", label: "Open" },
                { value: "paid", label: "Paid" },
                { value: "overdue", label: "Overdue" },
                { value: "disputed", label: "Disputed" },
              ]}
            />
            <Button variant="outline" size="sm" onClick={() => setPeriodOpen(true)}>
              <CalendarRange className="size-4" /> Period
            </Button>
            {period && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
                <CalendarRange className="size-3" />
                {formatDate(period.from)} – {formatDate(period.to)}
                <button
                  type="button"
                  aria-label="Clear period filter"
                  onClick={() => { setPeriod(null); setPage(1); }}
                  className="rounded-full p-0.5 transition-colors hover:bg-foreground/10"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
          </div>
        }
      />

      <DateRangeDialog
        open={stmtOpen}
        onOpenChange={setStmtOpen}
        title="Statement parameters"
        description="Select the billing period to include in the account statement."
        confirmLabel="Generate statement"
        confirmIcon={<Download className="size-4" />}
        onConfirm={generateStatement}
      />

      <DateRangeDialog
        open={periodOpen}
        onOpenChange={setPeriodOpen}
        title="Filter by period"
        description="Show only invoices issued within this date range."
        confirmLabel="Apply filter"
        confirmIcon={<CalendarRange className="size-4" />}
        defaultRange={period ?? undefined}
        onConfirm={(range) => {
          setPeriod(range);
          setPage(1);
          setPeriodOpen(false);
        }}
      />
    </div>
  );
}
