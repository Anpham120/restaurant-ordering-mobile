import type { CartLine, MenuItem, Order, Role } from './api';

/**
 * Google Analytics for Firebase event payloads, shared by the Android (analytics.native.ts) and web (analytics.ts)
 * implementations. Firebase builds the Retention report (cohorts by first visit, share of users who come back
 * week after week) from the automatic first_open / session_start / user_engagement events; the events below add
 * who the user is and the ordering funnel, so retention can be filtered to customers who actually buy.
 * Only customers and guests are measured: staff, kitchen, shipper and manager accounts would distort the cohorts.
 */
export const CURRENCY = 'VND';

export interface AnalyticsItem { item_id: string; item_name: string; item_category?: string; price: number; quantity?: number }

export interface AnalyticsBackend {
  enable: (on: boolean) => void;
  setUser: (id: string | null, props: Record<string, string | null>) => void;
  screen: (name: string) => void;
  event: (name: string, params?: Record<string, unknown>) => void;
}

/** Guests and customers are measured; every back-office role is not. */
export function measured(role: Role | null | undefined): boolean {
  return !role || role === 'CUSTOMER';
}

/** "/order/123" and "/item/45" become "/order/[id]", so screens group in the report instead of one row per order. */
export function screenName(path: string): string {
  const p = path.replace(/\/\d+(?=\/|$)/g, '/[id]');
  return p === '' ? '/' : p;
}

export const itemOf = (m: Pick<MenuItem, 'id' | 'name' | 'price'> & { categoryName?: string }, quantity?: number): AnalyticsItem => ({
  item_id: String(m.id), item_name: m.name, price: m.price,
  ...(m.categoryName ? { item_category: m.categoryName } : {}), ...(quantity ? { quantity } : {}),
});

export const lineItem = (l: CartLine): AnalyticsItem => ({ item_id: String(l.menuItemId), item_name: l.name, price: l.unitPrice, quantity: l.quantity });

export function purchaseParams(o: Order): Record<string, unknown> {
  return {
    transaction_id: o.code, currency: CURRENCY, value: o.total, shipping: o.deliveryFee,
    ...(o.voucherCode ? { coupon: o.voucherCode } : {}),
    payment_type: o.payment?.method ?? 'COD',
    items: o.items.map((i) => ({ item_id: String(i.menuItemId), item_name: i.name, price: i.unitPrice, quantity: i.quantity })),
  };
}

/** Wraps a backend so analytics never breaks the app: every call is guarded, and nothing is sent for staff roles. */
export function createTracker(backend: AnalyticsBackend) {
  // nothing is sent until the session is known: a restored staff session must not count its first screen
  let identified = false;
  let on = false;
  let firstScreen: string | null = null;
  const safe = (f: () => void) => { try { f(); } catch { /* analytics must never break ordering */ } };
  const send = (name: string, params?: Record<string, unknown>) => { if (on) safe(() => backend.event(name, params)); };
  const screen = (path: string) => {
    if (!identified) { firstScreen = path; return; }
    if (on) safe(() => backend.screen(screenName(path)));
  };
  return {
    /** Called whenever the signed-in user changes (null = guest). */
    identify(user: { id: number; role: Role } | null) {
      identified = true;
      on = measured(user?.role);
      safe(() => {
        backend.enable(on);
        // a customer is counted as one user across devices; a guest stays anonymous (app instance only)
        backend.setUser(on && user ? String(user.id) : null, { role: on ? (user ? 'customer' : 'guest') : null });
      });
      if (firstScreen !== null) { const p = firstScreen; firstScreen = null; screen(p); }
    },
    screen,
    login: () => send('login', { method: 'phone' }),
    signUp: () => send('sign_up', { method: 'phone' }),
    viewItem: (m: MenuItem) => send('view_item', { currency: CURRENCY, value: m.price, items: [itemOf(m)] }),
    addToCart: (l: CartLine, quantity: number) =>
      send('add_to_cart', { currency: CURRENCY, value: l.unitPrice * quantity, items: [{ ...lineItem(l), quantity }] }),
    viewCart: (lines: CartLine[], subtotal: number) => send('view_cart', { currency: CURRENCY, value: subtotal, items: lines.map(lineItem) }),
    purchase: (o: Order) => send('purchase', purchaseParams(o)),
  };
}

export type Tracker = ReturnType<typeof createTracker>;
