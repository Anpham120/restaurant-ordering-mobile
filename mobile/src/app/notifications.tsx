import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import type { ComponentProps } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { PhoneFrame, TopBar } from '@/components/phone';
import { Txt } from '@/components/txt';
import { Empty, ErrorBox, Loading } from '@/components/ui';
import { api, errorMessage, type Notification, type NotificationType } from '@/lib/api';
import { friendlyDate } from '@/lib/format';
import { useLoad, useNow } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';
import { useToast } from '@/lib/toast';

type IconName = ComponentProps<typeof Ionicons>['name'];
const KIND: Record<NotificationType, { icon: IconName; bg: string }> = {
  ORDER: { icon: 'bicycle-outline', bg: colors.primary },
  PAYMENT: { icon: 'card-outline', bg: colors.success },
  PROMOTION: { icon: 'gift-outline', bg: colors.info },
};

export default function NotificationsScreen() {
  const { user } = useSession();
  if (!user) return <Redirect href="/login" />;
  return <List />;
}

function List() {
  const now = useNow(60000);
  const toast = useToast();
  const list = useLoad<Notification[]>(() => api.notifications(50));
  const items = list.data ?? [];
  const unread = items.filter((n) => !n.read).length;

  const readAll = async () => {
    try {
      await api.readAllNotifications();
      list.setData((d) => (d ? d.map((n) => ({ ...n, read: true })) : d));
    } catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  const open = async (n: Notification) => {
    if (!n.read) {
      list.setData((d) => (d ? d.map((x) => (x.id === n.id ? { ...x, read: true } : x)) : d));
      api.readNotification(n.id).catch(() => undefined);
    }
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
      {list.loading && !list.data ? <Loading /> : list.error && !list.data ? <View style={{ padding: 16 }}><ErrorBox message={list.error} onRetry={list.reload} /></View> : (
        <FlatList
          data={items}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={<Empty icon="notifications-outline" title="Chưa có thông báo" text="Cập nhật về đơn hàng và chương trình ưu đãi sẽ hiện ở đây." />}
          renderItem={({ item: n }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`${n.read ? '' : 'Chưa đọc. '}${n.title}`} onPress={() => void open(n)}
              style={({ pressed }) => [styles.row, !n.read && styles.unread, pressed && { opacity: 0.85 }]}>
              <View style={[styles.icon, { backgroundColor: KIND[n.type].bg }]}><Ionicons name={KIND[n.type].icon} size={20} color={colors.white} /></View>
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
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  unread: { backgroundColor: '#FFF7F2' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
});
