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
  const requestSeq = useRef(0);
  const pending = useRef(false);
  useEffect(() => { fnRef.current = fn; });

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;
    pending.current = true;
    try {
      const d = await fnRef.current();
      if (seq !== requestSeq.current) return;
      setData(d);
      setError(null);
    } catch (e) {
      if (seq === requestSeq.current) setError(errorMessage(e));
    } finally {
      if (seq === requestSeq.current) {
        pending.current = false;
        setLoading(false);
      }
    }
  }, []);

  const key = JSON.stringify(deps);
  useFocusEffect(
    useCallback(() => {
      void load();
      const t = intervalMs ? setInterval(() => { if (!pending.current) void load(); }, intervalMs) : null;
      return () => {
        requestSeq.current++; // responses from a previous focus/account must not replace the current data
        if (t) clearInterval(t);
      };
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
