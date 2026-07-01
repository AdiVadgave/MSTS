import * as React from "react";
import {
  RadioTower,
  MoreHorizontal,
  Link2,
  Unlink,
  PauseCircle,
  PlayCircle,
  RefreshCw,
  Truck,
  PackageCheck,
  Boxes,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { SearchInput } from "@/components/common/SearchInput";
import { FilterSelect } from "@/components/common/FilterSelect";
import { StatusBadge } from "@/components/common/StatusBadge";
import { SourceTag } from "@/components/common/SourceTag";
import { StatCard } from "@/components/common/StatCard";
import { Tag } from "@/components/signage/Tag";
import { Plate } from "@/components/common/Plate";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useObus, useObuAction, type OBURow } from "@/hooks/api";
import { useDebounced } from "@/hooks/useDebounced";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

const GNSS_TYPES = new Set(["Satellic OBU", "HU-GO OBU"]);

export default function ObusPage() {
  const [q, setQ] = React.useState("");
  const debouncedQ = useDebounced(q, 300);
  const [status, setStatus] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState("");

  const { data, isLoading } = useObus({ q: debouncedQ, status, type, page, pageSize: 10, sort });
  const action = useObuAction();

  const run = async (id: string, act: string, label: string) => {
    await action.mutateAsync({ id, action: act });
    toast.success(label);
  };

  const columns: Column<OBURow>[] = [
    {
      key: "serial",
      header: "Serial",
      sortable: true,
      cell: (o) => (
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-secondary text-muted-foreground">
            <RadioTower className="size-4" />
          </span>
          <span className="font-semibold tabular-nums">{o.serial}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      cell: (o) => (
        <span className="flex items-center gap-2">
          {o.type}
          <Tag kind={GNSS_TYPES.has(o.type) ? "gnss" : "dsrc"}>
            {GNSS_TYPES.has(o.type) ? "GNSS" : "DSRC"}
          </Tag>
        </span>
      ),
    },
    {
      key: "vehiclePlate",
      header: "Assigned to",
      cell: (o) =>
        o.vehiclePlate ? (
          <Plate value={o.vehiclePlate} size="sm" />
        ) : (
          <span className="text-xs text-muted-foreground">Unassigned</span>
        ),
    },
    {
      key: "domains",
      header: "Domains",
      cell: (o) => <span className="text-xs text-muted-foreground">{o.domains.length} domains</span>,
    },
    { key: "status", header: "Status", sortable: true, cell: (o) => <StatusBadge status={o.status} /> },
    {
      key: "installedAt",
      header: "Installed",
      cell: (o) => (
        <span className="text-muted-foreground">
          {o.installedAt ? formatDate(o.installedAt) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (o) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {o.status === "unassigned" || !o.vehicleId ? (
              <DropdownMenuItem onClick={() => run(o.id, "assign", `${o.serial} assigned`)}>
                <Link2 /> Assign to vehicle
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => run(o.id, "unassign", `${o.serial} unassigned`)}>
                <Unlink /> Unassign
              </DropdownMenuItem>
            )}
            {o.status === "active" ? (
              <DropdownMenuItem onClick={() => run(o.id, "suspend", `${o.serial} suspended`)}>
                <PauseCircle /> Suspend device
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => run(o.id, "activate", `${o.serial} activated`)}>
                <PlayCircle /> Activate device
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => run(o.id, "replace", `Replacement ordered for ${o.serial}`)}
            >
              <RefreshCw /> Replace defective
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const total = data?.total ?? 0;
  const active = data?.rows.filter((o) => o.status === "active").length ?? 0;
  const transit = data?.rows.filter((o) => o.status === "in_transit").length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fleet · Devices"
        title="OBU & Devices"
        description="Assign, suspend, replace and track on-board units and tags across domains."
        badge={<SourceTag source="Toll2.0" />}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total devices" value={total} icon={Boxes} accent="primary" />
        <StatCard label="Active" value={active} icon={PackageCheck} accent="success" />
        <StatCard label="In transit" value={transit} icon={Truck} accent="warning" />
      </div>

      <DataTable
        columns={columns}
        rows={data?.rows ?? []}
        loading={isLoading}
        getRowId={(o) => o.id}
        total={total}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        sort={sort}
        onSortChange={(s) => { setSort(s); setPage(1); }}
        emptyTitle="No devices found"
        toolbar={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput
              value={q}
              onChange={(v) => { setQ(v); setPage(1); }}
              placeholder="Search serial or type…"
              className="sm:w-72"
            />
            <div className="flex gap-2">
              <FilterSelect
                value={status}
                onChange={(v) => { setStatus(v); setPage(1); }}
                options={[
                  { value: "all", label: "All statuses" },
                  { value: "active", label: "Active" },
                  { value: "unassigned", label: "Unassigned" },
                  { value: "in_transit", label: "In transit" },
                  { value: "suspended", label: "Suspended" },
                  { value: "defective", label: "Defective" },
                ]}
              />
              <FilterSelect
                value={type}
                onChange={(v) => { setType(v); setPage(1); }}
                options={[
                  { value: "all", label: "All types" },
                  { value: "Satellic OBU", label: "Satellic OBU" },
                  { value: "Go-Box", label: "Go-Box" },
                  { value: "Telepass", label: "Telepass" },
                  { value: "MYTO CZ OBU", label: "MYTO CZ OBU" },
                  { value: "HU-GO OBU", label: "HU-GO OBU" },
                  { value: "T-Tag", label: "T-Tag" },
                ]}
              />
            </div>
          </div>
        }
      />
    </div>
  );
}
