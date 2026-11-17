import { useSession } from './session';

/** Muting survives screen remounts, but never carries over to another login session. */
export function useHiddenPromos(): { ready: boolean; hidden: ReadonlySet<number>; hide: (id: number) => void } {
  const { ready, hiddenPromos, hidePromo } = useSession();
  return { ready, hidden: hiddenPromos, hide: hidePromo };
}
