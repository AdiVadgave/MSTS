# MSTS One — Robustness & Edge-Case Test Plan (Plan B)

A companion to [`test-plan.md`](./test-plan.md). That plan (**Plan A**) verifies
each feature does its happy-path job. **This plan (Plan B)** tries to *break* the
app: negative inputs, boundaries, data integrity, persistence, concurrency,
errors and cross-module consistency.

## How to split the work (two testers)

| | Tester A | Tester B |
|---|---|---|
| Uses | `test-plan.md` (functional) | `test-plan-robustness.md` (this) |
| Goal | "Does every control do its job?" | "Can I make it misbehave?" |
| Style | Happy path, per module | Adversarial, cross-cutting |

Run independently, then swap notes. Anything either of you can't explain →
log it in the **Defect log** at the bottom with a repro.

---

## 0. Environment & ground rules

| | |
|---|---|
| Start | `npm run dev` → `http://localhost:5173` |
| Demo login | `demo@mstsone.eu` / `msts1234` (pre-filled) · MFA `123456` |
| Reset baseline | Account → Preferences → **Reset demo data** before a fresh suite |
| Golden numbers (after reset) | Vehicles **68** (28/24/16 per entity) · Transactions **340** (137/114/89) · Invoices **18** (6/6/6) · OBUs **82** |
| Entities | NVD Stage BP 1 · Automation Foreign Std · Meridian Logistics |
| DevTools | Keep **Console** + **Network** open the whole time — watch for red errors / unexpected 4xx/5xx |

**Rules of engagement**
- If a page ever looks empty/broken, first check Console for a `[MSW] Unhandled
  API call…` warning → **hard refresh (Ctrl+Shift+R)**. Note whether the refresh
  fixed it (environmental) or not (real bug).
- Record **severity**: 🔴 blocker · 🟠 major · 🟡 minor · 🔵 cosmetic.
- A test "passes" only if there are **no console errors** during it.

Status legend: **☐ Pass ☐ Fail — severity + note**

---

## 1. Data integrity & entity scoping (highest priority)

The single most important robustness area — data must never leak between
customers, and totals must reconcile.

| ID | Case | Steps | Expected | Status |
|---|---|---|---|---|
| DI1 | Totals reconcile | Reset. Sum vehicles across all 3 entities (switch entity, read "of N") | 28 + 24 + 16 = **68** exactly | ☐ |
| DI2 | Transactions reconcile | Same for Transactions | 137 + 114 + 89 = **340** | ☐ |
| DI3 | Invoices reconcile | Same for Invoices & AR | 6 + 6 + 6 = **18** | ☐ |
| DI4 | No cross-entity leak | Entity A → note a specific plate; switch to B; search that plate | Not found under B | ☐ |
| DI5 | Create isolation | Entity B → add vehicle `ISO-B`; switch to A → search `ISO-B` | Absent under A; present only under B | ☐ |
| DI6 | Order isolation | Entity B → order a product on a B vehicle; switch to A → Products/Orders | B's order not visible under A | ☐ |
| DI7 | Dashboard matches lists | Entity A dashboard "Active vehicles" vs Vehicles list filtered active | Numbers agree | ☐ |
| DI8 | Export is scoped | Entity A → Transactions **Export**; open the CSV | Only A's rows; row count ≈ 137 | ☐ |
| DI9 | Report is scoped | Entity A → Reports → run "Truck Detail" CSV; open it | Only A's vehicles (~28 rows) | ☐ |
| DI10 | Switch mid-load | Rapidly switch entity A→B→A while a list is still loading | Final view matches final entity (no stale/mismatched rows) | ☐ |
| DI11 | Global stays global | Switch entities and watch Products catalogue, Domains, Users | These do **not** change (account-global) | ☐ |
| DI12 | Onboarding entity isolation | Onboard a new company; switch to it | It starts **empty** (0 vehicles/transactions), not showing others' data | ☐ |

---

## 2. Persistence & cache robustness

| ID | Case | Steps | Expected | Status |
|---|---|---|---|---|
| PS1 | Reload durability | Create vehicle → F5 → login again → find it | Survives | ☐ |
| PS2 | Multi-tab coherence | Open app in 2 tabs; create a vehicle in tab 1; reload tab 2 | Tab 2 shows it (shared `localStorage`) | ☐ |
| PS3 | Corrupt cache | DevTools → set `localStorage["msts-db"]="{{bad json"` → reload | App reseeds cleanly (no crash); data present | ☐ |
| PS4 | Version migration | DevTools → change `msts-db` version envelope `__v` to `1` → reload | Reseeds to current schema; entity data present | ☐ |
| PS5 | Reset is total | Create several records → Reset demo data | Everything returns to golden numbers; custom records gone | ☐ |
| PS6 | Reset re-tags entities | After reset, verify DI1–DI3 again | Still reconcile exactly | ☐ |
| PS7 | Theme persists | Toggle dark → reload | Stays dark | ☐ |
| PS8 | Entity persists | Select entity 3 → reload → re-login | Entity 3 still selected | ☐ |
| PS9 | Storage keys | Inspect `localStorage` | `msts-db`, `msts-theme`, `msts-entity` present; **no** `msts-session` after reload (auth not persisted) | ☐ |

