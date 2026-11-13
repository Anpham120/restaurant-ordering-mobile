import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Campaigns the customer asked never to see again in the pop-up ("Không hiển thị lại quảng cáo này"). Kept on the
 * device so it also works for guests; the campaign stays in the home-screen banner, where it does not interrupt.
 */
const KEY = 'atlas.promo.hidden.v1';
const MAX = 100;

let cache: number[] | null = null;
let loading: Promise<number[]> | null = null;

function load(): Promise<number[]> {
  if (cache) return Promise.resolve(cache);
  loading ??= AsyncStorage.getItem(KEY)
    .then((raw) => { const v: unknown = raw ? JSON.parse(raw) : []; return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : []; })
    .catch(() => [])
    .then((ids) => (cache = ids));
  return loading;
}

export function useHiddenPromos(): { ready: boolean; hidden: ReadonlySet<number>; hide: (id: number) => void } {
  const [ids, setIds] = useState<number[] | null>(cache);
  useEffect(() => {
    let alive = true;
    void load().then((v) => { if (alive) setIds(v); });
    return () => { alive = false; };
  }, []);
  const hide = useCallback((id: number) => {
    const next = [...(cache ?? []).filter((x) => x !== id), id].slice(-MAX);
    cache = next;
    setIds(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);
  const hidden = useMemo(() => new Set(ids ?? []), [ids]);
  return { ready: ids !== null, hidden, hide };
}
