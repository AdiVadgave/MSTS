import type { TollProduct, Vehicle } from "./types";

export type ProductStatusKind = "existing" | "available" | "ineligible" | "blocked";

export interface ProductStatus {
  kind: ProductStatusKind;
  /** Human-readable reason, shown for ineligible/blocked. */
  reason?: string;
  label: string;
}

/**
 * Decide whether `product` can be ordered for `vehicle`.
 *
 * Rules (assumed for the prototype):
 *  1. Already on the vehicle           → "existing"
 *  2. Vehicle missing key attributes   → "blocked" (complete attributes first)
 *  3. Product not offered in country   → "ineligible"
 *  4. Vehicle type not supported       → "ineligible"
 *  5. Otherwise                        → "available"
 */
export function productStatus(vehicle: Vehicle, product: TollProduct): ProductStatus {
  if (vehicle.products.includes(product.code)) {
    return { kind: "existing", label: "Existing" };
  }
  if (vehicle.status === "missing_attributes" || !vehicle.euronorm) {
    return {
      kind: "blocked",
      label: "Complete attributes",
      reason: "Complete the vehicle's technical attributes (EURO norm, weight) before ordering.",
    };
  }
  if (!product.countries.includes(vehicle.country)) {
    return {
      kind: "ineligible",
      label: "Not eligible",
      reason: `${product.name} is not offered in ${vehicle.country}.`,
    };
  }
  if (!product.eligibleTypes.includes(vehicle.type)) {
    const plural = vehicle.type === "Bus" ? "buses" : `${vehicle.type.toLowerCase()}s`;
    return {
      kind: "ineligible",
      label: "Not eligible",
      reason: `${product.name} is not available for ${plural}.`,
    };
  }
  return { kind: "available", label: "Available" };
}

/** Products a vehicle is allowed to order right now (not already on it). */
export function eligibleProducts(vehicle: Vehicle, products: TollProduct[]): TollProduct[] {
  return products.filter((p) => productStatus(vehicle, p).kind === "available");
}

export function isOrderable(vehicle: Vehicle, product: TollProduct): boolean {
  return productStatus(vehicle, product).kind === "available";
}
