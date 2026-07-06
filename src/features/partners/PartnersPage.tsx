import * as React from "react";
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
import { monogram, onAccentHex } from "@/lib/brand";
import { formatDate } from "@/lib/utils";
import type { Partner } from "@/lib/types";
import NotFoundPage from "@/features/misc/NotFoundPage";
import { toast } from "sonner";
import { PartnerSheet } from "./PartnerSheet";

const PACKAGE_BADGE: Record<Partner["package"], string> = {
  basic: "bg-secondary text-secondary-foreground",
  professional: "bg-info/15 text-info",
  enterprise: "bg-brand-accent/20 text-foreground",
};

export default function PartnersPage() {
  const { activeBrand } = useAppStore();
  const { data: partners, isLoading } = usePartners();
  const update = useUpdatePartner();
  const remove = useDeletePartner();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Partner | null>(null);
  const [deleting, setDeleting] = React.useState<Partner | null>(null);

  // The console that manages partners is never visible to a partner.
  if (activeBrand) return <NotFoundPage />;

  const openCreate = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (p: Partner) => { setEditing(p); setSheetOpen(true); };
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
        eyebrow="Administration · Whitelabel"
        title="Whitelabel Partners"
        description="Configure partner branding, packages and tenant customers — resellers run this portal under their own identity."
        actions={<Button onClick={openCreate}><Plus /> New partner</Button>}
      />

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

      <PartnerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        partner={editing}
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
