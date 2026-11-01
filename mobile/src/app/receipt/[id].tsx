import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { Platform, ScrollView, Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { PhoneFrame, TopBar } from '@/components/phone';
import { Txt } from '@/components/txt';
import { Empty, ErrorBox, Loading } from '@/components/ui';
import { api, type Order, type Store } from '@/lib/api';
import { fullDateTime, km, money, optionText, paymentChip, statusLabel } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { OrderService } from '@/lib/order-flow';
import { colors, radius } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' });
const PAPER_ID = 'atlas-receipt';

/** E-receipt of a delivered (or already paid by transfer) order, laid out like a printed till slip. */
export default function ReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const order = useLoad<Order>(() => api.myOrder(orderId), [orderId]);
  const store = useLoad<Store>(() => api.store());
  usePrintStyles();

  const error = order.error ?? store.error;
  return (
    <PhoneFrame>
      <TopBar title="Biên nhận" onBack={() => (router.canGoBack() ? router.back() : router.replace(`/order/${orderId}`))} />
      {(order.loading && !order.data) || (store.loading && !store.data) ? <Loading />
        : error && (!order.data || !store.data) ? <View style={{ padding: 16 }}><ErrorBox message={error} onRetry={() => { void order.reload(); void store.reload(); }} /></View>
        : order.data && store.data ? (
          OrderService.hasReceipt(order.data) ? <Receipt order={order.data} store={store.data} />
            : <Empty icon="receipt-outline" title="Chưa có biên nhận" text="Biên nhận được tạo khi đơn đã giao thành công hoặc khi bạn đã chuyển khoản."
                action={<Button title="Xem đơn hàng" variant="secondary" onPress={() => router.replace(`/order/${orderId}`)} />} />
        ) : null}
    </PhoneFrame>
  );
}

function Receipt({ order, store }: { order: Order; store: Store }) {
  const toast = useToast();
  const p = order.payment;
  const transfer = p?.method === 'BANK_TRANSFER';
  const confirmedBy = p?.confirmedByName ?? (transfer && p?.paidAt ? 'Ngân hàng xác nhận' : null);
  const payRows: [string, string][] = [
    ['Phương thức', transfer ? 'Chuyển khoản VietQR' : 'Tiền mặt khi nhận hàng'],
    ['Thanh toán', paymentChip(p).label],
    ...(p?.paidAt ? [['Thời gian TT', fullDateTime(p.paidAt)] as [string, string]] : []),
    ...(confirmedBy ? [['Xác nhận bởi', confirmedBy] as [string, string]] : []),
    ...(transfer && p?.transferContent ? [['Nội dung CK', p.transferContent] as [string, string]] : []),
    ['Trạng thái đơn', statusLabel[order.status]],
  ];

  const share = async () => {
    try { await Share.share({ title: `Biên nhận #${order.code}`, message: receiptText(order, store, payRows) }); }
    catch { toast.show('Không chia sẻ được biên nhận', 'error'); }
  };
  const canWebShare = Platform.OS === 'web' && typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View nativeID={PAPER_ID} style={styles.paper}>
        <View style={styles.center}>
          <Txt weight="extrabold" size={20} style={{ letterSpacing: 0.5 }}>{store.storeName.toUpperCase()}</Txt>
          <Txt size={12} color={colors.textSoft} style={{ textAlign: 'center' }}>{store.storeAddress}</Txt>
          <Txt size={12} color={colors.textSoft}>Hotline: <Mono size={12}>{store.hotline}</Mono></Txt>
        </View>
        <Dash />
        <View style={styles.center}>
          <Txt weight="extrabold" size={15} style={{ letterSpacing: 2 }}>BIÊN NHẬN ĐIỆN TỬ</Txt>
          <Mono size={13} color={colors.textSoft}>#{order.code}</Mono>
        </View>
        <Dash />
        <Row label="Thời gian đặt" value={fullDateTime(order.createdAt)} mono />
        <Row label="Người nhận" value={`${order.recipientName} · ${order.recipientPhone}`} />
        <Row label="Giao đến" value={order.deliveryStreet} />
        {order.note ? <Row label="Ghi chú" value={order.note} /> : null}
        <Dash />
        {order.items.map((i) => (
          <View key={i.id} style={{ gap: 2 }}>
            <View style={styles.row}>
              <Txt size={14} weight="semibold" style={{ flex: 1 }}>{i.name}</Txt>
              <Mono size={14}>{money(i.lineTotal)}</Mono>
            </View>
            <Mono size={12} color={colors.muted}>  {i.quantity} x {money(i.unitPrice)}</Mono>
            {i.options.length ? <Txt size={12} color={colors.muted} style={{ paddingLeft: 10 }}>+ {optionText(i.options)}</Txt> : null}
            {i.note ? <Txt size={12} color={colors.muted} style={{ paddingLeft: 10, fontStyle: 'italic' }}>“{i.note}”</Txt> : null}
          </View>
        ))}
        <Dash />
        <Row label={`Tạm tính (${order.itemCount} món)`} value={money(order.subtotal)} mono />
        <Row label={`Phí giao hàng · ${km(order.distanceKm)}`} value={money(order.deliveryFee)} mono />
        {order.discount > 0 ? <Row label={`Giảm giá${order.voucherCode ? ` (${order.voucherCode})` : ''}`} value={`-${money(order.discount)}`} mono /> : null}
        <View style={styles.double} />
        <View style={styles.row}>
          <Txt weight="extrabold" size={16}>TỔNG CỘNG</Txt>
          <Mono size={19} weight="bold">{money(order.total)}</Mono>
        </View>
        <Dash />
        {payRows.map(([l, v]) => <Row key={l} label={l} value={v} mono={l === 'Thời gian TT' || l === 'Nội dung CK'} />)}
        <Dash />
        <View style={styles.center}>
          <Txt weight="bold" size={13}>Cảm ơn quý khách – hẹn gặp lại!</Txt>
          <Txt size={11} color={colors.muted}>Biên nhận điện tử, không thay thế hóa đơn GTGT.</Txt>
        </View>
      </View>

      <View nativeID="atlas-receipt-actions" style={{ flexDirection: 'row', gap: 10 }}>
        {Platform.OS === 'web' ? <Button title="In" icon="print-outline" onPress={() => window.print()} style={{ flex: 1 }} /> : null}
        {Platform.OS !== 'web' || canWebShare ? <Button title="Chia sẻ" icon="share-social-outline" variant={Platform.OS === 'web' ? 'secondary' : 'primary'} onPress={share} style={{ flex: 1 }} /> : null}
      </View>
    </ScrollView>
  );
}

