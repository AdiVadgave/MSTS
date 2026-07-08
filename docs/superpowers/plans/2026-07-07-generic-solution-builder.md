# Generic Whitelabel Solution Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Partners get a fully generic portal (no Shell portal structure), configured through a full-page Solution Builder wizard (feature picker + 3 design templates), with an Azure GPT-4o setup assistant.

**Architecture:** Design templates are `data-theme` attribute blocks re-valuing the existing semantic CSS tokens (Signage stays the unattributed default); the partner accent now also drives `--primary`. A generic module catalogue (`navForBrand`) replaces the MyTolls/MyMST nav under any active brand. The wizard replaces the PartnerSheet; three new `/api/ai/*` endpoints follow the existing rc-card proxy pattern. Spec: `docs/superpowers/specs/2026-07-07-generic-whitelabel-solution-builder-design.md`.

**Tech Stack:** React 18 + Vite + TS, Tailwind (CSS-var tokens), MSW mock backend, TanStack Query, Express AI proxy (Azure OpenAI GPT-4o, mock fallback).

## Global Constraints

- **DO NOT `git commit` (or stage-and-commit, amend, push) at any point.** The user commits manually. Leave all changes in the working tree. Task boundaries are verified by build gates only.
- No unit-test framework exists; the verification gate for every task is `npm run build` (`tsc --noEmit && vite build`, must exit 0). `npm run lint` is unusable (eslint not installed — pre-existing).
- **MSTS default is untouched:** with `activeBrand === null` the app renders exactly as today — Signage theme (no `data-theme` attribute), Shell-red `--primary`, MyTolls/MyMST portals + switcher, SourceTags visible, `/partners` admin available.
- Design templates (exact ids): `"signage" | "executive" | "carbon"`. MSTS pinned to signage. Carbon defaults a partner session to dark mode on brand activation (user can still toggle).
- Generic module labels (exact, used in nav + palette + upgrade cards): Dashboard, Vehicles, Devices, Carriers, Toll Products, Toll Coverage, Transactions, Reports, Invoices, Users & Access, Customer Onboarding. Groups: Overview, Fleet, Tolling, Billing, Administration, General.
- Under a partner brand, the strings "MyTolls", "MyMST", "Toll2.0", "MSTS One" and SourceTag chips must not appear anywhere in the portal chrome (the "Powered by MSTS Tolls" login footer is the one deliberate exception).
- New `Partner` fields: `designTemplate` (default `"signage"`), optional `portalName`, `tagline`, `welcomeText`. DB schema VERSION 5 → **6**.
- AI endpoints return `source: "azure-openai" | "mock"`; real Azure call only when `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT` are set; any Azure failure degrades to the mock payload. Client-side validation clamps AI output (hex `#RRGGBB`, known FeatureFlags, known template ids) — invalid output degrades to "no suggestion", never a broken form.
- Path alias `@/` → `src/`. Windows PowerShell 5.1: chain with `;`, never `&&`.
- Pre-approved API adaptation: if the ui `Badge` component has no `outline` variant, substitute `<Badge className="border bg-transparent text-foreground">` wherever the plan writes `<Badge variant="outline">`. Check `src/components/ui/badge.tsx` before writing.
- Line references are as-of-plan-writing; match on content.

---

### Task 1: Types, template metadata, brand-driven primary color

**Files:**
- Modify: `src/lib/types.ts` (Partner interface + new type)
- Modify: `src/lib/brand.ts`
- Modify: `src/app/store.tsx` (carbon dark-first effect)

**Interfaces:**
- Consumes: existing `Partner`, `applyBrandVars`, `hexToChannels`, `onAccentHex` in `src/lib/brand.ts`.
- Produces (later tasks import these exact names):
  - types: `DesignTemplate = "signage" | "executive" | "carbon"`; `Partner` gains `designTemplate: DesignTemplate; portalName?: string; tagline?: string; welcomeText?: string;`
  - brand.ts: `DESIGN_TEMPLATES: TemplateMeta[]` (`interface TemplateMeta { id: DesignTemplate; name: string; description: string; swatches: [string, string, string]; defaultDark: boolean }`), `templateOf(brand: Partner | null): DesignTemplate`, `portalNameOf(brand: Partner): string`, `hexToHslChannels(hex: string): string`.
  - `applyBrandVars` additionally manages `data-theme` on `<html>` and `--primary`/`--primary-foreground`/`--ring` overrides.

- [ ] **Step 1: Add the type + fields in `src/lib/types.ts`**

Immediately before the `Partner` interface, add:

```ts
export type DesignTemplate = "signage" | "executive" | "carbon";
```

Inside `Partner`, after `accentColor: string;`, add:

```ts
  /** Visual design template applied to the partner's portal. */
  designTemplate: DesignTemplate;
  /** Portal display name (sidebar chip); defaults to "<name> Tolls". */
  portalName?: string;
  /** One-line positioning shown in the sidebar identity bar. */
  tagline?: string;
  /** Login-screen welcome sentence & dashboard greeting. */
  welcomeText?: string;
```

- [ ] **Step 2: Extend `src/lib/brand.ts`**

Add `DesignTemplate` to the type import from `./types`. Append:

```ts
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
```

Replace the whole `applyBrandVars` function with:

```ts
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
```

- [ ] **Step 3: Carbon dark-first in `src/app/store.tsx`**

Add `templateOf` to the brand import: `import { applyBrandVars, templateOf } from "@/lib/brand";`. Replace the existing brand effect with:

```ts
  React.useEffect(() => {
    applyBrandVars(activeBrand);
    // Carbon is dark-first: entering a carbon-branded session defaults to
    // dark. The user can still toggle back to light.
    if (activeBrand && templateOf(activeBrand) === "carbon") setTheme("dark");
  }, [activeBrand]);
```

(`setTheme` is the existing internal state setter — already in scope.)

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: FAILS — `src/mocks/db.ts` seed partners are missing the new required `designTemplate` field. That is Task 2's job; if that is the ONLY error class, this task is done. If `db.ts` somehow compiles, check nothing else broke.

- [ ] **Step 5: Do NOT commit** — leave changes in the working tree (user commits manually).

---

### Task 2: Mock backend v6 — seed portal copy/templates, handler fields

**Files:**
- Modify: `src/mocks/db.ts` (two seed partners)
- Modify: `src/mocks/persistence.ts` (VERSION)
- Modify: `src/mocks/handlers.ts` (POST + PATCH `/api/partners`)

**Interfaces:**
- Consumes: `DesignTemplate` from Task 1.
- Produces: seed partners with `designTemplate`/portal copy; POST defaults `designTemplate: "signage"`; PATCH accepts all four new fields (`|| undefined` normalization on the three copy strings).

- [ ] **Step 1: Update the seed in `src/mocks/db.ts`**

Replace the two partner objects so they read (keep `features` spread copies as-is):

```ts
  const partners: Partner[] = [
    {
      id: "ptr_alpine",
      name: "Alpine Fleet Services",
      slug: "alpine",
      accentColor: "#2F7D4F",
      designTemplate: "executive",
      portalName: "AlpineFleet Portal",
      tagline: "Tolls handled, Europe-wide.",
      welcomeText: "Welcome to your AlpineFleet tolling cockpit.",
      package: "enterprise",
      features: [...PACKAGE_FEATURES.enterprise],
      status: "active",
      entityIds: ["e1", "e2"],
      createdAt: iso(faker.date.past({ years: 1 })),
    },
    {
      id: "ptr_nordkap",
      name: "Nordkap Logistik",
      slug: "nordkap",
      accentColor: "#1B5FAA",
      designTemplate: "carbon",
      portalName: "Nordkap Toll Console",
      tagline: "Nordic freight, zero toll friction.",
      welcomeText: "Your Nordkap toll operations, all in one place.",
      package: "basic",
      features: [...PACKAGE_FEATURES.basic],
      status: "active",
      entityIds: ["e3"],
      createdAt: iso(faker.date.past({ years: 1 })),
    },
  ];
```

- [ ] **Step 2: Bump `src/mocks/persistence.ts`**

```ts
// v5: added the whitelabel partners collection.
// v6: partners carry designTemplate + portal copy (solution builder).
const VERSION = 6;
```

- [ ] **Step 3: Handlers in `src/mocks/handlers.ts`**

In the POST `/api/partners` handler, after `accentColor: body.accentColor ?? "#1B5FAA",` add:

```ts
      designTemplate: body.designTemplate ?? "signage",
      portalName: body.portalName || undefined,
      tagline: body.tagline || undefined,
      welcomeText: body.welcomeText || undefined,
```

In the PATCH handler, after the `accentColor` line add:

