import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FormSection } from "@/components/common/Field";
import { COUNTRIES } from "@/mocks/catalog";
import { useCreateVehicle, useUpdateVehicle, useEntities } from "@/hooks/api";
import {
  EURONORMS,
  VEHICLE_TYPES,
  vehicleSchema,
  type VehicleFormValues,
} from "./vehicleSchema";
import type { Vehicle } from "@/lib/types";
import { toast } from "sonner";

interface VehicleFormSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicle?: Vehicle | null;
  prefill?: Partial<VehicleFormValues> | null;
}

export function VehicleFormSheet({
  open,
  onOpenChange,
  vehicle,
  prefill,
}: VehicleFormSheetProps) {
  const isEdit = !!vehicle;
  const { data: entities } = useEntities();
  const create = useCreateVehicle();
  const update = useUpdateVehicle();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: defaults(),
  });

  function defaults(): VehicleFormValues {
    return {
      plate: "",
      country: "NL",
      type: "Truck",
      fleetCode: "",
      vin: "",
      euronorm: "EURO 6",
      totalAxles: 2,
      totalWeightKg: 18000,
      co2Class: 1,
      legalEntity: entities?.[0]?.name ?? "NVD Transport B.V.",
    };
  }

  // Reset on open with vehicle / prefill
  React.useEffect(() => {
    if (!open) return;
    if (vehicle) {
      reset({
        plate: vehicle.plate,
        country: vehicle.country,
        type: vehicle.type,
        fleetCode: vehicle.fleetCode,
        vin: vehicle.vin,
        euronorm: vehicle.euronorm,
        totalAxles: vehicle.totalAxles,
        totalWeightKg: vehicle.totalWeightKg,
        co2Class: vehicle.co2Class,
        legalEntity: vehicle.legalEntity,
      });
    } else {
      reset({ ...defaults(), ...prefill });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vehicle, prefill]);

  const onSubmit = async (values: VehicleFormValues) => {
    try {
      if (isEdit && vehicle) {
        await update.mutateAsync({ id: vehicle.id, ...values } as never);
        toast.success(`Vehicle ${values.plate} updated`);
      } else {
        await create.mutateAsync(values as never);
        toast.success(`Vehicle ${values.plate} created`);
      }
      onOpenChange(false);
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const pending = create.isPending || update.isPending;
  const country = watch("country");
  const type = watch("type");
  const euronorm = watch("euronorm");
  const legalEntity = watch("legalEntity");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{isEdit ? `Edit ${vehicle?.plate}` : "Add new vehicle"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update vehicle attributes. Missing attributes block product ordering."
              : "Enter vehicle details or pre-fill them from an RC card using AI extraction."}
          </SheetDescription>
        </SheetHeader>

        <form
          id="vehicle-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 space-y-6 overflow-y-auto p-6"
        >
          <FormSection title="Identity">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Plate number" htmlFor="plate" required error={errors.plate?.message}>
                <Input id="plate" placeholder="e.g. 234-E455" {...register("plate")} />
              </Field>
              <Field label="Country" required>
                <Select value={country} onValueChange={(v) => setValue("country", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.code} · {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Vehicle type" required>
                <Select value={type} onValueChange={(v) => setValue("type", v as never)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Fleet code" htmlFor="fleetCode" error={errors.fleetCode?.message}>
                <Input id="fleetCode" placeholder="Optional" {...register("fleetCode")} />
              </Field>
              <Field label="VIN" htmlFor="vin" className="col-span-2" error={errors.vin?.message}>
                <Input id="vin" placeholder="Vehicle identification number" {...register("vin")} />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Technical attributes" description="Required for accurate tolling and product eligibility.">
            <div className="grid grid-cols-2 gap-4">
              <Field label="EURO norm" required error={errors.euronorm?.message}>
                <Select value={euronorm} onValueChange={(v) => setValue("euronorm", v as never)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {EURONORMS.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="CO₂ class" htmlFor="co2Class" error={errors.co2Class?.message}>
                <Input id="co2Class" type="number" min={1} max={5} {...register("co2Class")} />
              </Field>
              <Field label="Total axles" htmlFor="totalAxles" required error={errors.totalAxles?.message}>
                <Input id="totalAxles" type="number" min={2} max={12} {...register("totalAxles")} />
              </Field>
              <Field label="Total weight (kg)" htmlFor="totalWeightKg" required error={errors.totalWeightKg?.message}>
                <Input id="totalWeightKg" type="number" {...register("totalWeightKg")} />
              </Field>
            </div>
          </FormSection>

          <FormSection title="Ownership">
            <Field label="Legal entity" required error={errors.legalEntity?.message}>
              <Select value={legalEntity} onValueChange={(v) => setValue("legalEntity", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {entities?.map((e) => (
                    <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FormSection>
        </form>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="vehicle-form" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isEdit ? "Save changes" : "Create vehicle"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
