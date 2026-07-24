export interface ApiError {
  error: { code: string; message: string };
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthOrganization {
  id: string;
  name: string;
  plan: string;
  role: string;
}

export interface MeResponse {
  user: AuthUser;
  organization: AuthOrganization;
}

export interface RegisterRequest {
  email: string;
  password: string;
  organizationName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ConnectionStatus {
  connected: boolean;
  status: string;
}

export interface ShopifyStatus extends ConnectionStatus {
  shopDomain: string | null;
  scopes: string | null;
  installedAt: string | null;
}

export interface KlaviyoStatus extends ConnectionStatus {
  accountId: string | null;
  tokenExpiresAt: string | null;
  scopes: string | null;
}

export interface ReturnMappingDto {
  id: string;
  sourceReason: string;
  marketingCategory: string;
  isActive: boolean;
}

export interface ReturnItemDto {
  id: string;
  productId: string | null;
  variantId: string | null;
  sku: string | null;
  title: string;
  variantTitle: string | null;
  quantity: number;
  reason: string;
  marketingCategory: string;
  returnedValue: number;
}

export interface ReturnListItemDto {
  id: string;
  shopifyReturnId: string;
  orderNumber: string | null;
  customerEmail: string | null;
  status: string;
  currency: string;
  totalReturnedValue: number;
  returnCreatedAt: string;
  syncStatus: string;
  itemCount: number;
}

export interface ReturnDetailDto extends ReturnListItemDto {
  shopifyOrderId: string;
  items: ReturnItemDto[];
  syncJobs: SyncJobDto[];
}

export interface SyncJobDto {
  id: string;
  returnId: string;
  returnItemId: string | null;
  eventType: string;
  klaviyoEventId: string | null;
  status: string;
  attemptCount: number;
  errorMessage: string | null;
  processedAt: string | null;
  createdAt: string;
}

export interface DashboardSummaryDto {
  totalReturns: number;
  totalReturnedItems: number;
  totalReturnedValue: number;
  eventsSuccess: number;
  eventsFailed: number;
}

export interface ReasonCountDto {
  key: string;
  count: number;
}

export interface DashboardReasonsDto {
  byReason: ReasonCountDto[];
  byCategory: ReasonCountDto[];
  topProducts: ReasonCountDto[];
}

export interface SyncHealthDto {
  pending: number;
  success: number;
  failed: number;
  recentFailures: SyncJobDto[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
