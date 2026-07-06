import { faker } from "@faker-js/faker";
import { PRODUCTS, REPORTS } from "./catalog";
import { loadDb, saveDb, clearDb } from "./persistence";
import type {
  ActivityEvent,
  Country,
  Entity,
  Haulier,
  Invoice,
  NotificationItem,
  OBU,
  Order,
  Partner,
  Profile,
  ScheduledReport,
  Settings,
  SupportTicket,
  TollDomain,
  Transaction,
  User,
  Vehicle,
} from "@/lib/types";
import { PACKAGE_FEATURES } from "@/lib/brand";

const COUNTRY_CODES: Country[] = [
  "NL", "DE", "BE", "FR", "IT", "AT", "PL", "CZ", "HU", "BG", "ES",
];
const pickCountry = () => faker.helpers.arrayElement(COUNTRY_CODES);
const iso = (d: Date) => d.toISOString();
const uid = (p: string) => `${p}_${faker.string.alphanumeric(8).toLowerCase()}`;

function makePlate(country: Country): string {
  switch (country) {
    case "NL":
      return `${faker.string.numeric(2)}-${faker.string.alpha({ length: 3, casing: "upper" })}-${faker.string.numeric(1)}`;
    case "DE":
      return `${faker.string.alpha({ length: 2, casing: "upper" })} ${faker.string.alpha({ length: 2, casing: "upper" })} ${faker.string.numeric(4)}`;
    default:
      return `${faker.string.alpha({ length: 2, casing: "upper" })}${faker.string.numeric(3)}${faker.string.alpha({ length: 2, casing: "upper" })}`;
  }
}

export interface DBShape {
  entities: Entity[];
  hauliers: Haulier[];
  vehicles: Vehicle[];
  obus: OBU[];
  domains: TollDomain[];
  transactions: Transaction[];
  invoices: Invoice[];
  users: User[];
  orders: Order[];
  notifications: NotificationItem[];
  activity: ActivityEvent[];
  tickets: SupportTicket[];
  scheduledReports: ScheduledReport[];
  partners: Partner[];
  profile: Profile;
  settings: Settings;
}