function Mono({ children, size = 14, color = colors.text, weight }: { children: ReactNode; size?: number; color?: string; weight?: 'bold' }) {
  return <Txt size={size} color={color} style={{ fontFamily: MONO, fontWeight: weight === 'bold' ? '700' : '400', fontVariant: ['tabular-nums'] }}>{children}</Txt>;
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Txt size={13} color={colors.muted}>{label}</Txt>
      {mono ? <Mono size={13}>{value}</Mono> : <Txt size={13} weight="semibold" style={{ flexShrink: 1, textAlign: 'right' }}>{value}</Txt>}
    </View>
  );
}

function Dash() {
  return <View style={styles.dash} />;
}

/** Plain-text version for the share sheet (chat apps keep the columns readable). */
function receiptText(order: Order, store: Store, payRows: [string, string][]): string {
  const line = '------------------------------';
  const items = order.items.flatMap((i) => [
    `${i.quantity} x ${i.name}  ${money(i.lineTotal)}`,
    ...(i.options.length ? [`   + ${optionText(i.options)}`] : []),
  ]);
  return [
    store.storeName.toUpperCase(), store.storeAddress, `Hotline: ${store.hotline}`, line,
    `BIÊN NHẬN #${order.code}`, `Đặt lúc: ${fullDateTime(order.createdAt)}`,
    `Giao đến: ${order.recipientName} · ${order.deliveryStreet}`, line,
    ...items, line,
    `Tạm tính: ${money(order.subtotal)}`, `Phí giao: ${money(order.deliveryFee)}`,
    ...(order.discount > 0 ? [`Giảm giá${order.voucherCode ? ` (${order.voucherCode})` : ''}: -${money(order.discount)}`] : []),
    `TỔNG CỘNG: ${money(order.total)}`, line,
    ...payRows.map(([l, v]) => `${l}: ${v}`),
  ].join('\n');
}

/** On web, printing shows only the receipt paper. */
function usePrintStyles() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const el = document.createElement('style');
    el.textContent = `@media print {
      @page { margin: 12mm; }
      body * { visibility: hidden !important; }
      #${PAPER_ID}, #${PAPER_ID} * { visibility: visible !important; }
      #${PAPER_ID} { position: fixed !important; left: 0; top: 0; width: 100% !important; border: none !important; box-shadow: none !important; }
    }`;
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, []);
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  paper: {
    backgroundColor: colors.white, borderRadius: radius.sm, paddingHorizontal: 18, paddingVertical: 20, gap: 10,
    borderWidth: 1, borderColor: colors.border,
    ...Platform.select({
      web: { boxShadow: '0 2px 10px rgba(28,25,23,0.08)' },
      default: { shadowColor: '#1C1917', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
    }),
  },
  center: { alignItems: 'center', gap: 3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  dash: { borderBottomWidth: 1.5, borderStyle: 'dashed', borderColor: '#BDB4AD', marginVertical: 2 },
  double: { height: 5, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.text, marginTop: 2 },
});
