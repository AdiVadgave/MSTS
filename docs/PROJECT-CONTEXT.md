# MSTS One — Project Context & Handoff

A single reference capturing **what this project is, every major decision, the
architecture, what was built, and the current state.** Written so a teammate (or
a future session) can pick it up cold.

> **TL;DR** — A production-quality **frontend prototype** that consolidates three
> legacy MSTS tolling portals (**MyTolls, MyMST, Toll 2.0**) into one unified,
> Shell-branded portal called **MSTS One**. React + Vite + TypeScript, a mock
> backend (MSW + localStorage) that behaves like the real thing, plus **one real
> integration**: Azure OpenAI GPT-4o for RC-card extraction.

---

## 1. The brief

Shell subsidiary **MSTS** runs three customer-facing tolling portals, each with
its own UI/UX and no consistency:

- **MyTolls** — legacy `cgi-bin` customer portal (vehicles, hauliers, tolling products).
- **MyMST** — legacy portal embedded in MyTolls (transactions, invoices, reporting, finance).
- **Toll 2.0** — a modern Vue/uPortal rebuild, but only rolled out for a specific supplier/product.

**Goal:** consolidate all three into one modern, consistent, interactive portal
with a **mock/dummy backend** (frontend-focused; no real backend required). The
result should feel like a production-ready application prototype.

**Locked-in decisions (from the user):**
- Stack: **React + Vite + TypeScript**.
- Visual identity: the Shell **"highway-signage"** look from a supplied
  `msts-tolls-landing.html` reference (not the initial "refined enterprise" look).
- Scope: cover the functionality of all three portals; the full module inventory
  came from `MSTS One - Consolidated Inventory.docx`.
- Where AI is needed, use **Azure OpenAI** (`gpt-4o`) via a `.env` the user fills.

---

## 2. How to run

```bash
npm install
npm run dev          # Vite web app (5173) + Express AI proxy (8787), via concurrently
```
Open http://localhost:5173.

- **Demo login (pre-filled):** email `demo@mstsone.eu`, password `msts1234`.
- **MFA code (pre-filled):** `123456`.
- After login → **MFA** → **portal launcher** (pick MyTolls / MyMST / Toll 2.0).
- **⌘K / Ctrl-K** opens the command palette.
- **Azure keys** go in `.env` (`AZURE_OPENAI_*`); without them RC extraction falls back to a realistic mock.
- If a page ever looks empty/broken after code changes: **hard refresh (Ctrl+Shift+R)** — the mock service worker can go stale (console shows `[MSW] Unhandled API call…`).
- **Reset demo data:** Account → Preferences → *Reset demo data*.

Repo: `c:\Users\AV115297\Desktop\MSTS` · working branch: `feat/backend-fixes`.

---

## 3. Tech stack

| Concern | Choice |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS + shadcn-style Radix primitives |
| Data layer | TanStack Query |
| Mock backend | **MSW** (Mock Service Worker) intercepting `/api/*` |
| Seed data | `@faker-js/faker` (deterministic seed) |
| Persistence | `localStorage` (`msts-db`) — survives reload |
| Forms | react-hook-form + zod |
| Charts | Recharts |
| Motion | framer-motion |
| PDF/exports | jsPDF (+ CSV/XLS generators) |
| Routing | react-router-dom v6 |
| Real AI | **Express proxy** (`server/index.js`) → Azure OpenAI GPT-4o |

The `/api/ai/*` path bypasses MSW and hits the Express proxy; everything else is
mocked in the browser.

---

## 4. Design system (Shell "highway-signage")

Tokens live in `src/styles/globals.css` + `tailwind.config.js`.

- **Palette:** asphalt `#161310` / `#211D18` (dark grounds), paper `#FAF7F0`,
  Shell **yellow `#FBCE07`** (accent), **red `#DD1D21`** (action/critical),
  green `#3FB984` (good), sign-blue `#1B3A8B` (EU plate strip), warm greys.
- **Type:** **Archivo** (black display headings), **Inter** (body),
  **JetBrains Mono** (eyebrows, labels, data). System fallbacks in the deck.
- **Motifs:** mono uppercase eyebrows, EU license-plate tiles (`Plate.tsx`),
  country signage chips, 78/80px gridline stripes, dashed-yellow rules,
  asphalt+yellow stat tiles, a scrolling **ticker** of toll domains.
- Deep-asphalt sidebar with **yellow** active state; light + dark themes.

---

## 5. Architecture & folder map

