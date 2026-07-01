import { z } from "zod";

export const EURONORMS = ["EURO 3", "EURO 4", "EURO 5", "EURO 6"] as const;
export const VEHICLE_TYPES = ["Truck", "Trailer", "Bus", "Van"] as const;

export const vehicleSchema = z.object({
  plate: z.string().min(2, "Plate is required").max(16),
  country: z.string().min(2),
  type: z.enum(VEHICLE_TYPES),
  fleetCode: z.string().max(12).optional().or(z.literal("")),
  vin: z.string().max(17).optional().or(z.literal("")),
  euronorm: z.enum(EURONORMS).or(z.literal("")),
  totalAxles: z.coerce.number().min(2).max(12),
  totalWeightKg: z.coerce.number().min(1000).max(60000),
  co2Class: z.coerce.number().min(1).max(5),
  legalEntity: z.string().min(1),
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;
