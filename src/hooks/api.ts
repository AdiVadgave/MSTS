import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, buildQuery } from "@/lib/api";
import type {
  ActivityEvent,
  Entity,
  Haulier,
  Invoice,
  NotificationItem,
  OBU,
  Order,
  Paginated,
  Profile,
  ReportDef,
  Settings,
  SupportTicket,
  TollDomain,
  TollProduct,
  Transaction,
  User,
  Vehicle,
} from "@/lib/types";

export interface ListArgs {
  q?: string;
  status?: string;
  country?: string;
  type?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  [key: string]: unknown;
}

// ── Reference ──────────────────────────────────────────────────
export const useEntities = () =>
  useQuery({ queryKey: ["entities"], queryFn: () => api.get<Entity[]>("/api/entities") });

export const useProducts = () =>
  useQuery({ queryKey: ["products"], queryFn: () => api.get<TollProduct[]>("/api/products") });

export const useReports = () =>
  useQuery({ queryKey: ["reports"], queryFn: () => api.get<ReportDef[]>("/api/reports") });

export const useNotifications = () =>
  useQuery({ queryKey: ["notifications"], queryFn: () => api.get<NotificationItem[]>("/api/notifications") });

export const useMarkNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/notifications/read-all", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
};

export const useActivity = () =>
  useQuery({ queryKey: ["activity"], queryFn: () => api.get<ActivityEvent[]>("/api/activity") });

// ── Dashboard / analytics ──────────────────────────────────────
export interface DashboardSummary {
  vehicles: number;
  activeVehicles: number;
  missingAttributes: number;
  pendingVehicles: number;
  obus: number;
  activeObus: number;
  periodSpend: number;
  openInvoices: number;
  transactions: number;
  exceptions: number;
}
export const useDashboardSummary = () =>
  useQuery({ queryKey: ["dashboard"], queryFn: () => api.get<DashboardSummary>("/api/dashboard/summary") });

export const useSpendTrend = () =>
  useQuery({ queryKey: ["spend-trend"], queryFn: () => api.get<{ month: string; spend: number }[]>("/api/analytics/spend-trend") });

export const useSpendByCountry = () =>
  useQuery({ queryKey: ["spend-country"], queryFn: () => api.get<{ country: string; spend: number }[]>("/api/analytics/spend-by-country") });

export const useFleetStatus = () =>
  useQuery({ queryKey: ["fleet-status"], queryFn: () => api.get<{ name: string; value: number; key: string }[]>("/api/analytics/fleet-status") });

// ── Vehicles ───────────────────────────────────────────────────
export const useVehicles = (args: ListArgs) =>
  useQuery({
    queryKey: ["vehicles", args],
    queryFn: () => api.get<Paginated<Vehicle>>(`/api/vehicles${buildQuery(args)}`),
  });

export const useVehicle = (id?: string) =>
  useQuery({
    queryKey: ["vehicle", id],
    enabled: !!id,
    queryFn: () =>
      api.get<Vehicle & { owner: Haulier | null; obus: OBU[] }>(`/api/vehicles/${id}`),
  });

export const useVehicleHistory = (id?: string) =>
  useQuery({
    queryKey: ["vehicle-history", id],
    enabled: !!id,
    queryFn: () => api.get<{ at: string; actor: string; change: string }[]>(`/api/vehicles/${id}/history`),
  });

export function useCreateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Vehicle>) => api.post<Vehicle>("/api/vehicles", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

export function useUpdateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Vehicle> & { id: string }) =>
      api.patch<Vehicle>(`/api/vehicles/${id}`, body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["vehicle", v.id] });
    },
  });
}

export function useDeactivateVehicle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Vehicle>(`/api/vehicles/${id}/deactivate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useBulkVehicles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: Partial<Vehicle>[]) =>
      api.post<{ created: number }>("/api/vehicles/bulk", { rows }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ── OBUs ───────────────────────────────────────────────────────
export type OBURow = OBU & { vehiclePlate: string | null };
export const useObus = (args: ListArgs) =>
  useQuery({
    queryKey: ["obus", args],
    queryFn: () => api.get<Paginated<OBURow>>(`/api/obus${buildQuery(args)}`),
  });

export function useObuAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, vehicleId }: { id: string; action: string; vehicleId?: string }) =>
      api.post<OBU>(`/api/obus/${id}/${action}`, { vehicleId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["obus"] }),
  });
}

// ── Orders ─────────────────────────────────────────────────────
export const useOrders = (args: ListArgs) =>
  useQuery({
    queryKey: ["orders", args],
    queryFn: () => api.get<Paginated<Order>>(`/api/orders${buildQuery(args)}`),
  });

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      productCode: string;
      mode: "order" | "block";
      vehiclePlate: string;
      quantity: number;
    }) => api.post<Order>("/api/orders", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      qc.invalidateQueries({ queryKey: ["vehicle"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ── Domains ────────────────────────────────────────────────────
export const useDomains = () =>
  useQuery({ queryKey: ["domains"], queryFn: () => api.get<TollDomain[]>("/api/domains") });

export function useUpdateDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<TollDomain>(`/api/domains/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["domains"] }),
  });
}

