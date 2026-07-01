import * as React from "react";
import { Loader2, ShoppingCart, Ban, Info } from "lucide-react";
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
import { productStatus } from "@/lib/eligibility";
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

  const rows = vehicles?.rows ?? [];

  // When the product/vehicle list changes, default to the first vehicle that
  // can actually order this product (order mode); any vehicle for block mode.
  React.useEffect(() => {
    if (!product || !rows.length) return;
    const firstEligible =
      mode === "order"
        ? rows.find((v) => productStatus(v, product).kind === "available")
        : rows[0];
    setVehiclePlate((firstEligible ?? rows[0]).plate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, vehicles, mode]);

  if (!product) return null;

  const selected = rows.find((v) => v.plate === vehiclePlate);
  const status = selected ? productStatus(selected, product) : null;
  const canOrder = mode === "block" ? !!selected : status?.kind === "available";

  const submit = async () => {
    try {
      await create.mutateAsync({ productCode: product.code, mode, vehiclePlate, quantity: qty });
      toast.success(
        mode === "block"
          ? `${product.name} blocked for ${vehiclePlate}`
          : `Ordered ${qty} × ${product.name} for ${vehiclePlate}`
      );
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Order failed. Please try again.");
    }
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
          <Field
            label="Vehicle"
            required
            hint={
              mode === "order"
                ? `Eligible: ${product.eligibleTypes.join(", ")} · ${product.countries.join(", ")}`
                : undefined
            }
          >
            <Select value={vehiclePlate} onValueChange={setVehiclePlate}>
              <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
              <SelectContent>
                {rows.map((v) => {
                  const st = productStatus(v, product);
                  const blocked = mode === "order" && st.kind !== "available";
                  return (
                    <SelectItem key={v.id} value={v.plate} disabled={blocked}>
                      {v.plate} · {v.type} · {v.country}
                      {blocked ? ` — ${st.kind === "existing" ? "already active" : "not eligible"}` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </Field>

          {/* Eligibility notice */}
          {mode === "order" && status && status.kind !== "available" && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <Info className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <span>
                {status.kind === "existing"
                  ? `${product.name} is already active on ${vehiclePlate}.`
                  : status.reason}
              </span>
            </div>
          )}

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
            disabled={!canOrder || create.isPending}
          >
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "block" ? "Block product" : "Place order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
