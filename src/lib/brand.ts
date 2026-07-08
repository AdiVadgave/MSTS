// ── Whitelabel brand helpers ────────────────────────────────────
// Single source of truth for package→feature mapping and the CSS
// brand-variable layer (--brand-accent etc., RGB channels).

import type { DesignTemplate, FeatureFlag, Partner, PartnerPackage } from "./types";

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

export interface TemplateMeta {
  id: DesignTemplate;
  name: string;
  description: string;
  /** Picker-card swatches: [page surface, sidebar, card]. */
  swatches: [string, string, string];
  defaultDark: boolean;
}

export const DESIGN_TEMPLATES: TemplateMeta[] = [
  {
    id: "signage",
    name: "Signage",
    description:
      "Editorial highway-signage look — warm paper, asphalt sidebar, bold display type and dashed motifs.",
    swatches: ["#FAF7F0", "#161310", "#FDFCF9"],
    defaultDark: false,
  },
  {
    id: "executive",
    name: "Executive",
    description:
      "Clean corporate SaaS — cool white and slate, soft corners, quiet chrome.",
    swatches: ["#F5F6F8", "#20293A", "#FFFFFF"],
    defaultDark: false,
  },
  {
    id: "carbon",
    name: "Carbon",
    description:
      "Dark tech console — near-black surfaces, sharp corners, thin accent lines. Dark-first.",
    swatches: ["#0E1113", "#08090B", "#16191C"],
    defaultDark: true,
  },
];

/** Active design template; MSTS (null brand) is pinned to Signage. */
export function templateOf(brand: Partner | null): DesignTemplate {
  return brand?.designTemplate ?? "signage";
}

/** Sidebar-chip portal name with sensible fallback. */
export function portalNameOf(brand: Partner): string {
  return brand.portalName?.trim() || `${brand.name} Tolls`;
}

/** "#FBCE07" → "49 96% 51%" (HSL channels for the semantic token layer). */
export function hexToHslChannels(hex: string): string {
  const [r, g, b] = hexToChannels(hex).split(" ").map((v) => Number(v) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Set/remove the brand CSS vars + design-template attribute on <html>.
 * null = MSTS defaults (Signage, Shell-red primary).
 */
export function applyBrandVars(brand: Partner | null): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!brand) {
    root.style.removeProperty("--brand-accent");
    root.style.removeProperty("--brand-accent-deep");
    root.style.removeProperty("--brand-on-accent");
    root.style.removeProperty("--primary");
    root.style.removeProperty("--primary-foreground");
    root.style.removeProperty("--ring");
    root.removeAttribute("data-theme");
    return;
  }
  root.style.setProperty("--brand-accent", hexToChannels(brand.accentColor));
  root.style.setProperty("--brand-accent-deep", hexToChannels(darkenHex(brand.accentColor)));
  root.style.setProperty("--brand-on-accent", hexToChannels(onAccentHex(brand.accentColor)));
  // Whitelabel action color: the partner accent replaces Shell red for
  // primary buttons, links and focus rings.
  root.style.setProperty("--primary", hexToHslChannels(brand.accentColor));
  root.style.setProperty("--primary-foreground", hexToHslChannels(onAccentHex(brand.accentColor)));
  root.style.setProperty("--ring", hexToHslChannels(brand.accentColor));
  const template = templateOf(brand);
  if (template === "signage") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", template);
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
  /** Uploaded partner logo (data URL). Embedded in PDF headers when the
   *  format is raster (PNG/JPEG); otherwise the name renders as text. */
  logoDataUrl?: string;
}

/** Brand info for file exports — only when branded-invoicing is licensed. */
export function exportBrandOf(brand: Partner | null): ExportBrand | undefined {
  return brand && brand.features.includes("branded-invoicing")
    ? {
        name: brand.name,
        accentColor: brand.accentColor,
        logoDataUrl: brand.logoDataUrl,
      }
    : undefined;
}
