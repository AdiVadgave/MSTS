import {
  LayoutDashboard,
  Truck,
  RadioTower,
  Building2,
  ShoppingCart,
  Globe2,
  Receipt,
  BarChart3,
  Wallet,
  Users,
  UserPlus,
  LifeBuoy,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { FeatureFlag, Partner, SourcePortal } from "@/lib/types";
import { featureEnabled } from "@/lib/brand";
import { PORTAL_SOURCES } from "./portals";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  sources: SourcePortal[];
  keywords?: string[];
  description?: string;
  /** Cross-cutting modules available inside every portal. */
  global?: boolean;
  /** Package feature flag gating this module for whitelabel partners. */
  feature?: FeatureFlag;
  /** Module reserved for the MSTS brand (e.g. partner administration). */
  mstsOnly?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        to: "/",
        icon: LayoutDashboard,
        sources: ["MyTolls", "Toll2.0"],
        keywords: ["home", "overview", "kpi", "fleet"],
        description: "Fleet overview & KPIs",
        feature: "dashboard",
      },
    ],
  },
  {
    label: "Fleet",
    items: [
      {
        label: "Vehicles",
        to: "/vehicles",
        icon: Truck,
        sources: ["MyTolls", "Toll2.0"],
        keywords: ["truck", "trailer", "plate", "rc card", "bulk"],
        description: "Manage vehicles, owners & documents",
        feature: "vehicles",
      },
      {
        label: "OBU & Devices",
        to: "/obus",
        icon: RadioTower,
        sources: ["Toll2.0"],
        keywords: ["on-board unit", "satellic", "telepass", "device", "shipment"],
        description: "Assign, replace & track devices",
        feature: "obu",
      },
      {
        label: "Hauliers",
        to: "/hauliers",
        icon: Building2,
        sources: ["MyTolls"],
        keywords: ["carrier", "company", "owner", "contractor"],
        description: "Manage hauliers & owners",
        feature: "hauliers",
      },
    ],
  },
  {
    label: "Tolling",
    items: [
      {
        label: "Products & Ordering",
        to: "/products",
        icon: ShoppingCart,
        sources: ["MyTolls"],
        keywords: ["card", "eurovignette", "obu", "order", "block", "vignette", "hu-go"],
        description: "Order & manage tolling products",
        feature: "products",
      },
      {
        label: "Domains",
        to: "/domains",
        icon: Globe2,
        sources: ["Toll2.0"],
        keywords: ["toll domain", "assignment", "viapass", "toll collect"],
        description: "Toll domains & assignments",
        feature: "domains",
      },
    ],
  },
  {
    label: "Data",
    items: [
      {
        label: "Transactions",
        to: "/transactions",
        icon: Receipt,
        sources: ["MyMST"],
        keywords: ["trx", "usage", "exception", "passage"],
        description: "Search transactions & exceptions",
        feature: "transactions",
      },
      {
        label: "Reports",
        to: "/reports",
        icon: BarChart3,
        sources: ["MyMST"],
        keywords: ["report", "export", "csv", "pdf", "turnover", "scheduled"],
        description: "Standard, custom & scheduled reports",
        feature: "reports",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Invoices & AR",
        to: "/finance",
        icon: Wallet,
        sources: ["MyMST"],
        keywords: ["invoice", "balance", "payment", "statement", "ar", "dispute"],
        description: "Invoices, balances & payments",
        feature: "finance",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Users & Access",
        to: "/users",
        icon: Users,
        sources: ["Toll2.0"],
        keywords: ["role", "permission", "invite", "member"],
        description: "Users, roles & permissions",
        feature: "users",
      },
      {
        label: "Onboarding",
        to: "/onboarding",
        icon: UserPlus,
        sources: ["Toll2.0"],
        keywords: ["register", "self-service", "vat", "signup", "wizard"],
        description: "Self-registration & guided setup",
        feature: "onboarding",
      },
    ],
  },
  {
    label: "Help",
    items: [
      {
        label: "Support",
        to: "/support",
        icon: LifeBuoy,
        sources: ["MyTolls", "MyMST", "Toll2.0"],
        keywords: ["help", "manual", "feedback", "country tolls", "contact"],
        description: "Help center & resources",
        global: true,
      },
      {
        label: "Account",
        to: "/account",
        icon: Settings,
        sources: ["MyTolls", "MyMST", "Toll2.0"],
        keywords: ["my entity", "company", "password", "security", "profile"],
        description: "Company & account settings",
        global: true,
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV.flatMap((g) => g.items);

/**
 * Nav groups scoped to a single portal: only modules that originated in
 * (or are shared with) that portal, excluding cross-cutting global items.
 * Global modules (Support, Account) are returned as a separate "General"
 * group so every portal can reach them without blurring segregation.
 */
export function navForPortal(
  portal: SourcePortal,
  brand: Partner | null = null
): NavGroup[] {
  // A switchable portal may span several legacy source portals (post-merge).
  const sources = PORTAL_SOURCES[portal] ?? [portal];
  const scoped = NAV.map((group) => ({
    label: group.label,
    items: group.items.filter(
      (item) =>
        !item.global &&
        item.sources.some((s) => sources.includes(s)) &&
        (!item.mstsOnly || !brand) &&
        (!item.feature || featureEnabled(brand, item.feature))
    ),
  })).filter((group) => group.items.length > 0);

  const globals = ALL_NAV_ITEMS.filter((item) => item.global);
  if (globals.length) scoped.push({ label: "General", items: globals });

  return scoped;
}