```
src/
  app/            shell: Sidebar, Topbar, CommandPalette, AppLayout, router, store, providers, nav, portals
  components/
    ui/           design-system primitives (button, card, dialog, table, select, …)
    common/       DataTable, PageHeader, StatCard, StatusBadge, SourceTag, Plate, Field, EmptyState, …
    signage/      Ticker, SignageHero, StatStrip, Tag, Step
    brand/        Logo
  features/       one folder per module (self-contained: page + sheets/dialogs + local hooks)
    dashboard/ vehicles/ obus/ hauliers/ products/ domains/
    transactions/ reports/ finance/ users/ onboarding/ support/ account/ auth/ launcher/ misc/
  hooks/          api.ts (all TanStack Query hooks) + useDebounced
  lib/            api client, types, query client, eligibility, download, chart, utils
  mocks/          db.ts (seed) · persistence.ts · handlers.ts · helpers.ts · catalog.ts · browser.ts
server/           Express AI proxy (Azure OpenAI GPT-4o)
docs/             this file + existing-portals, test-plan, test-plan-robustness
```

**Mock backend flow:** component → hook (`hooks/api.ts`) → `lib/api.ts` fetch →
MSW handler (`mocks/handlers.ts`) → in-memory `db` (`mocks/db.ts`) → `persist()`
writes the whole DB to `localStorage`. Swapping in a real backend = replace this
one layer; the hook/type contracts stay.

---

## 6. Modules (13) + portal segregation

Each portal shows only its own modules in the sidebar + a shared **General**
group (Support, Account). The top-bar **portal switcher** hops between them
without re-login; **⌘K** is scoped to the active portal.

| Module | One-liner | Portals |
|---|---|---|
| **Dashboard** | Fleet overview: KPIs, spend charts, fleet status, activity | MyTolls, Toll 2.0 |
| **Vehicles** | Create/update/search vehicles; AI RC-card; bulk load; Product Helper | MyTolls, Toll 2.0 |
| **OBU & Devices** | Assign/suspend/replace/track on-board units & tags | Toll 2.0 |
| **Hauliers** | Manage carrier/owner companies | MyTolls |
| **Products & Ordering** | Catalogue + order/block products per vehicle (eligibility) | MyTolls |
| **Domains** | Coverage explorer: toll schemes, tech (GNSS/DSRC), status | Toll 2.0 |
| **Transactions** | Search/reconcile toll passages; CSV export | MyMST |
| **Reports** | Run + export (CSV/XLSX/PDF); **Scheduled reports** | MyMST |
| **Invoices & AR** | Invoices, pay/dispute, invoice + statement PDFs | MyMST |
| **Users & Access** | Invite users, roles, permissions | Toll 2.0 |
| **Onboarding** | Guided self-registration + VAT validation → creates an entity | Toll 2.0 |
| **Support** | Help center, guides, manuals, ticket submission | all (General) |
| **Account** | Entity/profile/security/preferences + reset demo data | all (General) |
| **Whitelabel Partners** | Partner branding, packages/feature flags, tenant assignment | Solution Studio (`/studio`, standalone — entered from the login screen, outside all portals) |

---

## 7. Key features & how they work

- **Auth (mock):** login → MFA (6-digit) → portal launcher. Credentials/MFA are
  demo-checked, pre-filled. **Session is intentionally NOT persisted** — opening
  the app always starts at `/login` (a deliberate change; see §9). Theme and
  selected entity *are* persisted.

- **Entity / customer scoping:** the top-bar entity selector is a **real data
  scope**. Every record (vehicles, OBUs, transactions, invoices, hauliers,
  orders) carries an `entityId`; switching entity refetches and filters all
  modules + dashboard/analytics/reports. Per-entity counts reconcile to the
  global totals (see §8). Global areas (products, domains, users, account) are
  not scoped.

- **Persistence:** entire mock DB serialized to `localStorage` under `msts-db`
  with a schema **version** (currently **v6** — added `designTemplate`,
  `portalName`, `tagline`, `welcomeText` to partners for the generic Solution
  Builder, up from v5). Bumping the version auto-reseeds. Every mutation calls
  `persist()`. **Reset demo data** reseeds from scratch.

- **RC-card AI extraction (real):** Vehicles → *Extract RC card* → uploads the
  image to `server/index.js`, which calls Azure OpenAI **GPT-4o vision** and
  returns structured fields to pre-fill the vehicle form. Falls back to a
  realistic mock when Azure isn't configured. Shows a live 3-step pipeline and a
  GPT-4o/Mock badge + confidence.

- **Product eligibility:** each product defines `eligibleTypes` + `countries`
  (`mocks/catalog.ts`). `lib/eligibility.ts` computes per-vehicle status:
  **available / existing / ineligible (reason) / blocked (missing attributes)**.
  Enforced in the UI *and* the backend (ineligible orders → 422). Surfaced as a
  per-vehicle **Product Helper** tab; ordering an eligible product marks it
  *existing* on the vehicle.