// ── Transactions ───────────────────────────────────────────────
export const useTransactions = (args: ListArgs) =>
  useQuery({
    queryKey: ["transactions", args],
    queryFn: () => api.get<Paginated<Transaction>>(`/api/transactions${buildQuery(args)}`),
  });

// ── Reports ────────────────────────────────────────────────────
export function useRunReport() {
  return useMutation({
    mutationFn: ({ id, format }: { id: string; format: string }) =>
      api.post<{ fileName: string; rows: number; generatedAt: string }>(`/api/reports/${id}/run`, { format }),
  });
}

// ── Hauliers ───────────────────────────────────────────────────
export const useHauliers = (args: ListArgs) =>
  useQuery({
    queryKey: ["hauliers", args],
    queryFn: () => api.get<Paginated<Haulier>>(`/api/hauliers${buildQuery(args)}`),
  });

export function useCreateHaulier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Haulier>) => api.post<Haulier>("/api/hauliers", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hauliers"] }),
  });
}

// ── Invoices ───────────────────────────────────────────────────
export const useInvoices = (args: ListArgs) =>
  useQuery({
    queryKey: ["invoices", args],
    queryFn: () => api.get<Paginated<Invoice>>(`/api/invoices${buildQuery(args)}`),
  });

export function useInvoiceAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "pay" | "dispute" }) =>
      api.post<Invoice>(`/api/invoices/${id}/${action}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invoices"] }),
  });
}

// ── Users ──────────────────────────────────────────────────────
export const useUsers = () =>
  useQuery({ queryKey: ["users"], queryFn: () => api.get<User[]>("/api/users") });

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<User>) => api.post<User>("/api/users", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<User> & { id: string }) =>
      api.patch<User>(`/api/users/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}
export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/api/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

// ── Onboarding ─────────────────────────────────────────────────
export function useValidateVat() {
  return useMutation({
    mutationFn: (vat: string) =>
      api.post<{ valid: boolean; company: string | null; address: string | null }>(
        "/api/onboarding/validate-vat",
        { vat }
      ),
  });
}

export function useSubmitOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { company: string; vat: string; country: string }) =>
      api.post<{ ok: boolean; entityId: string; entity: Entity }>(
        "/api/onboarding/submit",
        body
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entities"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}

// ── Reports data export ────────────────────────────────────────
export interface ReportRun {
  fileName: string;
  count: number;
  columns: string[];
  rows: Record<string, unknown>[];
  format: string;
  generatedAt: string;
}
export function useRunReportData() {
  return useMutation({
    mutationFn: ({ id, format }: { id: string; format: string }) =>
      api.post<ReportRun>(`/api/reports/${id}/run`, { format }),
  });
}

// ── Entity / Profile / Settings (Account) ──────────────────────
export function useUpdateEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Entity> & { id: string }) =>
      api.patch<Entity>(`/api/entities/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["entities"] }),
  });
}

export const useProfile = () =>
  useQuery({ queryKey: ["profile"], queryFn: () => api.get<Profile>("/api/profile") });

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Profile>) => api.patch<Profile>("/api/profile", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export const useSettings = () =>
  useQuery({ queryKey: ["settings"], queryFn: () => api.get<Settings>("/api/settings") });

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Settings>) => api.patch<Settings>("/api/settings", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });
}

// ── Support tickets ────────────────────────────────────────────
export const useTickets = () =>
  useQuery({ queryKey: ["tickets"], queryFn: () => api.get<SupportTicket[]>("/api/tickets") });

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { subject: string; product: string; message: string }) =>
      api.post<SupportTicket>("/api/tickets", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tickets"] }),
  });
}

// ── System: reset demo data ────────────────────────────────────
export function useResetDemoData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/api/system/reset", {}),
    onSuccess: () => qc.invalidateQueries(),
  });
}