---

## 3. Authentication robustness

| ID | Case | Steps | Expected | Status |
|---|---|---|---|---|
| AU1 | Gate every route | While logged out, paste each URL: `/`, `/vehicles`, `/finance`, `/reports`, `/account?tab=security` | All redirect to `/login` | ☐ |
| AU2 | Wrong password ×3 | Enter bad password repeatedly | Inline error each time; never proceeds | ☐ |
| AU3 | Empty login | Clear email + password → Sign in | Blocked with error; no navigation | ☐ |
| AU4 | MFA required | Log in, then manually navigate to `/launcher` before MFA | Redirected back to `/mfa` | ☐ |
| AU5 | MFA wrong then right | Enter `000000` (fail) then `123456` | Fails, resets, then succeeds | ☐ |
| AU6 | Portal gate | After MFA, navigate to `/vehicles` before choosing a portal | Redirected to `/launcher` | ☐ |
| AU7 | Refresh = logout | Deep in the app, F5 | Back to `/login` (by design) | ☐ |
| AU8 | Sign out clears | Sign out → press browser Back | Does **not** re-enter app; stays gated | ☐ |
| AU9 | Direct MFA/launcher | Logged out, open `/mfa` and `/launcher` directly | Redirect to `/login` | ☐ |

---

## 4. Input validation & boundaries (negative)

| ID | Case | Steps | Expected | Status |
|---|---|---|---|---|
| VB1 | Empty required | Vehicle create with blank Plate | "Plate is required"; no save | ☐ |
| VB2 | Axles below min | Total axles = `1` | Validation error (min 2) | ☐ |
| VB3 | Axles above max | Total axles = `99` | Validation error (max 12) | ☐ |
| VB4 | Weight boundary | Weight = `0` and `999999` | Rejected out of range | ☐ |
| VB5 | Non-numeric | Type letters in a number field | Rejected / coerced, no NaN saved | ☐ |
| VB6 | Whitespace-only | Plate = `"   "` (spaces) | Treated as empty → error | ☐ |
| VB7 | Very long string | Plate = 200 chars | Rejected (max length) or truncated gracefully — no layout break | ☐ |
| VB8 | Special / HTML chars | Plate/name = `<img src=x onerror=alert(1)>` | Stored/escaped as text; **no alert**, no broken UI (XSS check) | ☐ |
| VB9 | Unicode/emoji | Company name = `Ölçü 🚚 Ǆ` | Saved & displayed correctly | ☐ |
| VB10 | Email format | Account → profile email = `not-an-email` → save | "valid email" error | ☐ |
| VB11 | Password rules | Account → new = `123`, confirm = `123` | "at least 8 characters" | ☐ |
| VB12 | Password mismatch | new `abcd1234`, confirm `abcd9999` | "don't match" | ☐ |
| VB13 | VAT too short | Onboarding VAT = `NL1` → Validate | "could not be validated" | ☐ |
| VB14 | Bulk garbage | Bulk load textarea = random non-CSV text | 0 valid rows; import disabled / no bad records | ☐ |
| VB15 | Bulk partial | Bulk CSV with some blank plate lines | Valid rows counted; blanks skipped | ☐ |
| VB16 | Ticket empty | Support submit with empty subject & message | Two separate errors; nothing saved | ☐ |

---

## 5. Product eligibility — full condition sweep

Reset first. Use the Vehicle → **Products** helper and the Products → Order dialog.

