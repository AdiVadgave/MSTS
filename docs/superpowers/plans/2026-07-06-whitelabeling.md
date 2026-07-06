# Whitelabeling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Business partners run the MSTS One portal under their own brand — an MSTS-side Partner Branding admin console plus a partner-branded portal experience (logo, accent color, package-gated modules, tenant-isolated data, branded exports), entered via a simulated partner domain on the login page.

**Architecture:** A CSS-variable brand layer (`--brand-accent` & friends, defaulting to Shell yellow) exposed through Tailwind as `brand-accent` classes; partners are first-class records in the MSW mock DB (localStorage-persisted); the app store holds `activeBrand` and applies the CSS vars. Spec: `docs/superpowers/specs/2026-07-06-whitelabeling-design.md`.

**Tech Stack:** React 18 + Vite + TypeScript, Tailwind, MSW mock backend, TanStack Query, jsPDF. Path alias `@/` → `src/`.

## Global Constraints

- **No unit-test framework exists in this repo.** The verification gate for every task is `npm run build` (runs `tsc --noEmit && vite build`) plus the browser checks described in the task. Do not add a test framework.
- **MSTS default must render pixel-identical to today.** With no partner active, every screen keeps its current Shell look. All brand CSS vars default to the current Shell values.
- Brand tokens replace `shell-yellow` **only on identity surfaces**. Never touch: `Plate.tsx`, plate-style chips (`bg-shell-ink … text-shell-yellow`), semantic warning icons, or any `shell-red` usage.
- CSS brand vars hold **space-separated RGB channels** (e.g. `251 206 7`), so Tailwind opacity modifiers (`bg-brand-accent/15`) keep working.
- Feature flags (exact strings): `dashboard`, `vehicles`, `obu`, `hauliers`, `products`, `domains`, `transactions`, `reports`, `finance`, `users`, `onboarding`, `api-access`, `branded-invoicing`, `scheduled-reports`.
- Packages: **basic** = dashboard, vehicles, obu, hauliers, products, domains · **professional** = basic + transactions, reports, branded-invoicing, scheduled-reports · **enterprise** = professional + finance, users, onboarding, api-access. Support/Account are always available (not flagged).
- Seed partners: **Alpine Fleet Services** (`alpine`, `#2F7D4F`, enterprise, entities e1+e2) and **Nordkap Logistik** (`nordkap`, `#1B5FAA`, basic, entity e3).
- Logo uploads: image mime types only, ≤ 200 KB, stored as data URL.
- `activeBrand` is **not** persisted across reloads (consistent with auth always starting at `/login`).
- Commit after every task with the message given in its final step.
- Windows PowerShell 5.1 shell: chain commands with `;`, not `&&`.

---

### Task 1: Brand domain foundation (`types.ts` + `lib/brand.ts`)

**Files:**
- Modify: `src/lib/types.ts` (append at end)
- Create: `src/lib/brand.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces (later tasks import these — exact names):
  - types: `Partner`, `PartnerPackage`, `PartnerStatus`, `FeatureFlag`
  - brand.ts: `PACKAGE_FEATURES: Record<PartnerPackage, FeatureFlag[]>`, `FEATURE_LABELS: Record<FeatureFlag, string>`, `featureEnabled(brand: Partner | null, flag: FeatureFlag): boolean`, `applyBrandVars(brand: Partner | null): void`, `hexToChannels(hex: string): string`, `darkenHex(hex: string, amount?: number): string`, `onAccentHex(accent: string): string`, `monogram(name: string): string`, `slugify(name: string): string`, `exportBrandOf(brand: Partner | null): ExportBrand | undefined`, `interface ExportBrand { name: string; accentColor: string }`

- [ ] **Step 1: Append partner types to `src/lib/types.ts`**

```ts
// ── Whitelabel partners ─────────────────────────────────────────
export type PartnerPackage = "basic" | "professional" | "enterprise";

export type PartnerStatus = "active" | "draft" | "suspended";

export type FeatureFlag =
  | "dashboard"
  | "vehicles"
  | "obu"
  | "hauliers"
  | "products"
  | "domains"
  | "transactions"
  | "reports"
  | "finance"
  | "users"
  | "onboarding"
  | "api-access"
  | "branded-invoicing"
  | "scheduled-reports";

/** A whitelabel business partner (reseller) running the portal under
 *  their own brand. MSTS itself is represented by `null`, not a record. */
export interface Partner {
  id: string;
  name: string;
  /** URL-safe id; simulated domain is tolls.<slug>.com */
  slug: string;
  /** Uploaded logo (data URL). Monogram fallback when absent. */
  logoDataUrl?: string;
  /** Hex accent, e.g. "#2F7D4F" — drives --brand-accent. */
  accentColor: string;
  package: PartnerPackage;
  /** Derived from package on selection, individually overridable. */
  features: FeatureFlag[];
  status: PartnerStatus;
  /** Tenant isolation: customer entities this partner owns. */
  entityIds: string[];
  createdAt: string;
}
```

- [ ] **Step 2: Create `src/lib/brand.ts`**

```ts
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
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: exits 0.

- [ ] **Step 4: Commit**

```powershell
git add src/lib/types.ts src/lib/brand.ts; git commit -m "feat: partner types and brand helper layer"
```

---

### Task 2: Partners in the mock backend (seed, persistence, handlers, hooks)

**Files:**
- Modify: `src/mocks/db.ts`
- Modify: `src/mocks/persistence.ts:7-9`
- Modify: `src/mocks/handlers.ts` (imports + new block before the `system/reset` handler)
- Modify: `src/hooks/api.ts` (imports + new section)

**Interfaces:**
- Consumes: `Partner`, `PartnerPackage` from `@/lib/types`; `PACKAGE_FEATURES` from `@/lib/brand`.
- Produces: REST `GET/POST /api/partners`, `PATCH/DELETE /api/partners/:id`; hooks `usePartners()`, `useCreatePartner()`, `useUpdatePartner()` (arg `{ id: string } & Partial<Partner>`), `useDeletePartner()` (arg `string`).

- [ ] **Step 1: Add the collection to `src/mocks/db.ts`**

Add `Partner` to the type import from `@/lib/types`, and add this import:

```ts
import { PACKAGE_FEATURES } from "@/lib/brand";
```

Add `partners: Partner[];` to `DBShape` (after `scheduledReports`). Inside `seedData()`, after the `scheduledReports` block, add:

```ts
  const partners: Partner[] = [
    {
      id: "ptr_alpine",
      name: "Alpine Fleet Services",
      slug: "alpine",
      accentColor: "#2F7D4F",
      package: "enterprise",
      features: PACKAGE_FEATURES.enterprise,
      status: "active",
      entityIds: ["e1", "e2"],
      createdAt: iso(faker.date.past({ years: 1 })),
    },
    {
      id: "ptr_nordkap",
      name: "Nordkap Logistik",
      slug: "nordkap",
      accentColor: "#1B5FAA",
      package: "basic",
      features: PACKAGE_FEATURES.basic,
      status: "active",
      entityIds: ["e3"],
      createdAt: iso(faker.date.past({ years: 1 })),
    },
  ];
```

Add `partners,` to the returned object (after `scheduledReports,`).

- [ ] **Step 2: Bump the persistence schema version in `src/mocks/persistence.ts`**

```ts
// v3: every record carries an `entityId` for customer scoping.
// v4: added the scheduledReports collection.
// v5: added the whitelabel partners collection.
const VERSION = 5;
```

- [ ] **Step 3: Add CRUD handlers to `src/mocks/handlers.ts`**

Add `Partner` and `PartnerPackage` to the type import from `@/lib/types`, and add:

```ts
import { PACKAGE_FEATURES } from "@/lib/brand";
```

Insert this block **before** the `// ── System: reset demo data` section:

```ts
  // ── Whitelabel partners ──────────────────────────────────────
  http.get("/api/partners", async () => {
    await latency();
    return HttpResponse.json(db.partners);
  }),
  http.post("/api/partners", async ({ request }) => {
    await latency();
    const body = (await request.json()) as Partial<Partner>;
    const name = body.name?.trim();
    const slug = body.slug?.trim();
    if (!name || !slug) {
      return HttpResponse.json({ error: "Name and slug are required" }, { status: 422 });
    }
    if (db.partners.some((p) => p.slug === slug)) {
      return HttpResponse.json({ error: "Slug is already in use" }, { status: 422 });
    }
    const pkg = (body.package ?? "basic") as PartnerPackage;
    const partner: Partner = {
      id: rid("ptr"),
      name,
      slug,
      logoDataUrl: body.logoDataUrl,
      accentColor: body.accentColor ?? "#1B5FAA",
      package: pkg,
      features: body.features ?? PACKAGE_FEATURES[pkg],
      status: body.status ?? "active",
      entityIds: body.entityIds ?? [],
      createdAt: now(),
    };
    claimEntities(partner.id, partner.entityIds);
    db.partners.unshift(partner);
    persist();
    return HttpResponse.json(partner, { status: 201 });
  }),
  http.patch("/api/partners/:id", async ({ params, request }) => {
    await latency();
    const p = db.partners.find((x) => x.id === params.id);
    if (!p) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as Partial<Partner>;
    if (body.slug && body.slug !== p.slug && db.partners.some((x) => x.slug === body.slug)) {
      return HttpResponse.json({ error: "Slug is already in use" }, { status: 422 });
    }
    if (body.name !== undefined) p.name = body.name;
    if (body.slug !== undefined) p.slug = body.slug;
    if (body.logoDataUrl !== undefined) p.logoDataUrl = body.logoDataUrl || undefined;
    if (body.accentColor !== undefined) p.accentColor = body.accentColor;
    if (body.package !== undefined) p.package = body.package;
    if (body.features !== undefined) p.features = body.features;
    if (body.status !== undefined) p.status = body.status;
    if (body.entityIds !== undefined) {
      p.entityIds = body.entityIds;
      claimEntities(p.id, p.entityIds);
    }
    persist();
    return HttpResponse.json(p);
  }),
  http.delete("/api/partners/:id", async ({ params }) => {
    await latency();
    const idx = db.partners.findIndex((x) => x.id === params.id);
    // Ownership lives only on the record, so removal releases its
    // entities back to MSTS implicitly.
    if (idx >= 0) db.partners.splice(idx, 1);
    persist();
    return HttpResponse.json({ ok: true });
  }),
```

Add this helper next to `scopeByEntity` near the top of the file:

```ts
/** An entity belongs to at most one partner: taking entities for
 *  `partnerId` removes them from every other partner. */
function claimEntities(partnerId: string, entityIds: string[]): void {
  db.partners.forEach((p) => {
    if (p.id !== partnerId) {
      p.entityIds = p.entityIds.filter((id) => !entityIds.includes(id));
    }
  });
}
```

- [ ] **Step 4: Add query hooks to `src/hooks/api.ts`**

Add `Partner` to the type import from `@/lib/types`. Add this section before the final export (e.g. after the scheduled-reports hooks):

```ts
// ── Whitelabel partners ────────────────────────────────────────
export const usePartners = () =>
  useQuery({ queryKey: ["partners"], queryFn: () => api.get<Partner[]>("/api/partners") });

export const useCreatePartner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Partner>) => api.post<Partner>("/api/partners", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partners"] }),
  });
};

export const useUpdatePartner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<Partner>) =>
      api.patch<Partner>(`/api/partners/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partners"] }),
  });
};

export const useDeletePartner = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/partners/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partners"] }),
  });
};
```

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: exits 0.
Browser check (dev server): DevTools → `fetch("/api/partners").then(r=>r.json()).then(console.log)` returns the two seeded partners (localStorage `msts-db` reseeded to v5 automatically).

- [ ] **Step 6: Commit**

```powershell
git add src/mocks/db.ts src/mocks/persistence.ts src/mocks/handlers.ts src/hooks/api.ts; git commit -m "feat: whitelabel partners collection with CRUD and seed"
```

---

### Task 3: Brand CSS variables, Tailwind colors, and `activeBrand` in the store

**Files:**
- Modify: `src/styles/globals.css:6` (inside `:root`)
- Modify: `tailwind.config.js` (colors + `signage-dash`)
- Modify: `src/app/store.tsx`

**Interfaces:**
- Consumes: `applyBrandVars`, `Partner` from Task 1.
- Produces: Tailwind classes `brand-accent`, `brand-accent-deep`, `brand-on-accent` (with opacity-modifier support); store fields `activeBrand: Partner | null`, `setActiveBrand(b: Partner | null): void`.

- [ ] **Step 1: Add brand vars to `src/styles/globals.css`**

Inside `:root` (after the `--sidebar-*` block, before the closing brace). RGB channels; values are today's Shell yellow / yellow-deep / ink. `.dark` needs no copy — runtime overrides land on `<html>` via inline style and apply to both themes:

```css
    /* Whitelabel brand layer — RGB channels so Tailwind opacity
       modifiers work. Defaults = Shell yellow identity. Overridden
       at runtime per partner (see lib/brand.ts applyBrandVars). */
    --brand-accent: 251 206 7;
    --brand-accent-deep: 240 184 0;
    --brand-on-accent: 26 23 18;
```

- [ ] **Step 2: Expose in `tailwind.config.js`**

Add to `theme.extend.colors` (next to the `shell` block):

```js
        brand: {
          accent: "rgb(var(--brand-accent) / <alpha-value>)",
          "accent-deep": "rgb(var(--brand-accent-deep) / <alpha-value>)",
          "on-accent": "rgb(var(--brand-on-accent) / <alpha-value>)",
        },
```

And make the dashed motif brand-aware — replace the `signage-dash` value:

```js
        "signage-dash":
          "repeating-linear-gradient(90deg,rgb(var(--brand-accent)) 0 44px,transparent 44px 84px)",
```

- [ ] **Step 3: Add `activeBrand` to `src/app/store.tsx`**

Imports:

```ts
import type { Entity, Partner } from "@/lib/types";
import { applyBrandVars } from "@/lib/brand";
```

Add to the `AppState` interface (after `theme`/`toggleTheme`):

```ts
  /** Active whitelabel partner brand; null = MSTS default. */
  activeBrand: Partner | null;
  setActiveBrand: (b: Partner | null) => void;
```

Add state + effect inside `AppStoreProvider` (near the theme state/effect):

```ts
  // Whitelabel: not persisted — like auth, every load starts as MSTS
  // until the login flow resolves a partner from the URL.
  const [activeBrand, setActiveBrand] = React.useState<Partner | null>(null);

  React.useEffect(() => {
    applyBrandVars(activeBrand);
  }, [activeBrand]);
