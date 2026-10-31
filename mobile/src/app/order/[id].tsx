import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Linking, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { ReasonDialog } from '@/components/modal';
import { PhoneFrame, TopBar } from '@/components/phone';
import { Txt } from '@/components/txt';
import { Card, ErrorBox, FoodImage, Line, Loading, Stars, StatusBadge } from '@/components/ui';
import { api, errorMessage, type Order, type OrderItem, type OrderStatus, type Store } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { money, time, timelineLabel } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { OrderService } from '@/lib/order-flow';
import { colors, fonts, radius } from '@/lib/theme';
import { useToast } from '@/lib/toast';

type IconName = ComponentProps<typeof Ionicons>['name'];

const HERO: Record<OrderStatus, { icon: IconName; title: string }> = {
  PENDING: { icon: 'hourglass-outline', title: 'Chờ cửa hàng xác nhận' },
  CONFIRMED: { icon: 'checkmark-done-outline', title: 'Cửa hàng đã nhận đơn' },
  PREPARING: { icon: 'flame-outline', title: 'Bếp đang chuẩn bị món' },
  READY: { icon: 'bag-check-outline', title: 'Món đã sẵn sàng, chờ giao' },
  DELIVERING: { icon: 'bicycle-outline', title: 'Đơn đang được giao tới bạn' },
  DELIVERED: { icon: 'happy-outline', title: 'Giao hàng thành công' },
  CANCELLED: { icon: 'close-circle-outline', title: 'Đơn hàng đã hủy' },
};

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const order = useLoad<Order>(() => api.myOrder(orderId), [orderId], 10000);
  const store = useLoad<Store>(() => api.store());
  return (
    <PhoneFrame>
      <TopBar title={order.data ? `Đơn #${order.data.code}` : 'Đơn hàng'} onBack={() => (router.canGoBack() ? router.back() : router.replace('/orders'))} />
      {order.loading && !order.data ? <Loading /> : order.error && !order.data ? <View style={{ padding: 16 }}><ErrorBox message={order.error} onRetry={order.reload} /></View>
        : order.data ? <Tracking order={order.data} hotline={store.data?.hotline ?? null} onChange={(o) => order.setData(o)} reload={order.reload} /> : null}
    </PhoneFrame>
  );
}

