// ── Whitelabel brand helpers ────────────────────────────────────
// Single source of truth for package→feature mapping and the CSS
// brand-variable layer (--brand-accent etc., RGB channels).

import type { FeatureFlag, Partner, PartnerPackage } from "./types";

const BASIC: FeatureFlag[] = [
  "dashboard", "vehicles", "obu", "hauliers", "products", "domains",
];
const PROFESSIONAL: FeatureFlag[] = [
  ...BASIC, "transactions", "reports", "branded-invoicing", "scheduled-reports",
];
const ENTERPRISE: FeatureFlag[] = [
  ...PROFESSIONAL, "finance", "users", "onboarding", "api-access",
];

export const PACKAGE_FEATURES: Record<PartnerPackage, FeatureFlag[]> = {
  basic: BASIC,
  professional: PROFESSIONAL,
  enterprise: ENTERPRISE,
};

export const FEATURE_LABELS: Record<FeatureFlag, string> = {
  dashboard: "Dashboard & KPIs",
  vehicles: "Vehicle management",
  obu: "OBU & devices",
  hauliers: "Hauliers",
  products: "Products & ordering",
  domains: "Toll domains",
  transactions: "Transactions",
  reports: "Reports & exports",
  finance: "Invoices & AR",
  users: "Users & access",
  onboarding: "Self-service onboarding",
  "api-access": "API access",
  "branded-invoicing": "Branded invoicing",
  "scheduled-reports": "Scheduled reports",
};

/** MSTS (brand = null) has every feature. */
export function featureEnabled(brand: Partner | null, flag: FeatureFlag): boolean {
  return !brand || brand.features.includes(flag);
}

/** "#FBCE07" → "251 206 7" (space-separated RGB channels for CSS vars). */
export function hexToChannels(hex: string): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

/** Darken a hex color multiplicatively (default 12%) for hover states. */
export function darkenHex(hex: string, amount = 0.12): string {
  const [r, g, b] = hexToChannels(hex).split(" ").map(Number);
  const d = (v: number) => Math.max(0, Math.round(v * (1 - amount)));
  return (
    "#" + [d(r), d(g), d(b)].map((v) => v.toString(16).padStart(2, "0")).join("")
  );
}

/** Legible text color on top of the accent, from perceived luminance. */
export function onAccentHex(accent: string): string {
  const [r, g, b] = hexToChannels(accent).split(" ").map(Number);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "#1A1712" : "#FFFFFF";
}

/** Set/remove the brand CSS vars on <html>. null = MSTS defaults. */
export function applyBrandVars(brand: Partner | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!brand) {
    root.style.removeProperty("--brand-accent");
    root.style.removeProperty("--brand-accent-deep");
    root.style.removeProperty("--brand-on-accent");
    return;
  }
  root.style.setProperty("--brand-accent", hexToChannels(brand.accentColor));
  root.style.setProperty("--brand-accent-deep", hexToChannels(darkenHex(brand.accentColor)));
  root.style.setProperty("--brand-on-accent", hexToChannels(onAccentHex(brand.accentColor)));
}

/** "Alpine Fleet Services" → "AF" */
export function monogram(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** "Alpine Fleet!" → "alpine-fleet" */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

export interface ExportBrand {
  name: string;
  accentColor: string;
}

/** Brand info for file exports — only when branded-invoicing is licensed. */
export function exportBrandOf(brand: Partner | null): ExportBrand | undefined {
  return brand && brand.features.includes("branded-invoicing")
    ? { name: brand.name, accentColor: brand.accentColor }
    : undefined;
}
