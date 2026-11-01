import { getApiBase } from './config';

// =============================================================== models (mirror backend Dtos.java)
export type Role = 'CUSTOMER' | 'STAFF' | 'KITCHEN' | 'MANAGER';
export type OrderStatus = 'AWAITING_PAYMENT' | 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERING' | 'DELIVERED' | 'CANCELLED';
export type DiscountType = 'PERCENT' | 'AMOUNT';
export type PaymentMethod = 'COD' | 'BANK_TRANSFER';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUND_PENDING' | 'REFUNDED';
export type PromotionTarget = 'NONE' | 'MENU_ITEM' | 'CATEGORY' | 'VOUCHER';
export type NotificationType = 'ORDER' | 'PAYMENT' | 'PROMOTION';

export interface User {
  id: number; fullName: string; phone: string; email: string | null; role: Role; active: boolean; createdAt: string;
  /** Set after a manager reset: only /api/auth/me and /api/auth/change-password work until the user picks a new password. */
  mustChangePassword: boolean; marketingOptIn: boolean;
}
export interface AuthResponse { token: string; expiresAt: string; user: User }

export interface Store {
  storeName: string; hotline: string; storeAddress: string; openTime: string; closeTime: string;
  minOrderAmount: number; acceptingOrders: boolean; openNow: boolean; closedReason: string | null;
  paymentMethods: PaymentMethod[]; bankCode: string | null; bankAccount: string | null; bankHolder: string | null; transferTimeoutMinutes: number;
  /** Restaurant position and the delivery pricing rules (see DeliveryService in the backend). */
  latitude: number | null; longitude: number | null; deliveryBaseKm: number; deliveryBaseFee: number; deliveryExtraFeePerKm: number;
  deliveryMaxKm: number; prepMinutes: number; minutesPerKm: number;
}
export interface StoreSettingsInput {
  storeName: string; hotline: string; storeAddress: string; openTime: string; closeTime: string; minOrderAmount: number; acceptingOrders: boolean;
  bankCode: string | null; bankAccount: string | null; bankHolder: string | null; transferTimeoutMinutes: number;
  latitude?: number | null; longitude?: number | null; deliveryBaseKm?: number; deliveryBaseFee?: number; deliveryExtraFeePerKm?: number;
  deliveryMaxKm?: number; prepMinutes?: number; minutesPerKm?: number;
}

/** Distance from the restaurant, fee and delivery estimate for a map position. */
export interface DeliveryQuote { distanceKm: number; deliveryFee: number; estimatedMinutes: number; deliverable: boolean; message: string | null }
/** A place found by the address search, with its position. */
export interface GeoPlace { name: string; latitude: number; longitude: number }

export interface Address {
  id: number; label: string; recipientName: string; recipientPhone: string; street: string; note: string | null; isDefault: boolean;
  latitude: number | null; longitude: number | null; hasLocation: boolean;
  distanceKm: number; deliveryFee: number; estimatedMinutes: number; deliverable: boolean; deliveryMessage: string | null;
}
export interface AddressInput {
  label: string; recipientName: string; recipientPhone: string; street: string; latitude: number; longitude: number;
  note?: string | null; makeDefault: boolean;
}

export interface Category { id: number; name: string; imageUrl: string | null; sortOrder: number; itemCount: number }
export interface CategoryInput { name: string; imageUrl?: string | null; sortOrder: number }
export interface MenuOption { id: number; name: string; priceDelta: number; available: boolean }
export interface OptionGroup { id: number; name: string; minSelect: number; maxSelect: number; options: MenuOption[] }
export interface OptionInput { id?: number | null; name: string; priceDelta: number; available?: boolean }
export interface OptionGroupInput { id?: number | null; name: string; minSelect: number; maxSelect: number; options: OptionInput[] }
export interface MenuItem {
  id: number; categoryId: number; categoryName: string; name: string; description: string | null; price: number;
  imageUrl: string | null; available: boolean; active: boolean; ratingAvg: number | null; ratingCount: number; soldCount: number; favorite: boolean;
  optionGroups: OptionGroup[];
}
export interface MenuItemInput {
  categoryId: number; name: string; description?: string | null; price: number; imageUrl?: string | null; available?: boolean; active?: boolean;
}
export interface Review {
  id: number; orderItemId: number; orderId: number; menuItemId: number; menuItemName: string; customerName: string;
  rating: number; comment: string | null; createdAt: string;
}
export interface MenuItemDetail { item: MenuItem; reviews: Review[] }

