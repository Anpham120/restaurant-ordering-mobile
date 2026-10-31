import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { setAuthToken, setUnauthorizedHandler, type MenuItem, type User } from './api';

export interface CartLine { menuItem: MenuItem; quantity: number; note: string }

interface Persisted {
  token: string | null; user: User | null; tableToken: string | null; tableCode: string | null; orderId: number | null;
}

interface SessionValue extends Persisted {
  cart: CartLine[];
  voucherCode: string;
  setStaffSession: (token: string, user: User) => void;
  logout: () => void;
  setTable: (token: string, code: string) => void;
  leaveTable: () => void;
  setOrderId: (id: number | null) => void;
  addToCart: (item: MenuItem) => void;
  setQuantity: (menuItemId: number, quantity: number) => void;
  setLineNote: (menuItemId: number, note: string) => void;
  clearCart: () => void;
  setVoucherCode: (code: string) => void;
}

const KEY = 'restaurant-ordering.session';
const EMPTY: Persisted = { token: null, user: null, tableToken: null, tableCode: null, orderId: null };

function load(): Persisted {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(KEY);
      if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<Persisted>) };
    }
  } catch { /* storage unavailable */ }
  return EMPTY;
}

function save(p: Persisted) {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(p));
  } catch { /* storage unavailable */ }
}

const Ctx = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  // Lazy init so the auth token is set before any child effect fires a request.
  const [state, setState] = useState<Persisted>(() => {
    const p = load();
    setAuthToken(p.token);
    return p;
  });
  const [cart, setCart] = useState<CartLine[]>([]);
  const [voucherCode, setVoucherCode] = useState('');

  useEffect(() => { save(state); }, [state]);

  const logout = useCallback(() => {
    setAuthToken(null);
    setState((s) => ({ ...s, token: null, user: null }));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const value = useMemo<SessionValue>(() => ({
    ...state,
    cart,
    voucherCode,
    setStaffSession: (token, user) => { setAuthToken(token); setState((s) => ({ ...s, token, user })); },
    logout,
    setTable: (tableToken, tableCode) => setState((s) => ({ ...s, tableToken, tableCode, orderId: s.tableToken === tableToken ? s.orderId : null })),
    leaveTable: () => { setState((s) => ({ ...s, tableToken: null, tableCode: null, orderId: null })); setCart([]); setVoucherCode(''); },
    setOrderId: (orderId) => setState((s) => ({ ...s, orderId })),
    addToCart: (item) => setCart((c) => {
      const found = c.find((l) => l.menuItem.id === item.id);
      return found ? c.map((l) => (l === found ? { ...l, quantity: l.quantity + 1 } : l)) : [...c, { menuItem: item, quantity: 1, note: '' }];
    }),
    setQuantity: (id, quantity) => setCart((c) => (quantity <= 0 ? c.filter((l) => l.menuItem.id !== id) : c.map((l) => (l.menuItem.id === id ? { ...l, quantity } : l)))),
    setLineNote: (id, note) => setCart((c) => c.map((l) => (l.menuItem.id === id ? { ...l, note } : l))),
    clearCart: () => { setCart([]); setVoucherCode(''); },
    setVoucherCode,
  }), [state, cart, voucherCode, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}
