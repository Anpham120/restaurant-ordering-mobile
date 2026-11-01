import { api, type Unread } from './api';
import { useLoad } from './hooks';
import { useSession } from './session';

const NONE: Unread = { count: 0, promotions: 0 };

/**
 * Unread notifications for the signed-in customer (refreshed on focus and every 30 s).
 * `count` = orders + payments (red badge); `promotions` only earns a small dot.
 */
export function useUnread(): Unread & { reload: () => Promise<void> } {
  const { user } = useSession();
  const customer = user?.role === 'CUSTOMER' && !user.mustChangePassword;
  const r = useLoad<Unread>(async () => (customer ? api.unreadCount() : NONE), [user?.id, customer], 30000);
  return { ...(r.data ?? NONE), reload: r.reload };
}
