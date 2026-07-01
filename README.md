# MSTS One — Unified Customer Portal

A modern, interactive prototype that consolidates the three legacy MSTS
tolling portals — **MyTolls**, **MyMST** and **Toll2.0** — into a single,
cohesive platform with one design system, one navigation model, and a
mock backend that behaves like the real thing.

> Frontend transformation prototype. React + Vite + TypeScript, Shell-branded
> "Refined Enterprise" design language. Backend is mocked (MSW) except the
> **RC-card AI extraction**, which calls a real Azure OpenAI GPT-4o deployment.

## Quick start

```bash
npm install
npm run dev          # starts Vite (5173) + AI proxy (8787) together
```

Open http://localhost:5173. Press **Ctrl-K / Cmd-K** anywhere for the command palette.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite web app **and** the AI proxy server (via `concurrently`) |
| `npm run dev:web` | Vite only |
| `npm run dev:api` | AI proxy only |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview the production build |

## Azure OpenAI (RC-card extraction)

The RC-card flow (Vehicles -> *Extract RC card*) sends the uploaded image to a
small **server-side** Express proxy (`server/index.js`) which calls your Azure
OpenAI GPT-4o vision deployment. The API key never reaches the browser.

Fill in `.env` (already created):

```
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o
AZURE_OPENAI_API_VERSION=2024-08-01-preview
```

Without credentials it automatically falls back to a realistic **mock**
extraction, so the prototype always works.

## Architecture

```
src/
  app/          # shell: sidebar, topbar, command palette, router, store, providers
  components/
    ui/         # design-system primitives (button, card, dialog, table, ...)
    common/     # DataTable, PageHeader, StatCard, StatusBadge, SourceTag, ...
    brand/      # MSTS/Shell logo
  features/     # one folder per module (self-contained)
    dashboard/ vehicles/ obus/ products/ domains/
    transactions/ reports/ hauliers/ finance/ users/
    onboarding/ support/ account/ misc/
  hooks/        # TanStack Query hooks (api.ts) + utilities
  lib/          # api client, types, query client, formatters, chart palette
  mocks/        # MSW handlers + faker seed data + in-memory stores
  styles/       # global CSS + design tokens
server/         # Express AI proxy (Azure OpenAI GPT-4o)
```

Every feature is a self-contained folder with its own MSW handlers, so new
modules slot in without touching the shell or design system.

## Portal consolidation map

| Unified module | Consolidates |
|---|---|
| Dashboard | Fleet overview & KPIs (Toll2.0) |
| Vehicles | MyTolls `mt_cust_truck_*` + Toll2.0 managevehicle + RC-card AI |
| OBU & Devices | Toll2.0 manageobu + Vision OBU module |
| Products & Ordering | MyTolls `mt_cust_product_*` |
| Domains | Toll2.0 domains + Vision domain module |
| Transactions | MyMST `cust_trx` |
| Reports | MyMST `report_*` |
| Hauliers | MyTolls `mt_cust_cntr_haulier_*` |
| Invoices & AR | MyMST `cust_invoice` / `cust_ar` / `cust_account` |
| Users & Access | Vision user management |
| Onboarding | Vision auto-onboarding (VAT validation + guided setup) |
| Support / Account | Toll2.0 mysupport + MyTolls account settings |

Subtle **source tags** (MyTolls / MyMST / Toll2.0) throughout indicate which
legacy portal each area originated from.
