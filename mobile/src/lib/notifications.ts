import { api } from './api';
import { useLoad } from './hooks';
import { useSession } from './session';

/** Unread notification count for the signed-in customer (refreshed on focus and every 30 s). */
export function useUnread(): { count: number; reload: () => Promise<void> } {
  const { user } = useSession();
  const customer = user?.role === 'CUSTOMER';
  const r = useLoad<number>(async () => (customer ? (await api.unreadCount()).count : 0), [user?.id], 30000);
  return { count: r.data ?? 0, reload: r.reload };
}
