import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field } from '@/components/field';
import { Muted, Row, Screen, Title } from '@/components/screen';
import { api, errorMessage, type Order, type Payment, type PaymentMethod, type RequestType } from '@/lib/api';
import { itemStatusLabel, methodLabel, money, orderStatusLabel, paymentStatusLabel, requestTypeLabel } from '@/lib/format';
import { notify } from '@/lib/confirm';
import { useSession } from '@/lib/session';
import { usePoll } from '@/lib/use-poll';
import { colors } from '@/lib/theme';

interface Snapshot { order: Order | null; payments: Payment[] }

export default function MyOrder() {
  const { orderId, tableToken, setOrderId } = useSession();
  const [actionError, setActionError] = useState<string | null>(null);
  const [voucher, setVoucher] = useState('');
  const { data, error, reload } = usePoll<Snapshot>(async () => {
    if (!orderId) return { order: null, payments: [] };
    const [order, payments] = await Promise.all([api.order(orderId), api.orderPayments(orderId)]);
    return { order, payments };
  }, 5000);

  const run = async (fn: () => Promise<unknown>, okMessage?: string) => {
    setActionError(null);
    try {
      await fn();
      if (okMessage) notify(okMessage);
      await reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  };

  const order = orderId ? data?.order ?? null : null;
  if (!orderId || !order) {
    return (
      <Screen error={error ?? actionError} onRefresh={reload}>
        <Muted>Bạn chưa có đơn nào. Hãy gửi order từ giỏ hàng.</Muted>
        {tableToken ? <CallStaff onCall={(t) => run(() => api.callStaff(tableToken, t), 'Đã gọi nhân viên')} /> : null}
      </Screen>
    );
  }

  const closed = order.status === 'COMPLETED' || order.status === 'CANCELLED';
  const payments = data?.payments ?? [];
  const waitingCash = payments.some((p) => p.status === 'PENDING');
  const canPay = !closed && !waitingCash && order.items.some((i) => i.status !== 'CANCELLED');

  return (
    <Screen error={error ?? actionError} onRefresh={reload}>
      <Card>
        <View style={styles.head}>
          <Title>Đơn #{order.id} · Bàn {order.tableCode}</Title>
          <Badge label={orderStatusLabel[order.status]} status={order.status} />
        </View>
        {order.items.map((i) => (
          <View key={i.id} style={styles.line}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{i.quantity} × {i.name}</Text>
              {i.note ? <Muted>{i.note}</Muted> : null}
            </View>
            <Badge label={itemStatusLabel[i.status]} status={i.status} />
          </View>
        ))}
        <View style={styles.sep} />
        <Text style={styles.sum}>Tạm tính: {money(order.subtotal)}</Text>
        {order.discount > 0 ? <Text style={styles.sum}>Giảm giá{order.voucherCode ? ` (${order.voucherCode})` : ''}: −{money(order.discount)}</Text> : null}
        <Text style={styles.total}>Tổng cộng: {money(order.totalAmount)}</Text>
      </Card>

      {!closed ? (
        <Card>
          <Title>Mã giảm giá</Title>
          <Row>
            <View style={{ flex: 1, minWidth: 160 }}>
              <Field value={voucher} onChangeText={setVoucher} autoCapitalize="characters" autoCorrect={false} placeholder="Nhập mã" />
            </View>
            <Button small title="Áp dụng" disabled={!voucher.trim()} onPress={() => run(async () => { await api.addVoucher(order.id, voucher.trim()); setVoucher(''); })} />
          </Row>
        </Card>
      ) : null}

      {tableToken && !closed ? <CallStaff onCall={(t) => run(() => api.callStaff(tableToken, t), 'Đã gọi nhân viên')} /> : null}

      {payments.length > 0 ? (
        <Card>
          <Title>Thanh toán</Title>
          {payments.map((p) => (
            <Row key={p.id}>
              <Text>{methodLabel[p.method]} · {money(p.amount)}</Text>
              <Badge label={paymentStatusLabel[p.status]} status={p.status} />
            </Row>
          ))}
          {waitingCash ? <Muted>Vui lòng đợi nhân viên đến thu tiền mặt.</Muted> : null}
        </Card>
      ) : null}

      {canPay ? <PayCard onPay={(m) => run(() => api.pay(order.id, m))} /> : null}

      {order.status === 'COMPLETED' ? <Reviews order={order} /> : null}

      {closed ? <Button title="Bắt đầu đơn mới" variant="secondary" onPress={() => setOrderId(null)} /> : null}
    </Screen>
  );
}

function CallStaff({ onCall }: { onCall: (t: RequestType) => void }) {
  const types: RequestType[] = ['WATER', 'HELP', 'BILL', 'OTHER'];
  return (
    <Card>
      <Title>Gọi nhân viên</Title>
      <Row>
        {types.map((t) => <Button key={t} small variant="secondary" title={requestTypeLabel[t]} onPress={() => onCall(t)} />)}
      </Row>
    </Card>
  );
}

function PayCard({ onPay }: { onPay: (m: PaymentMethod) => void }) {
  const methods: PaymentMethod[] = ['CASH', 'TRANSFER', 'EWALLET'];
  return (
    <Card>
      <Title>Thanh toán</Title>
      <Muted>Chuyển khoản/ví điện tử được ghi nhận ngay; tiền mặt chờ nhân viên xác nhận.</Muted>
      <Row>
        {methods.map((m) => <Button key={m} small title={methodLabel[m]} onPress={() => onPay(m)} />)}
      </Row>
    </Card>
  );
}

function Reviews({ order }: { order: Order }) {
  const [done, setDone] = useState<Record<number, boolean>>({});
  const [rating, setRating] = useState<Record<number, number>>({});
  const [comment, setComment] = useState<Record<number, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const seen = new Set<number>();
  const items = order.items.filter((i) => i.status !== 'CANCELLED' && !seen.has(i.menuItemId) && !!seen.add(i.menuItemId));

  const submit = async (menuItemId: number) => {
    setErr(null);
    try {
      await api.review({ orderId: order.id, menuItemId, rating: rating[menuItemId] ?? 5, comment: comment[menuItemId]?.trim() || undefined });
      setDone((d) => ({ ...d, [menuItemId]: true }));
    } catch (e) {
      const msg = errorMessage(e);
      if (msg.includes('already reviewed')) setDone((d) => ({ ...d, [menuItemId]: true }));
      else setErr(msg);
    }
  };

  return (
    <Card>
      <Title>Đánh giá món</Title>
      {err ? <Text style={{ color: colors.danger }}>{err}</Text> : null}
      {items.map((i) => (
        <View key={i.menuItemId} style={{ gap: 6 }}>
          <Text style={styles.itemName}>{i.name}</Text>
          {done[i.menuItemId] ? (
            <Muted>Cảm ơn bạn đã đánh giá!</Muted>
          ) : (
            <>
              <Row gap={4}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Button key={n} small variant={(rating[i.menuItemId] ?? 5) >= n ? 'primary' : 'secondary'} title={`${n}★`} onPress={() => setRating((r) => ({ ...r, [i.menuItemId]: n }))} />
                ))}
              </Row>
              <Field value={comment[i.menuItemId] ?? ''} onChangeText={(t) => setComment((c) => ({ ...c, [i.menuItemId]: t }))} placeholder="Nhận xét (không bắt buộc)" maxLength={500} />
              <Button small title="Gửi đánh giá" onPress={() => submit(i.menuItemId)} />
            </>
          )}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { fontSize: 15, fontWeight: '600', color: colors.text },
  sep: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  sum: { color: colors.muted },
  total: { fontSize: 18, fontWeight: '800', color: colors.primary },
});
