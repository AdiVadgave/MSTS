import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { useAppStore } from "./store";
import { PORTALS } from "./portals";
import LoginPage from "@/features/auth/LoginPage";
import MfaPage from "@/features/auth/MfaPage";
import PortalLauncher from "@/features/launcher/PortalLauncher";
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
import SupportPage from "@/features/support/SupportPage";
import AccountPage from "@/features/account/AccountPage";
import NotFoundPage from "@/features/misc/NotFoundPage";

/** Gate the app shell behind login → MFA → portal selection. */
function RequireApp() {
  const { user, mfaVerified, activePortal } = useAppStore();
  if (!user) return <Navigate to="/login" replace />;
  if (!mfaVerified) return <Navigate to="/mfa" replace />;
  if (!activePortal) return <Navigate to="/launcher" replace />;
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
  { path: "/launcher", element: <PortalLauncher /> },
  {
    path: "/",
    element: <RequireApp />,
    children: [
      { index: true, element: <PortalIndex /> },
      { path: "vehicles", element: <VehiclesPage /> },
      { path: "obus", element: <ObusPage /> },
      { path: "hauliers", element: <HauliersPage /> },
      { path: "products", element: <ProductsPage /> },
      { path: "domains", element: <DomainsPage /> },
      { path: "transactions", element: <TransactionsPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "finance", element: <FinancePage /> },
      { path: "users", element: <UsersPage /> },
      { path: "onboarding", element: <OnboardingPage /> },
      { path: "support", element: <SupportPage /> },
      { path: "account", element: <AccountPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
