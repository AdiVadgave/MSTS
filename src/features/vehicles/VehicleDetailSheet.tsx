import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Power, RadioTower, History, Package } from "lucide-react";
import { useVehicle, useVehicleHistory, useDeactivateVehicle } from "@/hooks/api";
import { PRODUCTS } from "@/mocks/catalog";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  vehicleId: string | null;
  onOpenChange: (v: boolean) => void;
  onEdit: () => void;
}

export function VehicleDetailSheet({ vehicleId, onOpenChange, onEdit }: Props) {
  const { data: vehicle, isLoading } = useVehicle(vehicleId ?? undefined);
  const { data: history } = useVehicleHistory(vehicleId ?? undefined);
  const deactivate = useDeactivateVehicle();

  const onDeactivate = async () => {
    if (!vehicle) return;
    await deactivate.mutateAsync(vehicle.id);
    toast.success(`${vehicle.plate} deactivated`);
    onOpenChange(false);
  };

  return (
    <Sheet open={!!vehicleId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <SheetTitle className="text-xl">
              {isLoading ? <Skeleton className="h-6 w-32" /> : vehicle?.plate}
            </SheetTitle>
            {vehicle && <StatusBadge status={vehicle.status} />}
          </div>
          {vehicle && (
            <p className="text-sm text-muted-foreground">
              {vehicle.type} · {vehicle.country} · MSTS ID {vehicle.mstsId}
            </p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading || !vehicle ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Tabs defaultValue="details">
              <TabsList>
                <TabsTrigger value="details"><Package /> Details</TabsTrigger>
                <TabsTrigger value="devices"><RadioTower /> Devices</TabsTrigger>
                <TabsTrigger value="history"><History /> History</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <dl className="grid grid-cols-2 gap-3">
                  {[
                    ["Fleet code", vehicle.fleetCode || "—"],
                    ["VIN", vehicle.vin || "—"],
                    ["EURO norm", vehicle.euronorm || "Missing"],
                    ["Total axles", vehicle.totalAxles],
                    ["Total weight", `${vehicle.totalWeightKg.toLocaleString()} kg`],
                    ["CO₂ class", vehicle.co2Class],
                    ["Legal entity", vehicle.legalEntity],
                    ["Owner", vehicle.owner?.name ?? "—"],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="rounded-lg border bg-card p-3">
                      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</dt>
                      <dd className="mt-0.5 truncate text-sm font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>

                <Separator />
                <div>
                  <p className="mb-2 text-sm font-semibold">Active products</p>
                  <div className="flex flex-wrap gap-2">
                    {vehicle.products.length ? (
                      vehicle.products.map((code) => (
                        <Badge key={code} variant="secondary">
                          {PRODUCTS.find((p) => p.code === code)?.name ?? code}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No products ordered yet.</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="devices" className="space-y-2">
                {vehicle.obus.length ? (
                  vehicle.obus.map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">{o.type}</p>
                        <p className="text-xs text-muted-foreground">Serial {o.serial}</p>
                      </div>
                      <StatusBadge status={o.status} />
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No devices assigned to this vehicle.
                  </p>
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-0">
                <ol className="relative border-l pl-6">
                  {(history ?? []).map((h, i) => (
                    <li key={i} className="mb-5 last:mb-0">
                      <span className="absolute -left-[7px] mt-1 size-3.5 rounded-full border-2 border-background bg-primary" />
                      <p className="text-sm font-medium">{h.change}</p>
                      <p className="text-xs text-muted-foreground">
                        {h.actor} · {formatDate(h.at, true)}
                      </p>
                    </li>
                  ))}
                </ol>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <SheetFooter className="sm:justify-between">
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={onDeactivate}
            disabled={!vehicle || vehicle.status === "deactivated" || deactivate.isPending}
          >
            <Power /> Deactivate
          </Button>
          <Button onClick={onEdit} disabled={!vehicle}>
            <Pencil /> Edit vehicle
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
