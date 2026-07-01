import { http, HttpResponse, delay } from "msw";
import { db, persist, resetDb } from "./db";
import { PRODUCTS, REPORTS } from "./catalog";
import { listPipeline, parseListParams } from "./helpers";
import { productStatus } from "@/lib/eligibility";
import type {
  Vehicle,
  OBU,
  Order,
  Haulier,
  User,
  Invoice,
  Entity,
  SupportTicket,
} from "@/lib/types";

const now = () => new Date().toISOString();
const rid = (p: string) =>
  `${p}_${Math.random().toString(36).slice(2, 10)}`;
const latency = () => delay(Math.random() * 350 + 120);

function monthKey(d: Date) {
  return d.toLocaleDateString("en-GB", { month: "short" });
}

/** Resolve a report id to a concrete column set + rows drawn from the DB. */
function reportDataset(id: string): {
  columns: string[];
  rows: Record<string, unknown>[];
} {
  switch (id) {
    case "truck-detail":
    case "truck-product-list-csv":
    case "truck-product-list-pdf":
      return {
        columns: ["Plate", "Country", "Type", "EURO norm", "Axles", "Weight (kg)", "Status", "Products"],
        rows: db.vehicles.map((v) => ({
          Plate: v.plate,
          Country: v.country,
          Type: v.type,
          "EURO norm": v.euronorm || "—",
          Axles: v.totalAxles,
          "Weight (kg)": v.totalWeightKg,
          Status: v.status,
          Products: v.products.length,
        })),
      };
    case "customer-list":
      return {
        columns: ["Haulier", "VAT number", "Country", "Contact", "Fleet size", "Status"],
        rows: db.hauliers.map((h) => ({
          Haulier: h.name,
          "VAT number": h.vatNumber,
          Country: h.country,
          Contact: h.contactEmail,
          "Fleet size": h.fleetSize,
          Status: h.status,
        })),
      };
    case "product-domain-list":
      return {
        columns: ["Code", "Domain", "Provider", "Tech", "Status", "Vehicles", "OBUs"],
        rows: db.domains.map((d) => ({
          Code: d.code,
          Domain: d.name,
          Provider: d.provider,
          Tech: d.tech,
          Status: d.status,
          Vehicles: d.assignedVehicles,
          OBUs: d.assignedObus,
        })),
      };
    case "turnover-analysis":
    case "card-turnover-comparison": {
      const map: Record<string, number> = {};
      db.transactions.forEach((t) => (map[t.country] = (map[t.country] ?? 0) + t.amount));
      return {
        columns: ["Country", "Transactions", "Spend (EUR)"],
        rows: Object.entries(map)
          .sort((a, b) => b[1] - a[1])
          .map(([country, spend]) => ({
            Country: country,
            Transactions: db.transactions.filter((t) => t.country === country).length,
            "Spend (EUR)": +spend.toFixed(2),
          })),
      };
    }
    case "unbilled": {
      const rows = db.transactions.filter((t) => t.status === "unbilled");
      return { columns: TX_COLS, rows: rows.map(txRow) };
    }
    default: {
      // transactions / toll-collect-* / eurovignette → transaction rows
      return { columns: TX_COLS, rows: db.transactions.map(txRow) };
    }
  }
}

const TX_COLS = ["Date", "Vehicle", "Country", "Domain", "Location", "Amount (EUR)", "Status"];
function txRow(t: (typeof db.transactions)[number]) {
  return {
    Date: new Date(t.date).toLocaleDateString("en-GB"),
    Vehicle: t.vehiclePlate,
    Country: t.country,
    Domain: t.domain,
    Location: t.location,
    "Amount (EUR)": t.amount,
    Status: t.status,
  };
}

