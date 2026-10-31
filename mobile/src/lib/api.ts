import { getApiBase } from './config';

// ---- models (mirror backend DTOs) ----
export type Role = 'STAFF' | 'KITCHEN' | 'MANAGER';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'COOKING' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
export type OrderItemStatus = 'PENDING' | 'COOKING' | 'READY' | 'SERVED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'EWALLET';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';
export type RequestType = 'WATER' | 'HELP' | 'BILL' | 'OTHER';
export type RequestStatus = 'OPEN' | 'DONE';
export type DiscountType = 'PERCENT' | 'AMOUNT';

export interface Category { id: number; name: string; sortOrder: number }
export interface MenuItem {
  id: number; category: Category; name: string; description: string | null; price: number;
  imageUrl: string | null; available: boolean; createdAt: string;
}
export interface TableInfo { id: number; code: string; seats: number; qrToken: string; status: 'FREE' | 'OCCUPIED' }
export interface Voucher {
  id: number; code: string; discountType: DiscountType; discountValue: number; minOrder: number;
  startAt: string | null; endAt: string | null; usageLimit: number | null;
}
export interface User { id: number; username: string; fullName: string; phone: string | null; role: Role; active: boolean }
export interface LoginResponse { token: string; user: User }
export interface OrderItem {
  id: number; menuItemId: number; name: string; quantity: number; unitPrice: number; note: string | null; status: OrderItemStatus;
}
export interface Order {
  id: number; tableId: number; tableCode: string; staffId: number | null; voucherCode: string | null; status: OrderStatus;
  note: string | null; subtotal: number; discount: number; totalAmount: number; createdAt: string; updatedAt: string; items: OrderItem[];
}
export interface Payment { id: number; orderId: number; method: PaymentMethod; amount: number; status: PaymentStatus; paidAt: string | null }
export interface ServiceRequest { id: number; tableId: number; tableCode: string; type: RequestType; status: RequestStatus; createdAt: string }
export interface Review { id: number; orderId: number; menuItemId: number; rating: number; comment: string | null; createdAt: string }
export interface DailyRevenue { date: string; revenue: number; orders: number }
export interface TopItem { menuItemId: number; name: string; quantity: number }
export interface RevenueReport { from: string; to: string; totalRevenue: number; orderCount: number; daily: DailyRevenue[]; topItems: TopItem[] }

export interface OrderItemInput { menuItemId: number; quantity: number; note?: string }
export interface MenuItemInput {
  categoryId: number; name: string; description?: string; price: number; imageUrl?: string; available?: boolean;
}
export interface VoucherInput {
  code: string; discountType: DiscountType; discountValue: number; minOrder: number; startAt?: string | null; endAt?: string | null; usageLimit?: number | null;
}
export interface UserInput { username: string; password?: string; fullName: string; phone?: string; role: Role; active?: boolean }

