import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { PhoneFrame, TopBar } from '@/components/phone';
import { Txt } from '@/components/txt';
import { Empty, ErrorBox, Loading } from '@/components/ui';
import { api, errorMessage, type Notification, type NotificationCategory, type NotificationType } from '@/lib/api';
import { friendlyDate } from '@/lib/format';
import { useLoad, useNow } from '@/lib/hooks';
import { useUnread } from '@/lib/notifications';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';
import { useToast } from '@/lib/toast';

type IconName = ComponentProps<typeof Ionicons>['name'];
const KIND: Record<NotificationType, { icon: IconName | 'moped'; bg: string }> = {
  ORDER: { icon: 'moped', bg: colors.primary },
  PAYMENT: { icon: 'card-outline', bg: colors.success },
  PROMOTION: { icon: 'gift-outline', bg: colors.info },
  FEEDBACK: { icon: 'chatbubble-ellipses-outline', bg: colors.warning },
};
const TABS: { value: NotificationCategory; label: string }[] = [{ value: 'ORDER', label: 'Đơn hàng' }, { value: 'PROMOTION', label: 'Khuyến mãi' }];
const EMPTY: Record<NotificationCategory, { title: string; text: string }> = {
  ORDER: { title: 'Chưa có thông báo đơn hàng', text: 'Trạng thái đơn và thanh toán sẽ hiện ở đây.' },
  PROMOTION: { title: 'Chưa có khuyến mãi', text: 'Ưu đãi và món mới của cửa hàng sẽ hiện ở đây. Bật/tắt trong Thông tin tài khoản.' },
};

export default function NotificationsScreen() {
  const { user } = useSession();
  if (!user) return <Redirect href="/login" />;
  return <List />;
}

function List() {
  const now = useNow(60000);
  const toast = useToast();
  const [tab, setTab] = useState<NotificationCategory>('ORDER');
  const counts = useUnread();
  const list = useLoad<Notification[]>(() => api.notifications(50, tab), [tab]);
  const items = list.data ?? [];
  const unreadHere = items.filter((n) => !n.read).length;
  const badge: Record<NotificationCategory, number> = { ORDER: counts.count, PROMOTION: counts.promotions };
  const unread = unreadHere + counts.count + counts.promotions;

  const switchTab = (t: NotificationCategory) => {
    if (t === tab) return;
    list.setData(null);
    setTab(t);
  };

  const readAll = async () => {
    try {
      await api.readAllNotifications();
      list.setData((d) => (d ? d.map((n) => ({ ...n, read: true })) : d));
      await counts.reload();
    } catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  const open = async (n: Notification) => {
    if (!n.read) {
      list.setData((d) => (d ? d.map((x) => (x.id === n.id ? { ...x, read: true } : x)) : d));
      api.readNotification(n.id).then(counts.reload).catch(() => undefined);
    }
    if (n.type === 'FEEDBACK') { router.push('/feedback'); return; }
    if (n.orderId) { router.push(`/order/${n.orderId}`); return; }
    if (n.promotionId) {
      try {
        const p = (await api.promotions()).find((x) => x.id === n.promotionId);
        if (p?.targetType === 'MENU_ITEM' && p.menuItemId) { router.push(`/item/${p.menuItemId}`); return; }
      } catch { /* fall back to the home screen */ }
      router.replace('/');
    }
  };

  return (
    <PhoneFrame>
      <TopBar title="Thông báo" right={unread ? (
        <Pressable accessibilityRole="button" onPress={() => void readAll()} style={styles.readAll} hitSlop={6}>
          <Txt weight="semibold" size={14} color={colors.primary}>Đánh dấu đã đọc</Txt>
        </Pressable>
      ) : null} />
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((t) => {
          const on = t.value === tab;
          const n = badge[t.value];
          return (
            <Pressable key={t.value} accessibilityRole="tab" accessibilityState={{ selected: on }}
              accessibilityLabel={n ? `${t.label}, ${n} chưa đọc` : t.label} onPress={() => switchTab(t.value)} style={[styles.tab, on && styles.tabOn]}>
              <Txt weight={on ? 'bold' : 'semibold'} size={15} color={on ? colors.primary : colors.textSoft}>{t.label}</Txt>
              {n ? (
                t.value === 'ORDER'
                  ? <View style={styles.count}><Txt weight="bold" size={11} color={colors.white}>{n > 9 ? '9+' : n}</Txt></View>
                  : <View style={styles.tabDot} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
      {!list.data && !list.error ? <Loading /> : list.error && !list.data ? <View style={{ padding: 16 }}><ErrorBox message={list.error} onRetry={list.reload} /></View> : (
        <FlatList
          data={items}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={<Empty icon={tab === 'ORDER' ? 'receipt-outline' : 'gift-outline'} title={EMPTY[tab].title} text={EMPTY[tab].text} />}
          renderItem={({ item: n }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`${n.read ? '' : 'Chưa đọc. '}${n.title}`} onPress={() => void open(n)}
              style={({ pressed }) => [styles.row, !n.read && styles.unread, pressed && { opacity: 0.85 }]}>
              <View style={[styles.icon, { backgroundColor: KIND[n.type].bg }]}>{KIND[n.type].icon === 'moped'
                ? <MaterialCommunityIcons name="moped" size={21} color={colors.white} />
                : <Ionicons name={KIND[n.type].icon as IconName} size={20} color={colors.white} />}</View>
              <View style={{ flex: 1, gap: 3 }}>
                <View style={styles.head}>
                  <Txt weight={n.read ? 'semibold' : 'extrabold'} size={15} style={{ flex: 1 }}>{n.title}</Txt>
                  <Txt size={12} color={colors.muted}>{friendlyDate(n.createdAt, now).replace('Hôm nay ', '')}</Txt>
                </View>
                <Txt size={13} color={colors.textSoft} style={{ lineHeight: 19 }}>{n.body}</Txt>
              </View>
              {!n.read ? <View style={styles.dot} /> : null}
            </Pressable>
          )}
        />
      )}
    </PhoneFrame>
  );
}

const styles = StyleSheet.create({
  readAll: { paddingHorizontal: 8, minHeight: 44, justifyContent: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', minHeight: 46, borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: colors.primary },
  count: { minWidth: 18, height: 18, paddingHorizontal: 5, borderRadius: 9, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  tabDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  unread: { backgroundColor: '#FFF7F2' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
});
