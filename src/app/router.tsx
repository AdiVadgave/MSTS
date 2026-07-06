import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { useAppStore } from "./store";
import { PORTALS } from "./portals";
import LoginPage from "@/features/auth/LoginPage";
import MfaPage from "@/features/auth/MfaPage";
import DashboardPage from "@/features/dashboard/DashboardPage";
import VehiclesPage from "@/features/vehicles/VehiclesPage";
import ObusPage from "@/features/obus/ObusPage";
import HauliersPage from "@/features/hauliers/HauliersPage";
import ProductsPage from "@/features/products/ProductsPage";
import DomainsPage from "@/features/domains/DomainsPage";
import TransactionsPage from "@/features/transactions/TransactionsPage";
import ReportsPage from "@/features/reports/ReportsPage";
import FinancePage from "@/features/finance/FinancePage";
import UsersPage from "@/features/users/UsersPage";
import OnboardingPage from "@/features/onboarding/OnboardingPage";
import PartnersPage from "@/features/partners/PartnersPage";
import SupportPage from "@/features/support/SupportPage";
import AccountPage from "@/features/account/AccountPage";
import NotFoundPage from "@/features/misc/NotFoundPage";
import { FeatureGate } from "@/components/common/FeatureGate";

/** Gate the app shell behind login → MFA → portal selection. */
function RequireApp() {
  const { user, mfaVerified } = useAppStore();
  if (!user) return <Navigate to="/login" replace />;
  if (!mfaVerified) return <Navigate to="/mfa" replace />;
  // Portal selection removed: MFA verification defaults the active portal, so
  // the app shell renders directly. The top bar toggles MyTolls / MyMST.
  return <AppLayout />;
}

/**
 * The fleet Dashboard is the home of Toll 2.0 and MyTolls. MyMST has no
 * dashboard, so it lands on its first module instead.
 */
function PortalIndex() {
  const { activePortal } = useAppStore();
  if (activePortal === "MyMST") {
    return <Navigate to={PORTALS.MyMST.home} replace />;
  }
  return <DashboardPage />;
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/mfa", element: <MfaPage /> },
  {
    path: "/",
    element: <RequireApp />,
    children: [
      { index: true, element: <FeatureGate feature="dashboard" moduleName="Dashboard"><PortalIndex /></FeatureGate> },
      { path: "vehicles", element: <FeatureGate feature="vehicles" moduleName="Vehicles"><VehiclesPage /></FeatureGate> },
      { path: "obus", element: <FeatureGate feature="obu" moduleName="OBU & Devices"><ObusPage /></FeatureGate> },
      { path: "hauliers", element: <FeatureGate feature="hauliers" moduleName="Hauliers"><HauliersPage /></FeatureGate> },
      { path: "products", element: <FeatureGate feature="products" moduleName="Products & Ordering"><ProductsPage /></FeatureGate> },
      { path: "domains", element: <FeatureGate feature="domains" moduleName="Domains"><DomainsPage /></FeatureGate> },
      { path: "transactions", element: <FeatureGate feature="transactions" moduleName="Transactions"><TransactionsPage /></FeatureGate> },
      { path: "reports", element: <FeatureGate feature="reports" moduleName="Reports"><ReportsPage /></FeatureGate> },
      { path: "finance", element: <FeatureGate feature="finance" moduleName="Invoices & AR"><FinancePage /></FeatureGate> },
      { path: "users", element: <FeatureGate feature="users" moduleName="Users & Access"><UsersPage /></FeatureGate> },
      { path: "onboarding", element: <FeatureGate feature="onboarding" moduleName="Onboarding"><OnboardingPage /></FeatureGate> },
      { path: "partners", element: <PartnersPage /> },
      { path: "support", element: <SupportPage /> },
      { path: "account", element: <AccountPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
