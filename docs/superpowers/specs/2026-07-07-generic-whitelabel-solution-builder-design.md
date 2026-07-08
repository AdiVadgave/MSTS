# Generic Whitelabel Solution Builder — Design Spec

**Date:** 2026-07-07 · **Branch:** `feat/white-labelling` · **Status:** Approved by user

Evolves the v1 whitelabeling feature (spec `2026-07-06-whitelabeling-design.md`,
shipped through commit `d30c837`) from "Shell's portals with a partner color"
into a **generic, configurable solution**: partners never see Shell's in-house
portal structure, an admin picks exactly which features a partner's solution
contains, and the partner chooses one of three design templates. Azure OpenAI
GPT-4o powers an optional setup assistant.

## Decisions (user-confirmed)

1. **Single unified partner portal** — no MyTolls/MyMST names, no portal
   switcher, generic module names. The two-portal split remains only in
   Shell's own MSTS view.
2. **Packages as starting points** — choosing Basic/Professional/Enterprise
   pre-selects a module set; the admin then freely adds/removes modules.
3. **3 visual design templates, one layout skeleton** — Signage (current),
   Executive (clean corporate light), Carbon (dark tech).
4. **Guided full-page Solution Builder wizard** in the admin console
   (replaces the edit sheet).
5. **AI: all three assists** — brand-from-logo, feature recommendation from a
   business description, generated portal copy — on the existing Express
   proxy with mock fallback.
6. **MSTS default is untouched**: Shell's view keeps both portals, the
   switcher, SourceTags, and the Signage look, pixel-identical.

## 1. Generic partner portal

When `activeBrand` is set, the app ignores the MyTolls/MyMST portal layer
entirely. A new `navForBrand(brand)` builds generic groups from the partner's
enabled modules:

| Group | Modules (generic label ← internal flag) |
|---|---|
| Overview | Dashboard ← `dashboard` |
| Fleet | Vehicles ← `vehicles` · Devices ← `obu` · Carriers ← `hauliers` |
| Tolling | Toll Products ← `products` · Toll Coverage ← `domains` |
| Billing | Transactions ← `transactions` · Reports ← `reports` · Invoices ← `finance` |
| Administration | Users & Access ← `users` · Customer Onboarding ← `onboarding` |
| General | Support · Account (always present) |

- Routes and page components are unchanged; only nav labels, palette labels,
  and `UpgradeState`'s module name switch to the generic names under a brand.
- **No portal switcher** in a partner session. The sidebar chip shows the
  partner's `portalName` instead of a portal name; `PortalIndex` under a
  brand lands on Dashboard if enabled, else the first enabled module.
- **SourceTag chips are hidden everywhere under a partner brand** (page
  headers, command palette, any list badges) — Shell-internal provenance.
- Partner record gains optional **portal copy**: `portalName` (default
  "<Company> Tolls"), `tagline`, `welcomeText` — used in the sidebar chip,
  login subtitle, and dashboard greeting. AI-generatable, manually editable.
- Empty nav groups (all modules of a group disabled) don't render.

## 2. Design templates

`designTemplate: "signage" | "executive" | "carbon"` on the partner; MSTS is
pinned to `signage`. Applied by the store as `data-theme="<template>"` on
`<html>`, alongside the existing brand accent vars and `dark` class.

| | Signage (default) | Executive | Carbon |
|---|---|---|---|
| Mood | highway-editorial (today) | clean corporate SaaS | dark tech console |
| Fonts | Archivo / Inter / JetBrains Mono | Inter throughout | Inter + mono data |
| Surfaces | warm paper; asphalt sidebar | cool white/slate; slate sidebar | near-black; dark cards |
| `--radius` | 0.6rem | 0.9rem | 0.3rem |
| Motifs | ticker, dashed rules, plate tiles | none — clean hairlines | thin accent lines |
| Default mode | light | light | dark-first |

Implementation:

- `globals.css` gains `[data-theme="executive"]` and `[data-theme="carbon"]`
  blocks that re-value the existing semantic tokens (`--background`, `--card`,
  `--sidebar*`, `--radius`, …) for light and dark. Signage is the
  unattributed default — zero change to today's CSS path.
- Under any partner brand, the **action color (`--primary`) becomes the
  partner's accent** (with computed readable foreground) instead of Shell
  red — buttons and focus rings carry the partner identity. MSTS keeps red.
- New font vars `--font-display` / `--font-body` / `--font-mono`;
  `tailwind.config.js` font families switch to `var(...)` with today's stacks
  as `:root` defaults.
- Signage-only motif components (Ticker, dashed rules `bg-signage-dash`
  accents, plate-style tiles, StatStrip numerals) render their decorated form
  only under Signage; Executive/Carbon get restrained equivalents (hairline
  rules, plain tiles). One conditional per motif component driven by a
  `useDesignTemplate()` helper.
