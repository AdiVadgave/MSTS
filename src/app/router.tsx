import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { StudioLayout } from "./StudioLayout";
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
import SolutionBuilderPage from "@/features/partners/builder/SolutionBuilderPage";
import SupportPage from "@/features/support/SupportPage";
import AccountPage from "@/features/account/AccountPage";
import NotFoundPage from "@/features/misc/NotFoundPage";
import { FeatureGate } from "@/components/common/FeatureGate";
import { brandHome } from "./nav";
import { featureEnabled } from "@/lib/brand";

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
 * Landing route. Partners land on their generic solution (Dashboard when
 * licensed, else their first module); MSTS lands per portal as before.
 */
function PortalIndex() {
  const { activePortal, activeBrand } = useAppStore();
  if (activeBrand) {
    if (featureEnabled(activeBrand, "dashboard")) return <DashboardPage />;
    return <Navigate to={brandHome(activeBrand)} replace />;
  }
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
      { index: true, element: <PortalIndex /> },
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
      { path: "support", element: <SupportPage /> },
      { path: "account", element: <AccountPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  // Partner Solution Studio — whitelabel configuration lives OUTSIDE the
  // customer portal, in its own minimal shell entered from the login screen.
  {
    path: "/studio",
    element: <StudioLayout />,
    children: [
      { index: true, element: <PartnersPage /> },
      { path: "new", element: <SolutionBuilderPage /> },
      { path: ":partnerId/edit", element: <SolutionBuilderPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
