import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, type Cart } from './api';
import { useSession } from './session';

const EMPTY: Cart = { lines: [], itemCount: 0, subtotal: 0, hasProblems: false };

interface CartValue {
  cart: Cart;
  refresh: () => Promise<void>;
  setQuantity: (menuItemId: number, quantity: number, note?: string | null) => Promise<Cart>;
  replace: (c: Cart) => void;
  quantityOf: (menuItemId: number) => number;
}

const Ctx = createContext<CartValue | null>(null);

/** The customer's server-side cart, shared by the menu, item and checkout screens. */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const isCustomer = user?.role === 'CUSTOMER';
  const [cart, setCart] = useState<Cart>(EMPTY);

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
    setQuantity: async (id, q, note) => {
      const c = await api.setCartItem(id, q, note);
      setCart(c);
      return c;
    },
    replace: setCart,
    quantityOf: (id) => cart.lines.find((l) => l.menuItemId === id)?.quantity ?? 0,
  }), [cart, isCustomer, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCart outside CartProvider');
  return v;
}
