import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { DeliveryProofPhoto } from '@/components/delivery-proof';
import { ReasonDialog } from '@/components/modal';
import { PhoneFrame, TopBar } from '@/components/phone';
import { Txt } from '@/components/txt';
import { Card, ErrorBox, Field, Line, Loading, StatusBadge } from '@/components/ui';
import { api, errorMessage, type Order } from '@/lib/api';
import { CameraDenied, takeDeliveryPhoto, type Photo } from '@/lib/camera';
import { dateTime, km, money, optionText } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { OrderService } from '@/lib/order-flow';
import { colors, radius } from '@/lib/theme';
import { useToast } from '@/lib/toast';

export default function ShipperOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const order = useLoad<Order>(() => api.shipperOrder(orderId), [orderId], 10000);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/shipper'));
  return (
    <PhoneFrame>
      <TopBar title={order.data ? `Đơn #${order.data.code.slice(-4)}` : 'Đơn hàng'} onBack={back} />
      {order.loading && !order.data ? <Loading /> : order.error && !order.data ? <View style={{ padding: 16 }}><ErrorBox message={order.error} onRetry={order.reload} /></View>
        : order.data ? <Trip order={order.data} onChange={(o) => order.setData(o)} /> : null}
    </PhoneFrame>
  );
}

