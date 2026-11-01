import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, type Cart, type CartLine } from './api';
import { useSession } from './session';

const EMPTY: Cart = { lines: [], itemCount: 0, subtotal: 0, hasProblems: false };

interface CartValue {
  cart: Cart;
  refresh: () => Promise<void>;
  /** Adds a dish with options; the server merges it with an identical line. */
  add: (menuItemId: number, quantity: number, note?: string | null, optionIds?: number[]) => Promise<Cart>;
  /** Sets the quantity (0 removes) and note of one line. */
  updateLine: (lineId: number, quantity: number, note?: string | null) => Promise<Cart>;
  replace: (c: Cart) => void;
  /** The line holding the dish without options or note (what the menu "+" and stepper control). */
  plainLine: (menuItemId: number) => CartLine | undefined;
  /** Total quantity of a dish over all its lines. */
  quantityOf: (menuItemId: number) => number;
  /** Voucher code picked from a promotion banner, pre-filled at checkout. */
  voucherHint: string | null;
  setVoucherHint: (code: string | null) => void;
}

const Ctx = createContext<CartValue | null>(null);

/** The customer's server-side cart, shared by the menu, item and checkout screens. */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const isCustomer = user?.role === 'CUSTOMER';
  const [cart, setCart] = useState<Cart>(EMPTY);
  const [voucherHint, setVoucherHint] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isCustomer) return;
    try { setCart(await api.cart()); } catch { /* keep the last known cart */ }
  }, [isCustomer]);

  useEffect(() => {
    if (!isCustomer) return undefined;
    let alive = true;
    api.cart().then((c) => { if (alive) setCart(c); }).catch(() => undefined);
    return () => { alive = false; };
  }, [isCustomer, user?.id]);

  const value = useMemo<CartValue>(() => ({
    cart: isCustomer ? cart : EMPTY,
    refresh,
    add: async (id, q, note, optionIds = []) => {
      const c = await api.addToCart(id, q, note, optionIds);
      setCart(c);
      return c;
    },
    updateLine: async (lineId, q, note) => {
      const c = await api.updateCartLine(lineId, q, note);
      setCart(c);
      return c;
    },
    replace: setCart,
    plainLine: (id) => cart.lines.find((l) => l.menuItemId === id && l.options.length === 0 && !l.note),
    quantityOf: (id) => cart.lines.filter((l) => l.menuItemId === id).reduce((n, l) => n + l.quantity, 0),
    voucherHint,
    setVoucherHint,
  }), [cart, isCustomer, refresh, voucherHint]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCart outside CartProvider');
  return v;
}
