# MSTS Existing Portals — Feature & Module Reference

> A functional walkthrough of the **three portals that exist today** — MyTolls,
> MyMST and Toll 2.0 — module by module, feature by feature.
>
> This documents the **current/legacy systems only**. It intentionally does **not**
> describe the unified "MSTS One" vision portal we are building. Use it to
> understand what each existing screen does and where its functionality should
> land in the consolidation.

---

## How to read this document

Each feature lists:

- **Feature** — the screen/action as the user experiences it.
- **Program / route** — the underlying CGI program (`mt_cust_*`, `cust_*`) or
  Apereo uPortal flow (`f/*`) discovered during portal research.
- **What it does** — the functional purpose in plain language.

**Sources of truth**

| Portal | System crawled | Coverage |
|---|---|---|
| MyTolls | MSTS CGI portal `msettt.beta.mststolls.com`, `mt_cust_*` programs | 41 distinct screens |
| MyMST | Same MSTS CGI portal, `cust_*` / `*mymse*` programs | (subset of the 41) |
| Toll 2.0 | `staging.tollseu.mststolls.com` (Apereo uPortal, Vue SPA) | 54 pages, module-level |

**Attribution note.** The crawled portals carry no product labels, so features are
attributed by URL naming convention: `mt_cust_*` → **MyTolls**, `cust_* / *mymse*`
→ **MyMST**, the tollseu uPortal → **Toll 2.0**.

**Coverage caveats.** Toll 2.0 portlets are JavaScript-rendered, so its inner
functionality was captured at **module level** only. Research is post-login
(registration/onboarding flows were not reachable), and link-based discovery may
under-represent actions hidden behind JS-only buttons.

---

## Background: the TTT platform the portals sit on

All three portals are front-ends over the same back-office platform (**TTT**),
which is organised into five functional pillars. Knowing these makes each portal
feature easier to place:

| Pillar | Responsibility |
|---|---|
| **CRM** | Customers, addresses, contacts, bank accounts, truck (vehicle) management, customer fees & commissions |
| **Product Management** | Product orders, deposits, embossing, mutations (toll cards, OBUs, vignettes) |
| **ETL** | Transaction processing, verification, resubmission/adjustment, reconciliation |
| **Billing** | Exchange rates, "who gets" allocation, pricing, invoice generation, direct debit, invoice transmission |
| **AR (Accounts Receivable)** | Collections, stornos (reversals), invoice disputes, AR reporting |

Roughly: **MyTolls** is the customer-facing CRM + Product surface, **MyMST** is the
Transactions + Billing + AR + reporting surface, and **Toll 2.0** is a modern
re-skin covering a slice of operational modules for a specific supplier/product.

---

# 1. MyTolls — legacy customer portal

**Source:** MSTS CGI portal, `mt_cust_*` programs. The richest functional surface
of the three — a full vehicle lifecycle, the tolling product catalogue, and
haulier/account management. Shell-branded, dense single-page forms served from
`cgi-bin`.

## 1.1 Vehicle Module

The core of MyTolls: register and maintain the trucks/vehicles that toll products
are attached to. (In the legacy screenshot this is the "Update Vehicle" screen
with a **Product Helper** panel showing which products a vehicle is eligible for.)

| Feature | Program / route | What it does |
|---|---|---|
| Vehicles list / home | `mt_cust_truck_home_all`, `mt_cust_truck_home` | Landing grid of all vehicles on the account; entry point to every vehicle action. |
| Create vehicle | `mt_cust_truck_entry_new` | Register a new vehicle — plate, country, type, technical attributes (EURO norm, axles, weight, CO₂ class, VIN). |
| Update vehicle | `mt_cust_truck_entry_update`, `mt_cust_truck_update`, `mt_cust_context` | Edit an existing vehicle's attributes; `mt_cust_context` sets the working vehicle/context for dependent screens. |
| Search & filter vehicles | `mt_cust_truck_search_all`, `mt_cust_truck_search` | Find vehicles with multi-column sort and filters (status, country). |
| Vehicle change history / audit | `AUDIT_LIST` (on the vehicles list) | View the audit trail of changes made to a vehicle over time. |
| Vehicle Owners management | `mt_cust_manage_owners` | Maintain the owner(s) associated with vehicles (ownership records used for tolling/registration). |

