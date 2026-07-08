import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ExternalLink, MoreHorizontal, Pencil, Pause, Play, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/app/store";
import { usePartners, useUpdatePartner, useDeletePartner } from "@/hooks/api";
import { monogram, onAccentHex, DESIGN_TEMPLATES } from "@/lib/brand";
import { formatDate } from "@/lib/utils";
import type { Partner } from "@/lib/types";
import NotFoundPage from "@/features/misc/NotFoundPage";
import { toast } from "sonner";

const PACKAGE_BADGE: Record<Partner["package"], string> = {
  basic: "bg-secondary text-secondary-foreground",
  professional: "bg-info/15 text-info",
  enterprise: "bg-brand-accent/20 text-foreground",
};

export default function PartnersPage() {
  const navigate = useNavigate();
  const { activeBrand } = useAppStore();
  const { data: partners, isLoading } = usePartners();
  const update = useUpdatePartner();
  const remove = useDeletePartner();
  const [deleting, setDeleting] = React.useState<Partner | null>(null);

  // The console that manages partners is never visible to a partner.
  if (activeBrand) return <NotFoundPage />;

  const openCreate = () => navigate("/studio/new");
  const openEdit = (p: Partner) => navigate(`/studio/${p.id}/edit`);
  const preview = (p: Partner) =>
    window.open(`/login?partner=${p.slug}`, "_blank", "noopener");

  const toggleStatus = (p: Partner) => {
    const status = p.status === "suspended" ? "active" : "suspended";
    update.mutate(
      { id: p.id, status },
      { onSuccess: () => toast.success(`${p.name} ${status === "active" ? "activated" : "suspended"}`) }
    );
  };

  const columns: Column<Partner>[] = [
    {
      key: "name",
      header: "Partner",
      sortable: true,
      cell: (p) => (
        <div className="flex items-center gap-2.5">
          {p.logoDataUrl ? (
            <img src={p.logoDataUrl} alt="" className="size-8 rounded-md object-contain" />
          ) : (
            <span
              className="grid size-8 shrink-0 place-items-center rounded-md font-display text-xs font-black"
              style={{ background: p.accentColor, color: onAccentHex(p.accentColor) }}
            >
              {monogram(p.name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{p.name}</p>
            <p className="font-mono text-xs text-muted-foreground">tolls.{p.slug}.com</p>
          </div>
        </div>
      ),
    },
    {
      key: "package",
      header: "Package",
      sortable: true,
      cell: (p) => (
        <Badge className={PACKAGE_BADGE[p.package]}>
          {p.package.charAt(0).toUpperCase() + p.package.slice(1)}
        </Badge>
      ),
    },
    {
      key: "designTemplate",
      header: "Template",
      cell: (p) => (
        <span className="text-sm text-muted-foreground">
          {DESIGN_TEMPLATES.find((t) => t.id === p.designTemplate)?.name ?? "Signage"}
        </span>
      ),
    },
    {
      key: "entityIds",
      header: "Customers",
      align: "center",
      cell: (p) => p.entityIds.length,
    },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
    { key: "createdAt", header: "Created", sortable: true, cell: (p) => formatDate(p.createdAt) },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (p) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm"><MoreHorizontal /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(p)}><Pencil /> Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => preview(p)}><ExternalLink /> Preview portal</DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleStatus(p)}>
              {p.status === "suspended" ? <><Play /> Activate</> : <><Pause /> Suspend</>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(p)}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Solution Studio · Whitelabel"
        title="Whitelabel Partners"
        description="Configure partner branding, packages and tenant customers — resellers run this portal under their own identity."
        actions={<Button onClick={openCreate}><Plus /> New solution</Button>}
      />

      {/* Platform replicas — full MSTS Tolls One, alternate color themes only.
          Not partner tenants: identical navigation, modules and data. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-lg font-display text-xs font-black text-white"
            style={{ background: "#1E88E5" }}
          >
            M1
          </span>
          <div className="min-w-0">
            <p className="font-semibold">
              MSTS Tolls One — Classic{" "}
              <Badge variant="outline" className="ml-1 align-middle">Replica</Badge>
            </p>
            <p className="truncate text-xs text-muted-foreground">
              The complete MSTS Tolls One application — every module, portal and workflow —
              in the classic blue theme. Colors only; nothing else changes.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => window.open("/login?replica=classic", "_blank", "noopener")}
        >
          <ExternalLink /> Launch replica
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={partners ?? []}
        loading={isLoading}
        getRowId={(p) => p.id}
        total={partners?.length ?? 0}
        page={1}
        pageSize={50}
        onPageChange={() => {}}
        emptyTitle="No partners yet"
      />

      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleting?.name}?</DialogTitle>
            <DialogDescription>
              The partner's branding and package configuration are removed and
              their {deleting?.entityIds.length ?? 0} customer entit
              {(deleting?.entityIds.length ?? 0) === 1 ? "y" : "ies"} return to
              MSTS. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                deleting &&
                remove.mutate(deleting.id, {
                  onSuccess: () => {
                    toast.success(`${deleting.name} deleted`);
                    setDeleting(null);
                  },
                })
              }
            >
              <Trash2 /> Delete partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