- **Order-after-create:** creating a vehicle auto-opens its detail on the
  **Products** tab so you can order eligible products immediately. (A vehicle
  missing its EURO norm correctly shows "Complete attributes" and blocks
  ordering — expected behavior.)

- **Real file exports:** `lib/download.ts` produces genuine **CSV**, Excel-
  openable **.xls**, and branded multi-page **PDF** (jsPDF) files — used by
  Reports, Transactions export, and Finance (invoice + statement PDFs). All
  entity-scoped.

- **Scheduled reports:** a persisted schedule manager (report + format +
  cadence) with **Run now** (downloads the real file), **pause/resume**, and
  **delete**; entity-scoped; shows next/last run. *Caveat:* it doesn't fire on a
  real timer (needs a server-side cron); everything else is real.

- **Command palette (⌘K), notifications (mark-all-read), activity feed,
  responsive layout, light/dark themes** — all wired to real state.

- **Whitelabeling (partners) — generic Solution Builder:** brand entry via
  `/login?partner=<slug>` (or the login page's domain-simulator dropdown),
  driving a **CSS-variable brand layer** (`--brand-accent`, `--primary`, etc.,
  see `lib/brand.ts`) that recolors the login, sidebar, dashboard tiles, and
  exports — the partner's `accentColor` drives `--primary` directly (buttons,
  links, focus rings), replacing Shell red. Partners get a **fully generic
  portal** (`navForBrand()` in `app/nav.ts`): no MyTolls/MyMST/Toll2.0
  structure, generic module names (Devices, Carriers, Toll Products, Toll
  Coverage, Invoices, Customer Onboarding) grouped as Overview/Fleet/Tolling
  /Billing/Administration/General, no portal switcher, and `SourceTag` chips
  hidden (MSTS-only affordance). Portal copy surfaces the partner's own
  strings: sidebar chip = `portalName`, a tagline bar = `tagline`, login
  subtitle + dashboard hero lede = `welcomeText`.
  Three **design templates** apply via a `data-theme` attribute + token
  blocks in `globals.css`: **Signage** (default, MSTS's own look — warm
  paper/asphalt), **Executive** (clean corporate SaaS, light), and **Carbon**
  (dark tech console, **dark-first** — sets `dark` automatically for the
  session, scoped to that login only, not a sticky global preference).
  Each partner has a **package** (Basic/Professional/Enterprise) whose
  feature flags gate sidebar entries, ⌘K results, and direct routes (blocked
  routes render an `UpgradeState` card); empty nav groups are omitted
  entirely rather than shown disabled. **Tenant isolation** is enforced via
  each partner's `entityIds`. Branded PDF/CSV exports are gated behind the
  `branded-invoicing` feature flag.
  Admin CRUD lives in the standalone **Partner Solution Studio** at
  `/studio` — deliberately OUTSIDE the customer portal product (no portal
  nav entry). Entry: the "Partner Solution Studio →" link on the MSTS login
  card (sign-in + MFA then land in the studio), or the profile-menu
  "Solution Studio" item from an MSTS portal session. The studio has its own
  minimal shell (slim asphalt top bar, no sidebar/entity scope) containing
  the partners list plus the 4-step **Solution Builder wizard** at
  `/studio/new` and `/studio/:id/edit` (Company & Brand → Package &
  Features → Design → Review & Launch, with a live preview rail), replacing
  the old 3-tab editor sheet. Three `/api/ai/*` assists wire into the wizard — **brand-from-logo**
  (step 1, suggests accent + template from an uploaded logo), **recommend-
  solution** (step 2, suggests a package + module set from a free-text
  business description), and **portal-copy** (step 3, drafts
  portalName/tagline/welcomeText) — all hitting real **Azure OpenAI GPT-4o**
  when `.env` keys are set (confirmed live during this build: GPT-4o badges
  on all three calls) with a realistic mock fallback otherwise.
  The mock DB schema is now **v6** (adds `designTemplate`, `portalName`,
  `tagline`, `welcomeText` to partners); bumping from v5 auto-reseeds. Seeds:
  **Alpine Fleet Services** (`alpine`, green `#2F7D4F`, Executive template,
  Enterprise package, entities e1+e2) and **Nordkap Logistik** (`nordkap`,
  blue `#1B5FAA`, Carbon template, Basic package, entity e3).

---

## 8. Data model & seed "golden numbers"

Three demo entities (customers), each with its own scoped data. After a fresh
**Reset demo data**:

| Entity | Vehicles | Transactions | Invoices |
|---|---|---|---|
| `13768 | NVD Stage BP 1` (e1) | 28 | 137 | 6 |
| `11769 | Automation Foreign Std` (e2) | 24 | 114 | 6 |
| `20452 | Meridian Logistics` (e3) | 16 | 89 | 6 |
| **Global total** | **68** | **340** | **18** |

