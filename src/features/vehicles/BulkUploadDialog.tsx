import * as React from "react";
import { Loader2, Upload, FileSpreadsheet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useBulkVehicles } from "@/hooks/api";
import type { Vehicle } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const SAMPLE = `plate,country,type,euronorm,axles,weight
12-ABC-3,NL,Truck,EURO 6,4,26000
B XY 4421,DE,Truck,EURO 5,5,40000
99-KLM-2,NL,Trailer,EURO 6,2,12000`;

export function BulkUploadDialog({ open, onOpenChange }: Props) {
  const [text, setText] = React.useState(SAMPLE);
  const bulk = useBulkVehicles();

  const parsed = React.useMemo(() => parseCsv(text), [text]);

  const submit = async () => {
    if (!parsed.length) {
      toast.error("No valid rows to import.");
      return;
    }
    const res = await bulk.mutateAsync(parsed);
    toast.success(`${res.created} vehicles queued for onboarding`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="size-5 text-primary" /> Bulk load / update vehicles
          </DialogTitle>
          <DialogDescription>
            Paste CSV rows (header: plate, country, type, euronorm, axles, weight).
            Imported vehicles start as <span className="font-medium">Pending</span>.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={9}
          className="font-mono text-xs"
        />
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{parsed.length}</span> valid row
          {parsed.length === 1 ? "" : "s"} detected.
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={bulk.isPending || !parsed.length}>
            {bulk.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Import {parsed.length} vehicles
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parseCsv(text: string): Partial<Vehicle>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  return lines
    .slice(1)
    .map((line) => {
      const [plate, country, type, euronorm, axles, weight] = line.split(",").map((s) => s.trim());
      if (!plate) return null;
      return {
        plate,
        country: (country || "NL") as Vehicle["country"],
        type: (type || "Truck") as Vehicle["type"],
        euronorm: (euronorm || "EURO 6") as Vehicle["euronorm"],
        totalAxles: Number(axles) || 2,
        totalWeightKg: Number(weight) || 18000,
      } as Partial<Vehicle>;
    })
    .filter(Boolean) as Partial<Vehicle>[];
}
