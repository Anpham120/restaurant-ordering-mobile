import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { api, errorMessage, type Order } from '@/lib/api';
import { countdown, dateTime, km, minutesSince, money, optionText, paymentChip, statusLabel, time } from '@/lib/format';
import { OrderService, type Action } from '@/lib/order-flow';
import { useSession } from '@/lib/session';
import { colors, radius, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { Button } from './button';
import { DeliveryProofPhoto, ShipperLine } from './delivery-proof';
import { ReasonDialog, Sheet } from './modal';
import { Txt } from './txt';
import { Badge, Line, StatusBadge } from './ui';

/** Runs a status change, asking for a reason when the action needs one. Renders the reason dialog. */
export function useStatusChange(onChanged: (o: Order) => void) {
  const toast = useToast();
  const [pending, setPending] = useState<{ order: Order; action: Action } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (order: Order, action: Action, note?: string) => {
    setBusy(`${order.id}:${action.to}`);
    try {
      const o = await api.setStatus(order.id, action.to, note ?? null);
      onChanged(o);
      toast.show(`#${o.code}: ${statusLabel[o.status]}`, 'success');
      setPending(null);
    } catch (e) {
      toast.show(errorMessage(e), 'error');
    } finally {
      setBusy(null);
    }
  };

  const trigger = (order: Order, action: Action) => {
    if (action.needsReason) setPending({ order, action });
    else void run(order, action);
  };

  const dialog = (
    <ReasonDialog visible={!!pending} title={pending ? `${pending.action.reasonTitle} #${pending.order.code}` : ''}
      onCancel={() => setPending(null)}
      suggestions={pending?.action.label === 'Giao thất bại'
        ? ['Khách không nghe máy', 'Sai địa chỉ', 'Khách từ chối nhận']
        : ['Hết nguyên liệu', 'Ngoài phạm vi giao', 'Khách yêu cầu hủy', 'Đơn nghi giả mạo']}
      onConfirm={(reason) => (pending ? run(pending.order, pending.action, reason) : undefined)} />
  );
  return { trigger, busy, dialog };
}

/** Kanban card for the staff order board. */
export function OrderCard({ order, now, onAction, busy, onOpen }: {
  order: Order; now: number; onAction: (a: Action) => void; busy: string | null; onOpen: () => void;
}) {
  const { user } = useSession();
  const mins = minutesSince(order.createdAt, now);
  const late = order.status === 'PENDING' ? mins >= 5 : mins >= 45;
  const actions = OrderService.actions(order.status, user?.role).filter((a) => !(user?.role === 'MANAGER' && (a.to === 'PREPARING' || a.to === 'READY')));
  const primary = actions.filter((a) => a.variant !== 'danger');
  const danger = actions.filter((a) => a.variant === 'danger');
  return (
    <View style={[styles.card, shadow]}>
      <Pressable accessibilityLabel={`Đơn ${order.code}`} onPress={onOpen} style={{ gap: 8 }}>
        <View style={styles.rowBetween}>
          <Txt weight="bold" size={15}>#{order.code.slice(-4)}</Txt>
          <Badge label={mins < 1 ? 'Vừa đặt' : `${mins} phút`} bg={late ? colors.dangerSoft : colors.neutralSoft} fg={late ? colors.danger : colors.neutralText} />
        </View>
        <View style={{ gap: 2 }}>
          <Txt weight="bold" size={13}>{order.recipientName}</Txt>
          <View style={styles.phone}>
            <Ionicons name="call-outline" size={13} color={colors.primary} />
            <Txt weight="semibold" size={13} color={colors.primary}>{order.recipientPhone}</Txt>
          </View>
          <Txt size={13} color={colors.textSoft} style={{ lineHeight: 18 }}>{order.deliveryStreet} · {km(order.distanceKm)}</Txt>
        </View>
        <Txt size={13} color={colors.neutralText} style={{ lineHeight: 18 }}>
          {order.items.map((i) => `${i.quantity} ${i.name}${i.options.length ? ` (${optionText(i.options)})` : ''}`).join(', ')}
        </Txt>
        {order.note ? <Txt size={12} color={colors.warningText}>Ghi chú: {order.note}</Txt> : null}
        <View style={styles.total}>
          <Badge label={paymentChip(order.payment).label} bg={paymentChip(order.payment).bg} fg={paymentChip(order.payment).fg} size={11} />
          <Txt weight="bold" size={16}>{money(order.total)}</Txt>
        </View>
      </Pressable>
      {!primary.length ? <Waiting order={order} /> : null}
      {primary.length || danger.length ? (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {primary.map((a) => <Button key={a.to} title={a.label} size="sm" variant={a.variant === 'success' ? 'success' : 'primary'} style={{ flex: 1 }}
            loading={busy === `${order.id}:${a.to}`} onPress={() => onAction(a)} />)}
          {danger.map((a) => <Button key={a.label} title={a.label} size="sm" variant="danger" onPress={() => onAction(a)} />)}
        </View>
      ) : null}
    </View>
  );
}

/** What the card is waiting for when the signed-in role has nothing to do on it. */
function Waiting({ order }: { order: Order }) {
  const [icon, text]: [keyof typeof Ionicons.glyphMap, string] =
    order.status === 'READY' ? ['time-outline', 'Chờ shipper nhận đơn']
      : order.status === 'DELIVERING' ? ['bicycle-outline', order.shipperName ? `${order.shipperName} đang giao` : 'Shipper đang giao']
        : ['flame-outline', 'Bếp đang làm'];
  return <View style={styles.waiting}><Ionicons name={icon} size={15} color={colors.neutralText} /><Txt weight="semibold" size={13} color={colors.neutralText} numberOfLines={1}>{text}</Txt></View>;
}

/** Staff confirm by hand a bank transfer that arrived but was not matched automatically. */
export function useConfirmTransfer(onDone: (orderId: number) => void) {
  const toast = useToast();
  const [busyId, setBusyId] = useState<number | null>(null);
  const confirm = async (o: Order) => {
    setBusyId(o.id);
    try {
      await api.confirmTransfer(o.id);
      toast.show(`#${o.code}: đã xác nhận nhận chuyển khoản`, 'success');
      onDone(o.id);
    } catch (e) { toast.show(errorMessage(e), 'error'); } finally { setBusyId(null); }
  };
  return { confirm, busyId };
}

/** Full order detail with timeline, used from the board, history and admin search. */
export function OrderDetailSheet({ order, onClose, onAction, busy, onConfirmTransfer }: {
  order: Order | null; onClose: () => void; onAction: (o: Order, a: Action) => void; busy: string | null; onConfirmTransfer?: (o: Order) => void;
}) {
  const { user } = useSession();
  if (!order) return null;
  const actions = OrderService.actions(order.status, user?.role);
  const canConfirmTransfer = !!onConfirmTransfer && order.status === 'AWAITING_PAYMENT' && (user?.role === 'STAFF' || user?.role === 'MANAGER');
  const pay = paymentChip(order.payment);
  return (
    <Sheet visible onClose={onClose} title={`Đơn #${order.code}`} width={620}
      footer={actions.length || canConfirmTransfer ? (
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {canConfirmTransfer ? <Button title="Xác nhận đã nhận CK" variant="success" icon="checkmark-done" onPress={() => onConfirmTransfer!(order)} style={{ flexGrow: 1 }} /> : null}
          {actions.map((a) => <Button key={a.label} title={a.label} variant={a.variant === 'danger' ? 'danger' : a.variant === 'success' ? 'success' : 'primary'}
            loading={busy === `${order.id}:${a.to}`} onPress={() => onAction(order, a)} style={{ flexGrow: 1 }} />)}
        </View>
      ) : undefined}>
      <View style={styles.rowBetween}>
        <StatusBadge status={order.status} />
        <Txt size={13} color={colors.muted}>Đặt lúc {dateTime(order.createdAt)}</Txt>
      </View>
      <View style={styles.block}>
        <Txt weight="bold" size={14}>{order.recipientName} · {order.recipientPhone}</Txt>
        <Txt size={14} color={colors.textSoft}>{order.deliveryStreet} · {km(order.distanceKm)}</Txt>
        {order.deliveryNote ? <Txt size={13} color={colors.muted}>Ghi chú giao: {order.deliveryNote}</Txt> : null}
        {order.note ? <Txt size={13} color={colors.warningText}>Ghi chú đơn: {order.note}</Txt> : null}
        <Txt size={12} color={colors.muted}>Tài khoản: {order.customerName} · {order.customerPhone}</Txt>
      </View>
      <View style={styles.block}>
        {order.items.map((i) => (
          <View key={i.id} style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Txt size={14}>{i.quantity} × {i.name}</Txt>
              {i.options.length ? <Txt size={13} color={colors.primaryText}>{optionText(i.options)}</Txt> : null}
              {i.note ? <Txt size={13} color={colors.warningText}>{i.note}</Txt> : null}
            </View>
            <Txt size={14}>{money(i.lineTotal)}</Txt>
          </View>
        ))}
        <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8, gap: 4 }}>
          <Line label="Tạm tính" value={money(order.subtotal)} />
          <Line label="Phí giao" value={money(order.deliveryFee)} />
          {order.discount > 0 ? <Line label={`Giảm giá (${order.voucherCode})`} value={`−${money(order.discount)}`} valueColor={colors.success} /> : null}
          <Line label="Tổng cộng" value={money(order.total)} strong />
        </View>
      </View>
      {order.shipperName ? (
        <View style={[styles.block, { gap: 12 }]}>
          <ShipperLine order={order} />
          {order.deliveryProof ? <DeliveryProofPhoto orderId={order.id} load={api.storeDeliveryProof} /> : null}
        </View>
      ) : null}
      <View style={[styles.block, { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }]}>
        <Txt weight="bold" size={14}>Thanh toán</Txt>
        <Badge label={pay.label} bg={pay.bg} fg={pay.fg} />
        <Txt size={13} color={colors.muted} style={{ flex: 1 }}>
          {order.payment?.method === 'BANK_TRANSFER' ? `Nội dung CK: ${order.payment.transferContent ?? ''}` : 'Tiền mặt khi giao'}
          {order.payment?.paidAt ? ` · lúc ${time(order.payment.paidAt)}` : ''}
          {order.payment?.confirmedByName ? ` · ${order.payment.confirmedByName}` : ''}
        </Txt>
      </View>
      <View style={{ gap: 8 }}>
        <Txt weight="bold" size={14}>Lịch sử trạng thái</Txt>
        {order.timeline.map((e, i) => (
          <View key={`${e.status}-${i}`} style={styles.event}>
            <Txt size={13} color={colors.muted} style={{ width: 44 }}>{time(e.at)}</Txt>
            <View style={{ flex: 1 }}>
              <Txt weight="semibold" size={14}>{statusLabel[e.status]}{e.byName ? <Txt size={13} color={colors.muted}>{` · ${e.byName}`}</Txt> : null}</Txt>
              {e.note ? <Txt size={13} color={colors.textSoft}>{e.note}</Txt> : null}
            </View>
          </View>
        ))}
      </View>
    </Sheet>
  );
}

