import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { api, setAuthToken, setUnauthorizedHandler, type AuthResponse, type Role, type User } from './api';

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
}

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
    setUnauthorizedHandler(() => persist(null));
    return () => setUnauthorizedHandler(null);
  }, [persist]);

  const accept = useCallback((r: AuthResponse) => { persist({ token: r.token, user: r.user }); return r.user; }, [persist]);

  const value = useMemo<SessionValue>(() => ({
    ready,
    user: state?.user ?? null,
    token: state?.token ?? null,
    login: async (login, password) => accept(await api.login(login, password)),
    register: async (b) => accept(await api.register(b)),
    logout: () => persist(null),
    setUser: (u) => { if (state) persist({ token: state.token, user: u }); },
  }), [ready, state, accept, persist]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession outside SessionProvider');
  return v;
}
