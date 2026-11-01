import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Page } from '@/components/backoffice';
import { AwaitingCard, OrderCard, OrderDetailSheet, useConfirmTransfer, useStatusChange } from '@/components/order-ops';
import { Txt } from '@/components/txt';
import { Chip, ErrorBox, Loading, SearchBox, Toggle } from '@/components/ui';
import { api, errorMessage, type Order, type OrderStatus, type Page as P, type Store } from '@/lib/api';
import { useLoad, useNow, useWide } from '@/lib/hooks';
import { colors } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const COLUMNS: { title: string; statuses: OrderStatus[]; dot: string }[] = [
  { title: 'Chờ xác nhận', statuses: ['PENDING'], dot: colors.primary },
  { title: 'Đang chuẩn bị', statuses: ['CONFIRMED', 'PREPARING'], dot: colors.warning },
  { title: 'Chờ giao', statuses: ['READY'], dot: colors.info },
  { title: 'Đang giao', statuses: ['DELIVERING'], dot: colors.success },
];
const ACTIVE: OrderStatus[] = ['AWAITING_PAYMENT', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING'];

export default function OrderBoard() {
  const now = useNow(15000);
  const wide = useWide(1100);
  const toast = useToast();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Order | null>(null);
  const board = useLoad<P<Order>>(() => api.storeOrders({ status: ACTIVE, sort: 'oldest', size: 100 }), [], 5000);
  const store = useLoad<Store>(() => api.storeInfo(), [], 30000);

  const replace = (o: Order) => {
    board.setData((d) => (d ? { ...d, content: d.content.map((x) => (x.id === o.id ? o : x)).filter((x) => ACTIVE.includes(x.status)) } : d));
    if (open?.id === o.id) setOpen(o);
  };
  const { trigger, busy, dialog } = useStatusChange(replace);
  const [showAwaiting, setShowAwaiting] = useState(true);
  const { confirm, busyId } = useConfirmTransfer(() => { void board.reload(); setOpen(null); });

  const orders = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (board.data?.content ?? []).filter((o) => !needle || o.code.toLowerCase().includes(needle)
      || o.recipientPhone.includes(needle) || o.recipientName.toLowerCase().includes(needle));
  }, [board.data, q]);

  const awaiting = orders.filter((o) => o.status === 'AWAITING_PAYMENT');
  const working = orders.filter((o) => o.status !== 'AWAITING_PAYMENT');

  const toggle = async (v: boolean) => {
    try { store.setData(await api.setAccepting(v)); toast.show(v ? 'Đã mở nhận đơn' : 'Đã tạm ngưng nhận đơn', 'success'); }
    catch (e) { toast.show(errorMessage(e), 'error'); }
  };

  return (
    <Page title="Đơn hàng đang xử lý" subtitle={`${working.length} đơn · tự cập nhật mỗi 5 giây`} scroll={false}
      actions={<>
        <View style={{ width: 230 }}><SearchBox value={q} onChangeText={setQ} placeholder="Tìm mã đơn, SĐT…" accessibilityLabel="Tìm đơn" /></View>
        {store.data ? (
          <View style={[styles.accept, { backgroundColor: store.data.acceptingOrders ? colors.successSoft : colors.dangerSoft }]}>
            <Toggle value={store.data.acceptingOrders} onChange={(v) => void toggle(v)} label="Đang nhận đơn" />
            <Txt weight="bold" size={14} color={store.data.acceptingOrders ? colors.success : colors.danger}>
              {store.data.acceptingOrders ? 'Đang nhận đơn' : 'Tạm ngưng nhận đơn'}
            </Txt>
          </View>
        ) : null}
      </>}>
      {board.error ? <ErrorBox message={board.error} onRetry={board.reload} /> : null}
      {awaiting.length ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Chip label={`Chờ chuyển khoản · ${awaiting.length}`} icon="qr-code-outline" active={showAwaiting} onPress={() => setShowAwaiting(!showAwaiting)} />
            <Txt size={13} color={colors.muted}>Đơn sẽ tự vào cột “Chờ xác nhận” khi ngân hàng báo có</Txt>
          </View>
          {showAwaiting ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingBottom: 4 }}>
              {awaiting.map((o) => <AwaitingCard key={o.id} order={o} now={now} busy={busyId === o.id} onConfirm={() => void confirm(o)} onOpen={() => setOpen(o)} />)}
            </ScrollView>
          ) : null}
        </View>
      ) : null}
      {board.loading && !board.data ? <Loading /> : (
        <ScrollView horizontal={!wide} style={{ flex: 1 }} contentContainerStyle={wide ? styles.grid : styles.rowScroll}>
          {COLUMNS.map((c) => {
            const list = working.filter((o) => c.statuses.includes(o.status));
            return (
              <View key={c.title} style={[styles.column, wide ? { flex: 1 } : { width: 290 }]}>
                <View style={styles.colHead}>
                  <View style={[styles.dot, { backgroundColor: c.dot }]} />
                  <Txt weight="extrabold" size={15} style={{ flex: 1 }}>{c.title}</Txt>
                  <Txt weight="bold" size={13} color={colors.neutralText}>{list.length}</Txt>
                </View>
                <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 12 }}>
                  {list.length === 0 ? <Txt size={13} color={colors.muted} style={{ textAlign: 'center', paddingVertical: 20 }}>Không có đơn</Txt> : null}
                  {list.map((o) => <OrderCard key={o.id} order={o} now={now} busy={busy} onAction={(a) => trigger(o, a)} onOpen={() => setOpen(o)} />)}
                </ScrollView>
              </View>
            );
          })}
        </ScrollView>
      )}
      <OrderDetailSheet order={open} onClose={() => setOpen(null)} onAction={trigger} busy={busy} onConfirmTransfer={(o) => void confirm(o)} />
      {dialog}
    </Page>
  );
}

const styles = StyleSheet.create({
  accept: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 12, borderRadius: 10 },
  grid: { flexDirection: 'row', gap: 14, flex: 1, alignItems: 'stretch' },
  rowScroll: { gap: 14, paddingBottom: 8 },
  column: { backgroundColor: '#EFEAE6', borderRadius: 14, padding: 12, gap: 10 },
  colHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