export interface ChosenOption { id: number; groupName: string; name: string; priceDelta: number }
export interface CartLine {
  lineId: number; menuItemId: number; name: string; imageUrl: string | null; basePrice: number; options: ChosenOption[]; unitPrice: number;
  quantity: number; note: string | null; lineTotal: number; orderable: boolean; problem: string | null;
}
export interface Cart { lines: CartLine[]; itemCount: number; subtotal: number; hasProblems: boolean }
export interface CheckoutInput { addressId: number; voucherCode?: string | null; note?: string | null; paymentMethod?: PaymentMethod }
export interface CheckoutPreview {
  cart: Cart; address: Address; subtotal: number; deliveryFee: number; voucherCode: string | null; discount: number;
  voucherMessage: string | null; total: number; estimatedMinutes: number; paymentMethod: PaymentMethod; paymentMethods: PaymentMethod[];
  canPlace: boolean; problems: string[];
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
  id: number; menuItemId: number; name: string; imageUrl: string | null; quantity: number; options: ChosenOption[]; unitPrice: number; lineTotal: number;
  note: string | null; reviewed: boolean;
}
export interface Payment {
  id: number; method: PaymentMethod; amount: number; status: PaymentStatus; expiresAt: string | null; paidAt: string | null; confirmedByName: string | null;
  transferContent: string | null; qrUrl: string | null; bankCode: string | null; bankAccount: string | null; bankHolder: string | null;
  bankApps: BankApp[]; canSwitchToCod: boolean; canSwitchToTransfer: boolean;
}
/** VietQR deeplink that opens a banking app with account, amount and content prefilled. */
export interface BankApp { appId: string; name: string; logoUrl: string; url: string }
export interface StatusEvent { status: OrderStatus; at: string; byName: string | null; note: string | null }
export interface Order {
  id: number; code: string; status: OrderStatus; createdAt: string; updatedAt: string;
  customerId: number; customerName: string; customerPhone: string;
  recipientName: string; recipientPhone: string; deliveryStreet: string; distanceKm: number; deliveryNote: string | null; note: string | null;
  items: OrderItem[]; itemCount: number; subtotal: number; deliveryFee: number; voucherCode: string | null; discount: number; total: number;
  payment: Payment | null; estimatedDeliveryAt: string | null; cancellable: boolean; reviewable: boolean; timeline: StatusEvent[];
}
export interface Page<T> { content: T[]; page: number; size: number; totalElements: number; totalPages: number }

export interface StaffInput { fullName: string; phone: string; email?: string | null; password?: string | null; role: Role; active?: boolean }
export interface CustomerSummary { id: number; fullName: string; phone: string; email: string | null; active: boolean; createdAt: string; orderCount: number }

export interface DailyRevenue { date: string; revenue: number; orders: number }
export interface TopItem { menuItemId: number; name: string; imageUrl: string | null; quantity: number; revenue: number }
export interface DistanceRevenue { band: string; revenue: number; orders: number }
export interface RevenueReport {
  from: string; to: string; revenue: number; deliveredOrders: number; cancelledOrders: number; averageOrderValue: number;
  daily: DailyRevenue[]; topItems: TopItem[]; byDistance: DistanceRevenue[];
}
export interface Dashboard {
  revenueToday: number; revenueYesterday: number; deliveredToday: number; cancelledToday: number; pendingOrders: number; activeOrders: number;
  awaitingPayment: number; pendingRefunds: number;
  averageOrderValueToday: number; ratingAvg7d: number | null; ratingCount7d: number; newCustomersToday: number; acceptingOrders: boolean;
  last7Days: DailyRevenue[]; topItemsToday: TopItem[]; recentOrders: Order[];
}

