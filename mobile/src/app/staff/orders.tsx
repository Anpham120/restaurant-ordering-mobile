import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Muted, Row, Screen, Title } from '@/components/screen';
import { api, errorMessage, OPEN_ORDER_STATUSES, type Order, type OrderStatus, type Payment } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { itemStatusLabel, methodLabel, money, orderStatusLabel } from '@/lib/format';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';
import { usePoll } from '@/lib/use-poll';

interface Row2 { order: Order; pending: Payment[] }

export default function StaffOrders() {
  const { user } = useSession();
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, error, reload } = usePoll<Row2[]>(async () => {
    const lists = await Promise.all(OPEN_ORDER_STATUSES.map((s) => api.ordersByStatus(s)));
    const orders = lists.flat().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return Promise.all(orders.map(async (order) => ({ order, pending: (await api.orderPayments(order.id)).filter((p) => p.status === 'PENDING') })));
  }, 5000);

  const run = async (fn: () => Promise<unknown>, confirmMsg?: string) => {
    if (confirmMsg && !(await confirmAction(confirmMsg))) return;
    setActionError(null);
    try { await fn(); await reload(); } catch (e) { setActionError(errorMessage(e)); }
  };
  const setStatus = (o: Order, s: OrderStatus, msg?: string) => run(() => api.setOrderStatus(o.id, s, user?.id), msg);

  return (
    <Screen error={error ?? actionError} onRefresh={reload}>
      {data && data.length === 0 ? <Muted>Chưa có đơn nào đang mở.</Muted> : null}
      {data?.map(({ order: o, pending }) => (
        <Card key={o.id}>
          <View style={styles.head}>
            <Title>Bàn {o.tableCode} · #{o.id}</Title>
            <Badge label={orderStatusLabel[o.status]} status={o.status} />
          </View>
          {o.note ? <Muted>Ghi chú: {o.note}</Muted> : null}
          {o.items.map((i) => (
            <View key={i.id} style={styles.line}>
              <Text style={styles.item}>{i.quantity} × {i.name}{i.note ? ` (${i.note})` : ''}</Text>
              <Badge label={itemStatusLabel[i.status]} status={i.status} />
            </View>
          ))}
          <Text style={styles.total}>Tổng: {money(o.totalAmount)}{o.voucherCode ? ` (mã ${o.voucherCode})` : ''}</Text>
          <Row>
            {o.status === 'PENDING' ? <Button small title="Xác nhận" onPress={() => setStatus(o, 'CONFIRMED')} /> : null}
            {o.status === 'COOKING' ? <Button small variant="secondary" title="Đã phục vụ" onPress={() => setStatus(o, 'SERVED')} /> : null}
            {o.status === 'PENDING' || o.status === 'CONFIRMED' ? <Button small variant="danger" title="Hủy đơn" onPress={() => setStatus(o, 'CANCELLED', `Hủy đơn #${o.id}?`)} /> : null}
          </Row>
          {pending.map((p) => (
            <Row key={p.id}>
              <Text style={styles.item}>{methodLabel[p.method]} chờ thu: {money(p.amount)}</Text>
              <Button small title="Đã thu tiền" onPress={() => run(() => api.confirmPayment(p.id))} />
              <Button small variant="ghost" title="Thất bại" onPress={() => run(() => api.failPayment(p.id), 'Đánh dấu thanh toán thất bại?')} />
            </Row>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  item: { flex: 1, color: colors.text },
  total: { fontWeight: '700', color: colors.primary },
});