## 1.2 Products & Tolling Domains

Order and manage the actual tolling products/devices per vehicle. This is where a
vehicle is enrolled in (or blocked from) national toll schemes. The legacy
Product Helper uses an **Order mode / Block mode** toggle per product.

| Feature | Program / route | What it does |
|---|---|---|
| Products list / home | `mt_cust_product_home_all`, `mt_cust_product_home` | Overview of products active/available across the fleet. |
| Order Cards / Boxes | `mt_cust_product_order` | Procure physical devices — toll cards and on-board units (OBUs/boxes). |
| Order Eurovignette | `mt_cust_product_ev_order` | Purchase the time-based Eurovignette road-user charge for eligible vehicles. |
| Manage Eurovignette | `mt_cust_product_evsp_manage` | Administer existing Eurovignette subscriptions (renew, adjust, review). |
| Manage OBU Domains | `mt_cust_product_obu_domain_manage` | Maintain OBU-to-toll-domain relationships — which national schemes each device is enabled for. |
| Order Bulgarian Route Pass | `mt_cust_product_order_route_pass` | Buy a route-based pass for the Bulgarian toll network. |
| Register HU-GO Payment | `mt_cust_product_hugo_payment`, `…_all` | Register/top-up payment for Hungary's HU-GO distance-based e-toll. |
| Italian Rebates | `mt_cust_product_italian_rebates` | Manage the Italian toll rebate scheme for eligible mileage. |
| Search Product | `mt_cust_product_search_all`, `mt_cust_product_search` | Locate products across vehicles by attribute/status. |
| Modify Product | `mt_cust_product_change` | Change an existing product's configuration on a vehicle. |
| Security & Purchase Control | `mt_cust_product_card_security` | Card security and purchase-control settings (limits/controls on card use). |

## 1.3 Haulier Module

Manage hauliers (the carrier companies / sub-contractors) beneath the account.

| Feature | Program / route | What it does |
|---|---|---|
| Hauliers list / home | `mt_cust_cntr_haulier_home` | List of hauliers linked to the customer/controller. |
| Create Haulier | `mt_cust_cntr_haulier_create` | Add a new haulier record. |
| Update Haulier | `mt_cust_cntr_haulier_update` | Edit an existing haulier's details. |
| Search Haulier | `mt_cust_cntr_haulier_search` | Find hauliers by name/attributes. |

## 1.4 Support & Account Settings

Account-level utilities and help.

| Feature | Program / route | What it does |
|---|---|---|
| Support home | `mt_cust_support_home` | Support landing page for the customer. |
| Home / News | `news.cgi`, `news` | Portal home with news/announcements. |
| Change password | `fw_user_password_change` | Update the login password. |
| Change security challenge | `fw_user_challenge_change` | Update the security question/challenge used for account recovery. |

---

# 2. MyMST — legacy financial, transactional & reporting portal

**Source:** MSTS CGI portal, `cust_*` and `*mymse*` programs. Embedded within /
reachable from MyTolls (there is a **"Go to MyTolls"** link and vice-versa). This
is the **financial and reporting backbone**: transactions, invoices, balances and
the report catalogue. Its legacy screenshot shows a dense blue/yellow left-nav
menu and a "Report Listing" of downloadable reports.

## 2.1 Financials

| Feature | Program / route | What it does |
|---|---|---|
| Invoices | `cust_invoice` | View issued invoices; drill into invoice detail; source of invoice downloads. |
| Account balance (AR) | `cust_ar` | The accounts-receivable balance — what is owed/outstanding on the account. |
| Account overview | `cust_account` | Consolidated account summary (status, balances, key figures). |

## 2.2 Transactions

| Feature | Program / route | What it does |
|---|---|---|
| Transaction search & history | `cust_trx` | Search and browse toll transactions (passages) with history — the raw usage that feeds billing. |

## 2.3 Reporting

The reporting engine, plus the concrete report catalogue seen in the "Report
Listing" screen.

