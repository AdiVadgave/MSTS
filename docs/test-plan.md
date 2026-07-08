# MSTS One — Full Manual Test Plan

A complete, execute-as-you-read test guide for the unified portal prototype.
Work top to bottom; each case has **Steps** and the **Expected result**. Mark the
**Status** box (✅ pass / ❌ fail / ✍️ note) as you go.

---

## 0. Test setup

| | |
|---|---|
| **Start app** | `npm run dev` → open `http://localhost:5173` |
| **Servers** | Vite (web) on `5173`, AI proxy on `8787` (auto-started together) |
| **Demo login** | email `demo@mstsone.eu`, password `msts1234` (pre-filled) |
| **Demo MFA code** | `123456` (pre-filled) |
| **Azure RC-card** | Real GPT‑4o if `.env` keys are set; otherwise a realistic **mock** extraction |
| **Reset data** | Account → Preferences → **Reset demo data** (restores the seeded corpus) |
| **Browsers** | Test in Chrome/Edge; also narrow the window to ~375px for responsive checks |

**Before each full pass:** if the app misbehaves after code changes, do a **hard
refresh (Ctrl+Shift+R)** to re-register the Mock Service Worker. If a control that
hits `/api/*` silently fails, open DevTools → Console — a `[MSW] Unhandled API
call …` warning means the worker is stale (hard refresh fixes it).

