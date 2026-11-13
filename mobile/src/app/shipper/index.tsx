import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { PhoneFrame } from '@/components/phone';
import { Txt } from '@/components/txt';
import { Badge, Empty, ErrorBox, Loading, StatusBadge } from '@/components/ui';
import { api, errorMessage, type Order, type ShipperBoard } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { km, minutesSince, money, time } from '@/lib/format';
import { useLoad, useNow } from '@/lib/hooks';
import { OrderService } from '@/lib/order-flow';
import { useSession } from '@/lib/session';
import { colors, radius, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';

type Tab = 'available' | 'delivering' | 'finishedToday';
const TABS: { value: Tab; label: string }[] = [
  { value: 'available', label: 'Chờ nhận' },
  { value: 'delivering', label: 'Đang giao' },
  { value: 'finishedToday', label: 'Hôm nay' },
];
const EMPTY: Record<Tab, { title: string; text: string }> = {
  available: { title: 'Chưa có đơn chờ giao', text: 'Đơn bếp nấu xong sẽ hiện ở đây, tự cập nhật mỗi 5 giây.' },
  delivering: { title: 'Bạn chưa nhận đơn nào', text: 'Vào tab “Chờ nhận” để nhận đơn đi giao.' },
  finishedToday: { title: 'Hôm nay chưa giao đơn nào', text: 'Đơn đã giao hoặc giao thất bại trong ngày sẽ hiện ở đây.' },
};

export default function ShipperHome() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useSession();
  const toast = useToast();
  const now = useNow(30000);
  const [tab, setTab] = useState<Tab>('available');
  const [claiming, setClaiming] = useState<number | null>(null);
  const board = useLoad<ShipperBoard>(() => api.shipperBoard(), [], 5000);
  const list = board.data?.[tab] ?? [];

  const claim = async (o: Order) => {
    setClaiming(o.id);
    try {
      const got = await api.claimOrder(o.id);
      toast.show(`Đã nhận đơn #${got.code.slice(-4)}`, 'success');
      await board.reload();
      router.push(`/shipper/${got.id}`);
    } catch (e) {
      toast.show(errorMessage(e), 'error');
      void board.reload();
    } finally { setClaiming(null); }
  };

  const signOut = async () => {
    if (await confirmAction('Đăng xuất khỏi tài khoản?', 'Đăng xuất')) { logout(); router.replace('/login'); }
  };

  return (
    <PhoneFrame>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={{ flex: 1 }}>
          <Txt size={13} color={colors.sidebarText}>Shipper · Atlas Restaurant</Txt>
          <Txt weight="extrabold" size={20} color={colors.white} numberOfLines={1}>{user?.fullName}</Txt>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Tài khoản" onPress={() => router.push('/profile')} style={styles.headIcon}>
          <Ionicons name="person-circle-outline" size={24} color={colors.sidebarText} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Đăng xuất" onPress={() => void signOut()} style={styles.headIcon}>
          <Ionicons name="log-out-outline" size={22} color={colors.sidebarText} />
        </Pressable>
      </View>
      <View style={styles.tabs} accessibilityRole="tablist">
        {TABS.map((t) => {
          const on = t.value === tab;
          const n = board.data?.[t.value].length ?? 0;
          return (
            <Pressable key={t.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(t.value)} style={[styles.tab, on && styles.tabOn]}>
              <Txt weight={on ? 'bold' : 'semibold'} size={14} color={on ? colors.primary : colors.textSoft}>{t.label}</Txt>
              {n ? <View style={[styles.count, !on && { backgroundColor: colors.neutralText }]}><Txt weight="bold" size={11} color={colors.white}>{n}</Txt></View> : null}
            </Pressable>
          );
        })}
      </View>
      {board.loading && !board.data ? <Loading /> : board.error && !board.data ? <View style={{ padding: 16 }}><ErrorBox message={board.error} onRetry={board.reload} /></View> : (
        <FlatList
          data={list}
          keyExtractor={(o) => String(o.id)}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => void board.reload()} />}
          ListEmptyComponent={<Empty icon={tab === 'available' ? 'bag-check-outline' : 'bicycle-outline'} title={EMPTY[tab].title} text={EMPTY[tab].text} />}
          renderItem={({ item: o }) => (
            <TripCard order={o} now={now} onOpen={() => router.push(`/shipper/${o.id}`)}
              action={tab === 'available' ? <Button title="Nhận đơn đi giao" icon="bicycle" loading={claiming === o.id} onPress={() => void claim(o)} /> : null} />
          )}
        />
      )}
    </PhoneFrame>
  );
}

function TripCard({ order: o, now, onOpen, action }: { order: Order; now: number; onOpen: () => void; action: ReactNode }) {
  const cash = OrderService.cashToCollect(o);
  const done = o.status === 'DELIVERED' || o.status === 'CANCELLED';
  return (
    <View style={[styles.card, shadow]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Đơn ${o.code}`} onPress={onOpen} style={{ gap: 8 }}>
        <View style={styles.rowBetween}>
          <Txt weight="extrabold" size={16}>#{o.code.slice(-4)}</Txt>
          {done ? <StatusBadge status={o.status} />
            : <Badge label={`Đặt ${minutesSince(o.createdAt, now)} phút trước`} bg={colors.neutralSoft} fg={colors.neutralText} />}
        </View>
        <View style={styles.addr}>
          <Ionicons name="location" size={18} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Txt weight="semibold" size={15} style={{ lineHeight: 20 }}>{o.deliveryStreet}</Txt>
            <Txt size={13} color={colors.muted}>{o.recipientName} · {km(o.distanceKm)}</Txt>
          </View>
        </View>
        <View style={styles.rowBetween}>
          <Txt size={13} color={colors.textSoft}>{o.itemCount} món{done ? ` · ${time(o.updatedAt)}` : ''}</Txt>
          {cash ? <Badge label={`Thu ${money(cash)}`} bg={colors.warningSoft} fg={colors.warningText} />
            : <Badge label="Đã thanh toán" bg={colors.successSoft} fg={colors.success} />}
        </View>
      </Pressable>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.sidebar, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingBottom: 14 },
  headIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  tab: { flex: 1, height: 48, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: colors.primary },
  count: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, gap: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  addr: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
});
