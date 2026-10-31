import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Badge } from '@/components/badge';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Chips } from '@/components/chip';
import { Muted, Row, Screen, Title } from '@/components/screen';
import { api, errorMessage, type Order, type OrderItemStatus } from '@/lib/api';
import { itemStatusLabel, money } from '@/lib/format';
import { colors } from '@/lib/theme';
import { usePoll } from '@/lib/use-poll';

type Tab = 'queue' | 'soldout';

export default function Kitchen() {
  const [tab, setTab] = useState<Tab>('queue');
  const [actionError, setActionError] = useState<string | null>(null);
  const queue = usePoll<Order[]>(async () => {
    const lists = await Promise.all((['PENDING', 'CONFIRMED', 'COOKING'] as const).map((s) => api.ordersByStatus(s)));
    return lists.flat().sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, 5000);
  const menu = usePoll(() => api.menu({ includeUnavailable: true }), 10000);

  const run = async (fn: () => Promise<unknown>, after: () => Promise<void>) => {
    setActionError(null);
    try { await fn(); await after(); } catch (e) { setActionError(errorMessage(e)); }
  };
  const setItem = (id: number, s: OrderItemStatus) => run(() => api.setItemStatus(id, s), queue.reload);

  return (
    <Screen error={queue.error ?? menu.error ?? actionError} onRefresh={tab === 'queue' ? queue.reload : menu.reload}>
      <Chips options={[{ value: 'queue' as Tab, label: 'Hàng đợi món' }, { value: 'soldout' as Tab, label: 'Hết món' }]} value={tab} onChange={setTab} />

      {tab === 'queue' ? (
        <>
          {queue.data && queue.data.every((o) => o.items.every((i) => i.status !== 'PENDING' && i.status !== 'COOKING')) ? <Muted>Không có món cần làm.</Muted> : null}
          {queue.data?.map((o) => {
            const items = o.items.filter((i) => i.status === 'PENDING' || i.status === 'COOKING');
            if (items.length === 0) return null;
            return (
              <Card key={o.id}>
                <Title>Bàn {o.tableCode} · #{o.id}</Title>
                {o.note ? <Muted>Ghi chú: {o.note}</Muted> : null}
                {items.map((i) => (
                  <View key={i.id} style={styles.item}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{i.quantity} × {i.name}</Text>
                      {i.note ? <Muted>{i.note}</Muted> : null}
                    </View>
                    <Badge label={itemStatusLabel[i.status]} status={i.status} />
                    <Row>
                      {i.status === 'PENDING' ? <Button small title="Bắt đầu nấu" onPress={() => setItem(i.id, 'COOKING')} /> : null}
                      {i.status === 'COOKING' ? <Button small variant="secondary" title="Xong" onPress={() => setItem(i.id, 'READY')} /> : null}
                    </Row>
                  </View>
                ))}
              </Card>
            );
          })}
        </>
      ) : (
        <>
          <Muted>Bật/tắt trạng thái còn món. Món hết sẽ ẩn khỏi thực đơn của khách.</Muted>
          {menu.data?.map((m) => (
            <Card key={m.id}>
              <Row>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{m.name}</Text>
                  <Muted>{money(m.price)}</Muted>
                </View>
                <Badge label={m.available ? 'Còn món' : 'Hết món'} status={m.available ? 'FREE' : 'CANCELLED'} />
                <Button small variant={m.available ? 'danger' : 'primary'} title={m.available ? 'Báo hết' : 'Có lại'} onPress={() => run(() => api.setAvailability(m.id, !m.available), menu.reload)} />
              </Row>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingVertical: 4 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
});
