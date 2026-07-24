import type {
  DashboardReasonsDto,
  DashboardSummaryDto,
  KlaviyoStatus,
  LoginRequest,
  MeResponse,
  Paginated,
  RegisterRequest,
  ReturnDetailDto,
  ReturnListItemDto,
  ReturnMappingDto,
  ShopifyStatus,
  SyncHealthDto,
  SyncJobDto,
} from "@returnsense/shared";
import { api, API_URL } from "./client";

export const endpoints = {
  // auth
  me: () => api.get<MeResponse>("/auth/me"),
  login: (body: LoginRequest) => api.post<MeResponse>("/auth/login", body),
  register: (body: RegisterRequest) => api.post<MeResponse>("/auth/register", body),
  logout: () => api.post<void>("/auth/logout"),

  // integrations
  shopifyStatus: () => api.get<ShopifyStatus>("/integrations/shopify/status"),
  shopifyDisconnect: () => api.post<void>("/integrations/shopify/disconnect"),
  klaviyoStatus: () => api.get<KlaviyoStatus>("/integrations/klaviyo/status"),
  klaviyoDisconnect: () => api.post<void>("/integrations/klaviyo/disconnect"),
  klaviyoTestEvent: () => api.post<{ ok: boolean; uniqueId: string }>(
    "/integrations/klaviyo/test-event",
  ),

  // mappings
  mappings: () => api.get<ReturnMappingDto[]>("/return-mappings"),
  createMapping: (body: { sourceReason: string; marketingCategory: string }) =>
    api.post<ReturnMappingDto>("/return-mappings", body),
  updateMapping: (id: string, body: { marketingCategory?: string; isActive?: boolean }) =>
    api.patch<void>(`/return-mappings/${id}`, body),

  // returns + sync
  returns: (page = 1, pageSize = 20) =>
    api.get<Paginated<ReturnListItemDto>>(`/returns?page=${page}&pageSize=${pageSize}`),
  returnDetail: (id: string) => api.get<ReturnDetailDto>(`/returns/${id}`),
  syncJobs: (status?: string, page = 1, pageSize = 20) =>
    api.get<Paginated<SyncJobDto>>(
      `/sync-jobs?page=${page}&pageSize=${pageSize}${status ? `&status=${status}` : ""}`,
    ),
  retrySyncJob: (id: string) => api.post<{ ok: boolean }>(`/sync-jobs/${id}/retry`),

  // dashboard
  summary: () => api.get<DashboardSummaryDto>("/dashboard/summary"),
  reasons: () => api.get<DashboardReasonsDto>("/dashboard/return-reasons"),
  syncHealth: () => api.get<SyncHealthDto>("/dashboard/sync-health"),
};

// External redirect URLs (browser navigates directly so the backend can 302 to OAuth).
export const oauthUrls = {
  shopifyInstall: (shop: string) =>
    `${API_URL}/integrations/shopify/install?shop=${encodeURIComponent(shop)}`,
  klaviyoConnect: () => `${API_URL}/integrations/klaviyo/connect`,
};
