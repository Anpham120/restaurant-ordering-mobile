import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { BankAppGrid } from '@/components/bank-apps';
import { Button } from '@/components/button';
import { ReasonDialog } from '@/components/modal';
import { PhoneFrame, TopBar } from '@/components/phone';
import { Txt } from '@/components/txt';
import { Card, Empty, ErrorBox, Loading } from '@/components/ui';
import { api, errorMessage, type Order } from '@/lib/api';
import { bankName, countdown, money } from '@/lib/format';
import { confirmAction } from '@/lib/confirm';
import { useLoad, useNow, useWide } from '@/lib/hooks';
import { colors, radius } from '@/lib/theme';
import { useToast } from '@/lib/toast';

/**
 * Bank transfer by VietQR: the order moves on by itself when SePay reports the money (polled every 3 s).
 * On a phone the customer cannot scan their own screen, so banking-app deeplinks come first; on a computer the QR does.
 */
export default function PayScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const order = useLoad<Order>(() => api.myOrder(orderId), [orderId], 3000);
  return (
    <PhoneFrame>
      <TopBar title={order.data ? `Thanh toán đơn #${order.data.code}` : 'Thanh toán'} onBack={() => router.replace(`/order/${orderId}`)} />
      {order.loading && !order.data ? <Loading /> : order.error && !order.data ? <View style={{ padding: 16 }}><ErrorBox message={order.error} onRetry={order.reload} /></View>
        : order.data ? <Pay order={order.data} onChange={order.setData} /> : null}
    </PhoneFrame>
  );
}