```

Add `activeBrand,` and `setActiveBrand,` to the `value` object.

- [ ] **Step 4: Verify**

Run: `npm run build`
Expected: exits 0. App renders identically (defaults match Shell values).

- [ ] **Step 5: Commit**

```powershell
git add src/styles/globals.css tailwind.config.js src/app/store.tsx; git commit -m "feat: brand CSS-variable layer and activeBrand store state"
```

---

### Task 4: Identity-surface refactor — `shell-yellow` → `brand-accent`

**Files (modify, exact swaps below):** `src/app/Sidebar.tsx`, `src/components/ui/button.tsx`, `src/components/signage/StatStrip.tsx`, `src/components/signage/SignageHero.tsx`, `src/components/signage/Ticker.tsx`, `src/components/signage/Step.tsx`, `src/components/signage/Tag.tsx`, `src/components/common/StatCard.tsx`, `src/features/domains/DomainsPage.tsx`, `src/features/auth/MfaPage.tsx`, `src/features/auth/AuthShell.tsx`, `src/features/support/SupportPage.tsx`

**Interfaces:** consumes Tailwind `brand-*` classes from Task 3. No API changes.

**DO NOT TOUCH:** `src/components/common/Plate.tsx`; `src/features/finance/FinancePage.tsx:76` and `src/features/dashboard/DashboardPage.tsx:251` (plate-motif chips); `src/features/dashboard/DashboardPage.tsx:207,221,230` (semantic warning icons); `src/components/common/StatCard.tsx` `warning` variant; anything `shell-red`/`shell-ink` not listed below.

- [ ] **Step 1: Apply these exact class swaps**

| File:line | Old | New |
|---|---|---|
| `Sidebar.tsx:87` | `bg-shell-yellow/15 text-white ring-1 ring-inset ring-shell-yellow/40` | `bg-brand-accent/15 text-white ring-1 ring-inset ring-brand-accent/40` |
| `Sidebar.tsx:97` | `text-shell-yellow` | `text-brand-accent` |
| `button.tsx:23` (brand variant) | `bg-shell-yellow text-shell-ink hover:bg-shell-yellow-deep hover:-translate-y-px` | `bg-brand-accent text-brand-on-accent hover:bg-brand-accent-deep hover:-translate-y-px` |
| `StatStrip.tsx:36` | `text-shell-yellow` | `text-brand-accent` |
| `SignageHero.tsx:32` | `border-shell-yellow-deep/40 bg-shell-yellow text-shell-ink` | `border-brand-accent-deep/40 bg-brand-accent text-brand-on-accent` |
| `SignageHero.tsx:50` | `text-shell-yellow` | `text-brand-accent` |
| `Ticker.tsx:35` | `text-shell-yellow` | `text-brand-accent` |
| `Step.tsx:22` | `text-shell-yellow` | `text-brand-accent` |
| `Tag.tsx:7` | `bg-shell-yellow/15 text-shell-yellow-deep` | `bg-brand-accent/15 text-brand-accent-deep` |
| `StatCard.tsx:19` (primary) | `text-shell-yellow bg-[hsl(var(--sidebar))]` | `text-brand-accent bg-[hsl(var(--sidebar))]` |
| `StatCard.tsx:20` (brand) | `text-shell-ink bg-shell-yellow` | `text-brand-on-accent bg-brand-accent` |
| `DomainsPage.tsx:52` | `border-shell-yellow bg-shell-yellow` | `border-brand-accent bg-brand-accent` |
| `DomainsPage.tsx:99` | `bg-shell-yellow px-3.5 py-1.5 font-display text-2xl font-black leading-none text-shell-ink` | `bg-brand-accent px-3.5 py-1.5 font-display text-2xl font-black leading-none text-brand-on-accent` |
| `DomainsPage.tsx:130` | `text-shell-yellow` | `text-brand-accent` |
| `DomainsPage.tsx:132` | `text-shell-yellow` | `text-brand-accent` |
| `MfaPage.tsx:95` | `focus:border-shell-yellow focus:ring-2 focus:ring-shell-yellow/40` | `focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/40` |
| `SupportPage.tsx:128` | `bg-shell-yellow text-shell-ink` | `bg-brand-accent text-brand-on-accent` |
| `AuthShell.tsx:27` | `bg-[repeating-linear-gradient(90deg,#FBCE07_0_44px,transparent_44px_84px)]` | `bg-signage-dash` |

(Line numbers are pre-change references; match on the old string.)

- [ ] **Step 2: Verify nothing was missed and nothing extra changed**

Run: `git diff --stat` (expect exactly the 12 files above) and search `src` for remaining `shell-yellow` occurrences.
Expected remaining `shell-yellow` matches ONLY in: `Plate.tsx` (2), `StatCard.tsx` warning variant (1), `FinancePage.tsx:76` (1), `DashboardPage.tsx` (4: three warning icons + plate chip).

- [ ] **Step 3: Verify build + visual**

Run: `npm run build`
Expected: exits 0. In the browser, MSTS look unchanged (login dashed bar, sidebar active item, brand buttons all still Shell yellow). Sanity-test theming: in DevTools run `document.documentElement.style.setProperty("--brand-accent","47 125 79")` — sidebar active state and brand buttons turn green.

- [ ] **Step 4: Commit**

```powershell
git add -A src; git commit -m "refactor: identity surfaces use brand tokens instead of shell-yellow"
```

---

### Task 5: BrandLogo + login domain simulator + partner entry flow

**Files:**
- Create: `src/components/brand/BrandLogo.tsx`
- Modify: `src/features/auth/AuthShell.tsx`
- Modify: `src/features/auth/LoginPage.tsx`
- Modify: `src/app/Sidebar.tsx:5,29-33` (logo usage)

**Interfaces:**
- Consumes: `usePartners()` (Task 2), `setActiveBrand`/`activeBrand` (Task 3), `monogram`, `onAccentHex` (Task 1).
- Produces: `BrandLogo({ className }: { className?: string })` — drop-in replacement for `Logo` on dark grounds; `AuthShell` gains optional `beforeCard?: React.ReactNode` prop.

- [ ] **Step 1: Create `src/components/brand/BrandLogo.tsx`**

```tsx
import { Logo } from "./Logo";
import { useAppStore } from "@/app/store";
import { monogram, onAccentHex } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Active-brand logo for dark grounds (sidebar, auth screens): the
 * partner's uploaded logo, else an accent monogram + wordmark, else
 * the MSTS wordmark.
 */
export function BrandLogo({ className }: { className?: string }) {
  const { activeBrand } = useAppStore();
  if (!activeBrand) return <Logo className={className} />;
  if (activeBrand.logoDataUrl) {
    return (
      <img
        src={activeBrand.logoDataUrl}
        alt={activeBrand.name}
        className={cn("h-7 w-auto select-none", className)}
        draggable={false}
      />
    );
  }
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      <span
        className="grid size-7 shrink-0 place-items-center rounded-md font-display text-sm font-black"
        style={{
          background: activeBrand.accentColor,
          color: onAccentHex(activeBrand.accentColor),
        }}
      >
        {monogram(activeBrand.name)}
      </span>
      <span className="truncate font-display text-base font-black text-white">
        {activeBrand.name}
      </span>
    </span>
  );
}
```

- [ ] **Step 2: Update `AuthShell.tsx`**

Replace the `Logo` import/usage with `BrandLogo` and add a `beforeCard` slot + brand-aware chip. Full new component body:

```tsx
import * as React from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAppStore } from "@/app/store";

/** Shared branded frame for the login / MFA screens. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  beforeCard,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Slot above the card — e.g. the partner-domain simulator. */
  beforeCard?: React.ReactNode;
}) {
  const { activeBrand } = useAppStore();
  return (
    <div className="grid min-h-dvh place-items-center bg-shell-asphalt p-6 text-shell-paper">
      <div className="ruler-bg pointer-events-none fixed inset-0 opacity-30" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandLogo className="h-7" />
          <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
            {activeBrand ? "Partner tolling portal" : "One · Unified portal"}
          </span>
        </div>
        {beforeCard}
        <div className="relative overflow-hidden rounded-2xl border border-shell-asphalt-line bg-shell-asphalt-2 p-8 shadow-[0_40px_80px_-32px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-signage-dash" />
          <h1 className="font-display text-2xl font-black">{title}</h1>
          <p className="mt-1.5 text-sm text-[#9a9184]">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        {footer && (
          <div className="mt-4 text-center text-xs text-[#8f8778]">{footer}</div>
        )}
      </div>
    </div>
  );
}

/** Demo credentials — this prototype has no real auth backend. */
export const DEMO = {
  email: "demo@mstsone.eu",
  password: "msts1234",
  name: "Lars Jansen",
  mfaCode: "123456",
};
```

(Keep the `bg-signage-dash` change if Task 4 already made it.)

- [ ] **Step 3: Add the domain simulator + brand resolution to `LoginPage.tsx`**

Add imports:

```tsx
import { useSearchParams } from "react-router-dom";
import { Globe2, ChevronDown, ShieldAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePartners } from "@/hooks/api";
```

Inside the component, after the existing state hooks (before the `if (user)` return):

```tsx
  const [params, setParams] = useSearchParams();
  const { activeBrand, setActiveBrand } = useAppStore();
  const { data: partners } = usePartners();
  const slug = params.get("partner");
  const activePartners = React.useMemo(
    () => (partners ?? []).filter((p) => p.status === "active"),
    [partners]
  );
  // A slug that points at a missing/draft/suspended partner = dead domain.
  const unavailable = Boolean(slug && partners && !activePartners.some((p) => p.slug === slug));

  // Resolve the simulated partner domain → active brand.
  React.useEffect(() => {
    if (!partners) return;
    setActiveBrand(activePartners.find((p) => p.slug === slug) ?? null);
  }, [partners, activePartners, slug, setActiveBrand]);
```

Build the simulator node (before `return`):

```tsx
  const domainBar = (
    <div className="mb-4 flex justify-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 font-mono text-xs text-white/80 transition-colors hover:bg-white/10">
            <Globe2 className="size-3.5" />
            {activeBrand ? `tolls.${activeBrand.slug}.com` : slug && unavailable ? `tolls.${slug}.com` : "portal.mststolls.eu"}
            <ChevronDown className="size-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-72">
          <DropdownMenuLabel>Simulate partner domain</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setParams({})}>
            <span className="font-mono text-xs">portal.mststolls.eu</span>
            <span className="ml-auto text-xs text-muted-foreground">MSTS</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {activePartners.map((p) => (
            <DropdownMenuItem key={p.id} onClick={() => setParams({ partner: p.slug })}>
              <span className="font-mono text-xs">tolls.{p.slug}.com</span>
              <span className="ml-auto truncate text-xs text-muted-foreground">{p.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
```

Change the `AuthShell` usage: pass `beforeCard={domainBar}`, make subtitle/footer brand-aware, and render an unavailable state instead of the form when the domain is dead:

```tsx
  return (
    <AuthShell
      title="Sign in"
      subtitle={
        activeBrand
          ? `Access your ${activeBrand.name} tolling account.`
          : "Access your unified MSTS tolling cockpit."
      }
      beforeCard={domainBar}
      footer={
        activeBrand ? (
          <>Powered by MSTS Tolls · whitelabel partner portal</>
        ) : (
          <>Protected by two-factor authentication · MSTS One prototype</>
        )
      }
    >
      {unavailable ? (
        <div className="space-y-4 text-center">
          <ShieldAlert className="mx-auto size-8 text-shell-paper/60" />
          <p className="text-sm font-semibold">This partner portal is unavailable</p>
          <p className="text-xs text-[#9a9184]">
            The portal at this address is inactive or does not exist. Contact
            your provider, or continue to the MSTS portal.
          </p>
          <Button variant="brand" className="w-full" onClick={() => setParams({})}>
            Go to MSTS sign-in
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" autoComplete="off">
          {/* … existing form contents unchanged … */}
        </form>
      )}
    </AuthShell>
  );
```

- [ ] **Step 4: Use `BrandLogo` in the sidebar**

In `src/app/Sidebar.tsx`, change the import `{ Logo, LogoMark }` to `{ LogoMark }` from `@/components/brand/Logo` plus `import { BrandLogo } from "@/components/brand/BrandLogo";`, and replace `<Logo className="h-6" />` with `<BrandLogo className="h-6" />`.

- [ ] **Step 5: Verify**

Run: `npm run build` → exits 0.
Browser: `/login` shows the `portal.mststolls.eu` chip; picking `tolls.alpine.com` turns the dashed card bar green, shows the "AF · Alpine Fleet Services" monogram wordmark and "Powered by MSTS Tolls" footer; `/login?partner=bogus` shows the unavailable card; login → MFA → app shows Alpine branding in the sidebar (green active nav item).

- [ ] **Step 6: Commit**

```powershell
git add -A src; git commit -m "feat: partner-branded login with simulated domain entry"
```

---

### Task 6: Tenant isolation — entity scoping + partner-aware sign-out

**Files:**
- Modify: `src/app/Topbar.tsx:56-62` (entity effect + list) and the sign-out handler (~line 243)

**Interfaces:** consumes `activeBrand` from the store; no new exports.

- [ ] **Step 1: Scope the entity selector in `Topbar.tsx`**

Pull `activeBrand` from `useAppStore()`. Replace the restore-entity effect and derive a visible list:

```tsx
  // Entities visible in this portal: a partner sees only the customer
  // entities it owns (tenant isolation); MSTS sees everything.
  const visibleEntities = React.useMemo(
    () =>
      activeBrand
        ? (entities ?? []).filter((e) => activeBrand.entityIds.includes(e.id))
        : entities ?? [],
    [entities, activeBrand]
  );

  // Restore the last-selected entity on load (when it's visible),
  // else default to the first visible one. Also corrects the selection
  // whenever the active brand changes.
  React.useEffect(() => {
    if (!visibleEntities.length) return;
    if (entity && visibleEntities.some((e) => e.id === entity.id)) return;
    const savedId = localStorage.getItem("msts-entity");
    setEntity(visibleEntities.find((e) => e.id === savedId) ?? visibleEntities[0]);
  }, [visibleEntities, entity, setEntity]);
```

In the entity `PopoverContent`, map over `visibleEntities` instead of `entities`.

- [ ] **Step 2: Keep partners on their branded login at sign-out**

In the sign-out `DropdownMenuItem` handler, replace `navigate("/login")` with:

```tsx
                navigate(activeBrand ? `/login?partner=${activeBrand.slug}` : "/login");
```

- [ ] **Step 3: Verify**

Run: `npm run build` → exits 0.
Browser: sign in via `tolls.alpine.com` → entity selector offers only `13768 | NVD Stage BP 1` and `11769 | Automation Foreign Std`; all modules show only those entities' data. Sign out → back at the Alpine-branded login. Via `tolls.nordkap.com` → only `20452 | Meridian Logistics`.

- [ ] **Step 4: Commit**

```powershell
git add src/app/Topbar.tsx; git commit -m "feat: tenant isolation via partner-scoped entity selector"
```

---

### Task 7: Package gating — nav features, FeatureGate routes, palette, portal switcher

**Files:**
- Modify: `src/app/nav.ts`
- Create: `src/components/common/UpgradeState.tsx`
- Create: `src/components/common/FeatureGate.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/app/Sidebar.tsx:17`, `src/app/CommandPalette.tsx:20`
- Modify: `src/app/Topbar.tsx` (portal-switcher visibility)
- Modify: `src/features/reports/ReportsPage.tsx` (scheduled-reports flag)

**Interfaces:**
- Consumes: `featureEnabled`, `FeatureFlag`, `Partner` (Task 1); `activeBrand` (Task 3).
- Produces: `NavItem.feature?: FeatureFlag`, `NavItem.mstsOnly?: boolean`; `navForPortal(portal: SourcePortal, brand?: Partner | null): NavGroup[]`; `FeatureGate({ feature, moduleName, children })`; `UpgradeState({ moduleName })`.

- [ ] **Step 1: Wire features into `src/app/nav.ts`**

Add imports:

```ts
import type { FeatureFlag, Partner, SourcePortal } from "@/lib/types";
import { featureEnabled } from "@/lib/brand";
```

Extend `NavItem`:

```ts
  /** Package feature flag gating this module for whitelabel partners. */
  feature?: FeatureFlag;
  /** Module reserved for the MSTS brand (e.g. partner administration). */
  mstsOnly?: boolean;
```

Add a `feature` to each module item: Dashboard `feature: "dashboard"`, Vehicles `"vehicles"`, OBU & Devices `"obu"`, Hauliers `"hauliers"`, Products & Ordering `"products"`, Domains `"domains"`, Transactions `"transactions"`, Reports `"reports"`, Invoices & AR `"finance"`, Users & Access `"users"`, Onboarding `"onboarding"`. (Support/Account get none.)

Change `navForPortal` to accept and honor the brand:

```ts
export function navForPortal(
  portal: SourcePortal,
  brand: Partner | null = null
): NavGroup[] {
  // A switchable portal may span several legacy source portals (post-merge).
  const sources = PORTAL_SOURCES[portal] ?? [portal];
  const scoped = NAV.map((group) => ({
    label: group.label,
    items: group.items.filter(
      (item) =>
        !item.global &&
        item.sources.some((s) => sources.includes(s)) &&
        (!item.mstsOnly || !brand) &&
        (!item.feature || featureEnabled(brand, item.feature))
    ),
  })).filter((group) => group.items.length > 0);

  const globals = ALL_NAV_ITEMS.filter((item) => item.global);
  if (globals.length) scoped.push({ label: "General", items: globals });

  return scoped;
}
```

- [ ] **Step 2: Create `src/components/common/UpgradeState.tsx`**

```tsx
import { Lock, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/app/store";

/** Shown when a whitelabel partner's package doesn't include a module. */
export function UpgradeState({ moduleName }: { moduleName: string }) {
  const { activeBrand } = useAppStore();
  const navigate = useNavigate();
  return (
    <div className="grid min-h-[60vh] place-items-center animate-fade-in">
      <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-card">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-accent text-brand-on-accent">
          <Lock className="size-5" />
        </span>
        <p className="eyebrow mt-5">Package upgrade required</p>
        <h2 className="mt-1 font-display text-xl font-black">
          {moduleName} is not in your package
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {activeBrand
            ? `The ${activeBrand.package} package for ${activeBrand.name} doesn't include this module. Contact MSTS to upgrade your whitelabel plan.`
            : "This module is not available."}
        </p>
        <Button className="mt-5" onClick={() => navigate("/support")}>
          Contact MSTS <ArrowUpRight />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/components/common/FeatureGate.tsx`**

```tsx
import * as React from "react";
import type { FeatureFlag } from "@/lib/types";
import { featureEnabled } from "@/lib/brand";
import { useAppStore } from "@/app/store";
import { UpgradeState } from "./UpgradeState";

/** Route wrapper: renders the module only when the active brand's
 *  package includes it; otherwise a polished upgrade prompt. */
export function FeatureGate({
  feature,
  moduleName,
  children,
}: {
  feature: FeatureFlag;
  moduleName: string;
  children: React.ReactNode;
}) {
  const { activeBrand } = useAppStore();
  if (!featureEnabled(activeBrand, feature)) {
    return <UpgradeState moduleName={moduleName} />;
  }
  return <>{children}</>;
}
```

- [ ] **Step 4: Gate the routes in `src/app/router.tsx`**

Add `import { FeatureGate } from "@/components/common/FeatureGate";` and wrap each module route element:

```tsx
      { index: true, element: <FeatureGate feature="dashboard" moduleName="Dashboard"><PortalIndex /></FeatureGate> },
      { path: "vehicles", element: <FeatureGate feature="vehicles" moduleName="Vehicles"><VehiclesPage /></FeatureGate> },
      { path: "obus", element: <FeatureGate feature="obu" moduleName="OBU & Devices"><ObusPage /></FeatureGate> },
      { path: "hauliers", element: <FeatureGate feature="hauliers" moduleName="Hauliers"><HauliersPage /></FeatureGate> },
      { path: "products", element: <FeatureGate feature="products" moduleName="Products & Ordering"><ProductsPage /></FeatureGate> },
      { path: "domains", element: <FeatureGate feature="domains" moduleName="Domains"><DomainsPage /></FeatureGate> },
      { path: "transactions", element: <FeatureGate feature="transactions" moduleName="Transactions"><TransactionsPage /></FeatureGate> },
      { path: "reports", element: <FeatureGate feature="reports" moduleName="Reports"><ReportsPage /></FeatureGate> },
      { path: "finance", element: <FeatureGate feature="finance" moduleName="Invoices & AR"><FinancePage /></FeatureGate> },
      { path: "users", element: <FeatureGate feature="users" moduleName="Users & Access"><UsersPage /></FeatureGate> },
      { path: "onboarding", element: <FeatureGate feature="onboarding" moduleName="Onboarding"><OnboardingPage /></FeatureGate> },
```

(Support, Account, and the `*` route stay unwrapped.)

- [ ] **Step 5: Pass the brand where nav is computed**

- `Sidebar.tsx:17`: `const groups = activePortal ? navForPortal(activePortal, activeBrand) : NAV;` (add `activeBrand` to the `useAppStore()` destructure).
- `CommandPalette.tsx:20`: same change (add `activeBrand` to the destructure).

- [ ] **Step 6: Hide the portal switcher when the other portal is fully gated**

In `Topbar.tsx`, add `import { navForPortal } from "./nav";` and after the `otherPortal` line:

```tsx
  // Hide the hop when every module of the other portal is outside the
  // partner's package (e.g. MyMST under a Basic plan).
  const otherPortalUsable = otherPortal
    ? navForPortal(otherPortal.id, activeBrand).some(
        (g) => g.label !== "General" && g.items.length > 0
      )
    : false;
```

Change the switcher render condition from `{portal && otherPortal && (` to `{portal && otherPortal && otherPortalUsable && (`.

- [ ] **Step 7: Gate scheduled reports inside `ReportsPage.tsx`**

Find the button/action that opens `ScheduledReportsDialog` (search for the state it toggles). Wrap its render with:

```tsx
{featureEnabled(activeBrand, "scheduled-reports") && ( /* existing scheduled-reports trigger */ )}
```

adding `import { featureEnabled } from "@/lib/brand";` and `const { activeBrand } = useAppStore();` (import `useAppStore` from `@/app/store` if not present).

- [ ] **Step 8: Verify**

Run: `npm run build` → exits 0.
Browser: as MSTS — everything unchanged, both portals switchable. Via `tolls.nordkap.com` (Basic): sidebar shows only Dashboard/Vehicles/OBU/Hauliers/Products/Domains + General; no MyMST switcher in the top bar; navigating directly to `/reports` shows the "not in your package" card; ⌘K lists no Transactions/Reports/Finance. Via `tolls.alpine.com` (Enterprise): all modules present.

- [ ] **Step 9: Commit**

```powershell
git add -A src; git commit -m "feat: package feature-flags gate nav, routes, palette and portal switcher"
```

---

### Task 8: Partners admin module — list page, route, nav entry

**Files:**
- Create: `src/features/partners/PartnersPage.tsx`
- Modify: `src/app/nav.ts` (Administration group)
- Modify: `src/app/router.tsx`

**Interfaces:**
- Consumes: `usePartners`, `useUpdatePartner`, `useDeletePartner` (Task 2); `monogram`, `onAccentHex`, `FEATURE_LABELS` (Task 1); `DataTable`/`Column`, `PageHeader`, `StatusBadge`, ui `Badge`, `DropdownMenu` (existing).
- Produces: route `/partners`; renders `<PartnerSheet>` from Task 9 — this task stubs it inline so it compiles standalone.

- [ ] **Step 1: Add the nav item in `src/app/nav.ts`**

Add `Palette` to the `lucide-react` import. Append to the **Administration** group's `items`:

```ts
      {
        label: "Whitelabel Partners",
        to: "/partners",
        icon: Palette,
        sources: ["MyTolls"],
        keywords: ["reseller", "brand", "whitelabel", "package", "tenant"],
        description: "Partner branding, packages & tenants",
        mstsOnly: true,
      },
```

- [ ] **Step 2: Create `src/features/partners/PartnersPage.tsx`** (list + row actions; the edit sheet arrives in Task 9 — include this temporary stub so the file compiles now)

```tsx
import * as React from "react";
import { Palette, Plus, ExternalLink, MoreHorizontal, Pencil, Pause, Play, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/app/store";
import { usePartners, useUpdatePartner, useDeletePartner } from "@/hooks/api";
import { monogram, onAccentHex } from "@/lib/brand";
import { formatDate } from "@/lib/utils";
import type { Partner } from "@/lib/types";
import NotFoundPage from "@/features/misc/NotFoundPage";
import { toast } from "sonner";
import { PartnerSheet } from "./PartnerSheet";

const PACKAGE_BADGE: Record<Partner["package"], string> = {
  basic: "bg-secondary text-secondary-foreground",
  professional: "bg-info/15 text-info",
  enterprise: "bg-brand-accent/20 text-foreground",
};

export default function PartnersPage() {
  const { activeBrand } = useAppStore();
  const { data: partners, isLoading } = usePartners();
  const update = useUpdatePartner();
  const remove = useDeletePartner();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Partner | null>(null);
  const [deleting, setDeleting] = React.useState<Partner | null>(null);

  // The console that manages partners is never visible to a partner.
  if (activeBrand) return <NotFoundPage />;

  const openCreate = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (p: Partner) => { setEditing(p); setSheetOpen(true); };
  const preview = (p: Partner) =>
    window.open(`/login?partner=${p.slug}`, "_blank", "noopener");

  const toggleStatus = (p: Partner) => {
    const status = p.status === "suspended" ? "active" : "suspended";
    update.mutate(
      { id: p.id, status },
      { onSuccess: () => toast.success(`${p.name} ${status === "active" ? "activated" : "suspended"}`) }
    );
  };

  const columns: Column<Partner>[] = [
    {
      key: "name",
      header: "Partner",
      sortable: true,
      cell: (p) => (
        <div className="flex items-center gap-2.5">
          {p.logoDataUrl ? (
            <img src={p.logoDataUrl} alt="" className="size-8 rounded-md object-contain" />
          ) : (
            <span
              className="grid size-8 shrink-0 place-items-center rounded-md font-display text-xs font-black"
              style={{ background: p.accentColor, color: onAccentHex(p.accentColor) }}
            >
              {monogram(p.name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold">{p.name}</p>
            <p className="font-mono text-xs text-muted-foreground">tolls.{p.slug}.com</p>
          </div>
        </div>
      ),
    },
    {
      key: "package",
      header: "Package",
      sortable: true,
      cell: (p) => (
        <Badge className={PACKAGE_BADGE[p.package]}>
          {p.package.charAt(0).toUpperCase() + p.package.slice(1)}
        </Badge>
      ),
    },
    {
      key: "entityIds",
      header: "Customers",
      align: "center",
      cell: (p) => p.entityIds.length,
    },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
    { key: "createdAt", header: "Created", sortable: true, cell: (p) => formatDate(p.createdAt) },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (p) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm"><MoreHorizontal /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(p)}><Pencil /> Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => preview(p)}><ExternalLink /> Preview portal</DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleStatus(p)}>
              {p.status === "suspended" ? <><Play /> Activate</> : <><Pause /> Suspend</>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleting(p)}>
              <Trash2 /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration · Whitelabel"
        title="Whitelabel Partners"
        description="Configure partner branding, packages and tenant customers — resellers run this portal under their own identity."
        actions={<Button onClick={openCreate}><Plus /> New partner</Button>}
      />

      <DataTable
        columns={columns}
        rows={partners ?? []}
        loading={isLoading}
        getRowId={(p) => p.id}
        total={partners?.length ?? 0}
        page={1}
        pageSize={50}
        onPageChange={() => {}}
        emptyTitle="No partners yet"
      />

      <PartnerSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        partner={editing}
      />

      <Dialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleting?.name}?</DialogTitle>
            <DialogDescription>
              The partner's branding and package configuration are removed and
              their {deleting?.entityIds.length ?? 0} customer entit
              {(deleting?.entityIds.length ?? 0) === 1 ? "y" : "ies"} return to
              MSTS. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() =>
                deleting &&
                remove.mutate(deleting.id, {
                  onSuccess: () => {
                    toast.success(`${deleting.name} deleted`);
                    setDeleting(null);
                  },
                })
              }
            >
              <Trash2 /> Delete partner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

Create a **temporary stub** `src/features/partners/PartnerSheet.tsx` (replaced wholesale in Task 9):

```tsx
import type { Partner } from "@/lib/types";

/** Placeholder — full branding/package/customers editor lands next task. */
export function PartnerSheet(_props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partner: Partner | null;
}) {
  return null;
}
```

If `DataTable`'s `Column` type or `StatusBadge` doesn't accept something above, adapt minimally to the existing component API rather than restructuring the shared component. Two adaptations are pre-approved: (a) add a `draft` entry to `StatusBadge`'s status map styled like a neutral/secondary badge; (b) if `Column.key` is typed as `keyof T` (so `"actions"` won't compile), reuse a real key such as `key: "id"` for the actions column (its `cell` renders the menu regardless).

- [ ] **Step 3: Register the route in `src/app/router.tsx`**

```tsx
import PartnersPage from "@/features/partners/PartnersPage";
// …
      { path: "partners", element: <PartnersPage /> },
```

(No FeatureGate — the page self-guards with `activeBrand`.)

- [ ] **Step 4: Verify**

Run: `npm run build` → exits 0.
Browser (MSTS login): Administration → Whitelabel Partners lists Alpine + Nordkap with monograms, package badges, customer counts; Preview opens the branded login in a new tab; Suspend removes the partner from the login picker; Delete works with confirm. Under a partner login, `/partners` shows the not-found page and no nav entry.

- [ ] **Step 5: Commit**

```powershell
git add -A src; git commit -m "feat: whitelabel partners admin list with preview, suspend and delete"
```

---

### Task 9: Partner create/edit sheet — branding, package, customers

**Files:**
- Replace: `src/features/partners/PartnerSheet.tsx` (the Task 8 stub)

**Interfaces:**
- Consumes: `useCreatePartner`, `useUpdatePartner`, `useEntities`, `usePartners` (Task 2); `PACKAGE_FEATURES`, `FEATURE_LABELS`, `monogram`, `onAccentHex`, `slugify` (Task 1); ui `Sheet`, `Tabs`, `Checkbox`, `Select`, `Input`, `Field`, `Button`.
- Produces: `PartnerSheet({ open, onOpenChange, partner })` — `partner: null` = create mode.

- [ ] **Step 1: Replace the stub with the full editor**

```tsx
import * as React from "react";
import { Loader2, Save, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/common/Field";
import { useCreatePartner, useUpdatePartner, useEntities, usePartners } from "@/hooks/api";
import { PACKAGE_FEATURES, FEATURE_LABELS, monogram, onAccentHex, slugify } from "@/lib/brand";
import type { FeatureFlag, Partner, PartnerPackage, PartnerStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const SWATCHES = ["#2F7D4F", "#1B5FAA", "#7C3AED", "#C2410C", "#0F766E", "#BE185D", "#B45309", "#334155"];

const MAX_LOGO_BYTES = 200 * 1024;

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

interface FormState {
  name: string;
  slug: string;
  slugTouched: boolean;
  logoDataUrl?: string;
  accentColor: string;
  package: PartnerPackage;
  features: FeatureFlag[];
  status: PartnerStatus;
  entityIds: string[];
}

const EMPTY: FormState = {
  name: "",
  slug: "",
  slugTouched: false,
  accentColor: SWATCHES[1],
  package: "basic",
  features: PACKAGE_FEATURES.basic,
  status: "active",
  entityIds: [],
};

export function PartnerSheet({
  open,
  onOpenChange,
  partner,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partner: Partner | null;
}) {
  const create = useCreatePartner();
  const update = useUpdatePartner();
  const { data: entities } = useEntities();
  const { data: partners } = usePartners();
  const [form, setForm] = React.useState<FormState>(EMPTY);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // (Re)hydrate whenever the sheet opens.
  React.useEffect(() => {
    if (!open) return;
    setForm(
      partner
        ? {
            name: partner.name,
            slug: partner.slug,
            slugTouched: true,
            logoDataUrl: partner.logoDataUrl,
            accentColor: partner.accentColor,
            package: partner.package,
            features: partner.features,
            status: partner.status,
            entityIds: partner.entityIds,
          }
        : EMPTY
    );
  }, [open, partner]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

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

  const pickPackage = (pkg: PartnerPackage) =>
    // Selecting a tier resets flags to its defaults; checkboxes below
    // then allow per-deal overrides.
    set({ package: pkg, features: PACKAGE_FEATURES[pkg] });

  const toggleFeature = (flag: FeatureFlag) =>
    set({
      features: form.features.includes(flag)
        ? form.features.filter((f) => f !== flag)
        : [...form.features, flag],
    });

  const toggleEntity = (id: string) =>
    set({
      entityIds: form.entityIds.includes(id)
        ? form.entityIds.filter((e) => e !== id)
        : [...form.entityIds, id],
    });

  /** The partner currently owning an entity (other than the one being edited). */
  const ownerOf = (entityId: string): Partner | undefined =>
    partners?.find((p) => p.id !== partner?.id && p.entityIds.includes(entityId));

  const busy = create.isPending || update.isPending;

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Partner name is required");
    if (!form.slug.trim()) return toast.error("Slug is required");
    const body = {
      name: form.name.trim(),
      slug: slugify(form.slug),
      logoDataUrl: form.logoDataUrl ?? "",
      accentColor: form.accentColor,
      package: form.package,
      features: form.features,
      status: form.status,
      entityIds: form.entityIds,
    };
    try {
      if (partner) {
        await update.mutateAsync({ id: partner.id, ...body });
        toast.success(`${form.name} updated`);
      } else {
        await create.mutateAsync(body);
        toast.success(`${form.name} created`);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save partner");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{partner ? `Edit ${partner.name}` : "New whitelabel partner"}</SheetTitle>
          <SheetDescription>
            Branding, package and customer tenants for this reseller.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="branding" className="mt-4 flex-1">
          <TabsList className="w-full">
            <TabsTrigger value="branding" className="flex-1">Branding</TabsTrigger>
            <TabsTrigger value="package" className="flex-1">Package</TabsTrigger>
            <TabsTrigger value="customers" className="flex-1">Customers</TabsTrigger>
          </TabsList>

          {/* ── Branding ── */}
          <TabsContent value="branding" className="space-y-4 pt-4">
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
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onLogoFile(e.target.files?.[0])}
                />
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                  <Upload /> Upload
                </Button>
                {form.logoDataUrl && (
                  <Button variant="ghost" size="sm" onClick={() => set({ logoDataUrl: undefined })}>
                    <X /> Remove
                  </Button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Without a logo the portal shows a monogram in the accent color.
              </p>
            </Field>
            <Field label="Accent color">
              <div className="flex flex-wrap items-center gap-2">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set({ accentColor: c })}
                    className={cn(
                      "size-8 rounded-md ring-offset-2 transition-transform hover:scale-110",
                      form.accentColor === c && "ring-2 ring-foreground"
                    )}
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
            {/* Live mini-preview */}
            <div className="rounded-xl border bg-shell-asphalt p-4">
              <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-white/50">
                Preview
              </p>
              <div className="flex items-center gap-2.5">
                {form.logoDataUrl ? (
                  <img src={form.logoDataUrl} alt="" className="h-7 max-w-28 object-contain" />
                ) : (
                  <span
                    className="grid size-7 place-items-center rounded-md font-display text-sm font-black"
                    style={{ background: form.accentColor, color: onAccentHex(form.accentColor) }}
                  >
                    {form.name ? monogram(form.name) : "?"}
                  </span>
                )}
                <span className="font-display font-black text-white">{form.name || "Partner name"}</span>
              </div>
              <div
                className="mt-3 rounded-lg px-3 py-2 text-sm font-semibold"
                style={{ background: `${form.accentColor}26`, color: "#fff", boxShadow: `inset 0 0 0 1px ${form.accentColor}66` }}
              >
                Active navigation item
              </div>
              <button
                className="mt-2 rounded-lg px-4 py-2 font-display text-sm font-semibold"
                style={{ background: form.accentColor, color: onAccentHex(form.accentColor) }}
              >
                Primary action
              </button>
            </div>
          </TabsContent>

          {/* ── Package ── */}
          <TabsContent value="package" className="space-y-4 pt-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => pickPackage(pkg.id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-colors hover:bg-secondary",
                    form.package === pkg.id && "border-transparent ring-2 ring-brand-accent bg-brand-accent/10"
                  )}
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
            <div>
              <p className="mb-2 text-sm font-semibold">
                Feature flags
                <span className="ml-2 font-normal text-muted-foreground">
                  ({form.features.length}/{Object.keys(FEATURE_LABELS).length} enabled — override per deal)
                </span>
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(Object.keys(FEATURE_LABELS) as FeatureFlag[]).map((flag) => (
                  <label key={flag} className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-secondary">
                    <Checkbox
                      checked={form.features.includes(flag)}
                      onCheckedChange={() => toggleFeature(flag)}
                    />
                    {FEATURE_LABELS[flag]}
                  </label>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ── Customers ── */}
          <TabsContent value="customers" className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">
              Tenant isolation: this partner's portal only ever shows the
              customer entities assigned here. An entity can belong to one
              partner at a time — assigning it moves it.
            </p>
            {(entities ?? []).map((e) => {
              const owner = ownerOf(e.id);
              return (
                <label
                  key={e.id}
                  className="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm hover:bg-secondary"
                >
                  <Checkbox
                    checked={form.entityIds.includes(e.id)}
                    onCheckedChange={() => toggleEntity(e.id)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{e.displayId}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {e.name} · {e.vatNumber}
                      {owner && <span className="text-warning"> · currently with {owner.name}</span>}
                    </span>
                  </span>
                </label>
              );
            })}
          </TabsContent>
        </Tabs>

        <div className="sticky bottom-0 -mx-6 mt-6 flex justify-end gap-2 border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Save />} {partner ? "Save changes" : "Create partner"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

Adapt minimally to the actual `Sheet`/`Tabs`/`Checkbox` component APIs in `src/components/ui/` if prop names differ (they are shadcn-style; check the files before writing).

Note: `logoDataUrl: form.logoDataUrl ?? ""` — the PATCH handler treats `""` as "clear the logo" (`body.logoDataUrl || undefined`), which is what Remove needs.

- [ ] **Step 2: Verify**

Run: `npm run build` → exits 0.
Browser (MSTS): New partner → type "Borealis Cargo" (slug auto-fills `borealis-cargo`), pick purple, package Professional (flags auto-check), assign an entity currently owned by Alpine (shows "currently with Alpine Fleet Services"), Create. List shows it; Preview opens a purple-branded login; the reassigned entity is gone from Alpine's portal. Edit Alpine → upload a small PNG → sidebar logo in its preview tab shows the image. Reload the page → everything persisted.

- [ ] **Step 3: Commit**

```powershell
git add -A src; git commit -m "feat: partner editor sheet with branding, package flags and tenant assignment"
```

---

### Task 10: Branded exports (PDF/CSV)

**Files:**
- Modify: `src/lib/download.ts`
- Modify: `src/features/reports/ReportsPage.tsx:65-68`, `src/features/reports/ScheduledReportsDialog.tsx:79-81`, `src/features/transactions/TransactionsPage.tsx:52`, `src/features/finance/FinancePage.tsx:33,111`

**Interfaces:**
- Consumes: `ExportBrand`, `exportBrandOf`, `hexToChannels` (Task 1); `activeBrand` (Task 3).
- Produces: new optional trailing param on `downloadCSV(filename, columns, rows, brand?)`, `downloadTablePDF(filename, title, columns, rows, subtitle?, brand?)`; `downloadDocumentPDF(filename, opts)` gains `opts.brand?: ExportBrand`.

- [ ] **Step 1: Thread the brand through `src/lib/download.ts`**

Add imports and a helper at the top:

```ts
import type { ExportBrand } from "./brand";
import { hexToChannels } from "./brand";

/** [r,g,b] tuple for jsPDF color setters. */
function rgbOf(hex: string): [number, number, number] {
  const [r, g, b] = hexToChannels(hex).split(" ").map(Number);
  return [r, g, b];
}
```

`downloadCSV` — add trailing `brand?: ExportBrand` and, when present, prepend a header comment line:

```ts
export function downloadCSV(filename: string, columns: string[], rows: Row[], brand?: ExportBrand) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    ...(brand ? [`# ${brand.name} — tolling data export`] : []),
    columns.map(esc).join(","),
    ...toCells(columns, rows).map((cells) => cells.map(esc).join(",")),
  ];
  saveBlob(new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" }), filename);
}
```

`downloadTablePDF` — add trailing `brand?: ExportBrand` after `subtitle`. In the header band, replace the hardcoded name/color:

```ts
  // Branded header band (partner brand when licensed, else MSTS)
  doc.setFillColor(22, 19, 16); // asphalt
  doc.rect(0, 0, pageW, 22, "F");
  const accent = brand ? rgbOf(brand.accentColor) : ([251, 206, 7] as [number, number, number]);
  doc.setFillColor(...accent);
  doc.rect(0, 22, pageW, 1.5, "F");
  doc.setTextColor(...accent);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(brand ? brand.name : "MSTS One", margin, 14);
```

(keep the right-aligned title lines that follow; bump the initial `let y = 32;` to `let y = 34;` so content clears the accent bar).

`downloadDocumentPDF` — add `brand?: ExportBrand;` to the `opts` object type and apply the same header treatment (accent bar `doc.rect(0, 26, pageW, 1.5, "F")`, brand name text, accent text color) in place of the hardcoded `"MSTS One"` + yellow.

- [ ] **Step 2: Pass the brand at every call site**

In each of the four files, add:

```ts
import { exportBrandOf } from "@/lib/brand";
import { useAppStore } from "@/app/store"; // if not already imported
```

inside the component: `const { activeBrand } = useAppStore();` and `const exportBrand = exportBrandOf(activeBrand);` then append the argument:

- `ReportsPage.tsx`: `downloadCSV(`${stamped}.csv`, res.columns, res.rows, exportBrand)` and `downloadTablePDF(`${stamped}.pdf`, r.name, res.columns, res.rows, `Period: ${period} · ${r.description}`, exportBrand)` (XLS/JSON unchanged).
- `ScheduledReportsDialog.tsx`: same pattern on its `downloadCSV` and `downloadTablePDF` calls (pass `undefined` as `subtitle` for the PDF: `downloadTablePDF(`${base}.pdf`, s.reportName, res.columns, res.rows, undefined, exportBrand)`).
- `TransactionsPage.tsx`: append `exportBrand` to the `downloadCSV(...)` call.
- `FinancePage.tsx`: both `downloadDocumentPDF` calls get `brand: exportBrand` added to their opts object. Note `FinancePage.tsx:33` is a module-level helper (`const invoicePdf = (i: Invoice) => downloadDocumentPDF(...)` or similar) — if it sits outside the component, convert it to receive the brand: change its signature to `(i: Invoice, brand?: ExportBrand)` and pass `exportBrand` from the component call site.

- [ ] **Step 3: Verify**

Run: `npm run build` → exits 0.
Browser: as MSTS, export a report PDF → header still says "MSTS One" in yellow. As Alpine (enterprise → `branded-invoicing` on), export → header says "Alpine Fleet Services" in green with a green rule; CSV starts with `# Alpine Fleet Services — tolling data export`. As Nordkap (basic → flag off) — Reports is gated, but the Transactions module is also gated under basic; verify instead by temporarily enabling `transactions` for Nordkap via the admin flags checklist, exporting a CSV, and confirming it has **no** brand line (flag `branded-invoicing` still off). Reset the flag afterwards.

- [ ] **Step 4: Commit**

```powershell
git add -A src; git commit -m "feat: partner-branded PDF and CSV exports behind branded-invoicing flag"
```

---

### Task 11: Docs + final verification

**Files:**
- Modify: `docs/test-plan.md` (append a section)
- Modify: `docs/PROJECT-CONTEXT.md` (§6 modules table + §7 key features)

**Interfaces:** none — documentation and the final regression pass.

- [ ] **Step 1: Append a "Whitelabeling" section to `docs/test-plan.md`**

Follow the document's existing format/numbering style. Cover, as concrete steps with expected results:
1. Login domain simulator: pick `tolls.alpine.com` → login rebrands (monogram, green accent, powered-by footer); `?partner=bogus` → unavailable card.
2. Partner portal branding: sidebar logo/accent, MFA focus ring, dashboard stat tiles all in partner accent; dark-mode toggle keeps working.
3. Package gating: Nordkap (Basic) hides Transactions/Reports/Finance/Users/Onboarding from sidebar + ⌘K, hides the MyMST switcher, `/reports` direct URL shows the upgrade card; Alpine (Enterprise) sees everything.
4. Tenant isolation: Alpine sees e1+e2 only; Nordkap sees e3 only; counts match the per-entity golden numbers of §8 of PROJECT-CONTEXT.
5. Admin console: create/edit/suspend/delete partner; logo upload >200 KB rejected; slug collision rejected; entity reassignment moves ownership; persistence across reload; suspended partner vanishes from the login picker and its direct URL shows unavailable.
6. Branded exports: Alpine PDF header + CSV comment line; MSTS exports unchanged.

- [ ] **Step 2: Update `docs/PROJECT-CONTEXT.md`**

- Add a row to the §6 module table: `| **Whitelabel Partners** | Partner branding, packages/feature flags, tenant assignment | MyTolls (MSTS brand only) |`
- Add a bullet in §7: brand entry via `/login?partner=<slug>`, CSS-variable brand layer, package gating, tenant isolation via `entityIds`, branded exports behind the `branded-invoicing` flag; note DB schema is now **v5**.

- [ ] **Step 3: Full regression gate**

Run: `npm run build` → exits 0.
Run: `npm run lint` → exits 0 (fix any new warnings — the script runs with `--max-warnings 0`).
Browser smoke (fresh `localStorage` — run “Reset demo data” or clear `msts-db`): MSTS login → identical to pre-feature look → Partners admin CRUD → preview Alpine → full branded pass (sidebar, gating, isolation, export) → sign out lands on Alpine login → switch simulator back to MSTS.

- [ ] **Step 4: Commit**

```powershell
git add docs; git commit -m "docs: whitelabeling test plan and project context updates"
```