/** Build a fresh, realistic corpus. Deterministic via a fixed seed. */
export function seedData(): DBShape {
  faker.seed(20260701);

  const entities: Entity[] = [
    { id: "e1", displayId: "13768 | NVD Stage BP 1", name: "NVD Transport B.V.", country: "NL", vatNumber: "NL8123.45.678.B01", billingAddress: "Havenweg 12, 3011 Rotterdam, NL" },
    { id: "e2", displayId: "11769 | Automation Foreign Std", name: "Automation Foreign Standard", country: "DE", vatNumber: "DE811234567", billingAddress: "Industriestraße 4, 40210 Düsseldorf, DE" },
    { id: "e3", displayId: "20452 | Meridian Logistics", name: "Meridian Logistics S.p.A.", country: "IT", vatNumber: "IT01234560123", billingAddress: "Via Roma 88, 20121 Milano, IT" },
  ];

  const hauliers: Haulier[] = Array.from({ length: 24 }, () => {
    const country = pickCountry();
    const entity = faker.helpers.arrayElement(entities);
    return {
      id: uid("hlr"),
      entityId: entity.id,
      name: faker.company.name(),
      vatNumber: `${country}${faker.string.numeric(9)}`,
      country,
      contactEmail: faker.internet.email().toLowerCase(),
      contactPhone: faker.phone.number(),
      fleetSize: faker.number.int({ min: 3, max: 240 }),
      status: faker.helpers.arrayElement(["active", "active", "active", "suspended"]),
      createdAt: iso(faker.date.past({ years: 3 })),
    };
  });

  const vehicles: Vehicle[] = Array.from({ length: 68 }, () => {
    const country = pickCountry();
    const status = faker.helpers.weightedArrayElement([
      { value: "active" as const, weight: 6 },
      { value: "pending" as const, weight: 2 },
      { value: "missing_attributes" as const, weight: 2 },
      { value: "deactivated" as const, weight: 1 },
    ]);
    const created = faker.date.past({ years: 2 });
    const entity = faker.helpers.arrayElement(entities);
    const entityHauliers = hauliers.filter((h) => h.entityId === entity.id);
    const owner = entityHauliers.length
      ? faker.helpers.arrayElement(entityHauliers)
      : faker.helpers.arrayElement(hauliers);
    return {
      id: uid("veh"),
      entityId: entity.id,
      plate: makePlate(country),
      country,
      fleetCode: faker.helpers.maybe(() => faker.string.alpha({ length: 4, casing: "upper" }), { probability: 0.6 }) ?? "",
      mstsId: faker.string.numeric(5),
      legalEntity: entity.name,
      type: faker.helpers.arrayElement(["Truck", "Truck", "Truck", "Trailer", "Bus", "Van"]),
      euronorm: status === "missing_attributes" ? "" : faker.helpers.arrayElement(["EURO 5", "EURO 6", "EURO 6", "EURO 4"]),
      totalAxles: faker.number.int({ min: 2, max: 6 }),
      totalWeightKg: faker.number.int({ min: 7500, max: 40000 }),
      co2Class: faker.number.int({ min: 1, max: 5 }),
      vin: faker.vehicle.vin(),
      status,
      ownerId: owner.id,
      products: faker.helpers.arrayElements(PRODUCTS, { min: 0, max: 4 }).map((p) => p.code),
      createdAt: iso(created),
      updatedAt: iso(faker.date.between({ from: created, to: new Date() })),
    };
  });

  const OBU_TYPES: OBU["type"][] = ["Satellic OBU", "Go-Box", "Telepass", "MYTO CZ OBU", "HU-GO OBU", "T-Tag"];
  const obus: OBU[] = Array.from({ length: 82 }, () => {
    const status = faker.helpers.weightedArrayElement([
      { value: "active" as const, weight: 6 },
      { value: "unassigned" as const, weight: 2 },
      { value: "in_transit" as const, weight: 2 },
      { value: "suspended" as const, weight: 1 },
      { value: "defective" as const, weight: 1 },
    ]);
    const assigned = status === "active" || status === "suspended";
    const vehicle = assigned ? faker.helpers.arrayElement(vehicles) : null;
    return {
      id: uid("obu"),
      entityId: vehicle?.entityId ?? faker.helpers.arrayElement(entities).id,
      serial: faker.string.numeric(12),
      type: faker.helpers.arrayElement(OBU_TYPES),
      status,
      vehicleId: vehicle?.id ?? null,
      domains: faker.helpers.arrayElements(["DE-TollCollect", "BE-Viapass", "AT-GoMaut", "IT-Telepass", "CZ-Myto", "HU-HuGo"], { min: 1, max: 3 }),
      shipmentTracking: status === "in_transit" ? `TRK${faker.string.numeric(10)}` : null,
      installedAt: assigned ? iso(faker.date.past({ years: 1 })) : null,
      createdAt: iso(faker.date.past({ years: 2 })),
    };
  });

  const domains: TollDomain[] = [
    { code: "DE-TollCollect", name: "Germany · Toll Collect", country: "DE", provider: "Toll Collect GmbH", tech: "GNSS", basis: "Distance", appliesTo: "≥ 3.5 t", rate: "€0.19–0.35 / km", corridors: "E40 · E45" },
    { code: "BE-Viapass", name: "Belgium · Viapass", country: "BE", provider: "Satellic", tech: "GNSS", basis: "Distance", appliesTo: "≥ 3.5 t", rate: "€0.11–0.29 / km", corridors: "E19 · E40" },
    { code: "AT-GoMaut", name: "Austria · GO-Maut", country: "AT", provider: "ASFINAG", tech: "DSRC", basis: "Distance", appliesTo: "≥ 3.5 t", rate: "€0.23–0.45 / km", corridors: "E60 · E55" },
    { code: "IT-Telepass", name: "Italy · Telepass", country: "IT", provider: "Telepass S.p.A.", tech: "DSRC", basis: "Distance", appliesTo: "All classes", rate: "€0.10–0.26 / km", corridors: "E35 · E45" },
    { code: "CZ-Myto", name: "Czech Republic · MYTO CZ", country: "CZ", provider: "CzechToll", tech: "DSRC", basis: "Distance", appliesTo: "≥ 3.5 t", rate: "€0.11–0.24 / km", corridors: "E50 · E65" },
    { code: "HU-HuGo", name: "Hungary · HU-GO", country: "HU", provider: "NÚSZ", tech: "GNSS", basis: "Distance", appliesTo: "≥ 3.5 t", rate: "€0.10–0.18 / km", corridors: "E60 · E71" },
    { code: "FR-TIS", name: "France · TIS PL", country: "FR", provider: "Bip&Go", tech: "DSRC", basis: "Distance (gantry)", appliesTo: "≥ 3.5 t", rate: "€0.20–0.28 / km", corridors: "E15 · E70" },
    { code: "ES-ViaT", name: "Spain · Via-T", country: "ES", provider: "Emovis", tech: "DSRC", basis: "Distance", appliesTo: "All classes", rate: "€0.12–0.22 / km", corridors: "E5 · E90" },
  ].map((d, i): TollDomain => ({
    id: `dom_${i}`,
    ...d,
    country: d.country as Country,
    tech: d.tech as "GNSS" | "DSRC",
    status: faker.helpers.weightedArrayElement([
      { value: "active" as const, weight: 6 },
      { value: "pending" as const, weight: 2 },
      { value: "blocked" as const, weight: 1 },
    ]),
    assignedVehicles: faker.number.int({ min: 2, max: 40 }),
    assignedObus: faker.number.int({ min: 1, max: 30 }),
    updatedAt: iso(faker.date.recent({ days: 60 })),
  }));

  const transactions: Transaction[] = Array.from({ length: 340 }, () => {
    const v = faker.helpers.arrayElement(vehicles);
    const dom = faker.helpers.arrayElement(domains);
    return {
      id: uid("trx"),
      entityId: v.entityId,
      date: iso(faker.date.recent({ days: 90 })),
      vehiclePlate: v.plate,
      obuSerial: faker.helpers.maybe(() => faker.helpers.arrayElement(obus).serial, { probability: 0.7 }) ?? null,
      country: dom.country,
      domain: dom.name,
      location: `${faker.location.city()} · A${faker.number.int({ min: 1, max: 99 })}`,
      amount: faker.number.float({ min: 2.5, max: 320, fractionDigits: 2 }),
      currency: "EUR",
      status: faker.helpers.weightedArrayElement([
        { value: "billed" as const, weight: 6 },
        { value: "unbilled" as const, weight: 3 },
        { value: "exception" as const, weight: 1 },
        { value: "rejected" as const, weight: 1 },
      ]),
    };
  });

  const invoices: Invoice[] = Array.from({ length: 18 }, (_, i) => {
    const issued = faker.date.recent({ days: 30 + i * 15 });
    const due = new Date(issued);
    due.setDate(due.getDate() + 30);
    const amount = faker.number.float({ min: 1800, max: 42000, fractionDigits: 2 });
    return {
      id: uid("inv"),
      entityId: entities[i % entities.length].id,
      number: `MST-2026-${String(1042 - i).padStart(5, "0")}`,
      period: issued.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
      issuedAt: iso(issued),
      dueAt: iso(due),
      amount,
      vatAmount: +(amount * 0.21).toFixed(2),
      currency: "EUR",
      status: faker.helpers.weightedArrayElement([
        { value: "paid" as const, weight: 5 },
        { value: "open" as const, weight: 3 },
        { value: "overdue" as const, weight: 1 },
        { value: "disputed" as const, weight: 1 },
      ]),
    };
  });

  const users: User[] = Array.from({ length: 9 }, (_, i) => ({
    id: uid("usr"),
    name: faker.person.fullName(),
    email: faker.internet.email().toLowerCase(),
    role: i === 0 ? "Admin" : faker.helpers.arrayElement(["Fleet Manager", "Finance", "Viewer"]),
    status: faker.helpers.arrayElement(["active", "active", "invited", "disabled"]),
    lastActive: iso(faker.date.recent({ days: 20 })),
  }));

  const orders: Order[] = Array.from({ length: 22 }, () => {
    const p = faker.helpers.arrayElement(PRODUCTS);
    const v = faker.helpers.arrayElement(vehicles);
    const qty = faker.number.int({ min: 1, max: 5 });
    const created = faker.date.recent({ days: 120 });
    return {
      id: uid("ord"),
      entityId: v.entityId,
      reference: `ORD-${faker.string.numeric(6)}`,
      productCode: p.code,
      productName: p.name,
      mode: faker.helpers.arrayElement(["order", "order", "order", "block"]),
      vehiclePlate: v.plate,
      quantity: qty,
      status: faker.helpers.arrayElement(["submitted", "processing", "fulfilled", "shipped", "fulfilled"]),
      total: +(p.deposit * qty + p.monthlyFee * qty).toFixed(2),
      createdAt: iso(created),
      updatedAt: iso(faker.date.between({ from: created, to: new Date() })),
    };
  });

  const notifications: NotificationItem[] = [
    { id: "n1", title: "3 vehicles missing attributes", description: "Complete EURO norm & weight to enable ordering.", time: iso(faker.date.recent({ days: 1 })), read: false, kind: "warning" },
    { id: "n2", title: "Invoice MST-2026-01042 is due soon", description: "€ 12,480.00 due in 5 days.", time: iso(faker.date.recent({ days: 2 })), read: false, kind: "alert" },
    { id: "n3", title: "OBU shipment delivered", description: "2 Satellic OBUs delivered to depot Rotterdam.", time: iso(faker.date.recent({ days: 3 })), read: true, kind: "success" },
    { id: "n4", title: "New Toll Collect rates effective", description: "German toll tariffs updated for EURO 6.", time: iso(faker.date.recent({ days: 6 })), read: true, kind: "info" },
  ];

  const activity: ActivityEvent[] = Array.from({ length: 14 }, () => ({
    id: uid("act"),
    actor: faker.person.firstName(),
    action: faker.helpers.arrayElement(["created vehicle", "ordered product", "assigned OBU", "generated report", "disputed invoice", "updated domain", "deactivated vehicle"]),
    target: faker.helpers.arrayElement([makePlate("NL"), "MST Card", "Satellic OBU", "Turnover Analysis", "MST-2026-01041"]),
    time: iso(faker.date.recent({ days: 10 })),
    source: faker.helpers.arrayElement(["MyTolls", "MyMST", "Toll2.0"]),
  }));

  const profile: Profile = {
    name: "Lars Jansen",
    email: "lars@nvd-transport.nl",
    phone: "+31 6 1234 5678",
    language: "English",
  };

  const settings: Settings = {
    emailNotifications: true,
    weeklySummary: false,
    twoFactor: true,
  };

  const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const scheduledReports: ScheduledReport[] = [
    { reportId: "turnover-analysis", format: "PDF" as const, cadence: "monthly" as const, entityId: "e1", days: 12 },
    { reportId: "unbilled", format: "CSV" as const, cadence: "weekly" as const, entityId: "e1", days: 4 },
    { reportId: "truck-detail", format: "XLSX" as const, cadence: "daily" as const, entityId: "e2", days: 1 },
  ].map((s) => {
    const def = REPORTS.find((r) => r.id === s.reportId);
    const created = faker.date.past({ years: 1 });
    return {
      id: uid("sch"),
      entityId: s.entityId,
      reportId: s.reportId,
      reportName: def?.name ?? s.reportId,
      format: s.format,
      cadence: s.cadence,
      status: "active" as const,
      createdAt: iso(created),
      lastRunAt: iso(faker.date.recent({ days: s.days + 1 })),
      nextRunAt: iso(addDays(new Date(), s.days)),
    };
  });

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

  return {
    entities, hauliers, vehicles, obus, domains, transactions,
    invoices, users, orders, notifications, activity,
    tickets: [], scheduledReports, partners, profile, settings,
  };
}

// Live DB — hydrated from localStorage, or freshly seeded on first run.
export const db: DBShape = loadDb(seedData);

/** Persist the current DB state. Call after every mutation in handlers. */
export function persist(): void {
  saveDb(db);
}

/** Wipe persisted data and repopulate from the seed (in place). */
export function resetDb(): void {
  clearDb();
  Object.assign(db, seedData());
  saveDb(db);
}

export type DB = DBShape;
