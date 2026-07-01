import * as React from "react";
import { Loader2, ShoppingCart, Ban } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/common/Field";
import { useCreateOrder, useVehicles } from "@/hooks/api";
import { formatCurrency } from "@/lib/utils";
import type { TollProduct } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  product: TollProduct | null;
  mode: "order" | "block";
  onOpenChange: (v: boolean) => void;
}

export function OrderDialog({ product, mode, onOpenChange }: Props) {
  const { data: vehicles } = useVehicles({ pageSize: 100, status: "active" });
  const create = useCreateOrder();
  const [vehiclePlate, setVehiclePlate] = React.useState("");
  const [qty, setQty] = React.useState(1);

  React.useEffect(() => {
    if (product && vehicles?.rows.length) setVehiclePlate(vehicles.rows[0].plate);
  }, [product, vehicles]);

  if (!product) return null;

  const submit = async () => {
    await create.mutateAsync({
      productCode: product.code,
      mode,
      vehiclePlate,
      quantity: qty,
    });
    toast.success(
      mode === "block"
        ? `${product.name} blocked for ${vehiclePlate}`
        : `Ordered ${qty} × ${product.name}`
    );
    onOpenChange(false);
  };

  const total = (product.deposit + product.monthlyFee) * qty;

  return (
    <Dialog open={!!product} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "block" ? <Ban className="size-5 text-destructive" /> : <ShoppingCart className="size-5 text-primary" />}
            {mode === "block" ? "Block" : "Order"} · {product.name}
          </DialogTitle>
          <DialogDescription>{product.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field label="Vehicle" required>
            <Select value={vehiclePlate} onValueChange={setVehiclePlate}>
              <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
              <SelectContent>
                {vehicles?.rows.map((v) => (
                  <SelectItem key={v.id} value={v.plate}>
                    {v.plate} · {v.country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {mode === "order" && (
            <Field label="Quantity">
              <Input
                type="number"
                min={1}
                max={20}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              />
            </Field>
          )}

          {mode === "order" && (
            <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deposit</span>
                <span>{formatCurrency(product.deposit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly fee</span>
                <span>{formatCurrency(product.monthlyFee)}</span>
              </div>
              <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
                <span>Estimated total ({qty}×)</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant={mode === "block" ? "destructive" : "default"}
            onClick={submit}
            disabled={!vehiclePlate || create.isPending}
          >
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "block" ? "Block product" : "Place order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