function Trip({ order: o, onChange }: { order: Order; onChange: (o: Order) => void }) {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'claim' | 'camera' | 'deliver' | null>(null);
  const [failing, setFailing] = useState(false);
  const cash = OrderService.cashToCollect(o);
  const call = () => void Linking.openURL(`tel:${o.recipientPhone}`);
  const map = () => void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.deliveryStreet)}`);

  const claim = async () => {
    setBusy('claim');
    try { onChange(await api.claimOrder(o.id)); toast.show('Đã nhận đơn, khách đã được báo shipper đang giao', 'success'); }
    catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(null); }
  };

  const shoot = async () => {
    setBusy('camera');
    try { const p = await takeDeliveryPhoto(); if (p) setPhoto(p); }
    catch (e) { toast.show(e instanceof CameraDenied ? e.message : errorMessage(e), 'error'); } finally { setBusy(null); }
  };

  const deliver = async () => {
    if (!photo) return;
    setBusy('deliver');
    try {
      onChange(await api.confirmDelivered(o.id, photo.base64, note.trim() || null));
      setPhoto(null);
      toast.show('Đã xác nhận giao thành công, cửa hàng đã nhận thông báo', 'success');
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusy(null); }
  };

  const fail = async (reason: string) => {
    try {
      onChange(await api.reportFailed(o.id, reason));
      setFailing(false);
      toast.show('Đã báo giao thất bại cho cửa hàng', 'info');
    } catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  return (
    <>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.rowBetween}>
          <StatusBadge status={o.status} />
          <Txt size={13} color={colors.muted}>Đặt lúc {dateTime(o.createdAt)}</Txt>
        </View>

        {o.status === 'DELIVERING' || o.status === 'READY' ? (
          <View style={[styles.cash, cash ? null : { backgroundColor: colors.successSoft }]}>
            <Ionicons name={cash ? 'cash-outline' : 'checkmark-circle'} size={26} color={cash ? colors.warningText : colors.success} />
            <View style={{ flex: 1 }}>
              <Txt size={13} color={cash ? colors.warningText : colors.success}>{cash ? 'Thu tiền mặt khi giao' : 'Khách đã chuyển khoản'}</Txt>
              <Txt weight="extrabold" size={22} color={cash ? colors.warningText : colors.success}>{cash ? money(cash) : 'Không thu tiền'}</Txt>
            </View>
          </View>
        ) : null}

        <Card style={{ gap: 12 }}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Txt size={12} color={colors.muted}>Người nhận</Txt>
              <Txt weight="bold" size={16}>{o.recipientName}</Txt>
              <Txt size={14} color={colors.textSoft}>{o.recipientPhone}</Txt>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Gọi ${o.recipientName}`} onPress={call} style={styles.round}>
              <Ionicons name="call" size={20} color={colors.white} />
            </Pressable>
          </View>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Txt size={12} color={colors.muted}>Địa chỉ · {km(o.distanceKm)}</Txt>
              <Txt weight="semibold" size={15} style={{ lineHeight: 21 }}>{o.deliveryStreet}</Txt>
              {o.deliveryNote ? <Txt size={13} color={colors.warningText}>Ghi chú giao: {o.deliveryNote}</Txt> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Mở bản đồ" onPress={map} style={[styles.round, { backgroundColor: colors.info }]}>
              <Ionicons name="navigate" size={20} color={colors.white} />
            </Pressable>
          </View>
        </Card>

        <Card style={{ gap: 8 }}>
          <Txt weight="extrabold" size={15}>{o.itemCount} món</Txt>
          {o.items.map((i) => (
            <View key={i.id}>
              <Txt size={14}>{i.quantity} × {i.name}</Txt>
              {i.options.length || i.note ? <Txt size={13} color={colors.muted}>{[optionText(i.options), i.note].filter(Boolean).join(' · ')}</Txt> : null}
            </View>
          ))}
          {o.note ? <Txt size={13} color={colors.warningText}>Ghi chú đơn: {o.note}</Txt> : null}
          <View style={styles.sum}><Line label="Tổng đơn" value={money(o.total)} strong /></View>
        </Card>

        {o.status === 'DELIVERING' ? (
          <Card style={{ gap: 12 }}>
            <Txt weight="extrabold" size={15}>Xác nhận giao hàng</Txt>
            <Txt size={13} color={colors.muted} style={{ lineHeight: 19 }}>
              Chụp ảnh lúc trao hàng (món ăn trong tay khách, hoặc đặt tại cửa/quầy lễ tân). Ảnh được gửi cho cửa hàng và khách làm bằng chứng.
            </Txt>
            {photo ? (
              <>
                <Image source={{ uri: photo.uri }} style={styles.preview} contentFit="cover" accessibilityLabel="Ảnh vừa chụp" />
                <Field label="Ghi chú (không bắt buộc)" value={note} onChangeText={setNote} placeholder="VD: Gửi bảo vệ tòa nhà" maxLength={300} />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Button title="Chụp lại" icon="camera-reverse-outline" variant="secondary" onPress={() => void shoot()} loading={busy === 'camera'} style={{ flex: 1 }} />
                  <Button title="Xác nhận đã giao" icon="checkmark-done" variant="success" onPress={() => void deliver()} loading={busy === 'deliver'} style={{ flex: 1.4 }} />
                </View>
              </>
            ) : (
              <Button title="Chụp ảnh giao hàng" icon="camera" size="lg" onPress={() => void shoot()} loading={busy === 'camera'} />
            )}
            <Button title="Giao thất bại" variant="danger" onPress={() => setFailing(true)} />
          </Card>
        ) : null}

        {o.status === 'READY' ? (
          <Button title="Nhận đơn đi giao" icon="bicycle" size="lg" onPress={() => void claim()} loading={busy === 'claim'} />
        ) : null}

        {o.status === 'DELIVERED' && o.deliveryProof ? (
          <Card><DeliveryProofPhoto orderId={o.id} load={api.shipperDeliveryProof} /></Card>
        ) : null}
        {o.status === 'CANCELLED' ? (
          <Card style={{ gap: 4 }}>
            <Txt weight="bold" size={15} color={colors.danger}>Giao thất bại</Txt>
            <Txt size={14} color={colors.textSoft}>{o.timeline[o.timeline.length - 1]?.note ?? ''}</Txt>
          </Card>
        ) : null}
      </ScrollView>
      <ReasonDialog visible={failing} title="Báo giao thất bại" confirmLabel="Báo cửa hàng" onCancel={() => setFailing(false)}
        placeholder="Lý do không giao được"
        suggestions={['Khách không nghe máy', 'Sai địa chỉ', 'Khách từ chối nhận', 'Khách hẹn lại hôm khác']}
        onConfirm={fail} />
    </>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  cash: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.warningSoft },
  round: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  sum: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8 },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.input },
});
