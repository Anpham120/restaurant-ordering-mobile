import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { errorMessage } from './api';

/**
 * Runs `fn` when the screen gains focus and every `intervalMs` while focused (0 = once).
 * Returns the latest data, error and a manual reload.
 */
export function usePoll<T>(fn: () => Promise<T>, intervalMs = 5000) {
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

  useFocusEffect(
    useCallback(() => {
      load();
      if (!intervalMs) return undefined;
      const t = setInterval(load, intervalMs);
      return () => clearInterval(t);
    }, [load, intervalMs]),
  );

  return { data, error, loading, reload: load };
}
