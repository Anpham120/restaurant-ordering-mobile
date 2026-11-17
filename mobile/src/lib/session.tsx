import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { track } from './analytics';
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
  /** Campaigns muted only for this app run/login session; never persisted. */
  hiddenPromos: ReadonlySet<number>;
  hidePromo: (id: number) => void;
}

export const SESSION_EXPIRED = 'Phiên đăng nhập đã hết hiệu lực, vui lòng đăng nhập lại.';

const Ctx = createContext<SessionValue | null>(null);

/** Where each role lands after signing in. */
export function homeFor(role: Role | undefined): '/' | '/store/orders' | '/store/kitchen' | '/admin' | '/shipper' {
  switch (role) {
    case 'STAFF': return '/store/orders';
    case 'KITCHEN': return '/store/kitchen';
    case 'MANAGER': return '/admin';
    case 'SHIPPER': return '/shipper';
    default: return '/';
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<Stored | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // 1: opening the app is a visit too (promotion popup), every sign-in adds one
  const [welcomeSeq, setWelcomeSeq] = useState(1);
  const [hiddenPromos, setHiddenPromos] = useState<ReadonlySet<number>>(() => new Set());

  const persist = useCallback((s: Stored | null) => {
    setAuthToken(s?.token ?? null);
    setState(s);
    if (!s) setHiddenPromos(new Set());
    void (s ? AsyncStorage.setItem(KEY, JSON.stringify(s)) : AsyncStorage.removeItem(KEY)).catch(() => undefined);
  }, []);

  useEffect(() => {
    // Discard the old device-wide preference; it must not affect any new session.
    void AsyncStorage.removeItem('atlas.promo.hidden.v1').catch(() => undefined);
    let alive = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw && alive) {
          const s = JSON.parse(raw) as Stored;
          setAuthToken(s.token);
          setState(s);
          // refresh the profile (role or lock may have changed); a 401 logs out via the handler
          api.me().then((u) => alive && persist({ token: s.token, user: u })).catch(() => undefined);
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

  // Analytics follows the signed-in user: customers are counted by account id (retention across devices),
  // guests anonymously, back-office roles not at all.
  const userId = state?.user.id;
  const role = state?.user.role;
  useEffect(() => {
    if (ready) track.identify(userId && role ? { id: userId, role } : null);
  }, [ready, userId, role]);

  const accept = useCallback((r: AuthResponse) => { persist({ token: r.token, user: r.user }); setNotice(null); return r.user; }, [persist]);

  const value = useMemo<SessionValue>(() => ({
    ready,
    user: state?.user ?? null,
    token: state?.token ?? null,
    login: async (login, password) => {
      const u = accept(await api.login(login, password)); track.identify(u); track.login();
      setHiddenPromos(new Set()); setWelcomeSeq((n) => n + 1); return u;
    },
    register: async (b) => {
      const u = accept(await api.register(b)); track.identify(u); track.signUp();
      setHiddenPromos(new Set()); setWelcomeSeq((n) => n + 1); return u;
    },
    logout: () => persist(null),
    setUser: (u) => { if (state) persist({ token: state.token, user: u }); },
    acceptAuth: accept,
    notice,
    clearNotice: () => setNotice(null),
    welcomeSeq,
    hiddenPromos,
    hidePromo: (id) => setHiddenPromos((ids) => new Set(ids).add(id)),
  }), [ready, state, accept, persist, notice, welcomeSeq, hiddenPromos]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}
