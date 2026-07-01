import { Truck, Receipt, Globe2, type LucideIcon } from "lucide-react";
import type { SourcePortal } from "@/lib/types";

export type PortalId = SourcePortal;

export interface PortalDef {
  id: PortalId;
  /** Display name of the legacy portal. */
  name: string;
  /** One-line positioning statement. */
  tagline: string;
  /** Longer description shown on the launcher card. */
  blurb: string;
  /** Route to land on when this portal is opened. */
  home: string;
  icon: LucideIcon;
  /** Solid accent (hex) used for identity bars/dots. */
  accent: string;
  /** Tailwind classes for the launcher card accent surface. */
  cardClass: string;
  /** Tailwind classes for the small identity chip. */
  chipClass: string;
  /** What this portal is best known for. */
  highlights: string[];
}

export const PORTALS: Record<PortalId, PortalDef> = {
  MyTolls: {
    id: "MyTolls",
    name: "MyTolls",
    tagline: "Fleet, hauliers & tolling products",
    blurb:
      "Manage vehicles and owners, run AI RC-card extraction, and order or block tolling products across Europe.",
    home: "/vehicles",
    icon: Truck,
    accent: "#2563eb",
    cardClass: "from-blue-500/15 to-blue-500/0 ring-blue-500/30",
    chipClass: "bg-blue-50 text-blue-700 ring-blue-200",
    highlights: ["Vehicles", "Hauliers", "Products & Ordering"],
  },
  MyMST: {
    id: "MyMST",
    name: "MyMST",
    tagline: "Transactions, reporting & billing",
    blurb:
      "Search and reconcile toll passages, build reports, and manage one consolidated invoice per period.",
    home: "/transactions",
    icon: Receipt,
    accent: "#7c3aed",
    cardClass: "from-violet-500/15 to-violet-500/0 ring-violet-500/30",
    chipClass: "bg-violet-50 text-violet-700 ring-violet-200",
    highlights: ["Transactions", "Reports", "Invoices & AR"],
  },
  "Toll2.0": {
    id: "Toll2.0",
    name: "Toll 2.0",
    tagline: "Devices, domains & administration",
    blurb:
      "The unified control tower — fleet KPIs, OBUs & devices, toll domains, onboarding and user access.",
    home: "/",
    icon: Globe2,
    accent: "#059669",
    cardClass: "from-emerald-500/15 to-emerald-500/0 ring-emerald-500/30",
    chipClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    highlights: ["Dashboard", "OBU & Devices", "Domains", "Users & Access"],
  },
};

export const PORTAL_LIST: PortalDef[] = [
  PORTALS.MyTolls,
  PORTALS.MyMST,
  PORTALS["Toll2.0"],
];
