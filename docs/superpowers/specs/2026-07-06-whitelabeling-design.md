# Whitelabeling — Design Spec

**Date:** 2026-07-06 · **Branch:** `feat/white-labelling` · **Status:** Approved by user

Business partners (resellers) run the MSTS One tolling portal under their own
brand — logo, colors, name — on a shared backend, per the "Whitelabeled
solution for Business partners" discovery deck. This prototype demonstrates
both sides: the MSTS-side **Partner Branding admin console** and the
**partner-branded portal experience**.

## Decisions (user-confirmed)

1. **Both sides**: admin configuration console + live rebranded portal.
2. **Entry**: simulated partner domain on the login page (`?partner=<slug>`
   URL param + a domain-simulator picker); admin console gets a Preview
   shortcut that opens the same flow.
3. **Packages gate features**: Basic / Professional / Enterprise map to
   feature flags that hide or show modules in the branded portal.
4. **Branded surfaces**: app shell + login (assumed) and **document exports**
   (PDF/CSV). No email preview, no favicon/title swap.
5. **Logos**: admin uploads a real image (data URL in localStorage);
   auto-generated monogram fallback when absent.
6. **Tenant isolation**: each partner owns a subset of customer entities and
   sees only those.

## Approach

CSS-variable brand layer + partners as first-class mock-DB records
(approach 1 of 3 considered). Partners swap *identity* (logo, accent, name);
the platform keeps its neutrals (asphalt/paper) and layout — mirroring how
real whitelabel products work. Rejected: full per-partner theme objects
(4× token surface, easy to break the signage design) and context-only inline
styling (scatters style logic, misses pseudo-states).

## 1. Data model & seed

New `Partner` type in `src/lib/types.ts`, stored in `src/mocks/db.ts`,
persisted via the existing localStorage layer (bump DB schema version to
auto-reseed):

```ts
interface Partner {
  id: string;
  name: string;            // "Alpine Fleet Services"
  slug: string;            // "alpine" → simulated domain tolls.alpine.com
  logoDataUrl?: string;    // uploaded logo; monogram fallback if absent
  accentColor: string;     // hex, drives --brand-accent
  package: "basic" | "professional" | "enterprise";
  features: FeatureFlag[]; // derived from package, individually overridable
  status: "active" | "draft" | "suspended";
  entityIds: string[];     // tenant isolation: owned customer entities
  createdAt: string;
}
```

Seed: **MSTS** default brand (not a DB record; implicit, owns all entities,
all flags on) + 2 demo partners:

| Partner | Slug | Accent | Package | Entities |
|---|---|---|---|---|
| Alpine Fleet Services | `alpine` | green | Enterprise | e1, e2 |
| Nordkap Logistik | `nordkap` | blue | Basic | e3 |

An entity belongs to at most one partner.

## 2. Brand tokens & theming

`src/styles/globals.css` (`:root` and `.dark`) gains:

```css
--brand-accent: #FBCE07;        /* replaces shell-yellow at identity spots */
--brand-accent-deep: #F0B800;   /* hover/pressed */
--brand-on-accent: #1A1712;     /* text/icon on accent */
```

`tailwind.config.js` exposes `brand.accent`, `brand.accent-deep`,
`brand.on-accent`. Mechanical refactor swaps `shell-yellow` → `brand-accent`
**only in identity surfaces**: sidebar active state, login/MFA accents, stat
tiles, dashed rules, ticker, primary buttons, SignageHero, StatStrip, Step,
Tag. Semantic uses keep `shell-*`: critical/red badges, EU plate tiles,
country chips.

`--brand-on-accent` is computed from accent luminance (helper in
`src/lib/brand.ts`) so light accents get dark text and vice versa.

A BrandProvider effect in the app store (`src/app/store.tsx`) sets the vars on
`document.documentElement` when the active brand changes; MSTS default removes
the overrides. Light/dark themes untouched (neutrals stay platform-owned).

## 3. Entry flow (simulated partner domain)