Also seeded: 82 OBUs, 24 hauliers, 8 toll domains, 22 orders, 9 users,
notifications, activity, and a few scheduled reports.

`localStorage` keys: `msts-db` (data, versioned), `msts-theme`, `msts-entity`.

---

## 9. Notable fixes & decisions (chronological)

1. **Built greenfield** — scaffold, design system, app shell, mock backend,
   then all modules.
2. **Design pivot** — reskinned from a blue "refined enterprise" look to the
   Shell **highway-signage** identity (Archivo/mono, asphalt+yellow, plates,
   ticker, coverage explorer, consolidated-invoice card).
3. **Colleague's branch (`feat/backend-fixes`)** — added the **auth flow**
   (login/MFA/launcher), **portal segregation**, and portal switcher. Analyzed
   and kept.
4. **"Make it a real product"** — replaced toast-only fakes with a **persistence
   layer** (localStorage) + real CRUD, real exports, support tickets, account
   save, onboarding-creates-entity.
5. **Auth not persisted** — opening the app now always lands on `/login`
   (previously it silently resumed the last portal).
6. **Entity scoping** — wired the entity selector to actually filter all data.
7. **Product eligibility** — per-vehicle orderable product rules + Product Helper.
8. **Name change** — demo user "Aman" → **Lars Jansen** (Dutch, fits NVD).
9. **Bug fixes:**
   - *MyMST empty* → stale `msts-db` (pre-entityId) filtered out by scoping;
     fixed by bumping persistence version so it reseeds.
   - *Login fields looked empty* → in **dark mode**, `text-foreground` on a
     white input rendered white-on-white; fixed with fixed-dark `text-shell-ink`
     on all white inputs; also disabled autofill interference and added a visible
     demo-credentials note.
   - *"No order button after create"* → auto-open Products tab; the specific
     vehicle was legitimately blocked (missing EURO norm) — correct behavior.
   - *MSW stale-worker* → clearer console warning instead of silent failure.
10. **Scheduled reports** — turned the placeholder button into a real, persisted
    feature.
11. **Dashboard added to MyTolls** — previously Toll 2.0-only.

---

## 10. Real vs simulated (don't file as bugs)

- **Real:** all CRUD + persistence, entity scoping, eligibility enforcement,
  file exports (CSV/XLS/PDF), RC-card extraction (Azure GPT-4o when keys set).
- **Simulated (no backend):** login / MFA / password / 2FA, "resend code",
  "resend invite" (no email), scheduled reports don't fire on a real timer;
  multi-tab demo caveat — each tab hydrates the mock DB from localStorage
  once, so mutations in a partner-preview tab and the admin tab can
  overwrite each other; refresh the other tab after cross-tab changes.

---

## 11. Deliverables & docs

- **App** — the running prototype (this repo).
- `README.md` — quick start + architecture.
- `docs/existing-portals.md` — feature/module reference for the **legacy** portals.
- `docs/test-plan.md` — full **functional** manual test plan.
- `docs/test-plan-robustness.md` — **robustness / edge-case** plan (Plan B) for a second tester.
- `docs/PROJECT-CONTEXT.md` — this document.
- **Pitch deck (Artifact):** 4-slide deck at
  `https://claude.ai/code/artifact/6428bb4d-71ca-49ad-82c1-9c3f2eb84830`
  (cover → problem → solution → outcome).
- Plan file: `C:\Users\AV115297\.claude\plans\we-have-the-following-piped-raccoon.md`.

---

## 12. Open items & next steps

- **Wire the real backend** — swap the MSW/`db` layer for the live TTT / CQRS
  services; hook + type contracts already match.
- **Confirm Toll 2.0's pilot supplier/product** — the source docs say "a specific
  supplier and product" but never name it (TBC with the product team).
- **Remaining sync gaps (deferred by choice):** invoices aren't derived from
  transactions; vehicle↔OBU↔domain links are loosely seeded.
- **Real scheduling** — scheduled reports need a server-side cron to actually fire.
- **Auth/payments/email** — currently simulated; need real services for production.
- Optional: extend "jump to Products" to the RC-card and bulk-upload flows;
  cross-link ordering an OBU product to a created device record.

---

## 13. Glossary

- **OBU** — On-Board Unit: the in-cab device that pays tolls automatically
  (GNSS = satellite/distance, DSRC = microwave gantry). Managed in *OBU & Devices*.
- **Entity** — a customer/company account (e.g. `13768 | NVD Stage BP 1`); the
  data-scoping context selected in the top bar.
- **Domain** — a national toll scheme/operator (e.g. Germany · Toll Collect).
- **Haulier** — a carrier company / sub-contractor under a customer.
- **RC card** — vehicle Registration Certificate; the AI extraction source.
- **TTT** — the underlying MSTS back-office platform (CRM, Product, ETL, Billing, AR).