export interface PaymentListItem {
  id: number; orderId: number; orderCode: string; customerName: string; method: PaymentMethod; amount: number; status: PaymentStatus;
  createdAt: string; paidAt: string | null; confirmedByName: string | null;
}
export interface BankTransaction {
  id: number; provider: string; providerTxnId: number; gateway: string | null; accountNumber: string | null; amount: number; content: string | null;
  referenceCode: string | null; transactionDate: string | null; receivedAt: string; orderId: number | null; orderCode: string | null; note: string | null;
}
export interface Promotion {
  id: number; title: string; subtitle: string | null; imageUrl: string; targetType: PromotionTarget;
  menuItemId: number | null; menuItemName: string | null; categoryId: number | null; categoryName: string | null; voucherId: number | null; voucherCode: string | null;
  startAt: string | null; endAt: string | null; sortOrder: number; active: boolean; live: boolean; notified: boolean;
  /** Announcement postponed by the quiet hours (sent automatically then). */
  announceAt: string | null; announcedAt: string | null;
}
export interface PromotionInput {
  title: string; subtitle?: string | null; imageUrl: string; targetType: PromotionTarget; menuItemId?: number | null; categoryId?: number | null;
  voucherId?: number | null; startAt?: string | null; endAt?: string | null; sortOrder: number; active?: boolean;
}
export interface Notification {
  id: number; type: NotificationType; title: string; body: string; orderId: number | null; promotionId: number | null; read: boolean; createdAt: string;
}
export interface Count { count: number }
/** Unread notifications: `count` (orders + payments) drives the red badge, `promotions` only a dot. */
export interface Unread { count: number; promotions: number }
export type NotificationCategory = 'ORDER' | 'PROMOTION';
export interface Announce { sent: number; skipped: number; scheduledAt: string | null; message: string }
export interface Message { message: string }
export interface TempPassword { temporaryPassword: string }