| Feature | Program / route | What it does |
|---|---|---|
| Reports listing | `report_listing_mymse`, `cust_report` | The catalogue of available reports (the "Report Listing" screen). |
| Report selection (parameterized) | `report_param` | Configure a report's parameters (date range, scope) before running it. |
| Scheduled Reports | `cust_schedule` | Set reports to generate automatically on a schedule. |
| File export / download | `cust_invoice.cgi?ACTION=GET_FILE` | Download generated files (e.g. invoice dumps / report exports). |

**Report catalogue (from the Report Listing screen):**

| Report | Purpose |
|---|---|
| Transactions Report | All toll transactions for a period. |
| Unbilled Transactions Report | Transactions loaded but not yet invoiced. |
| Toll Collect Abschläge Report | German Toll Collect instalment/deduction breakdown. |
| Download Toll Collect CSV | Raw Toll Collect export file. |
| Eurovignet Report | Active Eurovignette coverage per vehicle. |
| Turnover Analysis Report | Spend broken down by product, country and period. |
| Card Turnover Comparison Report | Period-over-period card spend comparison. |
| Truck Detail Report | Full attribute detail for every vehicle. |
| Truck Product List CSV Report | Products active per vehicle (CSV). |
| Truck Product List PDF Report | Products active per vehicle (PDF). |
| Customer List | Registered customers / contact groups. |
| Toll Collect Credit Registration CSV Report | Credit-registration export for Toll Collect. |
| Product Domain List CSV Report | OBU-to-domain assignment export. |

## 2.4 Customers & Contacts

| Feature | Program / route | What it does |
|---|---|---|
| Customer List / contact groups | `cust_cont_group_search` | Search customers and their contact groups. |

## 2.5 Admin/back-office left-nav (visible in the MyMST screenshot)

MyMST exposes a deep back-office menu that spans the whole TTT platform. Many of
these are operational/admin areas beyond the customer-self-service scope, but they
are part of the existing surface:

`Home` · `Customer` · `Registration` · `Generic Loader` · `Product` · `Supplier` ·
`Inventory` · `Fee` · `Order` · `Transaction` · `Billing` · `Collections` · `A/R` ·
`GL Code` · `Salesperson` · `Management` · `Utility Reports` · `Utility` ·
`Reports` · `Customer List` · `Invoices` · `Trucks` · `Transactions` · `Balance` ·
`Account` · `Select Customer` · `Go to MyTolls`

Notable ones: **Select Customer** (switch the customer/controller context — MyMST
is often used by staff acting on behalf of a customer), **Billing / Collections /
A/R / GL Code** (the finance operations pillars), **Supplier / Inventory / Fee /
Order** (product & procurement back-office), and **Go to MyTolls** (cross-link
back to the customer portal).

---

# 3. Toll 2.0 — modern uPortal application

**Source:** the `tollseu` Apereo uPortal. A modern, portlet-based portal; the front
login is a Vue SPA and inner portlet functionality is JS-rendered (captured at
**module level** only). This is the design target the unified portal takes cues
from — clean tables, cards and icons (e.g. the modern "Manage Vehicles" screen).

## 3.1 Core Operational Modules

| Module | Route / portlet | What it does |
|---|---|---|
| Manage Vehicle | `f/managevehicle` — manage-vehicle portlet | Modern vehicle management (the polished "Manage Vehicles" grid: active/missing-attribute/pending-deactivation views, bulk load/update, owners, order OBUs). |
| Manage OBU | `f/manageobu` — manage-obu portlet | Manage on-board units — assignment and device lifecycle. |
| Manage Order | `f/manageorder` — manage-order portlet | Create and manage product/device orders. |
| Order Fulfillment | `f/orderfulfillment` | Track/fulfil placed orders through to delivery. |
| My Routes | `f/myroutes` — my-routes portlet | Route management/visibility for the fleet. |

## 3.2 Account & Entity

| Module | Route / portlet | What it does |
|---|---|---|
| My Account | `f/myaccount` — my-account portlet | Personal account settings for the logged-in user. |
| My Entity (company) | `f/myentity` — my-entity portlet | Company/legal-entity details for the account. |