// ---- transport ----
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
export function setAuthToken(token: string | null) { authToken = token; }
export function setUnauthorizedHandler(fn: (() => void) | null) { onUnauthorized = fn; }

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  let res: Response;
  try {
    res = await fetch(getApiBase() + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, `Không kết nối được máy chủ (${getApiBase()})`);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* non-JSON body */ }
  if (!res.ok) {
    const msg = (data as { error?: string } | null)?.error ?? `Lỗi ${res.status}`;
    if (res.status === 401 && authToken && onUnauthorized) onUnauthorized();
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

const get = <T,>(p: string) => request<T>('GET', p);
const post = <T,>(p: string, b?: unknown) => request<T>('POST', p, b ?? {});
const put = <T,>(p: string, b: unknown) => request<T>('PUT', p, b);
const patch = <T,>(p: string, b?: unknown) => request<T>('PATCH', p, b);
const del = (p: string) => request<void>('DELETE', p);

export const api = {
  // auth
  login: (username: string, password: string) => post<LoginResponse>('/api/auth/login', { username, password }),
  // public
  tableByQr: (token: string) => get<TableInfo>(`/api/tables/qr/${encodeURIComponent(token)}`),
  categories: () => get<Category[]>('/api/categories'),
  menu: (opts: { category?: number | null; q?: string; includeUnavailable?: boolean } = {}) => {
    const p = new URLSearchParams();
    if (opts.category) p.set('category', String(opts.category));
    if (opts.q) p.set('q', opts.q);
    if (opts.includeUnavailable) p.set('includeUnavailable', 'true');
    const qs = p.toString();
    return get<MenuItem[]>('/api/menu' + (qs ? `?${qs}` : ''));
  },
  createOrder: (req: { qrToken: string; items: OrderItemInput[]; note?: string; voucherCode?: string }) => post<Order>('/api/orders', req),
  order: (id: number) => get<Order>(`/api/orders/${id}`),
  addVoucher: (id: number, code: string) => post<Order>(`/api/orders/${id}/voucher`, { code }),
  pay: (id: number, method: PaymentMethod) => post<Payment>(`/api/orders/${id}/payments`, { method }),
  orderPayments: (id: number) => get<Payment[]>(`/api/orders/${id}/payments`),
  callStaff: (qrToken: string, type: RequestType) => post<ServiceRequest>('/api/service-requests', { qrToken, type }),
  review: (r: { orderId: number; menuItemId: number; rating: number; comment?: string }) => post<Review>('/api/reviews', r),
  // staff / kitchen
  ordersByStatus: (status: OrderStatus) => get<Order[]>(`/api/orders?status=${status}`),
  setOrderStatus: (id: number, status: OrderStatus, staffId?: number) => patch<Order>(`/api/orders/${id}/status`, { status, staffId }),
  setItemStatus: (id: number, status: OrderItemStatus) => patch<Order>(`/api/order-items/${id}/status`, { status }),
  confirmPayment: (id: number) => patch<Payment>(`/api/payments/${id}/confirm`),
  failPayment: (id: number) => patch<Payment>(`/api/payments/${id}/fail`),
  openRequests: () => get<ServiceRequest[]>('/api/service-requests?status=OPEN'),
  doneRequest: (id: number) => patch<ServiceRequest>(`/api/service-requests/${id}/done`),
  setAvailability: (id: number, available: boolean) => patch<MenuItem>(`/api/menu-items/${id}/availability?available=${available}`),
  // manager
  adminMenuItems: () => get<MenuItem[]>('/api/admin/menu-items'),
  createMenuItem: (r: MenuItemInput) => post<MenuItem>('/api/admin/menu-items', r),
  updateMenuItem: (id: number, r: MenuItemInput) => put<MenuItem>(`/api/admin/menu-items/${id}`, r),
  deleteMenuItem: (id: number) => del(`/api/admin/menu-items/${id}`),
  createCategory: (name: string, sortOrder: number) => post<Category>('/api/admin/categories', { name, sortOrder }),
  deleteCategory: (id: number) => del(`/api/admin/categories/${id}`),
  adminTables: () => get<TableInfo[]>('/api/admin/tables'),
  createTable: (code: string, seats: number) => post<TableInfo>('/api/admin/tables', { code, seats }),
  regenerateQr: (id: number) => post<TableInfo>(`/api/admin/tables/${id}/regenerate-qr`),
  deleteTable: (id: number) => del(`/api/admin/tables/${id}`),
  vouchers: () => get<Voucher[]>('/api/admin/vouchers'),
  createVoucher: (v: VoucherInput) => post<Voucher>('/api/admin/vouchers', v),
  deleteVoucher: (id: number) => del(`/api/admin/vouchers/${id}`),
  revenue: (from: string, to: string) => get<RevenueReport>(`/api/admin/reports/revenue?from=${from}&to=${to}`),
  users: () => get<User[]>('/api/admin/users'),
  createUser: (u: UserInput) => post<User>('/api/admin/users', u),
  deleteUser: (id: number) => del(`/api/admin/users/${id}`),
};

export const OPEN_ORDER_STATUSES: OrderStatus[] = ['PENDING', 'CONFIRMED', 'COOKING', 'SERVED'];

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Có lỗi xảy ra';
}