- Login page reads `?partner=<slug>`; a mono-typeface **domain simulator**
  chip above the login card (`tolls.alpine.com ▾`) lists MSTS + active
  partners. Picking one updates the URL param and rebrands the login screen
  instantly (logo, accent, "Powered by MSTS Tolls" footnote for partners).
- Login → MFA → portal opens already scoped to the partner: their logo in the
  sidebar, accent everywhere, entity selector limited to `entityIds`
  (auto-select first), nav gated by package.
- `draft`/`suspended` partners are absent from the picker; direct URL shows a
  "portal unavailable" card.
- Active partner lives in the app store, **not persisted** (consistent with
  auth always starting at `/login`).

## 4. Admin console — "Whitelabel Partners"

`src/features/partners/`, route `/partners`, nav under **Administration**
(`sources: ["MyTolls"]`), **visible only under the MSTS brand**.

- **List page**: logo/monogram, name, simulated domain, package badge, entity
  count, status, created. Row actions: edit, preview, suspend/activate,
  delete (confirm dialog).
- **Create/Edit sheet** (existing form-sheet pattern), three tabs:
  - **Branding** — name, slug (auto-derived, editable), logo upload with live
    preview (data URL, RC-card-style), accent color picker + preset swatches,
    live mini-preview (sidebar + button in chosen brand).
  - **Package** — three-column Basic/Professional/Enterprise comparison (from
    the deck); selecting a tier shows its feature-flag checklist, flags
    individually togglable for custom deals.
  - **Customers** — checkbox list assigning entities (owned + unassigned).
- **Preview** → opens `/login?partner=<slug>` in a new tab (reuses the real
  entry flow; no separate preview renderer).
- Mock API: `GET/POST/PATCH/DELETE /api/partners` in `src/mocks/handlers.ts`;
  TanStack Query hooks in `src/hooks/api.ts`; persistence as usual.

## 5. Package gating

`src/lib/brand.ts` holds the package→flags map (single source of truth,
mirrored in the admin Package tab). Flags: `dashboard`, `vehicles`, `obu`,
`hauliers`, `products`, `domains`, `transactions`, `reports`, `finance`,
`users`, `onboarding`, `api-access`, `branded-invoicing`,
`scheduled-reports`.

Tier mapping (from the deck): **Basic** = `dashboard`, `vehicles`, `obu`,
`hauliers`, `products`, `domains` (Support/Account are always available and
not flagged); **Professional** = Basic + `transactions`, `reports`,
`branded-invoicing`, `scheduled-reports`; **Enterprise** = Professional +
`finance`, `users`, `onboarding`, `api-access`.

- `navForPortal()` takes the active brand; gated items disappear from sidebar
  **and** command palette; direct routes to a gated module render a "Not in
  your package — contact MSTS to upgrade" state.
- If all of a portal's modules are gated (e.g. MyMST under Basic), the portal
  switcher entry hides.
- MSTS default = all flags on → zero behavior change from today.

## 6. Branded exports & tenant isolation

- `src/lib/download.ts` export functions accept the active brand: with
  `branded-invoicing` on, PDF headers/footers show partner name + accent bar;
  otherwise neutral MSTS styling. CSV header comment line carries the partner
  name.
- Isolation rides the existing `entityId` scoping: entity selector under a
  partner lists only their `entityIds`; all modules already filter by selected
  entity, so isolation follows without touching module code. Global areas
  (products catalogue, domains) stay shared — the "unified backend" story.

## 7. Error handling

- Unknown/inactive `?partner` slug → neutral "portal unavailable" card on
  login.
- Logo upload: image-type validation, ~200 KB cap (protects localStorage),
  clear validation message.
- Deleting a partner releases its entities back to MSTS and invalidates
  affected queries.

## 8. Testing

- Manual test-plan additions (style of `docs/test-plan.md`): brand switch at
  login, per-tier package gating, tenant isolation checks, export branding,
  admin CRUD + persistence across reload, dark mode with a custom accent.
- Regression gate: `npm run build` (TypeScript + Vite) passes; MSTS default
  path renders identically to today.

## Out of scope

Real domains/DNS, real email comms, favicon/title swap, per-partner full
theme overrides, partner-side admin, real backend/tenant infrastructure.
