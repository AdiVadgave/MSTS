import * as React from "react";
import { ConciergeBell, Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/common/Field";
import { useCreateVasRequest, useVehicles } from "@/hooks/api";
import { formatCurrency } from "@/lib/utils";
import type { VasService } from "@/lib/types";
import { toast } from "sonner";

/** Sentinel for the "no specific vehicle" select option (Radix Select
 *  items cannot carry an empty string value). */
const FLEET_WIDE = "__fleet__";

interface Props {
  service: VasService | null;
  onOpenChange: (v: boolean) => void;
}

export function RequestVasDialog({ service, onOpenChange }: Props) {
  const { data: vehicles } = useVehicles({ pageSize: 100, status: "active" });
  const create = useCreateVasRequest();
  const [vehiclePlate, setVehiclePlate] = React.useState(FLEET_WIDE);
  const [notes, setNotes] = React.useState("");

  const rows = vehicles?.rows ?? [];

  // Reset the form whenever a new service is opened.
  React.useEffect(() => {
    setVehiclePlate(FLEET_WIDE);
    setNotes("");
  }, [service]);

  if (!service) return null;

  const submit = async () => {
    try {
      await create.mutateAsync({
        serviceCode: service.code,
        vehiclePlate: vehiclePlate === FLEET_WIDE ? null : vehiclePlate,
        notes,
      });
      toast.success(
        vehiclePlate === FLEET_WIDE
          ? `${service.name} requested for your fleet`
          : `${service.name} requested for ${vehiclePlate}`
      );
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Request failed. Please try again.");
    }
  };

  return (
    <Dialog open={!!service} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ConciergeBell className="size-5 text-primary" />
            Request · {service.name}
          </DialogTitle>
          <DialogDescription>{service.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Vehicle" hint="Leave fleet-wide for services that are not vehicle-specific.">
            <Select value={vehiclePlate} onValueChange={setVehiclePlate}>
              <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={FLEET_WIDE}>Fleet-wide · no specific vehicle</SelectItem>
                {rows.map((v) => (
                  <SelectItem key={v.id} value={v.plate}>
                    {v.plate} · {v.type} · {v.country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Notes">
            <Textarea
              rows={3}
              placeholder="Preferred date, location, special requirements…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Provider</span>
              <span>{service.provider}</span>
            </div>
            <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
              <span>Indicative price</span>
              <span>
                {service.priceFrom > 0
                  ? `from ${formatCurrency(service.priceFrom)} · ${service.unit}`
                  : `Quoted ${service.unit}`}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Submit request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
