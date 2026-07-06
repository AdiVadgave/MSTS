import * as React from "react";
import { CalendarRange, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/Field";

export interface DateRangeValue {
  from: string;
  to: string;
}

/** YYYY-MM-DD from local date parts (avoids UTC day-shift of toISOString). */
function isoLocal(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function defaultFrom() {
  const d = new Date();
  return isoLocal(new Date(d.getFullYear(), d.getMonth(), 1));
}
function defaultTo() {
  return isoLocal(new Date());
}

/**
 * A small parameter dialog that collects a start/end date range before an
 * action (running a report, generating a statement, …). Extra parameters can
 * be passed as `children` (e.g. a format picker).
 */
export function DateRangeDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Apply",
  confirmIcon,
  busy = false,
  defaultRange,
  children,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmIcon?: React.ReactNode;
  busy?: boolean;
  defaultRange?: Partial<DateRangeValue>;
  children?: React.ReactNode;
  onConfirm: (range: DateRangeValue) => void;
}) {
  const [from, setFrom] = React.useState(defaultRange?.from ?? defaultFrom());
  const [to, setTo] = React.useState(defaultRange?.to ?? defaultTo());

  // Reset to sensible defaults each time the dialog is (re)opened.
  React.useEffect(() => {
    if (open) {
      setFrom(defaultRange?.from ?? defaultFrom());
      setTo(defaultRange?.to ?? defaultTo());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const invalid = !from || !to || from > to;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid) return;
    onConfirm({ from, to });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="size-5 text-primary" /> {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Start date">
              <Input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => setFrom(e.target.value)}
              />
            </Field>
            <Field label="End date">
              <Input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => setTo(e.target.value)}
              />
            </Field>
          </div>

          {from && to && from > to && (
            <p className="text-xs font-medium text-destructive">
              The start date must be on or before the end date.
            </p>
          )}

          {children}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={invalid || busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                confirmIcon
              )}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