| ID | Condition | Setup | Expected | Status |
|---|---|---|---|---|
| EL1 | Eligible truck | Covered-country Truck → MST Card | Available → order → becomes **Existing** | ☐ |
| EL2 | Country mismatch | NL Truck → HU-GO OBU | "not offered in NL"; Order disabled; API 422 | ☐ |
| EL3 | Type mismatch | Bus → HGV Levy | "not available for buses" (correct plural) | ☐ |
| EL4 | Van heavy-goods | Van → Eurovignette | Not eligible | ☐ |
| EL5 | Van all-class | IT Van → Telepass | Available | ☐ |
| EL6 | Trailer | Trailer → Satellic OBU | Not eligible; Trailer → Eurovignette eligible | ☐ |
| EL7 | Missing attributes | Open a **Missing attrs** vehicle → Products | All show "Complete attributes"; none orderable | ☐ |
| EL8 | Existing re-order | Order same product twice | 2nd attempt blocked (existing) | ☐ |
| EL9 | Backend can't be bypassed | Order dialog: try to force an ineligible pick | Disabled in UI; if forced via API → 422 with reason | ☐ |
| EL10 | Block mode exempt | Block any product on any vehicle | Allowed regardless of eligibility | ☐ |
| EL11 | Eligibility after edit | Change a Bus → Truck, reopen Products | Newly eligible products appear | ☐ |

---

## 6. Search / filter / sort / pagination edges

