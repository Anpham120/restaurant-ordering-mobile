import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';

import { errorMessage } from './api';

/**
 * Loads `fn` when the screen gains focus and again every `intervalMs` while focused (0 = only on focus).
 * `deps` re-run the load when they change.
 */
export function useLoad<T>(fn: () => Promise<T>, deps: readonly unknown[] = [], intervalMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  useEffect(() => { fnRef.current = fn; });

  const load = useCallback(async () => {
    try {
      const d = await fnRef.current();
      setData(d);
      setError(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const key = JSON.stringify(deps);
  useFocusEffect(
    useCallback(() => {
      void load();
      if (!intervalMs) return undefined;
      const t = setInterval(() => { void load(); }, intervalMs);
      return () => clearInterval(t);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, intervalMs, key]),
  );

  return { data, error, loading, reload: load, setData };
}

/** Current time, updated every `ms` (for "x minutes ago" and kitchen timers). */
export function useNow(ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function useWide(min = 900): boolean {
  return useWindowDimensions().width >= min;
}
