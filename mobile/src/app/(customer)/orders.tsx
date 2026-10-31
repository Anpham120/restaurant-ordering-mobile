import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Txt } from '@/components/txt';
import { Card, Empty, ErrorBox, FoodImage, Loading, StatusBadge } from '@/components/ui';
import { api, errorMessage, type Order, type Page } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { friendlyDate, money } from '@/lib/format';
import { useLoad, useNow } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';
import { useToast } from '@/lib/toast';

export default function OrdersTab() {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.head, { paddingTop: insets.top + 14 }]}>
        <Txt weight="extrabold" size={22}>Đơn hàng của tôi</Txt>
      </View>
      {user ? <OrderList /> : (
        <Empty icon="receipt-outline" title="Đăng nhập để xem đơn hàng" text="Theo dõi đơn đang giao và đặt lại món yêu thích chỉ với một chạm."
          action={<Button title="Đăng nhập" onPress={() => router.push('/login')} />} />
      )}
    </View>
  );
}

function OrderList() {
  const now = useNow(60000);
  const toast = useToast();
  const { replace } = useCart();
  const { data, error, loading, reload } = useLoad<Page<Order>>(() => api.myOrders(0, 50), [], 15000);
  if (loading && !data) return <Loading />;
  if (error && !data) return <View style={{ padding: 16 }}><ErrorBox message={error} onRetry={reload} /></View>;
  const orders = data?.content ?? [];

  const reorder = async (o: Order) => {
    try { replace(await api.reorder(o.id)); router.push('/cart'); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => String(o.id)}
      contentContainerStyle={styles.list}
      ListEmptyComponent={<Empty icon="fast-food-outline" title="Bạn chưa có đơn hàng nào" text="Món ngon đang chờ bạn ở trang chủ."
        action={<Button title="Đặt món ngay" onPress={() => router.replace('/')} />} />}
      renderItem={({ item: o }) => {
        const active = !['DELIVERED', 'CANCELLED'].includes(o.status);
        return (
          <Card style={{ gap: 10 }}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Txt weight="bold" size={14}>#{o.code}</Txt>
                <Txt size={12} color={colors.muted}>{friendlyDate(o.createdAt, now)}</Txt>
              </View>
              <StatusBadge status={o.status} />
            </View>
            <View style={styles.rowGap}>
              <FoodImage uri={o.items[0]?.imageUrl} style={{ width: 48, height: 48 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Txt size={14} numberOfLines={1}>{o.items.map((i) => `${i.quantity} ${i.name}`).join(', ')}</Txt>
                <Txt weight="extrabold" size={15}>{money(o.total)}</Txt>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {o.reviewable ? <Button title="Đánh giá" size="sm" variant="soft" icon="star-outline" onPress={() => router.push(`/order/${o.id}`)} style={{ flex: 1 }} />
                : <Button title={active ? 'Theo dõi đơn' : 'Xem chi tiết'} size="sm" variant="soft" onPress={() => router.push(`/order/${o.id}`)} style={{ flex: 1 }} />}
              {!active ? <Button title="Đặt lại" size="sm" variant="secondary" icon="refresh" onPress={() => void reorder(o)} style={{ flex: 1 }} /> : null}
            </View>
          </Card>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  head: { backgroundColor: colors.white, paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  list: { padding: 16, gap: 12, paddingBottom: 32 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