function Pay({ order, onChange }: { order: Order; onChange: (o: Order) => void }) {
  const toast = useToast();
  const now = useNow(1000);
  const desktop = useWide(768) && Platform.OS === 'web';
  const [cancelling, setCancelling] = useState(false);
  const [switching, setSwitching] = useState(false);
  const left = useRef(false);
  const p = order.payment;

  // paid (webhook or staff) or switched to COD → tracking screen
  useEffect(() => {
    if (left.current || order.status === 'AWAITING_PAYMENT' || order.status === 'CANCELLED') return;
    left.current = true;
    if (order.payment?.method === 'BANK_TRANSFER') toast.show('Đã nhận thanh toán! Cửa hàng đang xác nhận đơn.', 'success');
    router.replace(`/order/${order.id}`);
  }, [order.status, order.id, order.payment?.method, toast]);

  if (order.status === 'CANCELLED') {
    return (
      <Empty icon="time-outline" title="Đơn đã hủy" text={order.timeline[order.timeline.length - 1]?.note ?? 'Đơn chưa được thanh toán trong thời hạn.'}
        action={<View style={{ gap: 10, width: 240 }}>
          <Button title="Xem đơn hàng" variant="secondary" onPress={() => router.replace(`/order/${order.id}`)} />
          <Button title="Về trang chủ" onPress={() => router.replace('/')} />
        </View>} />
    );
  }
  if (!p || p.method !== 'BANK_TRANSFER' || !p.qrUrl) return <Loading label="Đang chờ cập nhật…" />;

  const copy = async (label: string, value: string) => {
    await Clipboard.setStringAsync(value);
    toast.show(`Đã sao chép ${label.toLowerCase()}`, 'success');
  };
  const rows: { label: string; value: string; copy?: string; strong?: boolean }[] = [
    { label: 'Ngân hàng', value: bankName(p.bankCode) },
    { label: 'Số tài khoản', value: p.bankAccount ?? '', copy: p.bankAccount ?? '' },
    { label: 'Chủ tài khoản', value: p.bankHolder ?? '' },
    { label: 'Số tiền', value: money(p.amount), copy: String(Math.round(p.amount)), strong: true },
    { label: 'Nội dung', value: p.transferContent ?? '', copy: p.transferContent ?? '', strong: true },
  ];
  const remaining = countdown(p.expiresAt, now);
  const toCod = async () => {
    if (!(await confirmAction('Đổi sang trả tiền mặt khi nhận hàng? Đơn sẽ được gửi tới cửa hàng ngay, bạn trả tiền cho nhân viên giao hàng.', 'Đổi sang tiền mặt'))) return;
    setSwitching(true);
    try {
      left.current = true;
      await api.switchPaymentMethod(order.id, 'COD');
      toast.show('Đã đổi sang trả tiền mặt khi nhận hàng', 'success');
      router.replace(`/order/${order.id}`);
    } catch (e) { left.current = false; toast.show(errorMessage(e), 'error'); }
    finally { setSwitching(false); }
  };

  const apps = p.bankApps.length ? (
    <Card key="apps" style={{ gap: 12 }}>
      <View style={{ gap: 2 }}>
        <Txt weight="extrabold" size={desktop ? 15 : 17}>{desktop ? 'Đang dùng điện thoại?' : 'Mở app ngân hàng để thanh toán'}</Txt>
        <Txt size={13} color={colors.muted} style={{ lineHeight: 19 }}>
          {'Ứng dụng có nhãn "Điền sẵn" (MB, VietinBank, BIDV, ACB, OCB) tự điền số tài khoản, số tiền và nội dung. Với ngân hàng khác, nội dung chuyển khoản được sao chép sẵn để bạn dán.'}
        </Txt>
      </View>
      <BankAppGrid apps={p.bankApps} content={p.transferContent} />
    </Card>
  ) : null;

  const qr = (
    <Card key="qr" style={styles.qrCard}>
      {!desktop ? <Txt weight="extrabold" size={15} style={{ alignSelf: 'flex-start' }}>Hoặc quét mã từ thiết bị khác</Txt> : null}
      <Image source={{ uri: p.qrUrl }} style={desktop ? styles.qr : styles.qrSmall} contentFit="contain" accessibilityLabel={`Mã VietQR chuyển khoản ${money(p.amount)}`} />
      <Txt size={13} color={colors.muted} style={{ textAlign: 'center', lineHeight: 19 }}>
        Mở app ngân hàng bất kỳ, chọn <Txt weight="bold" size={13}>Quét mã QR</Txt>.{'\n'}Số tiền và nội dung đã được điền sẵn.
      </Txt>
      <Button title="Lưu ảnh QR" icon="download-outline" variant="secondary" size="sm" onPress={() => void Linking.openURL(p.qrUrl!)} />
    </Card>
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <View style={styles.timer}>
          <Ionicons name="time-outline" size={15} color={colors.warning} />
          <Txt weight="bold" size={13} color={colors.warningText}>{remaining === '00:00' ? 'Hết hạn thanh toán' : `Còn ${remaining} để thanh toán`}</Txt>
        </View>
        <Txt weight="extrabold" size={26} color={colors.primary}>{money(p.amount)}</Txt>
      </View>

      {desktop ? [qr, apps] : [apps, qr]}

      <Card padded={false} style={{ paddingHorizontal: 14, paddingVertical: 4 }}>
        {rows.map((r, i) => (
          <View key={r.label} style={[styles.row, i < rows.length - 1 && styles.rowLine]}>
            <Txt size={13} color={colors.muted}>{r.label}</Txt>
            <View style={styles.rowValue}>
              <Txt weight={r.strong ? 'extrabold' : 'bold'} size={r.strong ? 16 : 14} color={r.strong ? colors.primary : colors.text}>{r.value}</Txt>
              {r.copy ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Sao chép ${r.label.toLowerCase()}`} onPress={() => void copy(r.label, r.copy!)} style={styles.copy}>
                  <Ionicons name="copy-outline" size={15} color={colors.primary} />
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}
      </Card>

      <View style={styles.wait}>
        <View style={styles.pulse} />
        <Txt size={13} color="#14532D" style={{ flex: 1, lineHeight: 19 }}>
          Đang chờ ngân hàng báo có. Đơn sẽ <Txt weight="bold" size={13} color="#14532D">tự xác nhận</Txt> trong vài giây sau khi bạn chuyển – không cần chụp màn hình.
        </Txt>
      </View>
      <Txt size={12} color={colors.muted} style={{ textAlign: 'center' }}>Vui lòng giữ đúng nội dung chuyển khoản {p.transferContent} để hệ thống nhận diện đơn.</Txt>

      {p.canSwitchToCod ? (
        <Button title="Đổi sang trả tiền mặt khi nhận hàng" icon="cash-outline" variant="secondary" onPress={toCod} loading={switching} />
      ) : null}
      <Pressable accessibilityRole="button" onPress={() => setCancelling(true)} style={styles.cancel} hitSlop={6}>
        <Txt weight="semibold" size={14} color={colors.danger}>Hủy đơn hàng</Txt>
      </Pressable>

      <ReasonDialog visible={cancelling} title="Hủy đơn hàng" onCancel={() => setCancelling(false)}
        suggestions={['Đặt nhầm món', 'Không còn nhu cầu', 'Muốn đổi địa chỉ']}
        onConfirm={async (reason) => {
          try { onChange(await api.cancelOrder(order.id, reason)); setCancelling(false); toast.show('Đã hủy đơn hàng', 'success'); }
          catch (e) { toast.show(errorMessage(e), 'error'); }
        }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  head: { alignItems: 'center', gap: 6, paddingVertical: 4 },
  qrCard: { alignItems: 'center', gap: 10 },
  qrSmall: { width: 180, height: 180 },
  cancel: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.warningSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill },
  qr: { width: 236, height: 236 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 46, gap: 10 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  rowValue: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  copy: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  wait: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.successSoft, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 12 },
  pulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success, borderWidth: 3, borderColor: 'rgba(21,128,61,0.25)' },
});