```ts
    if (body.designTemplate !== undefined) p.designTemplate = body.designTemplate;
    if (body.portalName !== undefined) p.portalName = body.portalName || undefined;
    if (body.tagline !== undefined) p.tagline = body.tagline || undefined;
    if (body.welcomeText !== undefined) p.welcomeText = body.welcomeText || undefined;
```

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: exits 0 (Task 1's type error is now resolved).

- [ ] **Step 5: Do NOT commit.**

---

### Task 3: Theme CSS layer — font vars, template blocks, motif var, Ticker gating

**Files:**
- Modify: `src/styles/globals.css`
- Modify: `tailwind.config.js` (fontFamily + signage-dash)
- Modify: every render site of `<Ticker` (find with a grep; expected in `src/features/dashboard/DashboardPage.tsx` and possibly auth/support surfaces)

**Interfaces:**
- Consumes: `templateOf` (Task 1); `useAppStore` for gating Ticker.
- Produces: `[data-theme="executive"]` / `[data-theme="carbon"]` token blocks (light + `.dark` variants); `--font-display/--font-body/--font-mono`; `--motif-dash` driving the `bg-signage-dash` utility.

- [ ] **Step 1: Font + motif vars in `:root` of `src/styles/globals.css`**

Add after the `--brand-*` block, inside `:root`:

```css
    /* Template-controlled typography + motif layer (Signage defaults). */
    --font-display: "Archivo", ui-sans-serif, system-ui, sans-serif;
    --font-body: "Inter", ui-sans-serif, system-ui, sans-serif;
    --font-mono: "JetBrains Mono", ui-monospace, monospace;
    --motif-dash: repeating-linear-gradient(
      90deg,
      rgb(var(--brand-accent)) 0 44px,
      transparent 44px 84px
    );
```

Change the heading rule so templates can swap the display face — replace

```css
  h1, h2, h3, .font-display {
    font-family: "Archivo", ui-sans-serif, system-ui, sans-serif;
    letter-spacing: -0.02em;
  }
```

with

```css
  h1, h2, h3, .font-display {
    font-family: var(--font-display);
    letter-spacing: -0.02em;
  }
```

- [ ] **Step 2: Template token blocks**

Add after the `.dark { … }` block (still inside `@layer base`):

```css
  /* ── Design template: Executive (clean corporate SaaS) ──────── */
  [data-theme="executive"] {
    --background: 220 20% 97%;
    --foreground: 222 28% 12%;
    --card: 0 0% 100%;
    --card-foreground: 222 28% 12%;
    --popover: 0 0% 100%;
    --popover-foreground: 222 28% 12%;
    --secondary: 220 16% 93%;
    --secondary-foreground: 222 20% 20%;
    --muted: 220 16% 93%;
    --muted-foreground: 220 10% 44%;
    --accent: 220 60% 94%;
    --accent-foreground: 222 40% 20%;
    --border: 220 14% 88%;
    --input: 220 14% 88%;
    --radius: 0.9rem;
    --sidebar: 222 26% 16%;
    --sidebar-foreground: 220 16% 82%;
    --sidebar-muted: 220 10% 55%;
    --sidebar-border: 222 20% 24%;
    --font-display: "Inter", ui-sans-serif, system-ui, sans-serif;
    --motif-dash: linear-gradient(90deg, hsl(220 14% 88%) 0 100%);
  }
  .dark[data-theme="executive"] {
    --background: 222 24% 10%;
    --foreground: 220 20% 92%;
    --card: 222 22% 14%;
    --card-foreground: 220 20% 92%;
    --popover: 222 22% 14%;
    --popover-foreground: 220 20% 92%;
    --secondary: 222 18% 18%;
    --secondary-foreground: 220 18% 86%;
    --muted: 222 18% 18%;
    --muted-foreground: 220 10% 62%;
    --accent: 222 30% 20%;
    --accent-foreground: 220 40% 85%;
    --border: 222 16% 20%;
    --input: 222 16% 22%;
    --sidebar: 222 30% 8%;
    --sidebar-foreground: 220 16% 78%;
    --sidebar-muted: 220 10% 50%;
    --sidebar-border: 222 20% 16%;
    --motif-dash: linear-gradient(90deg, hsl(222 16% 20%) 0 100%);
  }

  /* ── Design template: Carbon (dark tech console) ────────────── */
  [data-theme="carbon"] {
    --background: 210 8% 94%;
    --foreground: 210 12% 10%;
    --card: 0 0% 99%;
    --card-foreground: 210 12% 10%;
    --popover: 0 0% 99%;
    --popover-foreground: 210 12% 10%;
    --secondary: 210 8% 89%;
    --secondary-foreground: 210 10% 18%;
    --muted: 210 8% 89%;
    --muted-foreground: 210 6% 42%;
    --accent: 210 10% 86%;
    --accent-foreground: 210 12% 14%;
    --border: 210 8% 84%;
    --input: 210 8% 84%;
    --radius: 0.3rem;
    --sidebar: 210 10% 6%;
    --sidebar-foreground: 210 8% 78%;
    --sidebar-muted: 210 6% 48%;
    --sidebar-border: 210 8% 14%;
    --font-display: "Inter", ui-sans-serif, system-ui, sans-serif;
    --motif-dash: linear-gradient(90deg, rgb(var(--brand-accent)) 0 100%);
  }
  .dark[data-theme="carbon"] {
    --background: 210 8% 6%;
    --foreground: 210 10% 90%;
    --card: 210 8% 9%;
    --card-foreground: 210 10% 90%;
    --popover: 210 8% 9%;
    --popover-foreground: 210 10% 90%;
    --secondary: 210 8% 13%;
    --secondary-foreground: 210 8% 82%;
    --muted: 210 8% 13%;
    --muted-foreground: 210 6% 58%;
    --accent: 210 10% 15%;
    --accent-foreground: 210 10% 85%;
    --border: 210 8% 16%;
    --input: 210 8% 18%;
    --sidebar: 210 12% 4%;
    --sidebar-foreground: 210 8% 75%;
    --sidebar-muted: 210 6% 45%;
    --sidebar-border: 210 8% 12%;
    --motif-dash: linear-gradient(90deg, rgb(var(--brand-accent)) 0 100%);
  }
```

- [ ] **Step 3: `tailwind.config.js`**

Replace the `fontFamily` block with:

```js
      fontFamily: {
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
```

Replace the `signage-dash` backgroundImage value with:

```js
        "signage-dash": "var(--motif-dash)",
```

- [ ] **Step 4: Gate the Ticker to the Signage template**

Find every render site: search `src` for `<Ticker`. At each site, wrap the element so it renders only under Signage, e.g. in `DashboardPage.tsx`:

```tsx
import { templateOf } from "@/lib/brand";
// inside the component (useAppStore is already imported in most sites; add if missing):
const { activeBrand } = useAppStore();
// at the render site:
{templateOf(activeBrand) === "signage" && <Ticker /* existing props unchanged */ />}
```

Do not remove the Ticker component itself. If a site is a non-portal surface that never renders under a brand (e.g. inside the MSTS-only launcher), leave it untouched and note it in your report.

- [ ] **Step 5: Verify**

Run: `npm run build` → exits 0.
DevTools sanity: `document.documentElement.setAttribute("data-theme","executive")` — page turns cool white/slate, corners round, display font becomes Inter; `"carbon"` + `.dark` — near-black console; removing the attribute restores Signage exactly.

- [ ] **Step 6: Do NOT commit.**

---

### Task 4: Generic partner navigation + portal chrome

**Files:**
- Modify: `src/app/nav.ts` (BRAND_GROUPS catalogue + `navForBrand` + helpers)
- Modify: `src/app/Sidebar.tsx` (groups source, chip, identity bar)
- Modify: `src/app/CommandPalette.tsx:20` (groups source)
- Modify: `src/app/Topbar.tsx:100-114` (hide portal switcher under brand)
- Modify: `src/app/router.tsx` (PortalIndex + unwrap index route)
- Modify: `src/components/common/FeatureGate.tsx` (generic module names)

**Interfaces:**
- Consumes: `featureEnabled`, `templateOf`, `portalNameOf`, `onAccentHex` (brand.ts); existing `NavGroup`/`NavItem`.
- Produces: `navForBrand(brand: Partner): NavGroup[]`, `brandModuleLabel(flag: FeatureFlag): string`, `brandHome(brand: Partner): string` — all exported from `src/app/nav.ts`.

- [ ] **Step 1: Add the generic catalogue to `src/app/nav.ts`**

Append after `navForPortal`:

```ts
// ── Generic whitelabel portal ───────────────────────────────────
// Partners never see Shell's MyTolls/MyMST structure: their portal is a
// single generic solution built from the modules in their package.

interface BrandModule {
  flag: FeatureFlag;
  label: string;
  to: string;
  icon: LucideIcon;
  keywords: string[];
  description: string;
}

const BRAND_GROUPS: { label: string; modules: BrandModule[] }[] = [
  {
    label: "Overview",
    modules: [
      { flag: "dashboard", label: "Dashboard", to: "/", icon: LayoutDashboard, keywords: ["home", "overview", "kpi", "fleet"], description: "Fleet overview & KPIs" },
    ],
  },
  {
    label: "Fleet",
    modules: [
      { flag: "vehicles", label: "Vehicles", to: "/vehicles", icon: Truck, keywords: ["truck", "trailer", "plate"], description: "Manage vehicles & documents" },
      { flag: "obu", label: "Devices", to: "/obus", icon: RadioTower, keywords: ["on-board unit", "device", "tag"], description: "Assign, replace & track devices" },
      { flag: "hauliers", label: "Carriers", to: "/hauliers", icon: Building2, keywords: ["carrier", "company", "owner"], description: "Carrier & owner companies" },
    ],
  },
  {
    label: "Tolling",
    modules: [
      { flag: "products", label: "Toll Products", to: "/products", icon: ShoppingCart, keywords: ["order", "vignette", "card"], description: "Order & manage tolling products" },
      { flag: "domains", label: "Toll Coverage", to: "/domains", icon: Globe2, keywords: ["coverage", "scheme", "country"], description: "Toll schemes & coverage" },
    ],
  },
  {
    label: "Billing",
    modules: [
      { flag: "transactions", label: "Transactions", to: "/transactions", icon: Receipt, keywords: ["usage", "passage"], description: "Search toll transactions" },
      { flag: "reports", label: "Reports", to: "/reports", icon: BarChart3, keywords: ["export", "csv", "pdf"], description: "Standard & scheduled reports" },
      { flag: "finance", label: "Invoices", to: "/finance", icon: Wallet, keywords: ["invoice", "payment", "balance"], description: "Invoices, balances & payments" },
    ],
  },
  {
    label: "Administration",
    modules: [
      { flag: "users", label: "Users & Access", to: "/users", icon: Users, keywords: ["role", "permission", "invite"], description: "Users, roles & permissions" },
      { flag: "onboarding", label: "Customer Onboarding", to: "/onboarding", icon: UserPlus, keywords: ["register", "signup", "wizard"], description: "Guided customer setup" },
    ],
  },
];

/** Generic nav for a whitelabel partner: only their modules, generic names. */
export function navForBrand(brand: Partner): NavGroup[] {
  const groups: NavGroup[] = BRAND_GROUPS.map((g) => ({
    label: g.label,
    items: g.modules
      .filter((m) => featureEnabled(brand, m.flag))
      .map((m) => ({
        label: m.label,
        to: m.to,
        icon: m.icon,
        sources: [], // generic — no Shell provenance
        keywords: m.keywords,
        description: m.description,
        feature: m.flag,
      })),
  })).filter((g) => g.items.length > 0);
  groups.push({ label: "General", items: ALL_NAV_ITEMS.filter((i) => i.global) });
  return groups;
}

/** Generic display label for a module flag (upgrade cards etc.). */
export function brandModuleLabel(flag: FeatureFlag): string {
  for (const g of BRAND_GROUPS) {
    const m = g.modules.find((x) => x.flag === flag);
    if (m) return m.label;
  }
  return "This module";
}

/** Landing route for a partner: Dashboard if enabled, else first module. */
export function brandHome(brand: Partner): string {
  for (const g of navForBrand(brand)) {
    if (g.label !== "General" && g.items.length) return g.items[0].to;
  }
  return "/support";
}
```

- [ ] **Step 2: Sidebar (`src/app/Sidebar.tsx`)**

Imports: add `navForBrand` to the `./nav` import; add `portalNameOf, onAccentHex` from `@/lib/brand`.

Change the groups line (currently line 18) to:

```ts
  const groups = activeBrand
    ? navForBrand(activeBrand)
    : activePortal
      ? navForPortal(activePortal)
      : NAV;
```

Replace the chip `<span>` (currently lines 35-40) with:

```tsx
            <span
              className="truncate rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={
                activeBrand
                  ? { background: activeBrand.accentColor, color: onAccentHex(activeBrand.accentColor) }
                  : { background: portal ? portal.accent : "rgba(255,255,255,0.1)", color: "#fff" }
              }
            >
              {activeBrand ? portalNameOf(activeBrand) : portal ? portal.name : "One"}
            </span>
```

Replace the identity-bar condition (currently `{portal && (`) with a brand-aware version:

```tsx
      {(activeBrand ? Boolean(activeBrand.tagline) : Boolean(portal)) && (
        <div
          className={cn(
            "flex items-center gap-2 border-b border-[hsl(var(--sidebar-border))] px-4 py-2.5",
            collapsed && "justify-center px-2"
          )}
        >
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: activeBrand ? activeBrand.accentColor : portal!.accent }}
          />
          {!collapsed && (
            <span className="truncate text-[11px] text-[hsl(var(--sidebar-muted))]">
              {activeBrand ? activeBrand.tagline : portal!.tagline}
            </span>
          )}
        </div>
      )}
```

- [ ] **Step 3: CommandPalette (`src/app/CommandPalette.tsx`)**

Add `navForBrand` to the `./nav` import and change line 20 to:

```ts
  const groups = activeBrand
    ? navForBrand(activeBrand)
    : activePortal
      ? navForPortal(activePortal, activeBrand)
      : NAV;
```

(The per-item `item.sources.map(...)` SourceTag rendering needs no change — brand items have `sources: []`.)

- [ ] **Step 4: Topbar — no portal switcher under a brand**

In `src/app/Topbar.tsx`, change the switcher render condition (currently line 101) to:

```tsx
      {!activeBrand && portal && otherPortal && otherPortalUsable && (
```

- [ ] **Step 5: Router (`src/app/router.tsx`)**

Add imports: `import { brandHome } from "./nav";` and `import { featureEnabled } from "@/lib/brand";`.

Replace `PortalIndex` with:

```tsx
/**
 * Landing route. Partners land on their generic solution (Dashboard when
 * licensed, else their first module); MSTS lands per portal as before.
 */
function PortalIndex() {
  const { activePortal, activeBrand } = useAppStore();
  if (activeBrand) {
    if (featureEnabled(activeBrand, "dashboard")) return <DashboardPage />;
    return <Navigate to={brandHome(activeBrand)} replace />;
  }
  if (activePortal === "MyMST") {
    return <Navigate to={PORTALS.MyMST.home} replace />;
  }
  return <DashboardPage />;
}
```

Change the index route back to unwrapped (PortalIndex now handles the gating/redirect itself):

```tsx
      { index: true, element: <PortalIndex /> },
```

- [ ] **Step 6: FeatureGate generic labels (`src/components/common/FeatureGate.tsx`)**

Add `import { brandModuleLabel } from "@/app/nav";` and change the UpgradeState line to:

```tsx
  if (!featureEnabled(activeBrand, feature)) {
    return (
      <UpgradeState
        moduleName={activeBrand ? brandModuleLabel(feature) : moduleName}
      />
    );
  }
```

- [ ] **Step 7: Verify**

Run: `npm run build` → exits 0.
Browser: MSTS unchanged (both portals, switcher, Shell nav labels). Via `tolls.nordkap.com`: sidebar shows "Nordkap Toll Console" chip in blue, tagline bar, groups Overview/Fleet/Tolling/General only, generic labels ("Devices", "Carriers", "Toll Coverage"), no portal switcher; ⌘K matches; `/reports` shows "Reports is not in your package".

- [ ] **Step 8: Do NOT commit.**

---

### Task 5: Hide Shell provenance + portal copy surfaces

**Files:**
- Modify: `src/components/common/SourceTag.tsx`
- Modify: `src/features/auth/LoginPage.tsx:96-100` (subtitle)
- Modify: `src/features/dashboard/DashboardPage.tsx` (PageHeader description)

**Interfaces:** consumes `useAppStore().activeBrand` and Partner copy fields. No new exports.

- [ ] **Step 1: SourceTag returns null under a partner brand**

In `src/components/common/SourceTag.tsx`, add `import { useAppStore } from "@/app/store";` and as the first line of the component body:

```tsx
  const { activeBrand } = useAppStore();
  // Shell-internal provenance — never shown in a whitelabel portal.
  if (activeBrand) return null;
```

(This kills every SourceTag app-wide under a brand — page headers, dashboard cards, activity feed, palette — without touching the ~15 call sites.)

- [ ] **Step 2: Login subtitle uses `welcomeText`**

In `src/features/auth/LoginPage.tsx`, replace the `subtitle=` expression with:

```tsx
      subtitle={
        activeBrand
          ? activeBrand.welcomeText ?? `Access your ${activeBrand.name} tolling account.`
          : "Access your unified MSTS tolling cockpit."
      }
```

- [ ] **Step 3: Dashboard greeting**

In `src/features/dashboard/DashboardPage.tsx`, locate the top-level `<PageHeader` call (title "Dashboard"). Pull `activeBrand` from the already-imported `useAppStore` (add the import/destructure if the component doesn't have it yet) and make the `description` prop brand-aware, preserving the existing MSTS text:

```tsx
        description={
          activeBrand
            ? activeBrand.welcomeText ?? activeBrand.tagline ?? "Your tolling operations at a glance."
            : /* existing description string, unchanged */
        }
```

- [ ] **Step 4: Verify**

Run: `npm run build` → exits 0.
Browser via `tolls.alpine.com`: login subtitle is Alpine's welcome sentence; dashboard header shows it too; no MyTolls/MyMST/Toll2.0 chips anywhere (spot-check Vehicles, Reports, dashboard cards, ⌘K). MSTS view still shows SourceTags.

- [ ] **Step 5: Do NOT commit.**

---

### Task 6: AI proxy endpoints (server)

**Files:**
- Modify: `server/index.js` (three new endpoints + mocks, inserted before `app.listen`)

**Interfaces:**
- Consumes: existing `azureConfigured`, env constants, endpoint URL pattern from the rc-card handler.
- Produces (client contract for Task 7):
  - `POST /api/ai/brand-from-logo` body `{ imageBase64: string }` → `{ palette: string[], suggestedAccent: string, suggestedTemplate: "signage"|"executive"|"carbon", rationale: string, source: "azure-openai"|"mock" }`
  - `POST /api/ai/recommend-solution` body `{ description: string }` → `{ package: "basic"|"professional"|"enterprise", modules: string[], reasoning: { module: string, why: string }[], source }`
  - `POST /api/ai/portal-copy` body `{ companyName: string, description?: string }` → `{ portalName: string, tagline: string, welcomeText: string, source }`

- [ ] **Step 1: Add a shared chat-completion helper + the three endpoints**

Insert before `app.listen(...)` in `server/index.js`:

```js
// ── Whitelabel solution-builder assists ─────────────────────────
// Same conventions as /api/ai/rc-card: real Azure when configured,
// deterministic mock otherwise, graceful fallback on any failure.

async function azureJson(messages, maxTokens = 600) {
  const url = `${AZURE_OPENAI_ENDPOINT.replace(/\/$/, "")}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": AZURE_OPENAI_API_KEY },
    body: JSON.stringify({
      messages,
      temperature: 0.4,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`Azure OpenAI ${r.status}: ${detail.slice(0, 300)}`);
  }
  const json = await r.json();
  return JSON.parse(json.choices?.[0]?.message?.content ?? "{}");
}

const MODULE_CATALOG = `Available module flags (use ONLY these exact strings):
dashboard (fleet KPIs), vehicles (vehicle management), obu (on-board devices),
hauliers (carrier companies), products (toll product ordering), domains (toll coverage),
transactions (toll passages), reports (reporting & exports), finance (invoices & AR),
users (user & access management), onboarding (customer self-registration),
api-access (partner API), branded-invoicing (partner-branded documents),
scheduled-reports (recurring reports).
Packages: basic = dashboard,vehicles,obu,hauliers,products,domains ·
professional = basic + transactions,reports,branded-invoicing,scheduled-reports ·
enterprise = professional + finance,users,onboarding,api-access.`;

app.post("/api/ai/brand-from-logo", async (req, res) => {
  const { imageBase64 } = req.body ?? {};
  if (!imageBase64) return res.status(400).json({ error: "imageBase64 is required" });
  if (!azureConfigured) {
    await new Promise((r) => setTimeout(r, 1200));
    return res.json(mockBrandFromLogo());
  }
  try {
    const dataUrl = imageBase64.startsWith("data:")
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`;
    const parsed = await azureJson([
      {
        role: "system",
        content: `You are a brand designer. Analyse the company logo image and return ONLY JSON:
{
  "palette": string[],          // 3-5 dominant hex colors, "#RRGGBB"
  "suggestedAccent": string,    // ONE hex best suited as a UI accent (saturated, mid-luminance; avoid near-white/near-black)
  "suggestedTemplate": string,  // "signage" | "executive" | "carbon" — carbon for dark/tech brands, executive for corporate/clean, signage for bold/industrial
  "rationale": string           // one sentence
}`,
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract the brand palette and suggest a portal accent + design template." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ]);
    return res.json({
      palette: Array.isArray(parsed.palette) ? parsed.palette : [],
      suggestedAccent: parsed.suggestedAccent ?? "",
      suggestedTemplate: parsed.suggestedTemplate ?? "executive",
      rationale: parsed.rationale ?? "",
      source: "azure-openai",
    });
  } catch (err) {
    console.error("brand-from-logo failure:", err);
    return res.json(mockBrandFromLogo());
  }
});

app.post("/api/ai/recommend-solution", async (req, res) => {
  const { description } = req.body ?? {};
  if (!description) return res.status(400).json({ error: "description is required" });
  if (!azureConfigured) {
    await new Promise((r) => setTimeout(r, 1200));
    return res.json(mockRecommendation(description));
  }
  try {
    const parsed = await azureJson([
      {
        role: "system",
        content: `You configure whitelabel tolling portals for business partners. ${MODULE_CATALOG}
Given a partner's business description, return ONLY JSON:
{
  "package": string,        // "basic" | "professional" | "enterprise" — closest tier
  "modules": string[],      // exact flags the partner needs (may deviate from the tier)
  "reasoning": [ { "module": string, "why": string } ]  // one short line per chosen module
}`,
      },
      { role: "user", content: description },
    ], 900);
    return res.json({
      package: parsed.package ?? "professional",
      modules: Array.isArray(parsed.modules) ? parsed.modules : [],
      reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : [],
      source: "azure-openai",
    });
  } catch (err) {
    console.error("recommend-solution failure:", err);
    return res.json(mockRecommendation(description));
  }
});

app.post("/api/ai/portal-copy", async (req, res) => {
  const { companyName, description } = req.body ?? {};
  if (!companyName) return res.status(400).json({ error: "companyName is required" });
  if (!azureConfigured) {
    await new Promise((r) => setTimeout(r, 900));
    return res.json(mockPortalCopy(companyName));
  }
  try {
    const parsed = await azureJson([
      {
        role: "system",
        content: `You write concise product copy for a whitelabel tolling portal. Return ONLY JSON:
{
  "portalName": string,   // short portal name incorporating the company brand, max 4 words
  "tagline": string,      // positioning line, max 8 words, no trailing period rules — natural
  "welcomeText": string   // one warm login-screen sentence, max 14 words
}`,
      },
      {
        role: "user",
        content: `Company: ${companyName}\n${description ? `About them: ${description}` : ""}`,
      },
    ]);
    return res.json({
      portalName: parsed.portalName ?? `${companyName} Tolls`,
      tagline: parsed.tagline ?? "",
      welcomeText: parsed.welcomeText ?? "",
      source: "azure-openai",
    });
  } catch (err) {
    console.error("portal-copy failure:", err);
    return res.json(mockPortalCopy(companyName));
  }
});

function mockBrandFromLogo() {
  const options = [
    { palette: ["#0E4DA4", "#12B5CB", "#0A2540", "#F4F7FA"], suggestedAccent: "#0E4DA4", suggestedTemplate: "executive", rationale: "Corporate blues suit a clean executive look." },
    { palette: ["#C2410C", "#F59E0B", "#1C1917", "#FFFBEB"], suggestedAccent: "#C2410C", suggestedTemplate: "signage", rationale: "Bold industrial tones fit the signage aesthetic." },
    { palette: ["#22D3EE", "#0F172A", "#334155", "#E2E8F0"], suggestedAccent: "#22D3EE", suggestedTemplate: "carbon", rationale: "High-contrast tech palette works best on a dark console." },
  ];
  const pick = options[Math.floor(Math.random() * options.length)];
  return { ...pick, source: "mock" };
}

function mockRecommendation(description) {
  const d = String(description).toLowerCase();
  const wantsFinance = /invoic|billing|finance|account/i.test(d);
  const wantsApi = /api|integrat|erp|crm/i.test(d);
  const modules = ["dashboard", "vehicles", "obu", "hauliers", "products", "domains", "transactions", "reports", "branded-invoicing", "scheduled-reports"];
  if (wantsFinance) modules.push("finance");
  if (wantsApi) modules.push("api-access", "users", "onboarding");
  return {
    package: wantsApi ? "enterprise" : "professional",
    modules,
    reasoning: [
      { module: "vehicles", why: "Fleet operators need vehicle lifecycle management." },
      { module: "transactions", why: "Toll passage visibility is core to reconciliation." },
      { module: "reports", why: "Recurring exports keep finance teams out of the portal." },
      ...(wantsFinance ? [{ module: "finance", why: "You mentioned invoicing — include receivables handling." }] : []),
      ...(wantsApi ? [{ module: "api-access", why: "System integration calls for API access." }] : []),
    ],
    source: "mock",
  };
}

function mockPortalCopy(companyName) {
  const first = String(companyName).split(/\s+/)[0] || "Partner";
  return {
    portalName: `${first} Toll Portal`,
    tagline: "Every toll, one place.",
    welcomeText: `Welcome to ${first}'s tolling portal — let's get you moving.`,
    source: "mock",
  };
}
```

- [ ] **Step 2: Verify**

Run: `npm run build` → exits 0 (server file isn't type-checked, but the web build must stay green).
Then start just the proxy and probe it (PowerShell):

```powershell
Start-Process node -ArgumentList "server/index.js" -NoNewWindow; Start-Sleep -Seconds 2
Invoke-RestMethod -Method Post -Uri http://localhost:8787/api/ai/portal-copy -ContentType "application/json" -Body '{"companyName":"Borealis Cargo"}'
Invoke-RestMethod -Method Post -Uri http://localhost:8787/api/ai/recommend-solution -ContentType "application/json" -Body '{"description":"freight forwarder needing invoicing and ERP integration"}'
```

Expected: JSON payloads with `source` of `mock` (or `azure-openai` if env keys are set). Stop the node process afterwards (`Get-Process node | Stop-Process -Force` only if you started it and no other node process was running — otherwise find the exact PID you spawned and stop that).

- [ ] **Step 3: Do NOT commit.**

---

### Task 7: AI client module with validation

**Files:**
- Create: `src/features/partners/builder/ai.ts`

**Interfaces:**
- Consumes: `api` from `@/lib/api`; types `DesignTemplate`, `FeatureFlag`, `PartnerPackage` from `@/lib/types`; `FEATURE_LABELS` from `@/lib/brand`.
- Produces (Tasks 9-11 import these):
  - `interface BrandSuggestion { palette: string[]; suggestedAccent: string | null; suggestedTemplate: DesignTemplate | null; rationale: string; source: AiSource }`
  - `interface SolutionSuggestion { package: PartnerPackage; modules: FeatureFlag[]; reasoning: { module: string; why: string }[]; source: AiSource }`
  - `interface CopySuggestion { portalName: string; tagline: string; welcomeText: string; source: AiSource }`
  - `type AiSource = "azure-openai" | "mock"`
  - `aiBrandFromLogo(imageDataUrl: string): Promise<BrandSuggestion>`
  - `aiRecommendSolution(description: string): Promise<SolutionSuggestion>`
  - `aiPortalCopy(companyName: string, description?: string): Promise<CopySuggestion>`

- [ ] **Step 1: Create `src/features/partners/builder/ai.ts`**

```ts
// ── Solution-builder AI assists ─────────────────────────────────
// Thin client over the /api/ai/* proxy endpoints. Every response is
// validated and clamped here: invalid AI output degrades to "no
// suggestion", never to a broken form.

import { api } from "@/lib/api";
import type { DesignTemplate, FeatureFlag, PartnerPackage } from "@/lib/types";
import { FEATURE_LABELS } from "@/lib/brand";

export type AiSource = "azure-openai" | "mock";

export interface BrandSuggestion {
  palette: string[];
  suggestedAccent: string | null;
  suggestedTemplate: DesignTemplate | null;
  rationale: string;
  source: AiSource;
}

export interface SolutionSuggestion {
  package: PartnerPackage;
  modules: FeatureFlag[];
  reasoning: { module: string; why: string }[];
  source: AiSource;
}

export interface CopySuggestion {
  portalName: string;
  tagline: string;
  welcomeText: string;
  source: AiSource;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const TEMPLATES: DesignTemplate[] = ["signage", "executive", "carbon"];
const PACKAGES: PartnerPackage[] = ["basic", "professional", "enterprise"];
const KNOWN_FLAGS = Object.keys(FEATURE_LABELS) as FeatureFlag[];

const sourceOf = (v: unknown): AiSource => (v === "azure-openai" ? "azure-openai" : "mock");
const cleanHex = (v: unknown): string | null =>
  typeof v === "string" && HEX_RE.test(v.trim()) ? v.trim().toUpperCase() : null;

export async function aiBrandFromLogo(imageDataUrl: string): Promise<BrandSuggestion> {
  const raw = await api.post<Record<string, unknown>>("/api/ai/brand-from-logo", {
    imageBase64: imageDataUrl,
  });
  const palette = (Array.isArray(raw.palette) ? raw.palette : [])
    .map(cleanHex)
    .filter((c): c is string => c !== null)
    .slice(0, 5);
  const template = TEMPLATES.includes(raw.suggestedTemplate as DesignTemplate)
    ? (raw.suggestedTemplate as DesignTemplate)
    : null;
  return {
    palette,
    suggestedAccent: cleanHex(raw.suggestedAccent) ?? palette[0] ?? null,
    suggestedTemplate: template,
    rationale: typeof raw.rationale === "string" ? raw.rationale : "",
    source: sourceOf(raw.source),
  };
}

export async function aiRecommendSolution(description: string): Promise<SolutionSuggestion> {
  const raw = await api.post<Record<string, unknown>>("/api/ai/recommend-solution", {
    description,
  });
  const modules = (Array.isArray(raw.modules) ? raw.modules : []).filter(
    (m): m is FeatureFlag => KNOWN_FLAGS.includes(m as FeatureFlag)
  );
  return {
    package: PACKAGES.includes(raw.package as PartnerPackage)
      ? (raw.package as PartnerPackage)
      : "professional",
    modules,
    reasoning: (Array.isArray(raw.reasoning) ? raw.reasoning : [])
      .filter(
        (r): r is { module: string; why: string } =>
          !!r && typeof (r as { module?: unknown }).module === "string" &&
          typeof (r as { why?: unknown }).why === "string"
      )
      .slice(0, 14),
    source: sourceOf(raw.source),
  };
}

export async function aiPortalCopy(
  companyName: string,
  description?: string
): Promise<CopySuggestion> {
  const raw = await api.post<Record<string, unknown>>("/api/ai/portal-copy", {
    companyName,
    description,
  });
  const str = (v: unknown, max: number): string =>
    typeof v === "string" ? v.trim().slice(0, max) : "";
  return {
    portalName: str(raw.portalName, 40),
    tagline: str(raw.tagline, 80),
    welcomeText: str(raw.welcomeText, 140),
    source: sourceOf(raw.source),
  };
}
```

- [ ] **Step 2: Verify**

Run: `npm run build` → exits 0.

- [ ] **Step 3: Do NOT commit.**

---

### Task 8: Solution Builder scaffold — routes, wizard shell, list-page rewire

**Files:**
- Create: `src/features/partners/builder/useBuilderState.ts`
- Create: `src/features/partners/builder/SolutionBuilderPage.tsx`
- Create: `src/features/partners/builder/PreviewRail.tsx`
- Create: four placeholder step files (replaced in Tasks 9-11): `StepBrand.tsx`, `StepFeatures.tsx`, `StepDesign.tsx`, `StepReview.tsx`
- Modify: `src/app/router.tsx` (two routes)
- Modify: `src/features/partners/PartnersPage.tsx` (navigate instead of sheet; Template column)
- Delete: `src/features/partners/PartnerSheet.tsx`

**Interfaces:**
- Consumes: `usePartners`, `useCreatePartner`, `useUpdatePartner`, `useEntities` (existing hooks); `PACKAGE_FEATURES`, `slugify`, `templateOf`, `DESIGN_TEMPLATES`, `monogram`, `onAccentHex`, `portalNameOf` (brand.ts).
- Produces:
  - `interface BuilderState { name: string; slug: string; slugTouched: boolean; logoDataUrl?: string; accentColor: string; package: PartnerPackage; features: FeatureFlag[]; status: PartnerStatus; entityIds: string[]; designTemplate: DesignTemplate; portalName: string; tagline: string; welcomeText: string; }`
  - `useBuilderState(partner: Partner | null)` → `{ form: BuilderState; set: (patch: Partial<BuilderState>) => void }` (hydrates from `partner` once on mount / partner change)
  - `EMPTY_BUILDER: BuilderState`
  - Step components' shared prop type: `interface StepProps { form: BuilderState; set: (patch: Partial<BuilderState>) => void; partner: Partner | null; }` (exported from `useBuilderState.ts`)
  - `PreviewRail({ form }: { form: BuilderState })`

- [ ] **Step 1: Create `src/features/partners/builder/useBuilderState.ts`**

```ts
import * as React from "react";
import type {
  DesignTemplate,
  FeatureFlag,
  Partner,
  PartnerPackage,
  PartnerStatus,
} from "@/lib/types";
import { PACKAGE_FEATURES } from "@/lib/brand";

export interface BuilderState {
  name: string;
  slug: string;
  slugTouched: boolean;
  logoDataUrl?: string;
  accentColor: string;
  package: PartnerPackage;
  features: FeatureFlag[];
  status: PartnerStatus;
  entityIds: string[];
  designTemplate: DesignTemplate;
  portalName: string;
  tagline: string;
  welcomeText: string;
}

export interface StepProps {
  form: BuilderState;
  set: (patch: Partial<BuilderState>) => void;
  partner: Partner | null;
}

export const EMPTY_BUILDER: BuilderState = {
  name: "",
  slug: "",
  slugTouched: false,
  accentColor: "#1B5FAA",
  package: "basic",
  features: [...PACKAGE_FEATURES.basic],
  status: "active",
  entityIds: [],
  designTemplate: "signage",
  portalName: "",
  tagline: "",
  welcomeText: "",
};

function fromPartner(p: Partner): BuilderState {
  return {
    name: p.name,
    slug: p.slug,
    slugTouched: true,
    logoDataUrl: p.logoDataUrl,
    accentColor: p.accentColor,
    package: p.package,
    features: [...p.features],
    status: p.status,
    entityIds: [...p.entityIds],
    designTemplate: p.designTemplate,
    portalName: p.portalName ?? "",
    tagline: p.tagline ?? "",
    welcomeText: p.welcomeText ?? "",
  };
}

/** Single wizard form object; rehydrates when the edited partner changes. */
export function useBuilderState(partner: Partner | null) {
  const [form, setForm] = React.useState<BuilderState>(
    partner ? fromPartner(partner) : EMPTY_BUILDER
  );
  React.useEffect(() => {
    setForm(partner ? fromPartner(partner) : EMPTY_BUILDER);
  }, [partner]);
  const set = React.useCallback(
    (patch: Partial<BuilderState>) => setForm((f) => ({ ...f, ...patch })),
    []
  );
  return { form, set };
}
```

- [ ] **Step 2: Create `src/features/partners/builder/PreviewRail.tsx`**

A static mini-portal mock driven by the form (NOT the live app theme — the wizard runs under MSTS):

```tsx
import { monogram, onAccentHex, DESIGN_TEMPLATES } from "@/lib/brand";
import type { BuilderState } from "./useBuilderState";

/** Per-template preview surfaces (mirrors the CSS token blocks). */
const SURFACES: Record<
  BuilderState["designTemplate"],
  { page: string; sidebar: string; card: string; text: string; sidebarText: string; radius: number }
> = {
  signage: { page: "#FAF7F0", sidebar: "#161310", card: "#FDFCF9", text: "#1A1712", sidebarText: "#CFC9BE", radius: 10 },
  executive: { page: "#F5F6F8", sidebar: "#20293A", card: "#FFFFFF", text: "#161B26", sidebarText: "#C3CAD6", radius: 14 },
  carbon: { page: "#0E1113", sidebar: "#08090B", card: "#16191C", text: "#DFE3E6", sidebarText: "#AEB4B9", radius: 5 },
};

/** Live mini-portal rendered from the wizard state. */
export function PreviewRail({ form }: { form: BuilderState }) {
  const s = SURFACES[form.designTemplate];
  const on = onAccentHex(form.accentColor);
  const templateName =
    DESIGN_TEMPLATES.find((t) => t.id === form.designTemplate)?.name ?? "";
  const portalName = form.portalName.trim() || (form.name ? `${form.name} Tolls` : "Partner portal");

  return (
    <div className="sticky top-20 hidden w-72 shrink-0 xl:block">
      <p className="eyebrow mb-2">Live preview · {templateName}</p>
      <div
        className="overflow-hidden border shadow-card"
        style={{ background: s.page, borderRadius: s.radius + 4 }}
      >
        <div className="flex">
          {/* Sidebar */}
          <div className="w-24 shrink-0 space-y-2 p-2.5" style={{ background: s.sidebar }}>
            <div className="flex items-center gap-1.5">
              {form.logoDataUrl ? (
                <img src={form.logoDataUrl} alt="" className="h-4 max-w-16 object-contain" />
              ) : (
                <span
                  className="grid size-4 shrink-0 place-items-center rounded text-[7px] font-black"
                  style={{ background: form.accentColor, color: on }}
                >
                  {form.name ? monogram(form.name) : "?"}
                </span>
              )}
            </div>
            <p className="truncate text-[7px] font-bold uppercase tracking-wider" style={{ color: s.sidebarText }}>
              {portalName}
            </p>
            <div
              className="px-1.5 py-1 text-[8px] font-semibold text-white"
              style={{ background: `${form.accentColor}33`, borderRadius: s.radius / 2, boxShadow: `inset 0 0 0 1px ${form.accentColor}66` }}
            >
              Dashboard
            </div>
            {["Vehicles", "Reports", "Support"].map((m) => (
              <p key={m} className="px-1.5 text-[8px]" style={{ color: s.sidebarText }}>
                {m}
              </p>
            ))}
          </div>
          {/* Content */}
          <div className="flex-1 space-y-2 p-2.5">
            <p className="text-[9px] font-black" style={{ color: s.text }}>
              {form.tagline.trim() || "Fleet overview"}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {[0, 1].map((i) => (
                <div key={i} className="h-9 border p-1.5" style={{ background: s.card, borderRadius: s.radius / 2, borderColor: `${s.text}14` }}>
                  <div className="h-1.5 w-8 rounded-sm" style={{ background: form.accentColor }} />
                  <div className="mt-1 h-1 w-12 rounded-sm" style={{ background: `${s.text}22` }} />
                </div>
              ))}
            </div>
            <button
              className="w-full py-1 text-[8px] font-bold"
              style={{ background: form.accentColor, color: on, borderRadius: s.radius / 2 }}
            >
              Primary action
            </button>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Approximation — use “Preview portal” after saving for the real thing.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Create the four step placeholders** (each replaced wholesale later; they must compile now)

`StepBrand.tsx`, `StepFeatures.tsx`, `StepDesign.tsx`, `StepReview.tsx`, each:

```tsx
import type { StepProps } from "./useBuilderState";

export function StepBrand(_props: StepProps) {
  return <p className="text-sm text-muted-foreground">Step under construction.</p>;
}
```

(adjust the exported name per file: `StepFeatures`, `StepDesign`, `StepReview`).

- [ ] **Step 4: Create `src/features/partners/builder/SolutionBuilderPage.tsx`**

```tsx
import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/app/store";
import { useCreatePartner, usePartners, useUpdatePartner } from "@/hooks/api";
import { slugify } from "@/lib/brand";
import NotFoundPage from "@/features/misc/NotFoundPage";
import { useBuilderState } from "./useBuilderState";
import { PreviewRail } from "./PreviewRail";
import { StepBrand } from "./StepBrand";
import { StepFeatures } from "./StepFeatures";
import { StepDesign } from "./StepDesign";
import { StepReview } from "./StepReview";

const STEPS = [
  { id: "brand", label: "Company & Brand" },
  { id: "features", label: "Package & Features" },
  { id: "design", label: "Design" },
  { id: "review", label: "Review & Launch" },
] as const;

export default function SolutionBuilderPage() {
  const navigate = useNavigate();
  const { partnerId } = useParams();
  const { activeBrand } = useAppStore();
  const { data: partners } = usePartners();
  const create = useCreatePartner();
  const update = useUpdatePartner();
  const partner = React.useMemo(
    () => partners?.find((p) => p.id === partnerId) ?? null,
    [partners, partnerId]
  );
  const { form, set } = useBuilderState(partner);
  const [step, setStep] = React.useState(0);

  // The builder is MSTS-internal — partners never see it.
  if (activeBrand) return <NotFoundPage />;
  // Deep link to an unknown partner id (after partners loaded).
  if (partnerId && partners && !partner) return <NotFoundPage />;

  const busy = create.isPending || update.isPending;

  const stepValid =
    step !== 0 || (form.name.trim().length > 0 && form.slug.trim().length > 0);

  const save = async (thenPreview: boolean) => {
    const body = {
      name: form.name.trim(),
      slug: slugify(form.slug),
      logoDataUrl: form.logoDataUrl ?? "",
      accentColor: form.accentColor,
      designTemplate: form.designTemplate,
      portalName: form.portalName.trim(),
      tagline: form.tagline.trim(),
      welcomeText: form.welcomeText.trim(),
      package: form.package,
      features: form.features,
      status: form.status,
      entityIds: form.entityIds,
    };
    try {
      const saved = partner
        ? await update.mutateAsync({ id: partner.id, ...body })
        : await create.mutateAsync(body);
      toast.success(partner ? `${saved.name} updated` : `${saved.name} launched`);
      if (thenPreview) window.open(`/login?partner=${saved.slug}`, "_blank", "noopener");
      navigate("/partners");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the solution");
    }
  };

  const stepProps = { form, set, partner };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration · Whitelabel"
        title={partner ? `Edit solution — ${partner.name}` : "New partner solution"}
        description="Configure the brand, the feature set and the design template this partner's portal ships with."
        actions={
          <Button variant="outline" onClick={() => navigate("/partners")}>
            <ArrowLeft /> Back to partners
          </Button>
        }
      />

      {/* Stepper */}
      <ol className="flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className={
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors " +
                (i === step
                  ? "border-transparent bg-brand-accent text-brand-on-accent"
                  : i < step
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                    : "text-muted-foreground")
              }
            >
              <span className="grid size-5 place-items-center rounded-full border text-[11px] font-bold">
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              {s.label}
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-6 bg-border" />}
          </li>
        ))}
      </ol>

      <div className="flex items-start gap-8">
        <div className="min-w-0 flex-1 space-y-6">
          {step === 0 && <StepBrand {...stepProps} />}
          {step === 1 && <StepFeatures {...stepProps} />}
          {step === 2 && <StepDesign {...stepProps} />}
          {step === 3 && <StepReview {...stepProps} />}

          <div className="flex items-center justify-between border-t pt-4">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft /> Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button disabled={!stepValid} onClick={() => setStep((s) => s + 1)}>
                Next <ArrowRight />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" disabled={busy} onClick={() => save(false)}>
                  {busy ? <Loader2 className="animate-spin" /> : <Check />} Save
                </Button>
                <Button disabled={busy} onClick={() => save(true)}>
                  {busy ? <Loader2 className="animate-spin" /> : <Rocket />}
                  {partner ? "Save & preview" : "Create & preview portal"}
                  <ExternalLink className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <PreviewRail form={form} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Routes in `src/app/router.tsx`**

```tsx
import SolutionBuilderPage from "@/features/partners/builder/SolutionBuilderPage";
// …children, next to the partners route:
      { path: "partners/new", element: <SolutionBuilderPage /> },
      { path: "partners/:partnerId/edit", element: <SolutionBuilderPage /> },
```

- [ ] **Step 6: Rewire `src/features/partners/PartnersPage.tsx`**

- Remove the `PartnerSheet` import, the `sheetOpen`/`editing` state, and the `<PartnerSheet …/>` element.
- Add `import { useNavigate } from "react-router-dom";` and `const navigate = useNavigate();`.
- `openCreate` → `() => navigate("/partners/new")`; `openEdit` → `(p: Partner) => navigate(`/partners/${p.id}/edit`)`.
- Add a Template column after the Package column (import `DESIGN_TEMPLATES` from `@/lib/brand`):

```tsx
    {
      key: "designTemplate",
      header: "Template",
      cell: (p) => (
        <span className="text-sm text-muted-foreground">
          {DESIGN_TEMPLATES.find((t) => t.id === p.designTemplate)?.name ?? "Signage"}
        </span>
      ),
    },
```

- Update the PageHeader action label to `<Plus /> New solution`.

- [ ] **Step 7: Delete `src/features/partners/PartnerSheet.tsx`** (its logic moves into the steps in Tasks 9-11).

- [ ] **Step 8: Verify**

Run: `npm run build` → exits 0.
Browser (MSTS): Partners list shows the Template column (Executive/Carbon); "New solution" opens the wizard shell with stepper, placeholder step, preview rail reacting to nothing yet; Back to partners works; `/partners/bogus/edit` shows not-found; under a partner brand both routes are not-found.

- [ ] **Step 9: Do NOT commit.**

---

### Task 9: Step 1 — Company & Brand (with AI brand-from-logo)

**Files:**
- Replace: `src/features/partners/builder/StepBrand.tsx`

**Interfaces:**
- Consumes: `StepProps` (Task 8); `useEntities`, `usePartners` hooks; `slugify`, `monogram`, `onAccentHex` (brand.ts); `aiBrandFromLogo`, `BrandSuggestion` (Task 7); ui `Input`, `Checkbox`, `Select*`, `Button`, `Field`.
- Produces: `StepBrand(props: StepProps)` — writes `name/slug/slugTouched/logoDataUrl/accentColor/status/entityIds/designTemplate(accepting AI suggestion)` into the form.

- [ ] **Step 1: Replace the placeholder with the full step**

```tsx
import * as React from "react";
import { Sparkles, Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/common/Field";
import { useEntities, usePartners } from "@/hooks/api";
import { slugify, monogram, onAccentHex } from "@/lib/brand";
import type { Partner, PartnerStatus } from "@/lib/types";
import { aiBrandFromLogo, type BrandSuggestion } from "./ai";
import type { StepProps } from "./useBuilderState";

const SWATCHES = ["#2F7D4F", "#1B5FAA", "#7C3AED", "#C2410C", "#0F766E", "#BE185D", "#B45309", "#334155"];
const MAX_LOGO_BYTES = 200 * 1024;

export function StepBrand({ form, set, partner }: StepProps) {
  const { data: entities } = useEntities();
  const { data: partners } = usePartners();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [aiBusy, setAiBusy] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState<BrandSuggestion | null>(null);

  const onName = (name: string) =>
    set({ name, ...(form.slugTouched ? {} : { slug: slugify(name) }) });

  const onLogoFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > MAX_LOGO_BYTES) return toast.error("Logo must be 200 KB or smaller");
    const reader = new FileReader();
    reader.onload = () => set({ logoDataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  const analyseLogo = async () => {
    if (!form.logoDataUrl) return toast.error("Upload a logo first");
    setAiBusy(true);
    setSuggestion(null);
    try {
      setSuggestion(await aiBrandFromLogo(form.logoDataUrl));
    } catch {
      toast.error("Brand analysis failed — pick the accent manually");
    } finally {
      setAiBusy(false);
    }
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    set({
      ...(suggestion.suggestedAccent ? { accentColor: suggestion.suggestedAccent } : {}),
      ...(suggestion.suggestedTemplate ? { designTemplate: suggestion.suggestedTemplate } : {}),
    });
    toast.success("Brand suggestion applied");
  };

  const ownerOf = (entityId: string): Partner | undefined =>
    partners?.find((p) => p.id !== partner?.id && p.entityIds.includes(entityId));

  const toggleEntity = (id: string) =>
    set({
      entityIds: form.entityIds.includes(id)
        ? form.entityIds.filter((e) => e !== id)
        : [...form.entityIds, id],
    });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Field label="Partner name" required>
          <Input value={form.name} onChange={(e) => onName(e.target.value)} placeholder="Alpine Fleet Services" />
        </Field>
        <Field label="Simulated domain" required>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">tolls.</span>
            <Input
              value={form.slug}
              onChange={(e) => set({ slug: slugify(e.target.value), slugTouched: true })}
              placeholder="alpine"
              className="font-mono"
            />
            <span className="font-mono text-sm text-muted-foreground">.com</span>
          </div>
        </Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set({ status: v as PartnerStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active — portal reachable</SelectItem>
              <SelectItem value="draft">Draft — hidden from login</SelectItem>
              <SelectItem value="suspended">Suspended — portal blocked</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Customer entities (tenant isolation)">
          <div className="space-y-2">
            {(entities ?? []).map((e) => {
              const owner = ownerOf(e.id);
              return (
                <label key={e.id} className="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm hover:bg-secondary">
                  <Checkbox
                    checked={form.entityIds.includes(e.id)}
                    onCheckedChange={() => toggleEntity(e.id)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{e.displayId}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {e.name}
                      {owner && <span className="text-warning"> · currently with {owner.name}</span>}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </Field>
      </div>

      <div className="space-y-4">
        <Field label="Logo (optional, ≤ 200 KB)">
          <div className="flex items-center gap-3">
            {form.logoDataUrl ? (
              <img src={form.logoDataUrl} alt="logo" className="h-10 max-w-32 rounded-md border object-contain p-1" />
            ) : (
              <span
                className="grid size-10 place-items-center rounded-md font-display text-sm font-black"
                style={{ background: form.accentColor, color: onAccentHex(form.accentColor) }}
              >
                {form.name ? monogram(form.name) : "?"}
              </span>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onLogoFile(e.target.files?.[0])} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload /> Upload
            </Button>
            {form.logoDataUrl && (
              <Button variant="ghost" size="sm" onClick={() => { set({ logoDataUrl: undefined }); setSuggestion(null); }}>
                <X /> Remove
              </Button>
            )}
          </div>
        </Field>

        {/* AI brand analysis */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">AI brand analysis</p>
            <Button size="sm" variant="outline" disabled={aiBusy || !form.logoDataUrl} onClick={analyseLogo}>
              {aiBusy ? <Loader2 className="animate-spin" /> : <Sparkles />} Extract brand from logo
            </Button>
          </div>
          {suggestion && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-1.5">
                {suggestion.palette.map((c) => (
                  <button
                    key={c}
                    type="button"
                    title={c}
                    onClick={() => set({ accentColor: c })}
                    className="size-7 rounded-md ring-offset-1 transition-transform hover:scale-110"
                    style={{ background: c }}
                    aria-label={`Use ${c} as accent`}
                  />
                ))}
                <Badge className="ml-2">{suggestion.source === "azure-openai" ? "GPT-4o" : "Mock"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{suggestion.rationale}</p>
              <Button size="sm" onClick={applySuggestion}>
                Apply accent{suggestion.suggestedTemplate ? " + template" : ""}
              </Button>
            </div>
          )}
        </div>

        <Field label="Accent color">
          <div className="flex flex-wrap items-center gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set({ accentColor: c })}
                className={
                  "size-8 rounded-md ring-offset-2 transition-transform hover:scale-110" +
                  (form.accentColor === c ? " ring-2 ring-foreground" : "")
                }
                style={{ background: c }}
                aria-label={c}
              />
            ))}
            <input
              type="color"
              value={form.accentColor}
              onChange={(e) => set({ accentColor: e.target.value })}
              className="size-8 cursor-pointer rounded-md border bg-transparent p-0.5"
              aria-label="Custom accent color"
            />
          </div>
        </Field>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run build` → exits 0.
Browser: wizard step 1 — name auto-derives slug; logo upload + "Extract brand from logo" returns a palette with the Mock/GPT-4o badge; applying sets accent (+ template, visible later); entity assignment shows ownership warnings; Next disabled until name+slug present.

- [ ] **Step 3: Do NOT commit.**

---

### Task 10: Step 2 — Package & Features (with AI recommendation)

**Files:**
- Replace: `src/features/partners/builder/StepFeatures.tsx`

**Interfaces:**
- Consumes: `StepProps`; `PACKAGE_FEATURES`, `FEATURE_LABELS` (brand.ts); `brandModuleLabel` (nav.ts, for display consistency); `aiRecommendSolution` (Task 7); ui `Checkbox`, `Textarea`, `Button`, `Badge`.
- Produces: `StepFeatures(props: StepProps)` — writes `package` + `features`.

- [ ] **Step 1: Replace the placeholder**

```tsx
import * as React from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { PACKAGE_FEATURES, FEATURE_LABELS } from "@/lib/brand";
import type { FeatureFlag, PartnerPackage } from "@/lib/types";
import { aiRecommendSolution, type SolutionSuggestion } from "./ai";
import type { StepProps } from "./useBuilderState";

const PACKAGES: { id: PartnerPackage; name: string; blurb: string; bullets: string[] }[] = [
  {
    id: "basic",
    name: "Basic",
    blurb: "Cost-effective entry point for small resellers",
    bullets: ["Core fleet & tolling modules", "Standard communication templates", "Support via ticketing"],
  },
  {
    id: "professional",
    name: "Professional",
    blurb: "Balanced feature set for mid-sized resellers",
    bullets: ["Everything in Basic", "Transactions, reports & exports", "Branded invoicing & scheduled reports"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    blurb: "Full customization for large reseller networks",
    bullets: ["Everything in Professional", "Finance, users & onboarding", "Whitelabeled API-first access"],
  },
];

export function StepFeatures({ form, set }: StepProps) {
  const [description, setDescription] = React.useState("");
  const [aiBusy, setAiBusy] = React.useState(false);
  const [suggestion, setSuggestion] = React.useState<SolutionSuggestion | null>(null);

  const pickPackage = (pkg: PartnerPackage) =>
    // A tier is a starting point: it resets the checklist, which stays
    // freely editable afterwards.
    set({ package: pkg, features: [...PACKAGE_FEATURES[pkg]] });

  const toggleFeature = (flag: FeatureFlag) =>
    set({
      features: form.features.includes(flag)
        ? form.features.filter((f) => f !== flag)
        : [...form.features, flag],
    });

  const recommend = async () => {
    if (description.trim().length < 12) {
      return toast.error("Describe the partner's business in a sentence or two first");
    }
    setAiBusy(true);
    setSuggestion(null);
    try {
      setSuggestion(await aiRecommendSolution(description.trim()));
    } catch {
      toast.error("Recommendation failed — pick modules manually");
    } finally {
      setAiBusy(false);
    }
  };

  const applySuggestion = () => {
    if (!suggestion) return;
    set({ package: suggestion.package, features: [...suggestion.modules] });
    toast.success("Recommended solution applied — adjust freely below");
  };

  return (
    <div className="space-y-6">
      {/* AI recommendation */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold">Describe the partner's business — AI proposes the solution</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Norwegian freight forwarder, 400 trucks across Scandinavia and Germany, has its own CRM, needs consolidated invoicing…"
            className="min-h-16 flex-1"
          />
          <Button variant="outline" disabled={aiBusy} onClick={recommend} className="sm:self-end">
            {aiBusy ? <Loader2 className="animate-spin" /> : <Sparkles />} Recommend
          </Button>
        </div>
        {suggestion && (
          <div className="mt-3 space-y-2 border-t pt-3">
            <div className="flex items-center gap-2">
              <Badge>{suggestion.package.charAt(0).toUpperCase() + suggestion.package.slice(1)}</Badge>
              <span className="text-xs text-muted-foreground">{suggestion.modules.length} modules</span>
              <Badge variant="outline">{suggestion.source === "azure-openai" ? "GPT-4o" : "Mock"}</Badge>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {suggestion.reasoning.slice(0, 6).map((r) => (
                <li key={r.module}>
                  <span className="font-semibold text-foreground">{FEATURE_LABELS[r.module as FeatureFlag] ?? r.module}:</span>{" "}
                  {r.why}
                </li>
              ))}
            </ul>
            <Button size="sm" onClick={applySuggestion}>Apply recommendation</Button>
          </div>
        )}
      </div>

      {/* Package cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {PACKAGES.map((pkg) => (
          <button
            key={pkg.id}
            type="button"
            onClick={() => pickPackage(pkg.id)}
            className={
              "rounded-xl border p-4 text-left transition-colors hover:bg-secondary" +
              (form.package === pkg.id ? " border-transparent bg-brand-accent/10 ring-2 ring-brand-accent" : "")
            }
          >
            <p className="font-display font-black">{pkg.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{pkg.blurb}</p>
            <ul className="mt-2 space-y-1 text-xs">
              {pkg.bullets.map((b) => (
                <li key={b} className="flex gap-1.5">
                  <span className="text-brand-accent-deep">•</span> {b}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {/* Feature checklist */}
      <div>
        <p className="mb-2 text-sm font-semibold">
          Modules in this solution
          <span className="ml-2 font-normal text-muted-foreground">
            ({form.features.length}/{Object.keys(FEATURE_LABELS).length} — package is a starting point, edit freely)
          </span>
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(FEATURE_LABELS) as FeatureFlag[]).map((flag) => (
            <label key={flag} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-secondary">
              <Checkbox checked={form.features.includes(flag)} onCheckedChange={() => toggleFeature(flag)} />
              {FEATURE_LABELS[flag]}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run build` → exits 0.
Browser: package card pre-selects its set; checklist freely editable; a description + Recommend returns a proposal with per-module reasoning and Mock/GPT-4o badge; Apply sets package + checklist.

- [ ] **Step 3: Do NOT commit.**

---

### Task 11: Step 3 — Design (+ AI copy) and Step 4 — Review

**Files:**
- Replace: `src/features/partners/builder/StepDesign.tsx`
- Replace: `src/features/partners/builder/StepReview.tsx`

**Interfaces:**
- Consumes: `StepProps`; `DESIGN_TEMPLATES`, `FEATURE_LABELS`, `portalNameOf` semantics (fallback `${name} Tolls`); `brandModuleLabel` (nav.ts); `aiPortalCopy` (Task 7); ui `Input`, `Button`, `Badge`, `Field`.
- Produces: `StepDesign(props: StepProps)` — writes `designTemplate/portalName/tagline/welcomeText`; `StepReview(props: StepProps)` — read-only summary.

- [ ] **Step 1: Replace `StepDesign.tsx`**

```tsx
import * as React from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/common/Field";
import { DESIGN_TEMPLATES } from "@/lib/brand";
import { aiPortalCopy } from "./ai";
import type { StepProps } from "./useBuilderState";

export function StepDesign({ form, set }: StepProps) {
  const [aiBusy, setAiBusy] = React.useState(false);
  const [copySource, setCopySource] = React.useState<string | null>(null);

  const generateCopy = async () => {
    if (!form.name.trim()) return toast.error("Set the partner name first (step 1)");
    setAiBusy(true);
    try {
      const copy = await aiPortalCopy(form.name.trim());
      set({
        portalName: copy.portalName || form.portalName,
        tagline: copy.tagline || form.tagline,
        welcomeText: copy.welcomeText || form.welcomeText,
      });
      setCopySource(copy.source);
      toast.success("Portal copy generated — edit freely");
    } catch {
      toast.error("Copy generation failed — write it manually");
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Template picker */}
      <div className="grid gap-3 sm:grid-cols-3">
        {DESIGN_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => set({ designTemplate: t.id })}
            className={
              "rounded-xl border p-4 text-left transition-colors hover:bg-secondary" +
              (form.designTemplate === t.id ? " border-transparent bg-brand-accent/10 ring-2 ring-brand-accent" : "")
            }
          >
            <div className="flex items-center justify-between">
              <p className="font-display font-black">{t.name}</p>
              {form.designTemplate === t.id && <Check className="size-4 text-brand-accent-deep" />}
            </div>
            {/* Swatch strip: page / sidebar / card */}
            <div className="mt-2 flex h-10 overflow-hidden rounded-lg border">
              {t.swatches.map((c, i) => (
                <span key={i} className="flex-1" style={{ background: c }} />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t.description}</p>
            {t.defaultDark && <Badge variant="outline" className="mt-2">Dark-first</Badge>}
          </button>
        ))}
      </div>

      {/* Portal copy */}
      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Portal copy</p>
          <div className="flex items-center gap-2">
            {copySource && (
              <Badge variant="outline">{copySource === "azure-openai" ? "GPT-4o" : "Mock"}</Badge>
            )}
            <Button size="sm" variant="outline" disabled={aiBusy} onClick={generateCopy}>
              {aiBusy ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate with AI
            </Button>
          </div>
        </div>
        <div className="mt-3 space-y-3">
          <Field label="Portal name (sidebar chip)">
            <Input
              value={form.portalName}
              onChange={(e) => set({ portalName: e.target.value })}
              placeholder={form.name ? `${form.name} Tolls` : "Partner Tolls"}
            />
          </Field>
          <Field label="Tagline (sidebar identity bar)">
            <Input
              value={form.tagline}
              onChange={(e) => set({ tagline: e.target.value })}
              placeholder="Every toll, one place."
            />
          </Field>
          <Field label="Welcome text (login & dashboard greeting)">
            <Input
              value={form.welcomeText}
              onChange={(e) => set({ welcomeText: e.target.value })}
              placeholder="Welcome to your tolling cockpit."
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Replace `StepReview.tsx`**

```tsx
import { Badge } from "@/components/ui/badge";
import { DESIGN_TEMPLATES, FEATURE_LABELS, monogram, onAccentHex } from "@/lib/brand";
import { brandModuleLabel } from "@/app/nav";
import { useEntities } from "@/hooks/api";
import type { FeatureFlag } from "@/lib/types";
import type { StepProps } from "./useBuilderState";

const MODULE_FLAGS: FeatureFlag[] = [
  "dashboard", "vehicles", "obu", "hauliers", "products", "domains",
  "transactions", "reports", "finance", "users", "onboarding",
];

export function StepReview({ form }: StepProps) {
  const { data: entities } = useEntities();
  const template = DESIGN_TEMPLATES.find((t) => t.id === form.designTemplate);
  const modules = form.features.filter((f): f is FeatureFlag => MODULE_FLAGS.includes(f));
  const capabilities = form.features.filter((f) => !MODULE_FLAGS.includes(f as FeatureFlag));
  const assigned = (entities ?? []).filter((e) => form.entityIds.includes(e.id));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border bg-card p-4">
        <p className="eyebrow">Brand</p>
        <div className="mt-2 flex items-center gap-3">
          {form.logoDataUrl ? (
            <img src={form.logoDataUrl} alt="" className="h-9 max-w-28 object-contain" />
          ) : (
            <span
              className="grid size-9 place-items-center rounded-md font-display text-sm font-black"
              style={{ background: form.accentColor, color: onAccentHex(form.accentColor) }}
            >
              {form.name ? monogram(form.name) : "?"}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{form.name || "—"}</p>
            <p className="font-mono text-xs text-muted-foreground">tolls.{form.slug || "—"}.com</p>
          </div>
          <span className="ml-auto size-6 rounded-md border" style={{ background: form.accentColor }} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {form.portalName.trim() || `${form.name || "Partner"} Tolls`}
          {form.tagline.trim() ? ` · ${form.tagline.trim()}` : ""}
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="eyebrow">Design & package</p>
        <div className="mt-2 flex items-center gap-2">
          <Badge>{template?.name ?? "Signage"}</Badge>
          <Badge variant="outline">
            {form.package.charAt(0).toUpperCase() + form.package.slice(1)} package
          </Badge>
          <Badge variant="outline">{form.status}</Badge>
        </div>
        {template && (
          <div className="mt-3 flex h-8 overflow-hidden rounded-lg border">
            {template.swatches.map((c, i) => (
              <span key={i} className="flex-1" style={{ background: c }} />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="eyebrow">Modules ({modules.length})</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {modules.map((m) => (
            <Badge key={m} variant="outline">{brandModuleLabel(m)}</Badge>
          ))}
        </div>
        {capabilities.length > 0 && (
          <>
            <p className="eyebrow mt-3">Capabilities</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {capabilities.map((c) => (
                <Badge key={c} variant="outline">{FEATURE_LABELS[c as FeatureFlag] ?? c}</Badge>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="eyebrow">Customers ({assigned.length})</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {assigned.length ? (
            assigned.map((e) => (
              <li key={e.id} className="truncate">
                <span className="font-medium">{e.displayId}</span>
                <span className="text-muted-foreground"> · {e.name}</span>
              </li>
            ))
          ) : (
            <li className="text-warning">
              No customers assigned — the portal will show no tenant data until
              entities are assigned.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run build` → exits 0.
Browser end-to-end: create "Borealis Cargo" — step 1 (brand + AI logo analysis), step 2 (recommend + adjust), step 3 (pick Carbon, generate copy), step 4 review shows everything incl. zero-customer warning if none assigned; "Create & preview portal" saves and opens the branded login; the new partner appears in the list with its Template; editing rehydrates the wizard; template/copy changes persist after reload.

- [ ] **Step 4: Do NOT commit.**

---

### Task 12: Docs + full regression

**Files:**
- Modify: `docs/test-plan.md` (append §23)
- Modify: `docs/PROJECT-CONTEXT.md` (§6 row already exists — update the whitelabel bullets in §7 and the caveats)

**Interfaces:** none — docs + the final gate.

- [ ] **Step 1: `docs/test-plan.md` — append a "§23 Generic Solution Builder" section** in the document's existing table format, covering with concrete steps + expected results: wizard create/edit end-to-end (incl. per-step validation and back-navigation state retention); AI assists in mock mode (badge says Mock) and, when Azure keys are set, real mode; template switching (each of the three renders with correct `data-theme`, radius, fonts; carbon logs in dark); generic portal checks (no MyTolls/MyMST/Toll2.0/SourceTag strings under a brand; generic labels Devices/Carriers/Toll Coverage; no portal switcher; empty groups hidden; partner without dashboard lands on first module); portal copy surfaces (sidebar chip, tagline bar, login subtitle, dashboard greeting); partner accent drives primary buttons; MSTS default unchanged (Signage, red primary, SourceTags, both portals). Mark rows not browser-verified during implementation with the existing ◈ convention.

- [ ] **Step 2: `docs/PROJECT-CONTEXT.md`** — update the §7 whitelabeling bullet: generic partner portal (`navForBrand`, generic module names, SourceTags hidden), 3 design templates via `data-theme` token blocks, partner accent drives `--primary`, Solution Builder wizard at `/partners/new`, three `/api/ai/*` assists (mock fallback), DB schema v6, seeds Alpine=Executive / Nordkap=Carbon.

- [ ] **Step 3: Full regression gate**

Run: `npm run build` → exit 0.
Browser smoke (fresh `msts-db` — clear localStorage): MSTS login → identical to before (Signage, red buttons, SourceTags, portal switcher) → Partners list (Template column) → wizard create with all three AI assists (mock badges) → preview the new partner (its template + accent + copy applied; generic nav; isolation) → `tolls.alpine.com` (Executive, green primary buttons, Alpine copy) → `tolls.nordkap.com` (Carbon, arrives dark, blue accents, Basic gating) → exports still branded per the v1 rules. Use playwright-core (`channel: "msedge"` or `"chrome"`) for the assertions where possible; document anything not verifiable as ◈ rows.

- [ ] **Step 4: Do NOT commit** — report the full list of changed files instead, so the user can review and commit.
