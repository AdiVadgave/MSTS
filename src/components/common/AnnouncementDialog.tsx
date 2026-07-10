import * as React from "react";
import { Megaphone, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAnnouncements } from "@/hooks/api";
import { useAppStore } from "@/app/store";
import { formatDate } from "@/lib/utils";
import type { Announcement } from "@/lib/types";

/**
 * Dismissals are remembered PER APPLICATION CONTEXT: the MSTS original,
 * the Classic replica and every partner portal each greet their customer
 * once per announcement — they are separate audiences.
 */
const READ_KEY = "msts-announcements-read";

function readIds(ctx: string): string[] {
  try {
    const raw = localStorage.getItem(`${READ_KEY}:${ctx}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const KIND_BADGE: Record<Announcement["kind"], string> = {
  info: "bg-info/15 text-info",
  update: "bg-success/15 text-success",
  alert: "bg-destructive/15 text-destructive",
};

/**
 * Broadcast popup on the landing screen after login: shows every active
 * announcement the customer hasn't dismissed yet. Closing marks the shown
 * announcements as read (per browser), so each one appears exactly once —
 * a newly published announcement pops up again on the next visit.
 */
export function AnnouncementDialog() {
  const { data: announcements } = useAnnouncements();
  const { activeBrand, classicReplica } = useAppStore();
  const [open, setOpen] = React.useState(false);
  const [unread, setUnread] = React.useState<Announcement[]>([]);

  // Which "application" is the customer in? Partner portals track by slug.
  const ctx = activeBrand ? `partner:${activeBrand.slug}` : classicReplica ? "classic" : "msts";

  React.useEffect(() => {
    if (!announcements?.length) return;
    const seen = readIds(ctx);
    const fresh = announcements.filter((a) => !seen.includes(a.id));
    if (fresh.length) {
      setUnread(fresh);
      setOpen(true);
    }
  }, [announcements, ctx]);

  const dismiss = () => {
    const seen = new Set([...readIds(ctx), ...unread.map((a) => a.id)]);
    localStorage.setItem(`${READ_KEY}:${ctx}`, JSON.stringify([...seen]));
    setOpen(false);
  };

  if (!unread.length) return null;

  return (
    // Dismissal only via the explicit controls, so closing always records
    // the read state (onOpenChange also fires for ESC / overlay clicks).
    <Dialog open={open} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-lg bg-brand-accent/20 text-brand-accent-deep">
              <Megaphone className="size-4.5" />
            </span>
            Service announcement{unread.length > 1 ? "s" : ""}
          </DialogTitle>
          <DialogDescription>
            General information for all customers.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-4 overflow-y-auto">
          {unread.map((a) => (
            <div key={a.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{a.title}</p>
                <Badge className={KIND_BADGE[a.kind]}>{a.kind}</Badge>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{a.message}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Published {formatDate(a.publishedAt)}
              </p>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={dismiss} className="w-full sm:w-auto">
            <Check className="size-4" /> Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