function Tracking({ order, hotline, onChange, reload }: { order: Order; hotline: string | null; onChange: (o: Order) => void; reload: () => Promise<void> }) {
  const toast = useToast();
  const { replace } = useCart();
  const [cancelling, setCancelling] = useState(false);
  const hero = HERO[order.status];
  const cancelled = order.status === 'CANCELLED';
  const steps = OrderService.timeline(order);

  const reorder = async () => {
    try { replace(await api.reorder(order.id)); router.push('/cart'); } catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.hero, { backgroundColor: cancelled ? colors.neutralText : order.status === 'DELIVERED' ? colors.success : colors.primary }]}>
        <View style={styles.heroIcon}><Ionicons name={hero.icon} size={28} color={colors.white} /></View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt weight="extrabold" size={19} color={colors.white}>{hero.title}</Txt>
          <Txt size={14} color={colors.white} style={{ opacity: 0.92 }}>
            {order.estimatedDeliveryAt ? `Dự kiến giao lúc ${time(order.estimatedDeliveryAt)}` : order.paid ? 'Đã thanh toán khi nhận hàng' : `Đặt lúc ${time(order.createdAt)}`}
          </Txt>
        </View>
      </View>

      <Card>
        {steps.map((s, i) => (
          <View key={`${s.status}-${i}`} style={styles.step}>
            <View style={styles.rail}>
              <View style={[styles.dot, s.state === 'done' && styles.dotDone, s.state === 'now' && styles.dotNow, s.state === 'cancel' && styles.dotCancel]}>
                {s.state === 'done' ? <Ionicons name="checkmark" size={14} color={colors.white} /> : s.state === 'cancel' ? <Ionicons name="close" size={14} color={colors.white} /> : null}
              </View>
              {i < steps.length - 1 ? <View style={[styles.railLine, s.state === 'done' && { backgroundColor: colors.success }]} /> : null}
            </View>
            <View style={styles.stepBody}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt weight={s.state === 'todo' ? 'regular' : 'bold'} size={15} color={s.state === 'todo' ? colors.faint : colors.text}>{timelineLabel[s.status]}</Txt>
                {s.note ? <Txt size={13} color={colors.muted}>{s.note}</Txt> : null}
              </View>
              <Txt size={13} color={colors.muted}>{s.at ? time(s.at) : ''}</Txt>
            </View>
          </View>
        ))}
      </Card>

      <Card style={{ gap: 10 }}>
        <View style={styles.rowBetween}>
          <Txt weight="extrabold" size={15}>Chi tiết đơn</Txt>
          <StatusBadge status={order.status} />
        </View>
        {order.items.map((i) => (
          <View key={i.id} style={styles.rowBetween}>
            <Txt size={14} style={{ flex: 1 }}>{i.quantity} × {i.name}{i.note ? <Txt size={13} color={colors.muted}>{`  (${i.note})`}</Txt> : null}</Txt>
            <Txt size={14}>{money(i.lineTotal)}</Txt>
          </View>
        ))}
        <View style={styles.sum}>
          <Line label="Tạm tính" value={money(order.subtotal)} />
          <Line label={`Phí giao · ${order.zoneName}`} value={money(order.deliveryFee)} />
          {order.discount > 0 ? <Line label={`Giảm giá (${order.voucherCode})`} value={`−${money(order.discount)}`} valueColor={colors.success} /> : null}
          <Line label={order.paid ? 'Đã thanh toán (COD)' : 'Thanh toán khi nhận hàng'} value={money(order.total)} strong />
        </View>
        <Txt size={14} color={colors.textSoft} style={{ lineHeight: 20 }}>
          Giao đến: {order.recipientName} · {order.recipientPhone}{'\n'}{order.deliveryStreet}, {order.zoneName}
        </Txt>
        {order.note ? <Txt size={13} color={colors.muted}>Ghi chú: {order.note}</Txt> : null}
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {hotline ? <Button title="Gọi cửa hàng" icon="call-outline" variant="secondary" onPress={() => void Linking.openURL(`tel:${hotline}`)} style={{ flex: 1 }} /> : null}
        {order.cancellable ? <Button title="Hủy đơn" variant="danger" onPress={() => setCancelling(true)} style={{ flex: 1 }} />
          : order.status === 'DELIVERED' || cancelled ? <Button title="Đặt lại" icon="refresh" variant="soft" onPress={reorder} style={{ flex: 1 }} /> : null}
      </View>
      {!order.cancellable && !cancelled && order.status !== 'DELIVERED' ? (
        <Txt size={12} color={colors.muted} style={{ textAlign: 'center' }}>Cửa hàng đã nhận đơn. Gọi hotline nếu bạn cần hủy.</Txt>
      ) : null}

      {order.reviewable ? <Reviews order={order} onDone={reload} /> : null}

      <ReasonDialog visible={cancelling} title="Hủy đơn hàng" onCancel={() => setCancelling(false)}
        suggestions={['Đặt nhầm món', 'Muốn đổi địa chỉ', 'Chờ lâu quá', 'Không còn nhu cầu']}
        onConfirm={async (reason) => {
          try { onChange(await api.cancelOrder(order.id, reason)); setCancelling(false); toast.show('Đã hủy đơn hàng', 'success'); }
          catch (e) { toast.show(errorMessage(e), 'error'); }
        }} />
    </ScrollView>
  );
}

function Reviews({ order, onDone }: { order: Order; onDone: () => Promise<void> }) {
  const pending = order.items.filter((i) => !i.reviewed);
  return (
    <Card style={{ gap: 14 }}>
      <Txt weight="extrabold" size={16}>Đánh giá món ăn</Txt>
      {pending.map((i) => <ReviewItem key={i.id} item={i} onDone={onDone} />)}
    </Card>
  );
}

function ReviewItem({ item, onDone }: { item: OrderItem; onDone: () => Promise<void> }) {
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    try { await api.review(item.id, rating, comment.trim() || null); toast.show('Cảm ơn bạn đã đánh giá!', 'success'); await onDone(); }
    catch (e) { toast.show(errorMessage(e), 'error'); }
    finally { setBusy(false); }
  };
  return (
    <View style={styles.review}>
      <View style={styles.rowGap}>
        <FoodImage uri={item.imageUrl} style={{ width: 44, height: 44 }} />
        <Txt weight="bold" size={14} style={{ flex: 1 }}>{item.name}</Txt>
      </View>
      <Stars value={rating} size={28} onChange={setRating} />
      <TextInput value={comment} onChangeText={setComment} placeholder="Nhận xét (không bắt buộc)" placeholderTextColor={colors.faint}
        style={styles.comment} maxLength={500} accessibilityLabel={`Nhận xét món ${item.name}`} />
      <Button title="Gửi đánh giá" size="sm" onPress={send} loading={busy} disabled={rating === 0} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  hero: { borderRadius: radius.xl, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  step: { flexDirection: 'row', gap: 12 },
  rail: { width: 24, alignItems: 'center' },
  dot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#D6CFC9', backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  dotDone: { backgroundColor: colors.success, borderColor: colors.success },
  dotNow: { borderWidth: 6, borderColor: colors.primary },
  dotCancel: { backgroundColor: colors.danger, borderColor: colors.danger },
  railLine: { flex: 1, width: 2, minHeight: 18, backgroundColor: '#E7E0DA' },
  stepBody: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingBottom: 18 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sum: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 10, gap: 6 },
  review: { gap: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  comment: { height: 46, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, fontFamily: fonts.regular, fontSize: 14, color: colors.text },
});
