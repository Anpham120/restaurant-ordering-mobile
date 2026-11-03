import { useState } from 'react';
import { View } from 'react-native';

import { Page } from '@/components/backoffice';
import { OrderDetailSheet, useConfirmTransfer, useStatusChange } from '@/components/order-ops';
import { OrderTable } from '@/components/order-table';
import { Txt } from '@/components/txt';
import { Card, Chip, Empty, ErrorBox, Field, Loading, SearchBox } from '@/components/ui';
import { api, type Order, type OrderStatus, type Page as P } from '@/lib/api';
import { money, statusLabel, todayIso } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { colors } from '@/lib/theme';

const FILTERS: (OrderStatus | 'ALL')[] = ['ALL', 'AWAITING_PAYMENT', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED'];

/** Order lookup by day, status, code, phone or name (staff "history" and manager "search"). */
export function OrderHistory({ title = 'Lịch sử đơn hàng' }: { title?: string }) {
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState<OrderStatus | 'ALL'>('ALL');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Order | null>(null);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined;
  const list = useLoad<P<Order>>(
    () => api.storeOrders({ date: q.trim() ? undefined : validDate, status: status === 'ALL' ? undefined : [status], q: q.trim() || undefined, size: 100 }),
    [validDate, status, q],
  );
  const replace = (o: Order) => {
    list.setData((d) => (d ? { ...d, content: d.content.map((x) => (x.id === o.id ? o : x)) } : d));
    setOpen(o);
  };
  const { trigger, busy, dialog } = useStatusChange(replace);
  const { confirm } = useConfirmTransfer(() => { setOpen(null); void list.reload(); });
  const orders = list.data?.content ?? [];
  const delivered = orders.filter((o) => o.status === 'DELIVERED');

  return (
    <Page title={title} subtitle={q.trim() ? 'Kết quả tìm kiếm' : `Ngày ${validDate ?? '—'} · ${orders.length} đơn · đã giao ${delivered.length} (${money(delivered.reduce((s, o) => s + o.total, 0))})`}
      actions={<>
        <View style={{ width: 240 }}><SearchBox value={q} onChangeText={setQ} placeholder="Mã đơn, SĐT, tên khách…" accessibilityLabel="Tìm đơn" /></View>
        <View style={{ width: 150 }}><Field value={date} onChangeText={setDate} mask="date" placeholder="yyyy-mm-dd" accessibilityLabel="Ngày" style={{ height: 46 }} /></View>
      </>}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {FILTERS.map((s) => <Chip key={s} label={s === 'ALL' ? 'Tất cả' : statusLabel[s]} active={status === s} onPress={() => setStatus(s)} />)}
      </View>
      {list.error ? <ErrorBox message={list.error} onRetry={list.reload} /> : null}
      <Card>
        {list.loading && !list.data ? <Loading /> : orders.length === 0 ? <Empty title="Không có đơn nào" text="Thử chọn ngày hoặc trạng thái khác." />
          : <OrderTable orders={orders} onOpen={setOpen} />}
      </Card>
      {orders.length >= 100 ? <Txt size={13} color={colors.muted}>Chỉ hiển thị 100 đơn mới nhất, hãy lọc thêm để xem đơn khác.</Txt> : null}
      <OrderDetailSheet order={open} onClose={() => setOpen(null)} onAction={trigger} busy={busy} onConfirmTransfer={(o) => void confirm(o)} />
      {dialog}
    </Page>
  );
}