export const handlers = [
  // ── Reference ────────────────────────────────────────────────
  http.get("/api/entities", async () => {
    await latency();
    return HttpResponse.json(db.entities);
  }),
  http.get("/api/products", async () => {
    await latency();
    return HttpResponse.json(PRODUCTS);
  }),
  http.get("/api/reports", async () => {
    await latency();
    return HttpResponse.json(REPORTS);
  }),
  http.get("/api/notifications", async () => {
    await latency();
    return HttpResponse.json(db.notifications);
  }),
  http.post("/api/notifications/read-all", async () => {
    db.notifications.forEach((n) => (n.read = true));
    persist();
    return HttpResponse.json({ ok: true });
  }),
  http.get("/api/activity", async () => {
    await latency();
    return HttpResponse.json(db.activity);
  }),

  // ── Dashboard summary + analytics ────────────────────────────
  http.get("/api/dashboard/summary", async () => {
    await latency();
    const active = db.vehicles.filter((v) => v.status === "active").length;
    const missing = db.vehicles.filter(
      (v) => v.status === "missing_attributes"
    ).length;
    const pending = db.vehicles.filter((v) => v.status === "pending").length;
    const spend = db.transactions.reduce((s, t) => s + t.amount, 0);
    const openInvoices = db.invoices
      .filter((i) => i.status === "open" || i.status === "overdue")
      .reduce((s, i) => s + i.amount, 0);
    const activeObus = db.obus.filter((o) => o.status === "active").length;
    return HttpResponse.json({
      vehicles: db.vehicles.length,
      activeVehicles: active,
      missingAttributes: missing,
      pendingVehicles: pending,
      obus: db.obus.length,
      activeObus,
      periodSpend: +spend.toFixed(2),
      openInvoices: +openInvoices.toFixed(2),
      transactions: db.transactions.length,
      exceptions: db.transactions.filter((t) => t.status === "exception").length,
    });
  }),

  http.get("/api/analytics/spend-trend", async () => {
    await latency();
    const buckets: Record<string, number> = {};
    const order: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const k = monthKey(d);
      buckets[k] = 0;
      order.push(k);
    }
    db.transactions.forEach((t) => {
      const k = monthKey(new Date(t.date));
      if (k in buckets) buckets[k] += t.amount;
    });
    return HttpResponse.json(
      order.map((k) => ({ month: k, spend: +buckets[k].toFixed(0) }))
    );
  }),

  http.get("/api/analytics/spend-by-country", async () => {
    await latency();
    const map: Record<string, number> = {};
    db.transactions.forEach((t) => {
      map[t.country] = (map[t.country] ?? 0) + t.amount;
    });
    return HttpResponse.json(
      Object.entries(map)
        .map(([country, spend]) => ({ country, spend: +spend.toFixed(0) }))
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 7)
    );
  }),

  http.get("/api/analytics/fleet-status", async () => {
    await latency();
    const count = (s: string) =>
      db.vehicles.filter((v) => v.status === s).length;
    return HttpResponse.json([
      { name: "Active", value: count("active"), key: "active" },
      { name: "Pending", value: count("pending"), key: "pending" },
      { name: "Missing attrs", value: count("missing_attributes"), key: "missing_attributes" },
      { name: "Deactivated", value: count("deactivated"), key: "deactivated" },
    ]);
  }),

  // ── Vehicles ─────────────────────────────────────────────────
  http.get("/api/vehicles", async ({ request }) => {
    await latency();
    const url = new URL(request.url);
    const p = parseListParams(url);
    const result = listPipeline<Vehicle>(db.vehicles, {
      q: p.q,
      searchFields: ["plate", "fleetCode", "mstsId", "vin", "legalEntity"],
      filters: {
        status: url.searchParams.get("status"),
        country: url.searchParams.get("country"),
      },
      sort: p.sort,
      page: p.page,
      pageSize: p.pageSize,
    });
    return HttpResponse.json(result);
  }),
  http.get("/api/vehicles/:id", async ({ params }) => {
    await latency();
    const v = db.vehicles.find((x) => x.id === params.id);
    if (!v) return new HttpResponse(null, { status: 404 });
    const owner = db.hauliers.find((h) => h.id === v.ownerId) ?? null;
    const vObus = db.obus.filter((o) => o.vehicleId === v.id);
    return HttpResponse.json({ ...v, owner, obus: vObus });
  }),
  http.get("/api/vehicles/:id/history", async ({ params }) => {
    await latency();
    const v = db.vehicles.find((x) => x.id === params.id);
    if (!v) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json([
      { at: v.updatedAt, actor: "lars.jansen", change: "Updated vehicle attributes" },
      { at: v.createdAt, actor: "system", change: "Vehicle created" },
    ]);
  }),
  http.post("/api/vehicles", async ({ request }) => {
    await latency();
    const body = (await request.json()) as Partial<Vehicle>;
    const v: Vehicle = {
      id: rid("veh"),
      plate: body.plate ?? "NEW-000",
      country: body.country ?? "NL",
      fleetCode: body.fleetCode ?? "",
      mstsId: String(Math.floor(50000 + Math.random() * 9999)),
      legalEntity: body.legalEntity ?? db.entities[0].name,
      type: body.type ?? "Truck",
      euronorm: body.euronorm ?? "EURO 6",
      totalAxles: body.totalAxles ?? 2,
      totalWeightKg: body.totalWeightKg ?? 18000,
      co2Class: body.co2Class ?? 1,
      vin: body.vin ?? "",
      status: body.status ?? "active",
      ownerId: body.ownerId ?? db.hauliers[0].id,
      products: body.products ?? [],
      createdAt: now(),
      updatedAt: now(),
    };
    db.vehicles.unshift(v);
    db.activity.unshift({
      id: rid("act"),
      actor: "lars.jansen",
      action: "created vehicle",
      target: v.plate,
      time: now(),
      source: "Toll2.0",
    });
    persist();
    return HttpResponse.json(v, { status: 201 });
  }),
  http.patch("/api/vehicles/:id", async ({ params, request }) => {
    await latency();
    const idx = db.vehicles.findIndex((x) => x.id === params.id);
    if (idx < 0) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as Partial<Vehicle>;
    db.vehicles[idx] = { ...db.vehicles[idx], ...body, updatedAt: now() };
    persist();
    return HttpResponse.json(db.vehicles[idx]);
  }),
  http.post("/api/vehicles/:id/deactivate", async ({ params }) => {
    await latency();
    const v = db.vehicles.find((x) => x.id === params.id);
    if (!v) return new HttpResponse(null, { status: 404 });
    v.status = "deactivated";
    v.updatedAt = now();
    persist();
    return HttpResponse.json(v);
  }),
  http.post("/api/vehicles/bulk", async ({ request }) => {
    await latency();
    const body = (await request.json()) as { rows: Partial<Vehicle>[] };
    const created = (body.rows ?? []).map((r) => {
      const v: Vehicle = {
        id: rid("veh"),
        plate: r.plate ?? "BULK-000",
        country: r.country ?? "NL",
        fleetCode: r.fleetCode ?? "",
        mstsId: String(Math.floor(50000 + Math.random() * 9999)),
        legalEntity: db.entities[0].name,
        type: r.type ?? "Truck",
        euronorm: r.euronorm ?? "EURO 6",
        totalAxles: r.totalAxles ?? 2,
        totalWeightKg: r.totalWeightKg ?? 18000,
        co2Class: 1,
        vin: r.vin ?? "",
        status: "pending",
        ownerId: db.hauliers[0].id,
        products: [],
        createdAt: now(),
        updatedAt: now(),
      };
      db.vehicles.unshift(v);
      return v;
    });
    persist();
    return HttpResponse.json({ created: created.length });
  }),

  // ── OBUs ─────────────────────────────────────────────────────
  http.get("/api/obus", async ({ request }) => {
    await latency();
    const url = new URL(request.url);
    const p = parseListParams(url);
    const rows = db.obus.map((o) => ({
      ...o,
      vehiclePlate:
        db.vehicles.find((v) => v.id === o.vehicleId)?.plate ?? null,
    }));
    const result = listPipeline(rows, {
      q: p.q,
      searchFields: ["serial", "type"],
      filters: {
        status: url.searchParams.get("status"),
        type: url.searchParams.get("type"),
      },
      sort: p.sort,
      page: p.page,
      pageSize: p.pageSize,
    });
    return HttpResponse.json(result);
  }),
  http.post("/api/obus/:id/:action", async ({ params, request }) => {
    await latency();
    const o = db.obus.find((x) => x.id === params.id) as OBU | undefined;
    if (!o) return new HttpResponse(null, { status: 404 });
    const action = params.action as string;
    const body = (await request.json().catch(() => ({}))) as {
      vehicleId?: string;
    };
    switch (action) {
      case "assign":
        o.vehicleId = body.vehicleId ?? null;
        o.status = "active";
        o.installedAt = now();
        break;
      case "unassign":
        o.vehicleId = null;
        o.status = "unassigned";
        break;
      case "suspend":
        o.status = "suspended";
        break;
      case "activate":
        o.status = "active";
        break;
      case "replace":
        o.status = "returned";
        break;
    }
    persist();
    return HttpResponse.json(o);
  }),

  // ── Orders ───────────────────────────────────────────────────
  http.get("/api/orders", async ({ request }) => {
    await latency();
    const url = new URL(request.url);
    const p = parseListParams(url);
    const result = listPipeline<Order>(db.orders, {
      q: p.q,
      searchFields: ["reference", "productName", "vehiclePlate"],
      filters: { status: url.searchParams.get("status") },
      sort: p.sort ?? "-createdAt",
      page: p.page,
      pageSize: p.pageSize,
    });
    return HttpResponse.json(result);
  }),
  http.post("/api/orders", async ({ request }) => {
    await latency();
    const body = (await request.json()) as {
      productCode: string;
      mode: "order" | "block";
      vehiclePlate: string;
      quantity: number;
    };
    const product = PRODUCTS.find((p) => p.code === body.productCode);
    const vehicle = db.vehicles.find((v) => v.plate === body.vehiclePlate);

    // Enforce per-vehicle product eligibility on order (block mode is exempt).
    if (body.mode === "order") {
      if (!product) return HttpResponse.json({ error: "Unknown product" }, { status: 400 });
      if (!vehicle) return HttpResponse.json({ error: "Unknown vehicle" }, { status: 400 });
      const status = productStatus(vehicle, product);
      if (status.kind !== "available") {
        return HttpResponse.json(
          { error: status.reason ?? "This product is not eligible for the selected vehicle." },
          { status: 422 }
        );
      }
    }

    const order: Order = {
      id: rid("ord"),
      reference: `ORD-${Math.floor(100000 + Math.random() * 899999)}`,
      productCode: body.productCode,
      productName: product?.name ?? body.productCode,
      mode: body.mode,
      vehiclePlate: body.vehiclePlate,
      quantity: body.quantity,
      status: "submitted",
      total: +(
        (product?.deposit ?? 0) * body.quantity +
        (product?.monthlyFee ?? 0) * body.quantity
      ).toFixed(2),
      createdAt: now(),
      updatedAt: now(),
    };
    db.orders.unshift(order);

    // Reflect the order on the vehicle so status becomes "existing" (or is
    // removed when blocked).
    if (vehicle) {
      if (body.mode === "order" && !vehicle.products.includes(body.productCode)) {
        vehicle.products.push(body.productCode);
      } else if (body.mode === "block") {
        vehicle.products = vehicle.products.filter((c) => c !== body.productCode);
      }
      vehicle.updatedAt = now();
    }
    db.activity.unshift({
      id: rid("act"),
      actor: "lars.jansen",
      action: body.mode === "block" ? "blocked product" : "ordered product",
      target: order.productName,
      time: now(),
      source: "MyTolls",
    });
    persist();
    return HttpResponse.json(order, { status: 201 });
  }),

  // ── Domains ──────────────────────────────────────────────────
  http.get("/api/domains", async () => {
    await latency();
    return HttpResponse.json(db.domains);
  }),
  http.patch("/api/domains/:id", async ({ params, request }) => {
    await latency();
    const d = db.domains.find((x) => x.id === params.id);
    if (!d) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as { status?: typeof d.status };
    if (body.status) d.status = body.status;
    d.updatedAt = now();
    persist();
    return HttpResponse.json(d);
  }),

  // ── Transactions ─────────────────────────────────────────────
  http.get("/api/transactions", async ({ request }) => {
    await latency();
    const url = new URL(request.url);
    const p = parseListParams(url);
    const result = listPipeline(db.transactions, {
      q: p.q,
      searchFields: ["vehiclePlate", "obuSerial", "location", "domain"],
      filters: {
        status: url.searchParams.get("status"),
        country: url.searchParams.get("country"),
      },
      sort: p.sort ?? "-date",
      page: p.page,
      pageSize: p.pageSize,
    });
    return HttpResponse.json(result);
  }),

  // ── Reports run — returns REAL rows for the client to export ─
  http.post("/api/reports/:id/run", async ({ params, request }) => {
    await delay(700);
    const body = (await request.json().catch(() => ({}))) as { format?: string };
    const format = body.format ?? "CSV";
    const { columns, rows } = reportDataset(String(params.id));
    return HttpResponse.json({
      id: params.id,
      format,
      fileName: `${params.id}-2026Q2.${format.toLowerCase()}`,
      count: rows.length,
      columns,
      rows,
      generatedAt: now(),
    });
  }),

  // ── Hauliers ─────────────────────────────────────────────────
  http.get("/api/hauliers", async ({ request }) => {
    await latency();
    const url = new URL(request.url);
    const p = parseListParams(url);
    const result = listPipeline<Haulier>(db.hauliers, {
      q: p.q,
      searchFields: ["name", "vatNumber", "contactEmail"],
      filters: {
        status: url.searchParams.get("status"),
        country: url.searchParams.get("country"),
      },
      sort: p.sort,
      page: p.page,
      pageSize: p.pageSize,
    });
    return HttpResponse.json(result);
  }),
  http.post("/api/hauliers", async ({ request }) => {
    await latency();
    const body = (await request.json()) as Partial<Haulier>;
    const h: Haulier = {
      id: rid("hlr"),
      name: body.name ?? "New Haulier",
      vatNumber: body.vatNumber ?? "",
      country: body.country ?? "NL",
      contactEmail: body.contactEmail ?? "",
      contactPhone: body.contactPhone ?? "",
      fleetSize: body.fleetSize ?? 0,
      status: "active",
      createdAt: now(),
    };
    db.hauliers.unshift(h);
    persist();
    return HttpResponse.json(h, { status: 201 });
  }),

  // ── Invoices / Finance ───────────────────────────────────────
  http.get("/api/invoices", async ({ request }) => {
    await latency();
    const url = new URL(request.url);
    const p = parseListParams(url);
    const result = listPipeline<Invoice>(db.invoices, {
      q: p.q,
      searchFields: ["number", "period"],
      filters: { status: url.searchParams.get("status") },
      sort: p.sort ?? "-issuedAt",
      page: p.page,
      pageSize: p.pageSize,
    });
    return HttpResponse.json(result);
  }),
  http.post("/api/invoices/:id/:action", async ({ params }) => {
    await latency();
    const inv = db.invoices.find((x) => x.id === params.id);
    if (!inv) return new HttpResponse(null, { status: 404 });
    if (params.action === "pay") inv.status = "paid";
    if (params.action === "dispute") inv.status = "disputed";
    persist();
    return HttpResponse.json(inv);
  }),

  // ── Users & Access ───────────────────────────────────────────
  http.get("/api/users", async () => {
    await latency();
    return HttpResponse.json(db.users);
  }),
  http.post("/api/users", async ({ request }) => {
    await latency();
    const body = (await request.json()) as Partial<User>;
    const u: User = {
      id: rid("usr"),
      name: body.name ?? "New User",
      email: body.email ?? "",
      role: body.role ?? "Viewer",
      status: "invited",
      lastActive: now(),
    };
    db.users.unshift(u);
    persist();
    return HttpResponse.json(u, { status: 201 });
  }),
  http.patch("/api/users/:id", async ({ params, request }) => {
    await latency();
    const u = db.users.find((x) => x.id === params.id);
    if (!u) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as Partial<User>;
    Object.assign(u, body);
    persist();
    return HttpResponse.json(u);
  }),
  http.delete("/api/users/:id", async ({ params }) => {
    await latency();
    const idx = db.users.findIndex((x) => x.id === params.id);
    if (idx >= 0) db.users.splice(idx, 1);
    persist();
    return HttpResponse.json({ ok: true });
  }),

  // ── Onboarding (simulated validation) ────────────────────────
  http.post("/api/onboarding/validate-vat", async ({ request }) => {
    await delay(700);
    const body = (await request.json()) as { vat?: string };
    const valid = !!body.vat && body.vat.replace(/\s/g, "").length >= 8;
    return HttpResponse.json({
      valid,
      company: valid ? "Verified Trading B.V." : null,
      address: valid ? "Havenweg 12, 3011 Rotterdam, NL" : null,
    });
  }),
  http.post("/api/onboarding/submit", async ({ request }) => {
    await delay(900);
    const body = (await request.json().catch(() => ({}))) as {
      company?: string;
      vat?: string;
      country?: string;
    };
    const id = rid("e");
    const seq = 20000 + db.entities.length + Math.floor(Math.random() * 900);
    const entity: Entity = {
      id,
      displayId: `${seq} | ${body.company || "New Company"}`,
      name: body.company || "New Company",
      country: (body.country as Entity["country"]) ?? "NL",
      vatNumber: body.vat || "",
      billingAddress: "",
    };
    db.entities.push(entity);
    db.activity.unshift({
      id: rid("act"),
      actor: "lars.jansen",
      action: "onboarded company",
      target: entity.name,
      time: now(),
      source: "Toll2.0",
    });
    persist();
    return HttpResponse.json({ ok: true, entityId: id, entity });
  }),

  // ── Entity update (Account → company details) ────────────────
  http.patch("/api/entities/:id", async ({ params, request }) => {
    await latency();
    const e = db.entities.find((x) => x.id === params.id);
    if (!e) return new HttpResponse(null, { status: 404 });
    const body = (await request.json()) as Partial<Entity>;
    Object.assign(e, body);
    persist();
    return HttpResponse.json(e);
  }),

  // ── Profile & settings (Account) ─────────────────────────────
  http.get("/api/profile", async () => {
    await latency();
    return HttpResponse.json(db.profile);
  }),
  http.patch("/api/profile", async ({ request }) => {
    await latency();
    const body = (await request.json()) as Partial<typeof db.profile>;
    Object.assign(db.profile, body);
    persist();
    return HttpResponse.json(db.profile);
  }),
  http.get("/api/settings", async () => {
    await latency();
    return HttpResponse.json(db.settings);
  }),
  http.patch("/api/settings", async ({ request }) => {
    await latency();
    const body = (await request.json()) as Partial<typeof db.settings>;
    Object.assign(db.settings, body);
    persist();
    return HttpResponse.json(db.settings);
  }),

  // ── Support tickets ──────────────────────────────────────────
  http.get("/api/tickets", async () => {
    await latency();
    return HttpResponse.json(db.tickets);
  }),
  http.post("/api/tickets", async ({ request }) => {
    await latency();
    const body = (await request.json()) as Partial<SupportTicket>;
    const ticket: SupportTicket = {
      id: rid("tkt"),
      reference: `TKT-${Math.floor(100000 + Math.random() * 899999)}`,
      subject: body.subject ?? "Support request",
      product: body.product ?? "General",
      message: body.message ?? "",
      status: "open",
      createdAt: now(),
    };
    db.tickets.unshift(ticket);
    persist();
    return HttpResponse.json(ticket, { status: 201 });
  }),

  // ── System: reset demo data ──────────────────────────────────
  http.post("/api/system/reset", async () => {
    await delay(500);
    resetDb();
    return HttpResponse.json({ ok: true });
  }),
];
