// ── Shared domain model for MSTS One ──────────────────────────────
// Consolidates entities across MyTolls, MyMST and Toll2.0.

export type SourcePortal = "MyTolls" | "MyMST" | "Toll2.0";

export type Country =
  | "NL"
  | "DE"
  | "BE"
  | "FR"
  | "IT"
  | "AT"
  | "PL"
  | "CZ"
  | "HU"
  | "BG"
  | "ES";

export type VehicleStatus = "active" | "pending" | "missing_attributes" | "deactivated";

export type VehicleType = "Truck" | "Trailer" | "Bus" | "Van";

export interface Vehicle {
  id: string;
  entityId: string;
  plate: string;
  country: Country;
  fleetCode: string;
  mstsId: string;
  legalEntity: string;
  type: VehicleType;
  euronorm: "EURO 3" | "EURO 4" | "EURO 5" | "EURO 6" | "";
  totalAxles: number;
  totalWeightKg: number;
  co2Class: number;
  vin: string;
  status: VehicleStatus;
  ownerId: string | null;
  products: string[]; // product codes active on this vehicle
  createdAt: string;
  updatedAt: string;
}

export type OBUStatus =
  | "active"
  | "suspended"
  | "in_transit"
  | "defective"
  | "unassigned"
  | "returned";

export interface OBU {
  id: string;
  entityId: string;
  serial: string;
  type: "Satellic OBU" | "Go-Box" | "Telepass" | "MYTO CZ OBU" | "HU-GO OBU" | "T-Tag";
  status: OBUStatus;
  vehicleId: string | null;
  domains: string[];
  shipmentTracking: string | null;
  installedAt: string | null;
  createdAt: string;
}

export interface TollProduct {
  code: string;
  name: string;
  category: "Card" | "OBU" | "Vignette" | "RoutePass" | "Rebate";
  countries: Country[];
  /** Vehicle types this product can be ordered for. */
  eligibleTypes: VehicleType[];
  description: string;
  deposit: number;
  monthlyFee: number;
  icon: string;
}

export type OrderStatus =
  | "draft"
  | "submitted"
  | "processing"
  | "fulfilled"
  | "shipped"
  | "cancelled";

export interface Order {
  id: string;
  entityId: string;
  reference: string;
  productCode: string;
  productName: string;
  mode: "order" | "block";
  vehiclePlate: string;
  quantity: number;
  status: OrderStatus;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export type DomainStatus = "active" | "pending" | "blocked";

export interface TollDomain {
  id: string;
  code: string;
  name: string;
  country: Country;
  provider: string;
  status: DomainStatus;
  assignedVehicles: number;
  assignedObus: number;
  updatedAt: string;
  // Tolling scheme detail (coverage explorer)
  tech: "GNSS" | "DSRC";
  basis: string;
  appliesTo: string;
  rate: string;
  corridors: string;
}

export type TxStatus = "billed" | "unbilled" | "exception" | "rejected";

export interface Transaction {
  id: string;
  entityId: string;
  date: string;
  vehiclePlate: string;
  obuSerial: string | null;
  country: Country;
  domain: string;
  location: string;
  amount: number;
  currency: string;
  status: TxStatus;
}

export interface Haulier {
  id: string;
  entityId: string;
  name: string;
  vatNumber: string;
  country: Country;
  contactEmail: string;
  contactPhone: string;
  fleetSize: number;
  status: "active" | "suspended";
  createdAt: string;
}

export type InvoiceStatus = "paid" | "open" | "overdue" | "disputed";

export interface Invoice {
  id: string;
  entityId: string;
  number: string;
  period: string;
  issuedAt: string;
  dueAt: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  vatAmount: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "Admin" | "Fleet Manager" | "Finance" | "Viewer";
  status: "active" | "invited" | "disabled";
  lastActive: string;
}

export interface Entity {
  id: string;
  displayId: string; // e.g. "13768 | NVD Stage BP 1"
  name: string;
  country: Country;
  vatNumber: string;
  billingAddress?: string;
}

export interface SupportTicket {
  id: string;
  reference: string;
  subject: string;
  product: string;
  message: string;
  status: "open" | "resolved";
  createdAt: string;
}

export interface Profile {
  name: string;
  email: string;
  phone: string;
  language: string;
}

export interface Settings {
  emailNotifications: boolean;
  weeklySummary: boolean;
  twoFactor: boolean;
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  kind: "info" | "success" | "warning" | "alert";
}

export interface ActivityEvent {
  id: string;
  actor: string;
  action: string;
  target: string;
  time: string;
  source: SourcePortal;
}

export interface ReportDef {
  id: string;
  name: string;
  category: "Transactions" | "Financial" | "Fleet" | "Toll" | "Custom";
  description: string;
  source: SourcePortal;
  formats: ("CSV" | "PDF" | "XLSX")[];
  scheduled?: boolean;
}

export type Cadence = "daily" | "weekly" | "monthly";

export interface ScheduledReport {
  id: string;
  entityId: string;
  reportId: string;
  reportName: string;
  format: "CSV" | "PDF" | "XLSX";
  cadence: Cadence;
  status: "active" | "paused";
  createdAt: string;
  lastRunAt: string | null;
  nextRunAt: string;
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

// RC-card AI extraction result
export interface RCCardExtraction {
  plate: string;
  vin: string;
  make: string;
  model: string;
  firstRegistration: string;
  euronorm: string;
  totalWeightKg: number;
  axles: number;
  co2Emission: number;
  countryCode: string;
  confidence: number;
  raw?: Record<string, unknown>;
  source: "azure-openai" | "mock";
}

// ── Whitelabel partners ─────────────────────────────────────────
export type PartnerPackage = "basic" | "professional" | "enterprise";

export type PartnerStatus = "active" | "draft" | "suspended";

export type FeatureFlag =
  | "dashboard"
  | "vehicles"
  | "obu"
  | "hauliers"
  | "products"
  | "domains"
  | "transactions"
  | "reports"
  | "finance"
  | "users"
  | "onboarding"
  | "api-access"
  | "branded-invoicing"
  | "scheduled-reports";

/** A whitelabel business partner (reseller) running the portal under
 *  their own brand. MSTS itself is represented by `null`, not a record. */
export interface Partner {
  id: string;
  name: string;
  /** URL-safe id; simulated domain is tolls.<slug>.com */
  slug: string;
  /** Uploaded logo (data URL). Monogram fallback when absent. */
  logoDataUrl?: string;
  /** Hex accent, e.g. "#2F7D4F" — drives --brand-accent. */
  accentColor: string;
  package: PartnerPackage;
  /** Derived from package on selection, individually overridable. */
  features: FeatureFlag[];
  status: PartnerStatus;
  /** Tenant isolation: customer entities this partner owns. */
  entityIds: string[];
  createdAt: string;
}