| ID | Case | Steps | Expected | Status |
|---|---|---|---|---|
| SF1 | No results | Search `zzzzzz` in any list | Friendly empty state; no crash | ☐ |
| SF2 | Special chars in search | Search `%`, `"`, `\`, `<>` | No crash; sensible (usually empty) results | ☐ |
| SF3 | Combined filters | Vehicles: status=Active + country=DE + search | Intersection only; count consistent | ☐ |
| SF4 | Filter + paginate | Apply a filter, go to page 2, change filter | Page resets to 1; results correct | ☐ |
| SF5 | Sort stability | Sort by a column asc/desc/none | Order correct; toggles through 3 states | ☐ |
| SF6 | Page boundaries | Go to last page | "Next" disabled; partial page renders | ☐ |
| SF7 | Rapid typing | Type fast then delete in search | Debounce holds; final result matches final text | ☐ |
| SF8 | Filter then switch entity | Filter Active, switch entity | Filter persists; data rescopes to entity | ☐ |

---

## 7. Concurrency / rapid actions (race conditions)

| ID | Case | Steps | Expected | Status |
|---|---|---|---|---|
| CC1 | Double submit | In a create form, click Save twice fast | Only one record created (button disables while pending) | ☐ |
| CC2 | Rapid entity switch | Switch entity 5× quickly | UI settles on the last entity; no mixed data | ☐ |
| CC3 | Rapid portal switch | Toggle portals quickly | Sidebar/nav consistent with final portal | ☐ |
| CC4 | Order spam | Click **Order** repeatedly on the helper | No duplicate orders beyond intent; button guards | ☐ |
| CC5 | Navigate mid-request | Open a vehicle detail then immediately close/next | No console error; no stuck spinner | ☐ |
| CC6 | Mark-all-read twice | Notifications → Mark all read, reopen, click again | No error; stays 0 unread | ☐ |

---

## 8. Error handling & recovery

| ID | Case | Steps | Expected | Status |
|---|---|---|---|---|
| ER1 | Stale worker | (Dev) edit code / leave tab open long; try an action that 404s | Console shows `[MSW] Unhandled API call…`; hard refresh recovers | ☐ |
| ER2 | Ineligible order error | Force an ineligible order | Toast shows the **specific reason** (not a generic failure) | ☐ |
| ER3 | Offline mutation | DevTools → Network offline → try to create | Graceful error toast; no crash; retry works when back online | ☐ |
| ER4 | AI without keys | `.env` blank → RC extract | Falls back to **Mock** badge; no crash | ☐ |
| ER5 | AI bad image | With Azure keys, upload a non-card image | Returns structured JSON or graceful mock; no unhandled error | ☐ |
| ER6 | 404 route | Open `/totally-made-up` (while authed) | NotFound page with "Back to dashboard" | ☐ |
| ER7 | Reset mid-view | Trigger Reset demo data while viewing a list | List refreshes to seeded data; no stale rows | ☐ |

---

## 9. File export integrity (open the files!)

Don't just trust the toast — **open each downloaded file** and inspect it.

| ID | Case | Steps | Expected | Status |
|---|---|---|---|---|
| FE1 | Transactions CSV | Export → open in Excel/text | Header row + data; amounts/dates correct; count = current filter total | ☐ |
| FE2 | Report CSV | Reports → Truck Detail CSV | Columns match on-screen; rows = entity's vehicles | ☐ |
| FE3 | Report XLSX | Export as XLSX → open in Excel | Opens as a real sheet (not corrupt) | ☐ |
| FE4 | Report PDF | Export as PDF | Branded, multi-page if long, readable table | ☐ |
| FE5 | Invoice PDF | Finance → Download PDF | Correct invoice number, net + VAT + total | ☐ |
| FE6 | Statement PDF | Finance → Statement | Country lines + total; matches consolidated card | ☐ |
| FE7 | Manuals PDF | Support → User manuals | Real PDF with product index | ☐ |
| FE8 | Filter reflected in export | Filter transactions to Exceptions → Export | File contains only exceptions | ☐ |

---

## 10. Cross-module consistency

Changes in one place must reflect everywhere the same data appears.

| ID | Case | Steps | Expected | Status |
|---|---|---|---|---|
| XM1 | Create → dashboard | Add a vehicle → open Dashboard | Vehicle count +1 | ☐ |
| XM2 | Order → vehicle products | Order product → open that vehicle's Products tab | Shows as Existing; Details "active products" +1 | ☐ |
| XM3 | Deactivate → fleet chart | Deactivate a vehicle → Dashboard fleet donut | Deactivated slice +1; active −1 | ☐ |
| XM4 | Pay invoice → status | Finance mark paid → reopen list | Persists as Paid | ☐ |
| XM5 | Activity feed | Create vehicle / order product | New entry appears in Dashboard activity with correct source tag | ☐ |
| XM6 | Onboard → entity switcher | Complete onboarding | New entity selectable in top bar immediately | ☐ |
| XM7 | Vehicle in two portals | Create in Toll 2.0 (Vehicles) → switch to MyTolls → Vehicles | Same vehicle present (shared data) | ☐ |

---

## 11. Portal segregation (access boundaries)

| ID | Case | Steps | Expected | Status |
|---|---|---|---|---|
| PSG1 | MyTolls scope | In MyTolls, confirm sidebar | Vehicles, Hauliers, Products + Support/Account **only** | ☐ |
| PSG2 | MyMST scope | In MyMST | Transactions, Reports, Invoices & AR + Support/Account **only** | ☐ |
| PSG3 | Toll 2.0 scope | In Toll 2.0 | Dashboard, Vehicles, OBU, Domains, Users, Onboarding + Support/Account | ☐ |
| PSG4 | Palette scope | ⌘K in MyMST | Only MyMST + General modules; no "Add vehicle" quick action | ☐ |
| PSG5 | Cross-portal deep link | In MyMST, manually open `/finance` (a MyMST route) vs `/domains` (Toll2.0) | MyMST routes render; note behavior of a route not in the current portal | ☐ |

---

## 12. Responsive, browser & accessibility

| ID | Case | Steps | Expected | Status |
|---|---|---|---|---|
| RB1 | Mobile width | Resize to ~375px across modules | Sidebar → drawer; tables scroll; no horizontal page scroll/overflow | ☐ |
| RB2 | Tablet width | ~768px | Layout adapts; cards reflow | ☐ |
| RB3 | Zoom 150% | Browser zoom | No clipping/overlap | ☐ |
| RB4 | Keyboard only | Tab through login, a form, ⌘K | Focus rings visible; all reachable; Esc closes dialogs/sheets | ☐ |
| RB5 | Second browser | Repeat smoke flow in Firefox/Edge | Same behavior | ☐ |
| RB6 | Long content | Vehicle with many products / long names | Truncates/wraps; no overflow | ☐ |
| RB7 | Dark mode pass | Toggle dark, visit every module | Readable contrast; no invisible text | ☐ |

---

## 13. Soak / volume

| ID | Case | Steps | Expected | Status |
|---|---|---|---|---|
| SK1 | Many creates | Add 20 vehicles in a row | All persist; list + pagination correct; no slowdown/crash | ☐ |
| SK2 | Large bulk import | Bulk paste ~100 CSV rows | Imported; counter accurate; UI responsive | ☐ |
| SK3 | Heavy navigation | Click through all modules 3× | No memory bloat/console errors; stays snappy | ☐ |
| SK4 | localStorage size | After heavy use, check `msts-db` size | Writes succeed; no quota error in console | ☐ |

---

## 14. Regression smoke (run before sign-off)

1. ☐ Reset demo data → golden numbers correct (68 / 340 / 18).
2. ☐ Login → MFA → launcher → Toll 2.0 dashboard loads with data.
3. ☐ Entity switch changes counts (137/114/89) and they sum to 340.
4. ☐ Create vehicle → persists across reload → visible only under its entity.
5. ☐ Product Helper: eligible order succeeds; ineligible blocked with reason.
6. ☐ Export a CSV and a PDF → open them → content correct & scoped.
7. ☐ Finance mark-paid + invoice PDF.
8. ☐ Support ticket persists.
9. ☐ No red errors in Console during the whole pass.

---

## Defect log

| # | Severity | Area / Test ID | Description | Steps to reproduce | Tester |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