## 3.3 Data & Reporting

| Module | Route / portlet | What it does |
|---|---|---|
| Reports | `f/reports` | Reporting module (Toll 2.0's equivalent of MyMST reporting). |

## 3.4 Support / Help Center

A fully-fledged self-service help centre.

| Module | Route / portlet | What it does |
|---|---|---|
| My Support (landing) | `f/mysupport` — my-support portlet | Help-centre landing page. |
| Help — select product | `f/mysupporthelpproducts` — mysupport-help-selectproduct | Pick a product to get help on. |
| Help — product content | `f/mysupporthelpproductcontent` — mysupport-help-productcontent | Product-specific help content/guides. |
| Support products | `f/mysupportproducts` | Browse supported products. |
| Country tolls products | `f/mysupportcountryproducts` — mysupport-countrytollsproducts | Toll products/requirements by country. |
| Download user manuals | `f/mysupportdownloadusermanulas` | Download product user manuals. |
| Feedback | mysupport-feedback portlet | Submit feedback. |
| Map / location | google-maps-portlet | Map/location content (e.g. service points). |

## 3.5 Platform & Navigation

The shell/chrome of the uPortal application.

| Element | Route / portlet | What it does |
|---|---|---|
| Home / landing | `f/home` — tollseu-home-page | Portal landing page. |
| MSTS Home | `f/mstshome` | MSTS-branded home entry. |
| Welcome | `f/welcome` | Welcome/entry screen. |
| Side navigation bar (global) | tollseu-sidenavbar portlet | The global left navigation. |
| Breadcrumb & left navigation (per flow) | mysupport-breadcrumb, mysupport-left-navigation | In-flow breadcrumb and contextual left nav. |

---

# 4. Cross-portal comparison

Where the same real-world capability lives across the three existing portals
(useful for de-duplication during consolidation):

| Capability | MyTolls | MyMST | Toll 2.0 |
|---|---|---|---|
| Vehicles / trucks | ✅ `mt_cust_truck_*` (full lifecycle) | ⚠️ `Trucks` (back-office view) | ✅ `f/managevehicle` (modern) |
| OBUs / devices | ✅ via Products (order boxes, OBU domains) | — | ✅ `f/manageobu` |
| Product ordering | ✅ `mt_cust_product_*` (full catalogue) | ⚠️ `Product` / `Order` (back-office) | ✅ `f/manageorder`, `f/orderfulfillment` |
| Hauliers | ✅ `mt_cust_cntr_haulier_*` | — | — |
| Transactions | — | ✅ `cust_trx` | (implied in Reports/routes) |
| Invoices / AR / balances | — | ✅ `cust_invoice` / `cust_ar` / `cust_account` | — |
| Reporting | — | ✅ full catalogue + scheduling | ✅ `f/reports` (module-level) |
| Routes | — | — | ✅ `f/myroutes` |
| Account / entity settings | ✅ password, security challenge | ✅ `Account` | ✅ `f/myaccount`, `f/myentity` |
| Support / help | ✅ `mt_cust_support_home`, news | — | ✅ full help centre |

**Key overlaps to resolve:** vehicles (three implementations), product ordering
(three), reporting (two), and account settings (three). **Unique-per-portal:**
hauliers (MyTolls only), invoices/AR/transactions (MyMST only), routes and the
rich help centre (Toll 2.0 only).

---

# 5. Summary

- **MyTolls** = customer-facing **CRM + product ordering** (vehicles, hauliers,
  the full tolling-product catalogue, account/security). Richest but oldest UI.
- **MyMST** = **finance, transactions & reporting** (invoices, AR, balances,
  transaction history, the report catalogue + scheduling), plus a deep
  back-office menu spanning the whole TTT platform.
- **Toll 2.0** = a **modern uPortal** covering a slice of operations (manage
  vehicle/OBU/order, routes), account/entity, a reporting module and a full
  self-service help centre — the visual/UX benchmark.

Together they cover the same underlying entities (vehicles, OBUs, products,
transactions, invoices, hauliers) through three inconsistent interfaces — which is
exactly what the unified portal is meant to consolidate.
