import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "success" | "warning" | "destructive" | "muted";

const MAP: Record<string, { label: string; variant: Variant; dot: string }> = {
  // vehicles
  active: { label: "Active", variant: "success", dot: "bg-success" },
  pending: { label: "Pending", variant: "warning", dot: "bg-warning" },
  missing_attributes: { label: "Missing attrs", variant: "destructive", dot: "bg-destructive" },
  deactivated: { label: "Deactivated", variant: "muted", dot: "bg-muted-foreground" },
  // obu
  suspended: { label: "Suspended", variant: "warning", dot: "bg-warning" },
  in_transit: { label: "In transit", variant: "default", dot: "bg-primary" },
  defective: { label: "Defective", variant: "destructive", dot: "bg-destructive" },
  unassigned: { label: "Unassigned", variant: "muted", dot: "bg-muted-foreground" },
  returned: { label: "Returned", variant: "muted", dot: "bg-muted-foreground" },
  // orders
  draft: { label: "Draft", variant: "muted", dot: "bg-muted-foreground" },
  submitted: { label: "Submitted", variant: "default", dot: "bg-primary" },
  processing: { label: "Processing", variant: "warning", dot: "bg-warning" },
  fulfilled: { label: "Fulfilled", variant: "success", dot: "bg-success" },
  shipped: { label: "Shipped", variant: "success", dot: "bg-success" },
  cancelled: { label: "Cancelled", variant: "muted", dot: "bg-muted-foreground" },
  // vas requests
  requested: { label: "Requested", variant: "default", dot: "bg-primary" },
  scheduled: { label: "Scheduled", variant: "warning", dot: "bg-warning" },
  in_progress: { label: "In progress", variant: "default", dot: "bg-primary" },
  completed: { label: "Completed", variant: "success", dot: "bg-success" },
  // domains
  blocked: { label: "Blocked", variant: "destructive", dot: "bg-destructive" },
  // transactions
  billed: { label: "Billed", variant: "success", dot: "bg-success" },
  unbilled: { label: "Unbilled", variant: "warning", dot: "bg-warning" },
  exception: { label: "Exception", variant: "destructive", dot: "bg-destructive" },
  rejected: { label: "Rejected", variant: "destructive", dot: "bg-destructive" },
  // invoices
  paid: { label: "Paid", variant: "success", dot: "bg-success" },
  open: { label: "Open", variant: "default", dot: "bg-primary" },
  overdue: { label: "Overdue", variant: "destructive", dot: "bg-destructive" },
  disputed: { label: "Disputed", variant: "warning", dot: "bg-warning" },
  // users
  invited: { label: "Invited", variant: "default", dot: "bg-primary" },
  disabled: { label: "Disabled", variant: "muted", dot: "bg-muted-foreground" },
};

export function StatusBadge({ status }: { status: string }) {
  const cfg = MAP[status] ?? {
    label: status,
    variant: "secondary" as Variant,
    dot: "bg-muted-foreground",
  };
  return (
    <Badge variant={cfg.variant} className="gap-1.5 font-medium">
      <span className={cn("size-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </Badge>
  );
}