**What is real vs simulated** (don't log these as bugs):
- **Simulated (no backend):** login / MFA / password change / 2FA toggle, "resend
  code", "resend invite" (no email is sent), "Scheduled reports" (informational).
- **Real:** all CRUD + persistence (localStorage), file exports (CSV/XLS/PDF),
  eligibility enforcement, **entity/customer data scoping** (see §3.5), and
  RC‑card extraction (Azure GPT‑4o when keys present).

> **Data is scoped to the selected entity.** The top-bar entity switcher
> (e.g. "13768 | NVD Stage BP 1") filters Vehicles, OBUs, Products/Orders,
> Transactions, Reports, Hauliers, Finance and the Dashboard to that customer.
> So record counts differ per entity — that's expected, not missing data. Use
> **Reset demo data** (Account → Preferences) to restore the seeded corpus.

Legend for statuses: **☐ Pass ☐ Fail — notes**

---

## 1. Authentication & entry gating

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| A1 | App opens on Login | Open `http://localhost:5173/` | Redirected to **/login** (never straight to a portal) | ☐ |
| A2 | Deep link is gated | Open `http://localhost:5173/vehicles` directly | Redirected to **/login** | ☐ |
| A3 | Creds pre-filled | Observe the login form | Email `demo@mstsone.eu` and password already populated | ☐ |
| A4 | Wrong credentials | Change password to `wrong`, click **Sign in** | Inline error "Invalid credentials…"; stays on login | ☐ |
| A5 | Valid login | With defaults, click **Sign in** | Brief spinner → navigates to **/mfa** | ☐ |
| A6 | MFA pre-filled | Observe the 6 boxes | Show `1 2 3 4 5 6` | ☐ |
| A7 | Wrong MFA | Clear boxes, type `000000`, **Verify** | Error "Incorrect code…"; boxes reset | ☐ |
| A8 | MFA paste | Clear, paste `123456` into first box | All six fill; focus advances | ☐ |
| A9 | Valid MFA | **Verify & continue** | Navigates to **/launcher** | ☐ |
| A10 | Resend code | On MFA, click **Resend code** | Toast "Verification code re-sent…" (simulated) | ☐ |
| A11 | Launcher shows 3 portals | On /launcher | Three cards: MyTolls, MyMST, Toll 2.0, each with accent + highlights | ☐ |
| A12 | Sign out from launcher | Click **Sign out** | Returns to /login | ☐ |
| A13 | Open a portal | Log back in → MFA → click **Toll 2.0** | Lands on **Dashboard** (`/`) | ☐ |
| A14 | Non-Toll2.0 landing | From launcher open **MyTolls** | Lands on **/vehicles** (MyMST → /transactions) | ☐ |
| A15 | Refresh logs out | Anywhere in the app, hard refresh | Returns to **/login** (auth intentionally not persisted) | ☐ |
| A16 | Sign out from top bar | Profile menu (avatar) → **Sign out** | Toast + back to /login | ☐ |

---

## 2. App shell & navigation

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| S1 | Sidebar reflects portal | Open **MyTolls** portal | Sidebar shows **Vehicles, Hauliers, Products & Ordering** + General (Support, Account). No Dashboard/OBU/Domains/Transactions/Reports/Finance/Users | ☐ |
| S2 | Sidebar (MyMST) | Switch to **MyMST** | Shows **Transactions, Reports, Invoices & AR** + General | ☐ |
| S3 | Sidebar (Toll 2.0) | Switch to **Toll 2.0** | Shows **Dashboard, Vehicles, OBU & Devices, Domains, Users & Access, Onboarding** + General | ☐ |
| S4 | Portal switcher | Top bar portal dropdown → pick another | Nav + landing change; identity dot/colour updates; no re-login | ☐ |
| S5 | "All portals" | Portal dropdown → **All portals** | Returns to /launcher | ☐ |
| S6 | Entity switcher scopes data | Open Transactions; note "Showing 1–x of **N**"; top-bar entity dropdown → pick another entity | **N changes live** (no reload) — data reflects the new customer. See §3.5 | ☐ |
| S7 | Entity persists | Select entity 2, hard refresh, log back in | Same entity is selected (stored in `msts-entity`) | ☐ |
| S8 | Sidebar collapse | Click **Collapse** at sidebar foot | Rail collapses to icons; tooltips on hover; toggle back | ☐ |
| S9 | Theme toggle | Top bar sun/moon | Switches light/dark; persists across reload | ☐ |
| S10 | Command palette open | Press **Ctrl/⌘ + K** | Palette opens with search | ☐ |
| S11 | Palette scoped | In **MyMST**, open ⌘K | Only MyMST modules + General appear; quick-actions limited (no "Add vehicle") | ☐ |
| S12 | Palette navigate | Type "reports", Enter | Navigates to Reports; palette closes | ☐ |
| S13 | Notifications | Bell icon | Popover lists notifications; unread badge count correct | ☐ |
| S14 | Mark all read | In popover → **Mark all read** | Unread badge clears; toast; persists on reload | ☐ |
| S15 | Profile deep links | Avatar → **My account / Company settings** | Opens Account on correct tab (`?tab=profile` / `?tab=entity`) | ☐ |
| S16 | Responsive nav | Narrow window < 1024px | Sidebar hides; hamburger opens a drawer; search icon opens palette | ☐ |

---

## 3. Data persistence & reset (critical)

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| P1 | Create persists | Vehicles → add a vehicle `TEST-01` → hard refresh → log back in → search `TEST-01` | Vehicle still present after reload | ☐ |
| P2 | Edit persists | Edit a vehicle's fleet code → refresh | Change survives | ☐ |
| P3 | Order persists | Order a product for a vehicle → refresh | Order + vehicle product survive | ☐ |
| P4 | Ticket persists | Support → submit a ticket → refresh | Ticket still listed under "Your tickets" | ☐ |
| P5 | Settings persist | Account → toggle "Weekly summary" on → refresh | Toggle stays on | ☐ |
| P6 | Reset demo data | Account → Preferences → **Reset demo data** → confirm | All lists return to seeded state; `TEST-01` gone; toast confirms | ☐ |

---

## 3.5 Entity / customer data scoping (data sync)

The top-bar entity selector filters all customer-owned data. Switching entity
must **refetch live** and every module must show only that customer's records.
The three seeded entities are **NVD Stage BP 1**, **Automation Foreign Std**,
**Meridian Logistics**. (Reset demo data first for the reference numbers below.)

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| EN1 | Vehicles scope | Toll 2.0 → Vehicles; note total; switch entity in top bar | Vehicle list + total change to the new customer; no reload | ☐ |
| EN2 | Transactions scope | MyMST → Transactions; note "of N"; switch entity | Total changes (reference: NVD 137 / Automation 114 / Meridian 89 on a fresh reset) | ☐ |
| EN3 | Invoices scope | MyMST → Invoices & AR; switch entity | Invoice list changes (≈6 per entity on fresh data) | ☐ |
| EN4 | Hauliers scope | MyTolls → Hauliers; switch entity | Only that entity's hauliers shown | ☐ |
| EN5 | Orders scope | Products → Orders tab; switch entity | Only that entity's orders shown | ☐ |
| EN6 | Dashboard scope | Toll 2.0 → Dashboard; switch entity | KPI strip, charts and activity all recompute for the entity | ☐ |
| EN7 | No leakage / totals add up | Sum a metric (e.g. vehicles) across all 3 entities | Equals the seeded global total (vehicles = **68**, transactions = **340**, invoices = **18**) | ☐ |
| EN8 | Create is scoped | Select entity B → add a vehicle → it appears under B; switch to entity A | New vehicle appears **only** under entity B, not A | ☐ |
| EN9 | Export is scoped | Select an entity → Transactions **Export** / Reports **Run** | Exported file contains **only that entity's** rows | ☐ |
| EN10 | Persist + scope | Select entity B, refresh, log back in | Still on entity B; its scoped data shows | ☐ |

> **Not scoped (by design):** the entities list itself, product catalogue, toll
> domains (network-wide), Users & Access, Support and Account settings are
> account/global — they do **not** change when you switch entity.

---

## 4. Dashboard (Toll 2.0)

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| D1 | KPIs load | Open Dashboard | Signage hero, ticker of countries, asphalt stat strip with numbers (active vehicles/OBUs/spend/receivables) | ☐ |
| D2 | Loading state | Hard refresh Dashboard | Skeletons show briefly before data | ☐ |
| D3 | Stat drill-down | Click **Active vehicles** stat | Navigates to Vehicles filtered `status=active` | ☐ |
| D4 | Spend stat | Click **Toll spend** | Navigates to Transactions | ☐ |
| D5 | Charts render | Observe charts | Spend trend (area), fleet status (donut), spend by country (bars) all render | ☐ |
| D6 | Needs attention | Observe "Needs attention" card | Lists missing-attribute vehicles / exceptions / alerts with working CTAs | ☐ |
| D7 | Activity feed | Observe recent activity | Cross-portal events with source tags; plates render as plate tiles | ☐ |
| D8 | Hero actions | Click **Extract RC card** / **Add vehicle** | Navigate to Vehicles with the right drawer open | ☐ |

---

## 5. Vehicles

### 5a. List, search, filter, sort, paginate
| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| V1 | List loads | Open Vehicles | Table with plate tiles, columns, pagination "1–10 of N" | ☐ |
| V2 | Search | Type a plate fragment | List filters (debounced); count updates | ☐ |
| V3 | Status filter | Filter = Missing attrs | Only missing-attribute vehicles shown | ☐ |
| V4 | Country filter | Filter = Germany | Only DE vehicles | ☐ |
| V5 | Sort | Click **Plate** / **Updated** headers | Sort toggles asc/desc/none | ☐ |
| V6 | Paginate | Next / Prev | Page advances; boundary buttons disable | ☐ |
| V7 | Empty state | Search gibberish `zzzzz` | "No vehicles found" empty state | ☐ |

### 5b. Create / validate
| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| V8 | Open create | **Add vehicle** | Drawer opens with defaults (country NL, EURO 6, etc.) | ☐ |
| V9 | Validation | Clear Plate, submit | Inline error "Plate is required"; no save | ☐ |
| V10 | Numeric bounds | Total axles = 1, submit | Validation error (min 2) | ☐ |
| V11 | Create success | Fill valid data, **Create vehicle** | Toast "Vehicle … created"; appears at top of list | ☐ |

### 5c. Detail, edit, deactivate
| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| V12 | Open detail | Click a row | Detail drawer: Details / Products / Devices / History tabs | ☐ |
| V13 | Details tab | View | Attributes + active products badges | ☐ |
| V14 | History tab | View | Timeline (created / updated) | ☐ |
| V15 | Devices tab | View | Assigned OBUs (or empty message) | ☐ |
| V16 | Edit | **Edit vehicle**, change weight, save | Toast "updated"; value reflects in list/detail | ☐ |
| V17 | Deactivate | **Deactivate** | Status → Deactivated; drawer closes; reflected in list | ☐ |

### 5d. Bulk & RC-card
| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| V18 | Bulk open | **Bulk load** | Dialog with CSV textarea + sample; "N valid rows" counter | ☐ |
| V19 | Bulk parse | Edit rows | Counter updates live; invalid lines ignored | ☐ |
| V20 | Bulk import | **Import** | Toast "N vehicles queued"; new vehicles appear as **Pending** | ☐ |
| V21 | RC open | **Extract RC card** | Sheet with dropzone | ☐ |
| V22 | RC upload | Drop/select an image | Preview shows; **Extract with AI** enabled | ☐ |
| V23 | RC extract | **Extract with AI** | 3-step pipeline animates; fields returned; badge shows **GPT‑4o** (keys set) or **Mock** | ☐ |
| V24 | RC prefill | **Use to create vehicle** | Vehicle form opens pre-filled with extracted values | ☐ |

### 5e. Product Helper (eligibility) — see also §8
| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| V25 | Helper tab | Open a **Truck** in a covered country → **Products** tab | Full catalogue with per-product status + legend | ☐ |
| V26 | Order eligible | Click **Order** on an "Available" product | Toast "Ordered…"; product flips to **Existing** | ☐ |
| V27 | Ineligible shown | Note red "Not eligible" items | Each shows a reason (country/type) | ☐ |

---

## 6. OBU & Devices (Toll 2.0)

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| O1 | List loads | Open OBU & Devices | Table with serial, type + GNSS/DSRC tag, assigned plate tile, status | ☐ |
| O2 | Filters | Filter status/type | List narrows accordingly | ☐ |
| O3 | Assign | Row menu → **Assign to vehicle** (on unassigned) | Status → Active; toast | ☐ |
| O4 | Unassign | Row menu → **Unassign** | Status → Unassigned; plate clears | ☐ |
| O5 | Suspend/Activate | Toggle via menu | Status flips; toast | ☐ |
| O6 | Replace | **Replace defective** | Status → Returned; toast | ☐ |
| O7 | Persist | Perform an action → refresh | State survives reload | ☐ |

---

## 7. Products & Ordering (MyTolls)

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| PR1 | Catalogue | Open Products → Catalogue | Product cards with category, **Eligible: types**, country chips | ☐ |
| PR2 | Order dialog | Click **Order** on a product | Dialog: vehicle select (eligible auto-picked), qty, cost summary | ☐ |
| PR3 | Ineligible vehicles disabled | Open dialog, expand vehicle list | Ineligible/existing vehicles disabled with "not eligible / already active" | ☐ |
| PR4 | Place order | Choose eligible vehicle, **Place order** | Toast "Ordered…"; appears in Orders tab | ☐ |
| PR5 | Block mode | Click **Block** (ban icon) on a product | Block dialog; any vehicle allowed; **Block product** works | ☐ |
| PR6 | Orders tab | Open **Orders** tab | Table of orders with mode/status; sortable; paginated | ☐ |

---

## 8. Product eligibility matrix (new feature — test the conditions)

Rules: orderable only if **product country ⊇ vehicle country** AND **product
eligibleTypes ⊇ vehicle type**; already-owned = Existing; missing attributes = blocked.

| ID | Condition | Setup | Expected | Status |
|---|---|---|---|---|
| E1 | Eligible truck | NL/BE/DE/FR **Truck** → **MST Card** (if not owned) | **Available** → order succeeds (201); becomes Existing | ☐ |
| E2 | Wrong country | **NL Truck** → **HU‑GO OBU** (HU only) | **Not eligible** — "not offered in NL"; Order disabled/422 | ☐ |
| E3 | Wrong type | **Bus** (covered country) → **HGV Levy** (Truck only) | **Not eligible** — "not available for buses" | ☐ |
| E4 | Van limits | **Van** → **Eurovignette** (Truck/Trailer only) | Not eligible | ☐ |
| E5 | Van allowed | **Van** in IT → **Telepass** (all classes) | Available | ☐ |
| E6 | Existing | Order a product, reopen Helper | Same product shows **Existing** (no Order button) | ☐ |
| E7 | Blocked by attrs | Open a **Missing attrs** vehicle → Products | All show **Complete attributes** (blocked); none orderable | ☐ |
| E8 | Backend guard | (Dev) POST an ineligible order via console/API | Responds **422** with reason (UI can't bypass it) | ☐ |

---

## 9. Domains — Coverage Explorer (Toll 2.0)

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| DM1 | Plate grid | Open Domains | Grid of country "plate" tiles (EU blue strip); first selected | ☐ |
| DM2 | Select domain | Click a tile | Detail panel updates: tech (GNSS/DSRC tag), basis, applies-to, rate, corridors, assignments | ☐ |
| DM3 | Live readout | Observe mono readout | Shows "● LIVE … settled automatically" with the chosen tech | ☐ |
| DM4 | Status change | Click **Activate / Pending / Block** | Status badge updates; toast; persists on reload | ☐ |

---

## 10. Transactions (MyMST)

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| T1 | List loads | Open Transactions | Table with date, plate tile, domain, location, OBU, amount, status | ☐ |
| T2 | Search | Search plate/location | Filters (debounced) | ☐ |
| T3 | Status filter | Filter = Exception | Only exceptions | ☐ |
| T4 | Country filter | Filter a country | Narrows | ☐ |
| T5 | Deep link | Dashboard → exceptions CTA | Opens Transactions filtered `status=exception` | ☐ |
| T6 | Export CSV | **Export** | Downloads a **real .csv** of ALL matching rows (not just page); toast with count | ☐ |
| T7 | Sort | Sort by Amount/Date | Order changes | ☐ |

---

## 11. Reports (MyMST)

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| R1 | Catalogue | Open Reports | Report cards grouped; category tabs filter | ☐ |
| R2 | Export CSV | Report → **Run** → **Export as CSV** | Downloads a **real .csv** with data rows; toast with row count | ☐ |
| R3 | Export XLSX | **Export as XLSX** | Downloads a `.xls` that opens in Excel | ☐ |
| R4 | Export PDF | **Export as PDF** | Downloads a **branded multi-page PDF** table | ☐ |
| R5 | Scheduled | **Scheduled reports** | Informational toast (simulated — not a bug) | ☐ |
| R6 ◈ | Parameter dialog | Report → **Run** | A **Report parameters** dialog collects start date, end date and format before the export runs | ☐ |
| R7 ◈ | Parameters filter the data | Run a transactions report twice: full 90-day range vs. a 1-week range | The narrow range downloads **fewer rows** (toast row count + file contents shrink) — dates are real parameters, not just a filename stamp; start date must be ≤ end date (inline validation) | ☐ |

---

## 12. Hauliers (MyTolls)

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| H1 | List | Open Hauliers | Table: company, VAT, country, contact, fleet, status | ☐ |
| H2 | Search/filter | Search name; filter status | Narrows | ☐ |
| H3 | Create validate | **Create haulier**, empty name, submit | Error "Name is required" | ☐ |
| H4 | Create success | Fill + submit | Toast; appears at top; persists | ☐ |

---

## 13. Finance — Invoices & AR (MyMST)

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| F1 | Layout | Open Finance | Consolidated invoice card (country lines, red total) + KPI tiles + invoice table | ☐ |
| F2 | Status filter | Filter = Overdue | Only overdue invoices | ☐ |
| F3 | Pay | Row menu → **Mark as paid** | Status → Paid; toast; persists | ☐ |
| F4 | Dispute | Row menu → **Dispute invoice** | Status → Disputed; toast | ☐ |
| F5 | Invoice PDF | Row menu → **Download PDF** | Real branded **invoice PDF** (net/VAT/total) downloads | ☐ |
| F6 | Statement | **Statement** button | A **Statement parameters** dialog (start/end date) precedes the download; real **statement PDF** stamped with the period | ☐ |
| F7 ◈ | Period filter | Toolbar → **Period** → pick a start/end date → **Apply filter** | Invoice list shows only invoices **issued within the range** (server-side; pagination + KPI tiles follow); an active-filter chip shows the range | ☐ |
| F8 ◈ | Clear period filter | Click **✕** on the period chip | Full list returns; page resets to 1; combines correctly with the status filter (both can be active at once) | ☐ |

---

## 14. Users & Access (Toll 2.0)

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| U1 | List | Open Users & Access | Table: user, role, status, last active | ☐ |
| U2 | Invite validate | **Invite user**, empty email, submit | Error "Email is required" | ☐ |
| U3 | Invite | Fill + submit | Toast; user added as **Invited**; persists | ☐ |
| U4 | Change role | Row menu → role radio | Role updates; toast; persists | ☐ |
| U5 | Resend invite | On an invited user → **Resend invite** | Toast (simulated email) | ☐ |
| U6 | Remove | Row menu → **Remove user** | User removed; toast; persists | ☐ |

---

## 15. Onboarding wizard (Toll 2.0)

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| N1 | Stepper | Open Onboarding | 5-step stepper (Company→Vehicles→Devices→Users→Review) | ☐ |
| N2 | VAT validate ok | Enter VAT ≥ 8 chars → **Validate** | "Verified" panel with company/address; company field filled | ☐ |
| N3 | VAT invalid | Short VAT → **Validate** | Error toast "could not be validated" | ☐ |
| N4 | Navigation | Continue / Back through steps | Animated transitions; state retained | ☐ |
| N5 | Submit creates entity | Complete → **Complete onboarding** | Success screen; **new entity appears in the top-bar entity switcher**; persists | ☐ |

---

## 16. Support / Help Center

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| SP1 | Search resources | Type in hero search | Resource cards filter; empty message if none | ☐ |
| SP2 | Product help | Click **Product help** card | Dialog lists real product guides (catalogue) | ☐ |
| SP3 | Country tolls | Click **Country tolls** card | Dialog lists domains with tech/rate/status | ☐ |
| SP4 | Manuals | Click **User manuals** card | Downloads a **real PDF** manual index; toast | ☐ |
| SP5 | Feedback | Click **Give feedback** | Scrolls to contact form | ☐ |
| SP6 | Ticket validate | **Submit ticket** with empty subject/message | Error toasts | ☐ |
| SP7 | Ticket create | Fill subject + message → **Submit ticket** | Toast "Ticket TKT‑…"; appears under **Your tickets**; persists | ☐ |

---

## 17. Account & Settings

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| AC1 | Entity tab | Account → My Entity | Fields pre-filled from selected entity (controlled) | ☐ |
| AC2 | Save entity | Change company name → **Save changes** | Toast; top-bar entity name updates; persists | ☐ |
| AC3 | Profile save | Profile tab, change name, save | Toast; persists (name shows in top bar avatar/menu) | ☐ |
| AC4 | Profile email validate | Enter invalid email, save | Error "valid email" | ☐ |
| AC5 | Password mismatch | Security: new ≠ confirm → **Update password** | Error "don't match" | ☐ |
| AC6 | Password too short | new < 8 chars | Error "at least 8 characters" | ☐ |
| AC7 | 2FA toggle | Toggle Two-factor | Toast; persists | ☐ |
| AC8 | Prefs persist | Toggle email/weekly/dark | Each toasts; survive reload | ☐ |
| AC9 | Reset demo data | Preferences → **Reset demo data** → confirm | Everything reseeds; toast | ☐ |

---

## 18. Cross-cutting states & error conditions

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| X1 | Loading states | Hard refresh various list pages | Skeletons/`Loading…` appear before data | ☐ |
| X2 | Empty states | Filter any list to no results | Friendly empty state with icon | ☐ |
| X3 | Latency realism | Watch any list load | Small artificial delay + spinners on actions | ☐ |
| X4 | Eligibility guard | Try to order ineligible (see E-series) | Blocked in UI + 422 from API | ☐ |
| X5 | Stale worker warning | (Dev) after code changes without refresh | Console `[MSW] Unhandled API call…`; hard refresh resolves | ☐ |
| X6 | Responsive | Resize to mobile across modules | Tables scroll; layout stacks; nav becomes drawer | ☐ |
| X7 | Keyboard/a11y | Tab through forms; ⌘K; Esc closes dialogs | Focus rings visible; dialogs/sheets close on Esc | ☐ |
| X8 | Deep-link tabs | Open `/account?tab=security` | Opens on Security tab | ☐ |

---

## 19. RC-card AI (Azure) — targeted

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| AI1 | Mock fallback | With `.env` keys **blank**, run extraction | Returns realistic values; badge **Mock**; toast notes mock | ☐ |
| AI2 | Live extraction | With valid Azure keys, upload a real RC-card image | GPT‑4o returns fields; badge **GPT‑4o**; confidence shown | ☐ |
| AI3 | Health | (Dev) `GET /api/ai/health` | `{ ok:true, azureConfigured:true|false, deployment:"gpt-4o" }` | ☐ |
| AI4 | Failure handling | Upload a non-card image with live keys | Still returns structured JSON (or graceful mock fallback), no crash | ☐ |

---

## 20. Portal segregation matrix (quick reference)

Confirm each portal's sidebar shows **only** these (plus General = Support, Account):

| Portal | Modules that MUST appear | Modules that MUST NOT appear |
|---|---|---|
| **MyTolls** | Vehicles, Hauliers, Products & Ordering | Dashboard, OBU, Domains, Transactions, Reports, Finance, Users, Onboarding |
| **MyMST** | Transactions, Reports, Invoices & AR | Vehicles, Hauliers, Products, OBU, Domains, Users, Onboarding, Dashboard |
| **Toll 2.0** | Dashboard, Vehicles, OBU & Devices, Domains, Users & Access, Onboarding | Hauliers, Products & Ordering, Transactions, Reports, Finance |

---

## 21. Regression smoke checklist (5-minute pass)

1. ☐ Login → MFA → launcher → Toll 2.0 dashboard loads with data.
2. ☐ Create a vehicle → it appears → refresh → still there.
3. ☐ Open vehicle → Products tab → order an eligible product → becomes Existing.
4. ☐ Products → attempt ineligible order → blocked with reason.
5. ☐ Transactions → Export CSV downloads a real file.
6. ☐ Reports → Export PDF downloads a real file.
7. ☐ Finance → Download an invoice PDF; mark one paid.
8. ☐ Support → submit a ticket → shows in list → refresh persists.
9. ☐ Switch portals from the top bar; sidebar changes correctly.
10. ☐ Switch **entity** in the top bar; Transactions/Vehicles totals change live.
11. ☐ Account → Reset demo data restores everything.

---

## 22. Whitelabeling (partner branding, packages, tenant isolation)

*Rows marked ◈ have been verified only by code inspection (not yet run in a browser) — prioritize them on the first manual pass.*

Partners are seeded in the mock DB (`msts-db` schema **v5**): **Alpine Fleet
Services** (`alpine`, green, **Enterprise** package, owns entities e1 + e2) and
**Nordkap Logistik** (`nordkap`, blue, **Basic** package, owns entity e3).
Entry point is `/login?partner=<slug>`; the login page's domain-simulator
dropdown fakes picking `tolls.<slug>.com` without changing the URL bar.

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| W1 | Domain simulator → Alpine | Open `/login`, domain dropdown → **Simulate partner domain** → pick `tolls.alpine.com` | Login rebrands: Alpine monogram + green accent on the button/focus ring, domain chip reads `tolls.alpine.com`, footer shows "Powered by MSTS Tolls · whitelabel partner portal" (or Alpine-specific copy) | ☐ |
| W2 ◈ | Direct partner URL | Open `/login?partner=alpine` directly | Same rebranded look as W1, no dropdown interaction needed | ☐ |
| W3 | Unknown partner slug | Open `/login?partner=bogus` | "This partner portal is unavailable" card renders instead of the login form; domain chip still shows `tolls.bogus.com` | ☐ |
| W4 | Login with Alpine branding | On `/login?partner=alpine`, sign in with demo creds → MFA `123456` | MFA screen keeps the green focus ring on the 6 code boxes; lands on launcher/portal still Alpine-branded | ☐ |
| W5 | Sidebar + dashboard branding | Logged in as Alpine, open Toll 2.0 | Sidebar logo/accent and dashboard stat tiles render in Alpine green (not Shell yellow) | ☐ |
| W6 ◈ | Dark mode still works | While Alpine-branded, toggle dark mode | Theme switches correctly; brand accent color persists in dark mode | ☐ |
| W7 | Package gating — Basic (Nordkap) | Log in via `/login?partner=nordkap`, inspect sidebar + ⌘K | **Transactions, Reports, Finance, Users & Access, Onboarding** are absent from sidebar and ⌘K results; MyMST portal switcher entry is hidden | ☐ |
| W8 | Package gating — direct URL block | As Nordkap, navigate directly to `/reports` (or `/finance`, `/users`) | Route renders an **UpgradeState** "upgrade to unlock" card instead of the module, no data leak | ☐ |
| W9 ◈ | Package gating — Enterprise (Alpine) | Log in as Alpine | All modules from §20's matrix are visible in sidebar + ⌘K; no UpgradeState anywhere | ☐ |
| W10 | Tenant isolation — Alpine | As Alpine, open the entity switcher | Only **e1 (NVD Stage BP 1)** and **e2 (Automation Foreign Std)** are listed; Vehicles/Transactions/etc. counts match §8's per-entity golden numbers for e1/e2 | ☐ |
| W11 ◈ | Tenant isolation — Nordkap | As Nordkap, open the entity switcher | Only **e3 (Meridian Logistics)** is listed; counts match §8's e3 golden numbers; no e1/e2 data visible anywhere | ☐ |
| W12 | Admin console — list | Log in as MSTS default, open the **Solution Studio** (`/studio`, or profile menu → Solution Studio) | List shows Alpine + Nordkap with logo/swatch, package badge, entity count, status | ☐ |
| W13 ◈ | Admin — create partner | **Add partner** → fill slug/name/package/accent → save | New partner appears in the list; persists across reload | ☐ |
| W14 | Admin — slug collision | Try creating a partner with slug `alpine` (existing) | Inline validation error; save blocked | ☐ |
| W15 ◈ | Admin — logo upload size guard | Editor sheet → Branding tab → upload an image **> 200 KB** | Rejected with a size-limit error; existing logo unchanged | ☐ |
| W16 ◈ | Admin — package comparison | Editor sheet → Package tab | Feature comparison grid shows Basic vs Enterprise flags; changing package updates the partner's gating live after save | ☐ |
| W17 ◈ | Admin — entity reassignment | Editor sheet → Entities tab → move e2 from Alpine to Nordkap → save | Ownership moves: Alpine's entity switcher now shows only e1; Nordkap's shows e2 + e3 | ☐ |
| W18 ◈ | Admin — preview | Editor sheet → **Preview** | Opens/renders the partner's branded login look without leaving the admin session | ☐ |
| W19 ◈ | Admin — suspend | Partner row menu → **Suspend** | Status → Suspended; partner disappears from the `/login` domain-simulator picker; `/login?partner=<slug>` now shows the unavailable card | ☐ |
| W20 ◈ | Admin — delete | Partner row menu → **Delete** → confirm | Partner removed from list and picker; persists across reload | ☐ |
| W21 ◈ | Persistence across reload | After W13/W17/W19, hard refresh and re-open **/studio** | All changes (new partner, reassigned entity, suspended status) survive reload (`msts-db` v6 in localStorage) | ☐ |
| W22 | Branded export — PDF | As Alpine, with `branded-invoicing` enabled for the package, Reports/Finance → **Export as PDF** | PDF header band shows Alpine branding; a thin accent bar under the header uses Alpine green | ☐ |
| W23 | Branded export — CSV | As Alpine → **Export CSV** | CSV includes an Alpine-branded comment/header line | ☐ |
| W24 | MSTS default export unchanged | As the default MSTS login (no partner param) → export PDF/CSV | Exports still say **"MSTS One"**; PDF shows the same thin accent bar (Shell yellow) — this is a new, plan-mandated element and not a regression | ☐ |
| W25 | MSTS default login/portal unchanged | Open `/login` with no `partner` param | Login and portal look identical to the pre-whitelabeling baseline (Shell yellow/asphalt, MSTS branding, no domain-simulator side effects) | ☐ |
| W26 ◈ | Zero-entity partner fails closed | Create a partner with no customers assigned, Preview → login | No tenant data visible anywhere (empty lists/zero KPIs), NOT all tenants' data | ☐ |
| W27 ◈ | Support page under partner brand | As any partner, open Support via an upgrade card's Contact MSTS button | No Shell-yellow identity elements; dashed rules follow the partner accent | ☐ |

---

## 23. Generic Solution Builder

*Rows marked ◈ have been verified only by code inspection or a scripted partial
pass (not a full manual click-through) — prioritize them on the first manual
pass. Partners are seeded in the mock DB (`msts-db` schema **v6**): **Alpine
Fleet Services** (`alpine`, green `#2F7D4F`, **Executive** template,
**Enterprise** package, entities e1+e2) and **Nordkap Logistik** (`nordkap`,
blue `#1B5FAA`, **Carbon** template, **Basic** package, entity e3). The old
partner edit sheet is gone — creation/editing now go through the **Solution
Builder wizard** at `/studio/new` and `/studio/:id/edit` (4 steps + a
live preview rail). The whole console lives OUTSIDE the portal product in
the standalone **Partner Solution Studio** (`/studio`): enter it via the
"Partner Solution Studio →" link on the MSTS login card (then sign in +
MFA), or via the profile menu's "Solution Studio" item from an MSTS portal
session. It has no portal sidebar/entity selector and no MyTolls nav entry.*

| ID | Case | Steps | Expected result | Status |
|---|---|---|---|---|
| G0 ◈ | Studio entry from login | On the MSTS login card, click **Partner Solution Studio →**, sign in + MFA | Lands at `/studio` (partners list in the slim studio shell — no portal sidebar); the link is hidden under any partner domain; **Cancel** on the banner reverts to a normal portal sign-in — not exercised this pass | ☐ |
| G1 | Wizard entry | In the studio (`/studio`) → **New solution** | Opens `/studio/new`; 4-step stepper (Company & Brand / Package & Features / Design / Review & Launch) + live preview rail on the right | ☐ |
| G2 ◈ | Step 1 validation | On step 1, leave Name/slug empty, click **Next** | **Next** stays disabled until name + slug are non-empty — not exercised this pass | ☐ |
| G3 | Step 1 auto-slug | Type "Borealis Cargo" into Name | Slug field auto-fills `borealis-cargo` (domain preview `tolls.borealis-cargo.com`) unless the slug was hand-edited first | ☐ |
| G4 ◈ | Back-navigation retains state | Fill step 1, advance to step 2, pick a package, click **Back** | Step 1 fields (name, slug, entities) are still populated — no data loss crossing steps; not exercised this pass | ☐ |
| G5 | AI brand-from-logo — Azure live ◈ | Step 1, upload a logo, run the brand analysis | Suggested accent + template render with a **GPT-4o** source badge (keys were present this session); without keys, the same call falls back to a **Mock** badge | ☐ |
| G6 | AI recommend-solution — Azure live | Step 2, describe the business in the textarea, click **Recommend** | Returns a package tier + per-module reasoning list with a **GPT-4o** badge; verified live: prompt "mid-size logistics reseller needing dashboard, vehicles, transactions and reports, no finance" → **Professional**, 4 modules (Dashboard, Vehicles, Transactions, Reports) with plausible reasoning text | — verified |
| G7 | Apply AI recommendation | Click **Apply recommendation** | Package + feature checklist update to match the suggestion; still freely editable afterward | — verified |
| G8 | Step 2 package cards | Step 2, click each of Basic/Professional/Enterprise | Selecting a card updates the feature checklist to that package's default flags; individual flags can still be toggled independently | ☐ |
| G9 | Template picker | Step 3, view the template grid | Three cards — **Signage**, **Executive**, **Carbon** — each with swatches and a description; selecting one updates the live preview rail immediately | ☐ |
| G10 | AI portal-copy — Azure live | Step 3, click **Generate**/**Write copy** | Returns portalName/tagline/welcomeText with a **GPT-4o** badge; verified live for "Borealis Cargo" → tagline "Borealis Toll Hub · Streamlined tolling for seamless cargo journeys" | — verified |
| G11 | Step 4 review summary | Step 4 | Read-only cards: Brand (name/slug/domain), Design & package (template/package/status), Modules (list matching step 2), Customers (assigned entities, warns if zero) | ☐ |
| G12 | Create & persist | Step 4 → **Save** | Toast confirms creation; returns to `/studio`; new row shows correct Package/Template/Customers/Status columns — verified live (pre-studio-move, at the old `/partners` route): "Borealis Cargo" appeared as Professional / Carbon / 1 customer / Active | — verified |
| G13 | Persistence across reload | After G12, hard refresh + re-login → `/studio` | New partner still present (`msts-db` v6 in localStorage) — verified live (pre-studio-move) | — verified |
| G14 | Edit rehydrates ◈ | `/studio` → open the just-created partner for edit | Wizard opens at step 1 pre-filled with all saved values (name, package, template, copy, entities) — not exercised this pass; the list-row click target used in the scripted smoke timed out, needs a manual click-through | ☐ |
| G15 | Create & preview | Step 4 → **Create & preview portal** | Saves, then opens `/login?partner=<slug>` in a new tab showing that partner's brand/template/copy | ☐ |
| G16 template render — Signage | MSTS default (no partner) | No `data-theme` attribute on `<html>`; `--primary` HSL starts ~`359 76% 49%` (Shell red) — verified live | — verified |
| G17 template render — Executive | Login/portal as `tolls.alpine.com` | `<html data-theme="executive">`; `--primary` ≈ `145 45% 34%` (Alpine green); light background, soft corners — verified live | — verified |
| G18 template render — Carbon dark-first | Login/portal as `tolls.nordkap.com` | `<html data-theme="carbon" class="dark">` **automatically**, no manual dark-mode toggle; body background ≈ `rgb(14, 15, 17)`; `--primary` ≈ `211 73% 39%` (Nordkap blue) — verified live | — verified |
| G19 | Carbon dark is session-scoped ◈ | While on Nordkap (dark), sign out and log back in as MSTS default | MSTS reverts to light Signage (dark was scoped to the Nordkap session, not a global sticky setting) — not re-verified this pass, verify manually | ☐ |
| G20 | Generic portal purity — Alpine | Logged in as `tolls.alpine.com`, read the full sidebar + dashboard | Sidebar shows generic groups/labels **Overview→Dashboard, Fleet→Vehicles/Devices/Carriers, Tolling→Toll Products/Toll Coverage, Billing→Transactions/Reports/Invoices, Administration→Users & Access/Customer Onboarding, General→Support/Account**; page text contains **no** "MyTolls", "MyMST", "Toll2.0"/"Toll 2.0", or "MSTS One" — verified live via full body-text scan (all four strings absent) | — verified |
| G21 | Generic portal purity — Nordkap | Logged in as `tolls.nordkap.com`, read sidebar + dashboard | Same generic labels (Basic package hides Billing group + Administration entirely — confirmed absent); no MyTolls/MyMST/Toll2.0/MSTS One text — verified live | — verified |
| G22 | Allowed MSTS exception | Partner login screens (Alpine and Nordkap) | The **only** MSTS reference permitted anywhere under a partner brand is the login-footer line "Powered by MSTS Tolls · whitelabel partner portal" — confirmed present verbatim on both, no other Shell/MSTS artifacts — verified live | — verified |
| G23 | No portal switcher under a brand | As Alpine or Nordkap, check the top bar | No MyTolls/MyMST/Toll2.0 portal-switcher control is rendered — only the entity switcher, search, notifications, account menu — verified live (absent from both partner sessions' text dump) | — verified |
| G24 ◈ | No SourceTag chips under a brand | As Alpine or Nordkap, scan any list/detail view | No `SourceTag` chip components render (they're an MSTS-only affordance); MSTS default still shows them (Toll 2.0 dashboard/sidebar text confirms MyTolls/MyMST/Toll2.0 identifiers survive for MSTS) — code-verified (SourceTag returns null under a brand), not asserted in the browser this pass | ☐ |
| G25 | Empty groups hidden | As Nordkap (Basic package) | Billing and Administration nav groups are omitted entirely from the sidebar (not shown empty/disabled) — verified live | — verified |
| G26 | Partner without dashboard lands on first module ◈ | Create a partner with the `dashboard` flag unchecked, log in as them | Lands on the first enabled module's route (per `brandHome()`), not `/` | ☐ |
| G27 | Portal copy — sidebar chip | Alpine vs Nordkap sidebar header | Chip reads the partner's `portalName` — "AlpineFleet Portal" / "Nordkap Toll Console" (not the partner's legal name) — verified live | — verified |
| G28 | Portal copy — tagline bar | Alpine vs Nordkap, just under the sidebar chip | Shows the partner's `tagline` — "Tolls handled, Europe-wide." / "Nordic freight, zero toll friction." — verified live | — verified |
| G29 | Portal copy — login subtitle | `/login?partner=alpine` before signing in | Subtitle under the partner name/domain reads the partner's `welcomeText` ("Welcome to your AlpineFleet tolling cockpit.") — verified live | — verified |
| G30 | Portal copy — dashboard hero lede | Alpine/Nordkap dashboard hero | The hero lede line under "One fleet. Every road. One screen." shows the partner's `welcomeText` — verified live for both | — verified |
| G31 | Partner accent drives primary buttons | Alpine (green) vs Nordkap (blue) vs MSTS (red) | Primary buttons/focus rings follow `--primary`, sourced from each partner's `accentColor` via `hexToHslChannels` — verified live via computed `--primary` values (green/blue/red respectively) | — verified |
| G32 | MSTS default fully unchanged | `/login` with no partner param, then the Toll 2.0/MyTolls/MyMST session | Signage look, red primary, both SourceTags and the 3-portal switcher (MyTolls/MyMST/Toll 2.0) all present and unaffected by the whitelabel work — verified live | — verified |
| G33 | Tenant isolation still enforced ◈ | Alpine entity switcher vs Nordkap entity switcher | Alpine only lists e1/e2 (NVD Stage BP 1 / Automation Foreign Std); Nordkap only lists e3 (Meridian Logistics) — confirmed Nordkap's switcher during this pass showed only "20452 \| Meridian Logistics"; Alpine's e1/e2 pair not re-confirmed this pass (was previously verified pre-Task-12) | ☐ |
| G34 | Basic package gating beyond nav ◈ | As Nordkap, try a direct URL to a Billing-group route | Route blocked/upgrade-gated exactly like the pre-generic-nav gating (§22 W8) — not re-exercised this pass; logic unchanged from Task 1-8, low risk | ☐ |
| G35 | Slug collision blocked inline ◈ | Wizard step 1, type an existing slug (e.g. `alpine`) | Inline destructive-styled error appears directly on step 1 ("The domain slug "alpine" is already used by another partner — pick a different one."), and Next stays disabled until the slug is changed to a unique value — not browser-verified this pass | ☐ |

---

## Notes / defect log

| ID | Severity | Area | Description | Repro |
|---|---|---|---|---|
| | | | | |