// =============================================================== transport
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
export function setAuthToken(token: string | null) { authToken = token; }
let onMustChangePassword: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) { onUnauthorized = fn; }
/** Called on 403 "Vui lòng đổi mật khẩu…" (the account still has a temporary password). */
export function setMustChangePasswordHandler(fn: (() => void) | null) { onMustChangePassword = fn; }

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
    if (res.status === 403 && authToken && onMustChangePassword && /đổi mật khẩu/i.test(msg)) onMustChangePassword();
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
  updateProfile: (b: { fullName: string; email?: string | null; marketingOptIn?: boolean }) => put<User>('/api/auth/profile', b),
  /** Returns a fresh token; every other session of the account is signed out. */
  changePassword: (currentPassword: string, newPassword: string) => post<AuthResponse>('/api/auth/change-password', { currentPassword, newPassword }),
  forgotPassword: (login: string) => post<Message>('/api/auth/forgot-password', { login }),
  resetPassword: (login: string, code: string, newPassword: string) => post<Message>('/api/auth/reset-password', { login, code, newPassword }),

  // public
  store: () => get<Store>('/api/store'),
  deliveryQuote: (lat: number, lng: number) => get<DeliveryQuote>(`/api/delivery/quote${qs({ lat, lng })}`),
  searchPlaces: (q: string) => get<GeoPlace[]>(`/api/geocode/search${qs({ q })}`),
  reversePlace: (lat: number, lng: number) => get<GeoPlace[]>(`/api/geocode/reverse${qs({ lat, lng })}`),
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
  addToCart: (menuItemId: number, quantity: number, note?: string | null, optionIds: number[] = []) =>
    post<Cart>('/api/me/cart/items', { menuItemId, quantity, note: note ?? null, optionIds }),
  updateCartLine: (lineId: number, quantity: number, note?: string | null) => patch<Cart>(`/api/me/cart/items/${lineId}`, { quantity, note: note ?? null }),
  clearCart: () => request<Cart>('DELETE', '/api/me/cart'),
  preview: (b: CheckoutInput) => post<CheckoutPreview>('/api/me/checkout/preview', b),
  placeOrder: (b: CheckoutInput) => post<Order>('/api/me/orders', b),
  myOrders: (page = 0, size = 20) => get<Page<Order>>(`/api/me/orders${qs({ page, size })}`),
  myOrder: (id: number) => get<Order>(`/api/me/orders/${id}`),
  cancelOrder: (id: number, reason: string) => post<Order>(`/api/me/orders/${id}/cancel`, { reason }),
  switchPaymentMethod: (id: number, method: PaymentMethod) => post<Order>(`/api/me/orders/${id}/payment-method`, { method }),
  reorder: (id: number) => post<Cart>(`/api/me/orders/${id}/reorder`),
  review: (orderItemId: number, rating: number, comment?: string | null) => post<Review>('/api/me/reviews', { orderItemId, rating, comment: comment ?? null }),
  promotions: () => get<Promotion[]>('/api/promotions'),
  notifications: (limit = 50, category?: NotificationCategory) => get<Notification[]>(`/api/me/notifications${qs({ limit, category })}`),
  unreadCount: () => get<Unread>('/api/me/notifications/unread-count'),
  readNotification: (id: number) => post<void>(`/api/me/notifications/${id}/read`),
  readAllNotifications: () => post<Count>('/api/me/notifications/read-all'),

  // store
  storeOrders: (p: { status?: OrderStatus[]; q?: string; date?: string; page?: number; size?: number; sort?: 'oldest' | 'newest' }) =>
    get<Page<Order>>(`/api/manage/orders${qs({ status: p.status, q: p.q, date: p.date, page: p.page, size: p.size, sort: p.sort })}`),
  storeOrder: (id: number) => get<Order>(`/api/manage/orders/${id}`),
  setStatus: (id: number, status: OrderStatus, note?: string | null) => patch<Order>(`/api/manage/orders/${id}/status`, { status, note: note ?? null }),
  kitchenQueue: () => get<Order[]>('/api/manage/kitchen/queue'),
  confirmTransfer: (orderId: number) => patch<Payment>(`/api/manage/orders/${orderId}/confirm-transfer`),
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
  setOptions: (id: number, groups: OptionGroupInput[]) => put<MenuItem>(`/api/admin/menu-items/${id}/options`, { groups }),
  payments: (status: PaymentStatus = 'REFUND_PENDING') => get<PaymentListItem[]>(`/api/admin/payments?status=${status}`),
  markRefunded: (id: number) => patch<PaymentListItem>(`/api/admin/payments/${id}/refunded`),
  bankTransactions: (limit = 100) => get<BankTransaction[]>(`/api/admin/bank-transactions?limit=${limit}`),
  adminPromotions: () => get<Promotion[]>('/api/admin/promotions'),
  createPromotion: (b: PromotionInput) => post<Promotion>('/api/admin/promotions', b),
  updatePromotion: (id: number, b: PromotionInput) => put<Promotion>(`/api/admin/promotions/${id}`, b),
  deletePromotion: (id: number) => del(`/api/admin/promotions/${id}`),
  announcePromotion: (id: number) => post<Announce>(`/api/admin/promotions/${id}/announce`),
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
  resetUserPassword: (id: number) => post<TempPassword>(`/api/admin/users/${id}/reset-password`),
  reviews: (limit = 100) => get<Review[]>(`/api/admin/reviews?limit=${limit}`),
  settings: () => get<Store>('/api/admin/settings'),
  updateSettings: (b: StoreSettingsInput) => put<Store>('/api/admin/settings', b),
};