- The light/dark toggle keeps working within every template; Carbon defaults
  a partner session to dark on login (user can toggle).

## 3. Solution Builder wizard

Full-page routes `/partners/new` and `/partners/:id/edit` (MSTS-brand-only,
same self-guard as the list page). The `PartnerSheet` side sheet is deleted;
the list page's Create/Edit actions navigate to the wizard. Four steps with a
persistent **live preview rail** (mini portal mock — sidebar + header + a
card — rendered in the current brand accent, logo, and template):

1. **Company & Brand** — name, simulated domain (slug), logo upload
   (validation rules unchanged from v1), accent swatches + custom color,
   status, customer-entity assignment (ownership warnings as in v1).
   **AI: "Extract brand from logo"** → suggested accent + palette + best-fit
   template with rationale; applying is one click, everything editable.
2. **Package & Features** — three package cards (pre-select module sets via
   the existing `PACKAGE_FEATURES`); full module checklist below with the
   generic names + one-line descriptions, freely editable after a package is
   picked. **AI: "Recommend from business description"** — textarea →
   proposed package + module set + one-line reasoning per module; applying
   sets the checklist.
3. **Design** — three template cards with real visual previews; selection
   restyles the preview rail live. **AI: "Generate portal copy"** →
   `portalName`, `tagline`, `welcomeText` proposed and inline-editable.
4. **Review & Launch** — summary (brand, modules by group, template,
   customers, package); Save creates/updates the partner; "Create & preview
   portal" also opens `/login?partner=<slug>` in a new tab.

Wizard state is local (single form object as in the v1 sheet); steps are
navigable back/forward; validation per step (name+slug on step 1) before
advancing. Edit mode hydrates from the record.

## 4. AI layer (Azure GPT-4o via existing proxy)

Three endpoints in `server/index.js`, same conventions as `/api/ai/rc-extract`
(real Azure call when `AZURE_OPENAI_*` env is set, deterministic realistic
mock otherwise; response carries `source: "azure-openai" | "mock"`; UI shows
the GPT-4o/Mock badge and a loading state):

- `POST /api/ai/brand-from-logo` — JSON `{ imageBase64 }` (same convention as `/api/ai/rc-card`) →
  `{ palette: string[], suggestedAccent: string, suggestedTemplate: "signage"|"executive"|"carbon", rationale: string, source }`
- `POST /api/ai/recommend-solution` — `{ description: string }` →
  `{ package: "basic"|"professional"|"enterprise", modules: FeatureFlag[], reasoning: { module: string, why: string }[], source }`
- `POST /api/ai/portal-copy` — `{ companyName: string, description?: string }` →
  `{ portalName: string, tagline: string, welcomeText: string, source }`

All three use JSON-constrained prompts (response_format json_object) and
validate/clamp outputs client-side (accent must be valid hex, modules must be
known flags) — invalid AI output degrades to "no suggestion", never to a
broken form. `/api/ai/*` already bypasses MSW.

## 5. Data model & persistence

`Partner` gains: `designTemplate` (default `"signage"`), `portalName?`,
`tagline?`, `welcomeText?`. Seeds: Alpine → `executive`, Nordkap → `carbon`
(so the demo shows all three templates incl. MSTS's Signage), with seeded
portal copy. DB schema version **v5 → v6** (auto-reseed). POST/PATCH
handlers accept the new fields; package/features semantics unchanged.

## 6. Carried over unchanged

Tenant isolation (fail-closed sentinel), login domain simulator + unavailable
card, branded exports behind `branded-invoicing`, admin list page (gains a
Template column), suspend/delete, persistence conventions.

## 7. Error handling

- AI endpoints: network/Azure failure → toast + form stays manual; mock mode
  clearly badged. Output validation as §4.
- Wizard: cannot advance past step 1 without name+slug; slug collisions
  surface on save (422 toast, stay on Review).
- A partner whose `designTemplate` is missing (pre-v6 data) is impossible —
  version bump reseeds; handlers default to `"signage"`.

## 8. Testing

- Gate per task: `npm run build`. Final task: playwright smoke — each
  template renders (assert `data-theme` + a token value per template), a
  partner portal shows no "MyTolls"/"MyMST"/SourceTag strings anywhere,
  wizard end-to-end create (mock AI), generic nav labels present, MSTS
  default unchanged.
- Test-plan additions for: wizard flow, template switching, generic naming,
  AI assists (mock + real), portal copy surfaces.

## Out of scope

Layout variants (top-nav), per-partner custom fonts, partner self-service
builder, real email sending, AI-generated imagery.
