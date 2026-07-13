import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Building2, Plus, Mail, Phone, Loader2, Upload } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { SearchInput } from "@/components/common/SearchInput";
import { FilterSelect } from "@/components/common/FilterSelect";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SourceTag } from "@/components/common/SourceTag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/common/Field";
import { useCreateHaulier, useHauliers } from "@/hooks/api";
import { BulkUploadHauliersDialog } from "./BulkUploadHauliersDialog";
import { useDebounced } from "@/hooks/useDebounced";
import { COUNTRIES } from "@/mocks/catalog";
import { formatNumber } from "@/lib/utils";
import type { Haulier } from "@/lib/types";
import { toast } from "sonner";

export default function HauliersPage() {
  const [q, setQ] = React.useState("");
  const debouncedQ = useDebounced(q, 300);
  const [status, setStatus] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [params, setParams] = useSearchParams();

  // ⌘K quick action deep link: /hauliers?bulk=1 opens the bulk dialog.
  React.useEffect(() => {
    if (params.get("bulk") === "1") {
      setBulkOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const { data, isLoading } = useHauliers({ q: debouncedQ, status, page, pageSize: 10, sort });

  const columns: Column<Haulier>[] = [
    {
      key: "name",
      header: "Haulier",
      sortable: true,
      cell: (h) => (
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-secondary text-muted-foreground">
            <Building2 className="size-4" />
          </span>
          <div>
            <p className="font-semibold">{h.name}</p>
            <p className="text-xs text-muted-foreground">{h.vatNumber}</p>
          </div>
        </div>
      ),
    },
    { key: "country", header: "Country", sortable: true, cell: (h) => h.country },
    {
      key: "contactEmail",
      header: "Contact",
      cell: (h) => (
        <div className="space-y-0.5 text-xs">
          <p className="flex items-center gap-1"><Mail className="size-3" /> {h.contactEmail}</p>
          <p className="flex items-center gap-1 text-muted-foreground"><Phone className="size-3" /> {h.contactPhone}</p>
        </div>
      ),
    },
    { key: "fleetSize", header: "Fleet", align: "center", sortable: true, cell: (h) => formatNumber(h.fleetSize) },
    { key: "status", header: "Status", cell: (h) => <StatusBadge status={h.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fleet · Carriers"
        title="Hauliers"
        description="Manage carriers, owners and their fleet & contact details."
        badge={<SourceTag source="MyTolls" />}
        actions={
          <>
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <Upload /> Bulk load
            </Button>
            <Button onClick={() => setOpen(true)}><Plus /> Create haulier</Button>
          </>
        }
      />

      <DataTable
        columns={columns}
        rows={data?.rows ?? []}
        loading={isLoading}
        getRowId={(h) => h.id}
        total={data?.total ?? 0}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        sort={sort}
        onSortChange={(s) => { setSort(s); setPage(1); }}
        emptyTitle="No hauliers found"
        toolbar={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput
              value={q}
              onChange={(v) => { setQ(v); setPage(1); }}
              placeholder="Search name, VAT, email…"
              className="sm:w-80"
            />
            <FilterSelect
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { value: "all", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "suspended", label: "Suspended" },
              ]}
            />
          </div>
        }
      />

      <CreateHaulierDialog open={open} onOpenChange={setOpen} />
      <BulkUploadHauliersDialog open={bulkOpen} onOpenChange={setBulkOpen} />
    </div>
  );
}

function CreateHaulierDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const create = useCreateHaulier();
  const [form, setForm] = React.useState({ name: "", vatNumber: "", country: "NL", contactEmail: "", contactPhone: "", fleetSize: 0 });

  const submit = async () => {
    if (!form.name) return toast.error("Name is required");
    await create.mutateAsync(form as Partial<Haulier>);
    toast.success(`${form.name} created`);
    onOpenChange(false);
    setForm({ name: "", vatNumber: "", country: "NL", contactEmail: "", contactPhone: "", fleetSize: 0 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create haulier</DialogTitle>
          <DialogDescription>Add a new carrier / owner to your account.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company name" required className="col-span-2">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="VAT number">
            <Input value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} />
          </Field>
          <Field label="Country">
            <Select value={form.country} onValueChange={(v) => setForm({ ...form, country: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Contact email">
            <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
          </Field>
          <Field label="Contact phone">
            <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
          </Field>
          <Field label="Fleet size" className="col-span-2">
            <Input type="number" value={form.fleetSize} onChange={(e) => setForm({ ...form, fleetSize: Number(e.target.value) })} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
