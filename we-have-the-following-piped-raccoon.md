# MSTS Tolls — Unified Portal Prototype

## Context

MSTS (a Shell subsidiary) runs **three** customer-facing portals with inconsistent, fragmented UX:

- **MyTolls** — legacy `cgi-bin` customer portal: vehicle create/update, product ordering (MST Card, Eurovignette, OBUs, T-Tag, vignettes). Dense, dated forms.
- **MyMST** — legacy `cgi-bin` admin/reporting portal embedded in MyTolls: customer data, transactions, billing, collections, A/R, fees, report catalog. Crowded left-nav, raw report links.
- **Tolls 2.0** — modern Vue/uPortal app (clean tables, cards, icons) covering only a slice (Manage Vehicles) for a specific supplier/product. This is the **design target**.

The backend platform (**TTT**) is organized into four functional pillars — **CRM, Product Management, ETL/Transactions, Billing & AR** — plus an Azure Foundry GPT‑4o vision service for **RC‑card extraction**.

**Goal:** Consolidate all three portals into one unified, modern, responsive React prototype with a single design system and navigation shell, driven entirely by a **mock backend** (no real integration). Output should feel production-ready and demonstrate improved navigation, clarity, and interactivity.

**Decisions locked in (from user):**
- Stack: **React + Vite + TypeScript**
- Branding: **Modern MSTS brand** (teal/navy identity from title slides, refreshed)
- Scope: **cover all functionality** of the three portals. Full detailed module/feature list will be supplied later — architecture must be extensible to absorb it.

---

## Tech Stack

- **React 18 + Vite + TypeScript** — app foundation
- **Tailwind CSS + shadcn/ui** (Radix primitives) — design system & accessible components
- **React Router v6** — routing / nested layouts
- **TanStack Query** — data-fetching/cache layer (talks to mock API as if real)
- **MSW (Mock Service Worker)** — intercepts `fetch` to simulate a REST backend (latency, errors, pagination)
- **@faker-js/faker** — seed realistic dummy data (vehicles, customers, transactions, invoices)
- **react-hook-form + zod** — forms & validation (vehicle/product/customer forms)
- **Recharts** — analytics/report charts
- **lucide-react** — icon set

Rationale: matches the modern, card+table feel of Tolls 2.0 while giving the fastest path to a polished, clickable prototype. MSW makes mocked data behave like a production API so swapping in the real TTT/CQRS API later is a localized change.

---

## Architecture

### App shell (modeled on Tolls 2.0)
- **Left sidebar** — icon nav, collapsible, module sections
- **Top bar** — entity/customer selector (e.g. "13768 | NVD Stage BP 1"), global search, language switcher, notifications, profile menu
- **Content area** — breadcrumb + page header with primary actions; consistent table/card/detail patterns

### Module map (covers all three portals' functionality)
1. **Dashboard** — KPIs, recent activity, quick actions, alerts (vehicles missing attributes, pending invoices)
2. **Customers / CRM** — customers, addresses, contacts, bank accounts, fees & commissions, customer reports
3. **Vehicle Management** — list/search, create/update vehicle, owners, bulk load/update, "missing attributes" & "pending deactivation" views (unifies MyTolls + Tolls 2.0)
4. **Product Ordering** — product catalog (MST Card, Eurovignette, HGV Levy, Satellic OBU, Go‑Box, Telepass, MYTO CZ OBU, HU‑GO OBU, Fréjus, T‑Tag, etc.), order/block mode, deposits, embossing, mutations, product reports
5. **Transactions (ETL)** — processing, verification, resubmission/adjustment, reconciliation, transaction reports
6. **Reports & Analytics** — report catalog from MyMST (Transactions, Unbilled, Toll Collect, Eurovignette, Turnover Analysis, Card Turnover Comparison, etc.) with filters, charts, CSV/PDF export simulation, scheduled reports
7. **Billing** — exchange rates, pricing, invoice generation, direct debit creation, invoice transmission, billing reports
8. **Accounts Receivable** — collections, stornos, invoice disputes, AR reports
9. **RC Card AI Extraction** — upload RC card image → simulated GPT‑4o vision extraction → structured JSON → prefilled vehicle/registration form (mirrors the Azure Foundry dataflow slide)

### Folder structure
```
src/
  app/                # router, providers, layout shell (sidebar, topbar)
  components/ui/      # shadcn/ui primitives
  components/common/  # DataTable, PageHeader, StatCard, EmptyState, Drawer, etc.
  features/
    dashboard/
    customers/
    vehicles/
    products/
    transactions/
    reports/
    billing/
    receivables/
    rc-card/
  mocks/
    browser.ts        # MSW worker setup
    handlers/         # one handler file per resource
    data/             # faker seed generators + in-memory stores
  lib/                # api client, query keys, formatters, types
  theme/              # MSTS design tokens (colors, typography, spacing)
```

Each feature folder is self-contained (routes, components, hooks, types) so the later full feature list drops in as new feature folders + handlers without touching the shell.

### Design system — Modern MSTS brand
- Tokens derived from MSTS identity: deep teal/navy primary (`~#0d3b4c` / `#0e4a5f`), clean neutrals, single bright accent, semantic success/warning/error
- MSTS logo in topbar/sidebar; light theme matching Tolls 2.0 polish
- Consistent components: data tables (sort/filter/paginate), forms (sectioned, inline help/tooltips like the "Product Helper" panel), status badges, drawers/modals, toasts
- Responsive (sidebar collapses, tables scroll/stack on mobile) and accessible (Radix + keyboard/focus states)

### Mock backend
- MSW handlers per resource with realistic latency + occasional simulated errors
- Faker-seeded in-memory stores; mutations (create/update/order) persist in-session so workflows feel real
- TanStack Query hooks consume these endpoints — UI is fully decoupled from mock vs real API

---

## Build phases

1. **Scaffold & design system** — Vite+TS+Tailwind+shadcn, MSTS theme tokens, app shell (sidebar/topbar/layout), routing skeleton, MSW bootstrap.
2. **Shared primitives** — DataTable, PageHeader, StatCard, FormSection, StatusBadge, Drawer/Modal, toast; faker data + base MSW handlers.
3. **Core modules** — Vehicle Management (full CRUD + bulk + owners) and Product Ordering (catalog + order/block mode) as the flagship flows; Dashboard.
4. **Data & admin modules** — Customers/CRM, Transactions, Reports & Analytics (with charts + export simulation).
5. **Financial modules** — Billing and Accounts Receivable.
6. **RC Card AI extraction** — upload → simulated extraction → prefilled form.
7. **Polish** — empty/loading/error states, responsiveness, accessibility pass, demo seed data, walkthrough-ready.

> When the full functional list arrives, it maps onto phases 3–6 (new feature folders + MSW handlers); the shell and design system from phases 1–2 remain unchanged.

---

## Verification

- `npm run dev` launches the app; MSW intercepts all API calls (no real backend).
- Click-through each module: navigate via sidebar, run a full workflow (e.g. create a vehicle → order a product → view it in a report → generate an invoice).
- Confirm mocked mutations persist in-session and reflect across views.
- Check responsive behavior (resize to mobile) and keyboard navigation/focus.
- `npm run build` + `npm run preview` to confirm a production build serves cleanly.
- Optional: Playwright smoke test covering one end-to-end workflow per module.

## Open item
- Awaiting the **complete functional/module list** across MyTolls, MyMST, and Tolls 2.0 from the user to finalize the exact screens and fields per module. The architecture above is built to absorb it without rework.
