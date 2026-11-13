import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { api, errorMessage, type Notification, type Order } from '@/lib/api';
import { dateTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import { colors, radius } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { Sheet } from './modal';
import { OrderDetailSheet } from './order-ops';
import { Txt } from './txt';
import { Empty, Loading } from './ui';

const POLL_MS = 10000;

/**
 * Bell for staff and managers: shippers' delivery confirmations and failures, and new customer feedback, arrive here. A new one also pops a toast
 * on whatever back-office page is open; tapping it in the list opens the order with the doorstep photo.
 */
export function StoreBell({ dark = true }: { dark?: boolean }) {
  const { user } = useSession();
  const enabled = user?.role === 'STAFF' || user?.role === 'MANAGER';
  const toast = useToast();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Notification[] | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const seen = useRef<number | null>(null); // newest notification id already announced

  const poll = useCallback(async () => {
    try {
      const u = await api.storeUnread();
      setUnread(u.count);
      if (!u.count) { if (seen.current === null) seen.current = 0; return; }
      const latest = (await api.storeNotifications(5)).filter((n) => !n.read);
      const newest = latest[0];
      // first poll after opening the app: remember what is there, only announce what arrives afterwards
      if (seen.current === null) { seen.current = newest?.id ?? 0; return; }
      if (newest && newest.id > seen.current) {
        seen.current = newest.id;
        toast.show(newest.title, /thất bại/i.test(newest.title) ? 'error' : newest.type === 'FEEDBACK' ? 'info' : 'success');
      }
    } catch { /* keep the last count; the next poll retries */ }
  }, [toast]);

  useEffect(() => {
    if (!enabled) return undefined;
    const first = setTimeout(() => void poll(), 0);
    const t = setInterval(() => void poll(), POLL_MS);
    return () => { clearTimeout(first); clearInterval(t); };
  }, [enabled, poll]);

  const show = async () => {
    setOpen(true);
    setList(null);
    try { setList(await api.storeNotifications(30)); } catch (e) { toast.show(errorMessage(e), 'error'); setList([]); }
  };

  const pick = async (n: Notification) => {
    if (!n.read) {
      setList((l) => (l ? l.map((x) => (x.id === n.id ? { ...x, read: true } : x)) : l));
      setUnread((c) => Math.max(0, c - 1));
      api.storeReadNotification(n.id).catch(() => undefined);
    }
    if (n.type === 'FEEDBACK') { setOpen(false); router.navigate('/store/feedback'); return; }
    if (!n.orderId) return;
    try { setOrder(await api.storeOrder(n.orderId)); setOpen(false); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  const readAll = async () => {
    try { await api.storeReadAllNotifications(); setUnread(0); setList((l) => (l ? l.map((x) => ({ ...x, read: true })) : l)); }
    catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  if (!enabled) return null;
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={unread ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'} onPress={() => void show()}
        hitSlop={6} style={styles.bell}>
        <Ionicons name={unread ? 'notifications' : 'notifications-outline'} size={22} color={dark ? colors.sidebarText : colors.text} />
        {unread ? <View style={styles.badge}><Txt weight="bold" size={10} color={colors.white}>{unread > 9 ? '9+' : unread}</Txt></View> : null}
      </Pressable>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Thông báo" width={480}
        footer={unread ? <Pressable accessibilityRole="button" onPress={() => void readAll()} style={{ alignSelf: 'flex-end' }} hitSlop={6}>
          <Txt weight="semibold" size={14} color={colors.primary}>Đánh dấu tất cả đã đọc</Txt>
        </Pressable> : undefined}>
        {!list ? <Loading /> : list.length === 0 ? (
          <Empty icon="notifications-off-outline" title="Chưa có thông báo" text="Shipper xác nhận giao hàng, báo giao thất bại và góp ý mới của khách sẽ hiện ở đây." />
        ) : list.map((n) => {
          const failed = /thất bại/i.test(n.title);
          const feedback = n.type === 'FEEDBACK';
          return (
            <Pressable key={n.id} accessibilityRole="button" onPress={() => void pick(n)}
              style={({ pressed }) => [styles.row, !n.read && styles.unread, pressed && { opacity: 0.85 }]}>
              <View style={[styles.icon, { backgroundColor: feedback ? colors.warning : failed ? colors.danger : colors.success }]}>
                <Ionicons name={feedback ? 'chatbubble-ellipses' : failed ? 'close' : 'checkmark-done'} size={18} color={colors.white} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt weight={n.read ? 'semibold' : 'bold'} size={14}>{n.title}</Txt>
                <Txt size={13} color={colors.textSoft} style={{ lineHeight: 18 }}>{n.body}</Txt>
                <Txt size={12} color={colors.muted}>{dateTime(n.createdAt)}</Txt>
              </View>
            </Pressable>
          );
        })}
      </Sheet>
      <OrderDetailSheet order={order} onClose={() => setOrder(null)} onAction={() => undefined} busy={null} />
    </>
  );
}

const styles = StyleSheet.create({
  bell: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 6, right: 4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: radius.md },
  unread: { backgroundColor: colors.primarySoft },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
