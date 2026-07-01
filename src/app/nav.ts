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
import type { SourcePortal } from "@/lib/types";

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  sources: SourcePortal[];
  keywords?: string[];
  description?: string;
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
        sources: ["Toll2.0"],
        keywords: ["home", "overview", "kpi", "fleet"],
        description: "Fleet overview & KPIs",
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
      },
      {
        label: "OBU & Devices",
        to: "/obus",
        icon: RadioTower,
        sources: ["Toll2.0"],
        keywords: ["on-board unit", "satellic", "telepass", "device", "shipment"],
        description: "Assign, replace & track devices",
      },
      {
        label: "Hauliers",
        to: "/hauliers",
        icon: Building2,
        sources: ["MyTolls"],
        keywords: ["carrier", "company", "owner", "contractor"],
        description: "Manage hauliers & owners",
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
      },
      {
        label: "Domains",
        to: "/domains",
        icon: Globe2,
        sources: ["Toll2.0"],
        keywords: ["toll domain", "assignment", "viapass", "toll collect"],
        description: "Toll domains & assignments",
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
      },
      {
        label: "Reports",
        to: "/reports",
        icon: BarChart3,
        sources: ["MyMST"],
        keywords: ["report", "export", "csv", "pdf", "turnover", "scheduled"],
        description: "Standard, custom & scheduled reports",
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
      },
      {
        label: "Onboarding",
        to: "/onboarding",
        icon: UserPlus,
        sources: ["Toll2.0"],
        keywords: ["register", "self-service", "vat", "signup", "wizard"],
        description: "Self-registration & guided setup",
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
        sources: ["Toll2.0"],
        keywords: ["help", "manual", "feedback", "country tolls", "contact"],
        description: "Help center & resources",
      },
      {
        label: "Account",
        to: "/account",
        icon: Settings,
        sources: ["MyTolls", "Toll2.0"],
        keywords: ["my entity", "company", "password", "security", "profile"],
        description: "Company & account settings",
      },
    ],
  },
];

export const ALL_NAV_ITEMS: NavItem[] = NAV.flatMap((g) => g.items);