/** Compact card of an order waiting for a bank transfer (store board strip). */
export function AwaitingCard({ order, now, onConfirm, busy, onOpen }: { order: Order; now: number; onConfirm: () => void; busy: boolean; onOpen: () => void }) {
  return (
    <View style={[styles.awaiting, shadow]}>
      <Pressable accessibilityLabel={`Đơn ${order.code}`} onPress={onOpen} style={{ gap: 4 }}>
        <View style={styles.rowBetween}>
          <Txt weight="bold" size={14}>#{order.code.slice(-4)} · {money(order.total)}</Txt>
          <Badge label={`còn ${countdown(order.payment?.expiresAt, now)}`} bg={colors.warningSoft} fg={colors.warningText} size={11} />
        </View>
        <Txt size={12} color={colors.textSoft} numberOfLines={1}>{order.recipientName} · {order.payment?.transferContent}</Txt>
      </Pressable>
      <Button title="Xác nhận đã nhận CK" size="sm" variant="success" loading={busy} onPress={onConfirm} />
    </View>
  );
}

const styles = StyleSheet.create({
  awaiting: { width: 250, backgroundColor: colors.white, borderRadius: 12, padding: 10, gap: 8 },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 12, gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  phone: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', height: 38, borderRadius: 9, backgroundColor: colors.neutralSoft },
  block: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 12, gap: 6 },
  event: { flexDirection: 'row', gap: 10 },
});
