import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout";
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

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
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
