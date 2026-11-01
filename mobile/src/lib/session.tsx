import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { api, setAuthToken, setMustChangePasswordHandler, setUnauthorizedHandler, type AuthResponse, type Role, type User } from './api';

const KEY = 'atlas.session.v1';

interface Stored { token: string; user: User }

interface SessionValue {
  ready: boolean;
  user: User | null;
  token: string | null;
  login: (login: string, password: string) => Promise<User>;
  register: (b: { fullName: string; phone: string; email?: string | null; password: string }) => Promise<User>;
  logout: () => void;
  setUser: (u: User) => void;
  /** Stores a token returned by the API (e.g. after changing the password). */
  acceptAuth: (r: AuthResponse) => User;
  /** Why the user was signed out (expired or revoked session); shown on the login screen. */
  notice: string | null;
  clearNotice: () => void;
  /** Counts sign-ins and registrations of this run (not restored sessions): the promotion popup is shown once per sign-in. */
  welcomeSeq: number;
}

export const SESSION_EXPIRED = 'Phiên đăng nhập đã hết hiệu lực, vui lòng đăng nhập lại.';
/** The phone app is for customers only; manager, staff and kitchen accounts work on the web. */
export const STORE_WEB_URL = 'https://order.atlasplatform12.tech';
export const STORE_ON_WEB = `Tài khoản cửa hàng (quản lý, nhân viên, bếp) chỉ dùng trên web: ${STORE_WEB_URL.replace('https://', '')}`;
export const allowedHere = (u: User): boolean => Platform.OS === 'web' || u.role === 'CUSTOMER';

const Ctx = createContext<SessionValue | null>(null);

/** Where each role lands after signing in. */
export function homeFor(role: Role | undefined): '/' | '/store/orders' | '/store/kitchen' | '/admin' {
  switch (role) {
    case 'STAFF': return '/store/orders';
    case 'KITCHEN': return '/store/kitchen';
    case 'MANAGER': return '/admin';
    default: return '/';
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<Stored | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [welcomeSeq, setWelcomeSeq] = useState(0);

  const persist = useCallback((s: Stored | null) => {
    setAuthToken(s?.token ?? null);
    setState(s);
    void (s ? AsyncStorage.setItem(KEY, JSON.stringify(s)) : AsyncStorage.removeItem(KEY)).catch(() => undefined);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw && alive) {
          const s = JSON.parse(raw) as Stored;
          if (!allowedHere(s.user)) {               // a store account left signed in on the phone by an older version
            await AsyncStorage.removeItem(KEY);
            setNotice(STORE_ON_WEB);
          } else {
            setAuthToken(s.token);
            setState(s);
            // refresh the profile (role or lock may have changed); a 401 logs out via the handler
            api.me().then((u) => {
              if (!alive) return;
              if (allowedHere(u)) persist({ token: s.token, user: u }); else { persist(null); setNotice(STORE_ON_WEB); }
            }).catch(() => undefined);
          }
        }
      } catch { /* corrupt storage: start signed out */ }
      if (alive) setReady(true);
    })();
    return () => { alive = false; };
  }, [persist]);

  useEffect(() => {
    // a 401 means the token expired or was revoked (password changed elsewhere, account locked)
    setUnauthorizedHandler(() => { persist(null); setNotice(SESSION_EXPIRED); });
    // a 403 "Vui lòng đổi mật khẩu…" means the stored profile is stale: flag it so the gate opens the set-password screen
    setMustChangePasswordHandler(() => setState((s) => {
      if (!s || s.user.mustChangePassword) return s;
      const next = { token: s.token, user: { ...s.user, mustChangePassword: true } };
      void AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    }));
    return () => { setUnauthorizedHandler(null); setMustChangePasswordHandler(null); };
  }, [persist]);

  const accept = useCallback((r: AuthResponse) => { persist({ token: r.token, user: r.user }); setNotice(null); return r.user; }, [persist]);

  const value = useMemo<SessionValue>(() => ({
    ready,
    user: state?.user ?? null,
    token: state?.token ?? null,
    login: async (login, password) => {
      const r = await api.login(login, password);
      if (!allowedHere(r.user)) throw new Error(STORE_ON_WEB);   // nothing is stored: the app stays signed out
      const u = accept(r); setWelcomeSeq((n) => n + 1); return u;
    },
    register: async (b) => { const u = accept(await api.register(b)); setWelcomeSeq((n) => n + 1); return u; },
    logout: () => persist(null),
    setUser: (u) => { if (state) persist({ token: state.token, user: u }); },
    acceptAuth: accept,
    notice,
    clearNotice: () => setNotice(null),
    welcomeSeq,
  }), [ready, state, accept, persist, notice, welcomeSeq]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}
