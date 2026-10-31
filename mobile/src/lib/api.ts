import { getApiBase } from './config';

// =============================================================== models (mirror backend Dtos.java)
export type Role = 'CUSTOMER' | 'STAFF' | 'KITCHEN' | 'MANAGER';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';
export type DiscountType = 'PERCENT' | 'AMOUNT';

export interface User { id: number; fullName: string; phone: string; email: string | null; role: Role; active: boolean; createdAt: string }
export interface AuthResponse { token: string; expiresAt: string; user: User }

export interface Store {
  storeName: string; hotline: string; storeAddress: string; openTime: string; closeTime: string;
  minOrderAmount: number; acceptingOrders: boolean; openNow: boolean; closedReason: string | null;
}
export interface StoreSettingsInput {
  storeName: string; hotline: string; storeAddress: string; openTime: string; closeTime: string; minOrderAmount: number; acceptingOrders: boolean;
}

export interface Zone { id: number; name: string; deliveryFee: number; estimatedMinutes: number; sortOrder: number; active: boolean }
export interface ZoneInput { name: string; deliveryFee: number; estimatedMinutes: number; sortOrder: number; active?: boolean }

export interface Address {
  id: number; zoneId: number; zoneName: string; deliveryFee: number; estimatedMinutes: number; zoneActive: boolean;
  label: string; recipientName: string; recipientPhone: string; street: string; note: string | null; isDefault: boolean;
}
export interface AddressInput {
  zoneId: number; label: string; recipientName: string; recipientPhone: string; street: string; note?: string | null; makeDefault: boolean;
}

export interface Category { id: number; name: string; imageUrl: string | null; sortOrder: number; itemCount: number }
export interface CategoryInput { name: string; imageUrl?: string | null; sortOrder: number }
export interface MenuItem {
  id: number; categoryId: number; categoryName: string; name: string; description: string | null; price: number;
  imageUrl: string | null; available: boolean; active: boolean; ratingAvg: number | null; ratingCount: number; soldCount: number; favorite: boolean;
}
export interface MenuItemInput {
  categoryId: number; name: string; description?: string | null; price: number; imageUrl?: string | null; available?: boolean; active?: boolean;
}
export interface Review {
  id: number; orderItemId: number; orderId: number; menuItemId: number; menuItemName: string; customerName: string;
  rating: number; comment: string | null; createdAt: string;
}
export interface MenuItemDetail { item: MenuItem; reviews: Review[] }

export interface CartLine {
  menuItemId: number; name: string; imageUrl: string | null; unitPrice: number; quantity: number; note: string | null;
  lineTotal: number; orderable: boolean; problem: string | null;
}
export interface Cart { lines: CartLine[]; itemCount: number; subtotal: number; hasProblems: boolean }
export interface CheckoutInput { addressId: number; voucherCode?: string | null; note?: string | null }
export interface CheckoutPreview {
  cart: Cart; address: Address; subtotal: number; deliveryFee: number; voucherCode: string | null; discount: number;
  voucherMessage: string | null; total: number; estimatedMinutes: number; canPlace: boolean; problems: string[];
}

export interface Voucher {
  id: number; code: string; description: string | null; discountType: DiscountType; discountValue: number; maxDiscount: number | null;
  minOrder: number; startAt: string | null; endAt: string | null; usageLimit: number | null; perUserLimit: number | null; active: boolean; usedCount: number;
}
export interface VoucherInput {
  code: string; description?: string | null; discountType: DiscountType; discountValue: number; maxDiscount?: number | null; minOrder?: number | null;
  startAt?: string | null; endAt?: string | null; usageLimit?: number | null; perUserLimit?: number | null; active?: boolean;
}

export interface OrderItem {
  id: number; menuItemId: number; name: string; imageUrl: string | null; quantity: number; unitPrice: number; lineTotal: number; note: string | null; reviewed: boolean;
}
export interface StatusEvent { status: OrderStatus; at: string; byName: string | null; note: string | null }
export interface Order {
  id: number; code: string; status: OrderStatus; createdAt: string; updatedAt: string;
  customerId: number; customerName: string; customerPhone: string;
  recipientName: string; recipientPhone: string; deliveryStreet: string; zoneName: string; deliveryNote: string | null; note: string | null;
  items: OrderItem[]; itemCount: number; subtotal: number; deliveryFee: number; voucherCode: string | null; discount: number; total: number;
  paymentMethod: 'COD'; paid: boolean; estimatedDeliveryAt: string | null; cancellable: boolean; reviewable: boolean; timeline: StatusEvent[];
}
export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }

export interface StaffInput { fullName: string; phone: string; email?: string | null; password?: string | null; role: Role; active?: boolean }
export interface CustomerSummary { id: number; fullName: string; phone: string; email: string | null; active: boolean; createdAt: string; orderCount: number }

export interface DailyRevenue { date: string; revenue: number; orders: number }
export interface TopItem { menuItemId: number; name: string; imageUrl: string | null; quantity: number; revenue: number }
export interface ZoneRevenue { zone: string; revenue: number; orders: number }
export interface RevenueReport {
  from: string; to: string; revenue: number; deliveredOrders: number; cancelledOrders: number; averageOrderValue: number;
  daily: DailyRevenue[]; topItems: TopItem[]; byZone: ZoneRevenue[];
}
export interface Dashboard {
  revenueToday: number; revenueYesterday: number; deliveredToday: number; cancelledToday: number; pendingOrders: number; activeOrders: number;
  averageOrderValueToday: number; ratingAvg7d: number | null; ratingCount7d: number; newCustomersToday: number; acceptingOrders: boolean;
  last7Days: DailyRevenue[]; topItemsToday: TopItem[]; recentOrders: Order[];
}

// =============================================================== transport
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
    throw new ApiError(0, 'Không kết nối được máy chủ, vui lòng kiểm tra mạng');
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

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Đã có lỗi xảy ra';
}

const get = <T,>(p: string) => request<T>('GET', p);
const post = <T,>(p: string, b?: unknown) => request<T>('POST', p, b ?? {});
const put = <T,>(p: string, b?: unknown) => request<T>('PUT', p, b ?? {});
const patch = <T,>(p: string, b?: unknown) => request<T>('PATCH', p, b ?? {});
const del = (p: string) => request<void>('DELETE', p);

