import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Receipt, TriangleAlert, CircleDollarSign, Download } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { SearchInput } from "@/components/common/SearchInput";
import { FilterSelect } from "@/components/common/FilterSelect";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SourceTag } from "@/components/common/SourceTag";
import { StatCard } from "@/components/common/StatCard";
import { Plate } from "@/components/common/Plate";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTransactions } from "@/hooks/api";
import { useDebounced } from "@/hooks/useDebounced";
import { api, buildQuery } from "@/lib/api";
import { useAppStore } from "@/app/store";
import { downloadCSV } from "@/lib/download";
import { COUNTRIES } from "@/mocks/catalog";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Paginated, Transaction } from "@/lib/types";
import { toast } from "sonner";

export default function TransactionsPage() {
  const [params] = useSearchParams();
  const [q, setQ] = React.useState("");
  const debouncedQ = useDebounced(q, 300);
  const [status, setStatus] = React.useState(params.get("status") ?? "all");
  const [country, setCountry] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState("-date");

  const [exporting, setExporting] = React.useState(false);
  const entityId = useAppStore().entity?.id;

  const { data, isLoading } = useTransactions({
    q: debouncedQ,
    status,
    country,
    page,
    pageSize: 12,
    sort,
  });

  // Export ALL rows matching the current filters (not just this page).
  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await api.get<Paginated<Transaction>>(
        `/api/transactions${buildQuery({ q: debouncedQ, status, country, sort, page: 1, pageSize: 5000, entityId })}`
      );
      downloadCSV(
        `transactions-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Date", "Vehicle", "Country", "Domain", "Location", "OBU", "Amount (EUR)", "Status"],
        all.rows.map((t) => ({
          Date: formatDate(t.date, true),
          Vehicle: t.vehiclePlate,
          Country: t.country,
          Domain: t.domain,
          Location: t.location,
          OBU: t.obuSerial ?? "",
          "Amount (EUR)": t.amount,
          Status: t.status,
        }))
      );
      toast.success(`Exported ${all.total.toLocaleString()} transactions`);
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<Transaction>[] = [
    { key: "date", header: "Date", sortable: true, cell: (t) => <span className="text-muted-foreground">{formatDate(t.date, true)}</span> },
    { key: "vehiclePlate", header: "Vehicle", sortable: true, cell: (t) => <Plate value={t.vehiclePlate} country={t.country} size="sm" /> },
    { key: "domain", header: "Domain", cell: (t) => t.domain },
    { key: "location", header: "Location", cell: (t) => <span className="text-muted-foreground">{t.location}</span> },
    { key: "obuSerial", header: "OBU", cell: (t) => t.obuSerial ?? "—" },
    { key: "amount", header: "Amount", align: "right", sortable: true, cell: (t) => <span className="font-medium tabular-nums">{formatCurrency(t.amount)}</span> },
    { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Data · Passages"
        title="Transactions"
        description="Search, verify and reconcile toll passages. Investigate exceptions before billing."
        badge={<SourceTag source="MyMST" />}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={exporting}>
            {exporting ? <Loader2 className="animate-spin" /> : <Download />} Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Transactions (90d)" value={data?.total ?? "—"} icon={Receipt} accent="primary" />
        <StatCard
          label="Exceptions"
          value={data?.rows.filter((t) => t.status === "exception").length ?? 0}
          icon={TriangleAlert}
          accent="destructive"
          hint="on this page"
        />
        <StatCard
          label="Page value"
          value={formatCurrency(data?.rows.reduce((s, t) => s + t.amount, 0) ?? 0)}
          icon={CircleDollarSign}
          accent="success"
        />
      </div>

      <DataTable
        columns={columns}
        rows={data?.rows ?? []}
        loading={isLoading}
        getRowId={(t) => t.id}
        total={data?.total ?? 0}
        page={page}
        pageSize={12}
        onPageChange={setPage}
        sort={sort}
        onSortChange={(s) => { setSort(s); setPage(1); }}
        emptyTitle="No transactions"
        toolbar={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput
              value={q}
              onChange={(v) => { setQ(v); setPage(1); }}
              placeholder="Search vehicle, OBU, location…"
              className="sm:w-80"
            />
            <div className="flex gap-2">
              <FilterSelect
                value={status}
                onChange={(v) => { setStatus(v); setPage(1); }}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "billed", label: "Billed" },
                  { value: "unbilled", label: "Unbilled" },
                  { value: "exception", label: "Exception" },
                  { value: "rejected", label: "Rejected" },
                ]}
              />
              <FilterSelect
                value={country}
                onChange={(v) => { setCountry(v); setPage(1); }}
                options={[
                  { value: "all", label: "All countries" },
                  ...COUNTRIES.map((c) => ({ value: c.code, label: c.name })),
                ]}
              />
            </div>
          </div>
        }
      />
    </div>
  );
}
