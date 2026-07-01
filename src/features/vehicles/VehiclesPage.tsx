import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Upload, FileUp, Truck } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { SearchInput } from "@/components/common/SearchInput";
import { FilterSelect } from "@/components/common/FilterSelect";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SourceTag } from "@/components/common/SourceTag";
import { Plate } from "@/components/common/Plate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useVehicles } from "@/hooks/api";
import { COUNTRIES } from "@/mocks/catalog";
import { formatDate } from "@/lib/utils";
import type { Vehicle } from "@/lib/types";
import { VehicleFormSheet } from "./VehicleFormSheet";
import { VehicleDetailSheet } from "./VehicleDetailSheet";
import { RcCardSheet } from "./RcCardSheet";
import { BulkUploadDialog } from "./BulkUploadDialog";
import type { VehicleFormValues } from "./vehicleSchema";
import { useDebounced } from "@/hooks/useDebounced";

export default function VehiclesPage() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = React.useState("");
  const debouncedQ = useDebounced(q, 300);
  const [status, setStatus] = React.useState(params.get("status") ?? "all");
  const [country, setCountry] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState("");

  // Drawer state
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Vehicle | null>(null);
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [rcOpen, setRcOpen] = React.useState(false);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [prefill, setPrefill] = React.useState<Partial<VehicleFormValues> | null>(null);

  // Deep links from command palette / dashboard
  React.useEffect(() => {
    if (params.get("new")) openCreate();
    if (params.get("rc")) setRcOpen(true);
    if (params.get("bulk")) setBulkOpen(true);
    if (params.has("new") || params.has("rc") || params.has("bulk")) {
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data, isLoading } = useVehicles({
    q: debouncedQ,
    status,
    country,
    page,
    pageSize: 10,
    sort,
  });

  const openCreate = () => {
    setEditing(null);
    setPrefill(null);
    setFormOpen(true);
  };

  const columns: Column<Vehicle>[] = [
    {
      key: "plate",
      header: "Plate",
      sortable: true,
      cell: (v) => (
        <div className="flex items-center gap-2.5">
          <Plate value={v.plate} country={v.country} />
          <span className="text-xs text-muted-foreground">{v.fleetCode || "No fleet code"}</span>
        </div>
      ),
    },
    { key: "country", header: "Country", sortable: true, cell: (v) => v.country },
    { key: "type", header: "Type", cell: (v) => v.type },
    { key: "mstsId", header: "MSTS ID", cell: (v) => <span className="tabular-nums">{v.mstsId}</span> },
    {
      key: "totalAxles",
      header: "Axles",
      align: "center",
      cell: (v) => v.totalAxles,
    },
    {
      key: "products",
      header: "Products",
      cell: (v) =>
        v.products.length ? (
          <Badge variant="secondary">{v.products.length} active</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    { key: "status", header: "Status", sortable: true, cell: (v) => <StatusBadge status={v.status} /> },
    {
      key: "updatedAt",
      header: "Updated",
      sortable: true,
      cell: (v) => <span className="text-muted-foreground">{formatDate(v.updatedAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fleet · Vehicles"
        title="Vehicles"
        description="Create, update and monitor your fleet. Extract details from RC cards with AI."
        badge={<SourceTag source="MyTolls" />}
        actions={
          <>
            <Button variant="outline" onClick={() => setBulkOpen(true)}>
              <Upload /> Bulk load
            </Button>
            <Button variant="outline" onClick={() => setRcOpen(true)}>
              <FileUp /> Extract RC card
            </Button>
            <Button onClick={openCreate}>
              <Plus /> Add vehicle
            </Button>
          </>
        }
      />

      <DataTable
        columns={columns}
        rows={data?.rows ?? []}
        loading={isLoading}
        getRowId={(v) => v.id}
        onRowClick={(v) => setDetailId(v.id)}
        total={data?.total ?? 0}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        sort={sort}
        onSortChange={(s) => {
          setSort(s);
          setPage(1);
        }}
        emptyTitle="No vehicles found"
        emptyDescription="Adjust filters, or add your first vehicle."
        toolbar={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput
              value={q}
              onChange={(v) => {
                setQ(v);
                setPage(1);
              }}
              placeholder="Search plate, VIN, fleet code…"
              className="sm:w-80"
            />
            <div className="flex gap-2">
              <FilterSelect
                value={status}
                onChange={(v) => {
                  setStatus(v);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "active", label: "Active" },
                  { value: "pending", label: "Pending" },
                  { value: "missing_attributes", label: "Missing attrs" },
                  { value: "deactivated", label: "Deactivated" },
                ]}
              />
              <FilterSelect
                value={country}
                onChange={(v) => {
                  setCountry(v);
                  setPage(1);
                }}
                options={[
                  { value: "all", label: "All countries" },
                  ...COUNTRIES.map((c) => ({ value: c.code, label: c.name })),
                ]}
              />
            </div>
          </div>
        }
      />

      {/* Sheets & dialogs */}
      <VehicleFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        vehicle={editing}
        prefill={prefill}
      />
      <VehicleDetailSheet
        vehicleId={detailId}
        onOpenChange={(v) => !v && setDetailId(null)}
        onEdit={() => {
          const v = data?.rows.find((x) => x.id === detailId) ?? null;
          setDetailId(null);
          setEditing(v);
          setPrefill(null);
          setFormOpen(true);
        }}
      />
      <RcCardSheet
        open={rcOpen}
        onOpenChange={setRcOpen}
        onUseData={(values) => {
          setEditing(null);
          setPrefill(values);
          setFormOpen(true);
        }}
      />
      <BulkUploadDialog open={bulkOpen} onOpenChange={setBulkOpen} />
    </div>
  );
}