function qs(params: Record<string, string | number | boolean | null | undefined | string[]>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue;
    if (Array.isArray(v)) v.forEach((x) => parts.push(`${k}=${encodeURIComponent(x)}`));
    else parts.push(`${k}=${encodeURIComponent(String(v))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

// =============================================================== endpoints
export const api = {
  // auth
  login: (login: string, password: string) => post<AuthResponse>('/api/auth/login', { login, password }),
  register: (b: { fullName: string; phone: string; email?: string | null; password: string }) => post<AuthResponse>('/api/auth/register', b),
  me: () => get<User>('/api/auth/me'),
  updateProfile: (b: { fullName: string; email?: string | null }) => put<User>('/api/auth/profile', b),
  changePassword: (currentPassword: string, newPassword: string) => post<void>('/api/auth/change-password', { currentPassword, newPassword }),

  // public
  store: () => get<Store>('/api/store'),
  zones: () => get<Zone[]>('/api/zones'),
  categories: () => get<Category[]>('/api/categories'),
  vouchers: () => get<Voucher[]>('/api/vouchers'),
  menu: (categoryId?: number | null, q?: string) => get<MenuItem[]>(`/api/menu${qs({ categoryId, q })}`),
  popular: (limit = 6) => get<MenuItem[]>(`/api/menu/popular?limit=${limit}`),
  item: (id: number) => get<MenuItemDetail>(`/api/menu/${id}`),

  // customer
  addresses: () => get<Address[]>('/api/me/addresses'),
  addAddress: (b: AddressInput) => post<Address>('/api/me/addresses', b),
  updateAddress: (id: number, b: AddressInput) => put<Address>(`/api/me/addresses/${id}`, b),
  defaultAddress: (id: number) => patch<Address>(`/api/me/addresses/${id}/default`),
  deleteAddress: (id: number) => del(`/api/me/addresses/${id}`),
  favorites: () => get<MenuItem[]>('/api/me/favorites'),
  addFavorite: (id: number) => put<void>(`/api/me/favorites/${id}`),
  removeFavorite: (id: number) => del(`/api/me/favorites/${id}`),
  cart: () => get<Cart>('/api/me/cart'),
  setCartItem: (menuItemId: number, quantity: number, note?: string | null) => put<Cart>(`/api/me/cart/items/${menuItemId}`, { quantity, note: note ?? null }),
  clearCart: () => request<Cart>('DELETE', '/api/me/cart'),
  preview: (b: CheckoutInput) => post<CheckoutPreview>('/api/me/checkout/preview', b),
  placeOrder: (b: CheckoutInput) => post<Order>('/api/me/orders', b),
  myOrders: (page = 0, size = 20) => get<Page<Order>>(`/api/me/orders${qs({ page, size })}`),
  myOrder: (id: number) => get<Order>(`/api/me/orders/${id}`),
  cancelOrder: (id: number, reason: string) => post<Order>(`/api/me/orders/${id}/cancel`, { reason }),
  reorder: (id: number) => post<Cart>(`/api/me/orders/${id}/reorder`),
  review: (orderItemId: number, rating: number, comment?: string | null) => post<Review>('/api/me/reviews', { orderItemId, rating, comment: comment ?? null }),

  // store
  storeOrders: (p: { status?: OrderStatus[]; q?: string; date?: string; page?: number; size?: number; sort?: 'oldest' | 'newest' }) =>
    get<Page<Order>>(`/api/manage/orders${qs({ status: p.status, q: p.q, date: p.date, page: p.page, size: p.size, sort: p.sort })}`),
  storeOrder: (id: number) => get<Order>(`/api/manage/orders/${id}`),
  setStatus: (id: number, status: OrderStatus, note?: string | null) => patch<Order>(`/api/manage/orders/${id}/status`, { status, note: note ?? null }),
  kitchenQueue: () => get<Order[]>('/api/manage/kitchen/queue'),
  storeMenu: () => get<MenuItem[]>('/api/manage/menu'),
  setAvailability: (id: number, available: boolean) => patch<MenuItem>(`/api/manage/menu-items/${id}/availability`, { available }),
  storeInfo: () => get<Store>('/api/manage/store'),
  setAccepting: (acceptingOrders: boolean) => patch<Store>('/api/manage/store/accepting', { acceptingOrders }),

  // admin
  dashboard: () => get<Dashboard>('/api/admin/dashboard'),
  revenue: (from: string, to: string) => get<RevenueReport>(`/api/admin/reports/revenue${qs({ from, to })}`),
  adminCategories: () => get<Category[]>('/api/admin/categories'),
  createCategory: (b: CategoryInput) => post<Category>('/api/admin/categories', b),
  updateCategory: (id: number, b: CategoryInput) => put<Category>(`/api/admin/categories/${id}`, b),
  deleteCategory: (id: number) => del(`/api/admin/categories/${id}`),
  adminItems: () => get<MenuItem[]>('/api/admin/menu-items'),
  createItem: (b: MenuItemInput) => post<MenuItem>('/api/admin/menu-items', b),
  updateItem: (id: number, b: MenuItemInput) => put<MenuItem>(`/api/admin/menu-items/${id}`, b),
  deleteItem: (id: number) => del(`/api/admin/menu-items/${id}`),
  adminZones: () => get<Zone[]>('/api/admin/zones'),
  createZone: (b: ZoneInput) => post<Zone>('/api/admin/zones', b),
  updateZone: (id: number, b: ZoneInput) => put<Zone>(`/api/admin/zones/${id}`, b),
  deleteZone: (id: number) => del(`/api/admin/zones/${id}`),
  adminVouchers: () => get<Voucher[]>('/api/admin/vouchers'),
  createVoucher: (b: VoucherInput) => post<Voucher>('/api/admin/vouchers', b),
  updateVoucher: (id: number, b: VoucherInput) => put<Voucher>(`/api/admin/vouchers/${id}`, b),
  deleteVoucher: (id: number) => del(`/api/admin/vouchers/${id}`),
  staff: () => get<User[]>('/api/admin/staff'),
  createStaff: (b: StaffInput) => post<User>('/api/admin/staff', b),
  updateStaff: (id: number, b: StaffInput) => put<User>(`/api/admin/staff/${id}`, b),
  deleteStaff: (id: number) => del(`/api/admin/staff/${id}`),
  customers: (q: string, page = 0, size = 30) => get<Page<CustomerSummary>>(`/api/admin/customers${qs({ q, page, size })}`),
  setUserActive: (id: number, active: boolean) => patch<User>(`/api/admin/users/${id}/active`, { active }),
  reviews: (limit = 100) => get<Review[]>(`/api/admin/reviews?limit=${limit}`),
  settings: () => get<Store>('/api/admin/settings'),
  updateSettings: (b: StoreSettingsInput) => put<Store>('/api/admin/settings', b),
};
