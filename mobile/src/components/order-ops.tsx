import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { api, errorMessage, type Order } from '@/lib/api';
import { dateTime, minutesSince, money, statusLabel, time } from '@/lib/format';
import { OrderService, type Action } from '@/lib/order-flow';
import { useSession } from '@/lib/session';
import { colors, radius, shadow } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { Button } from './button';
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
        : ['Hết nguyên liệu', 'Ngoài khu vực giao', 'Khách yêu cầu hủy', 'Đơn nghi giả mạo']}
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
          <Txt size={13} color={colors.textSoft} style={{ lineHeight: 18 }}>{order.deliveryStreet}, {order.zoneName}</Txt>
        </View>
        <Txt size={13} color={colors.neutralText} style={{ lineHeight: 18 }}>{order.items.map((i) => `${i.quantity} ${i.name}`).join(', ')}</Txt>
        {order.note ? <Txt size={12} color={colors.warningText}>Ghi chú: {order.note}</Txt> : null}
        <View style={styles.total}>
          <Txt size={12} color={colors.muted}>COD</Txt>
          <Txt weight="bold" size={16}>{money(order.total)}</Txt>
        </View>
      </Pressable>
      {primary.length || danger.length ? (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {primary.map((a) => <Button key={a.to} title={a.label} size="sm" variant={a.variant === 'success' ? 'success' : 'primary'} style={{ flex: 1 }}
            loading={busy === `${order.id}:${a.to}`} onPress={() => onAction(a)} />)}
          {danger.map((a) => <Button key={a.label} title={a.label} size="sm" variant="danger" onPress={() => onAction(a)} />)}
        </View>
      ) : (
        <View style={styles.waiting}><Ionicons name="flame-outline" size={15} color={colors.neutralText} /><Txt weight="semibold" size={13} color={colors.neutralText}>Bếp đang làm</Txt></View>
      )}
    </View>
  );
}

/** Full order detail with timeline, used from the board, history and admin search. */
export function OrderDetailSheet({ order, onClose, onAction, busy }: {
  order: Order | null; onClose: () => void; onAction: (o: Order, a: Action) => void; busy: string | null;
}) {
  const { user } = useSession();
  if (!order) return null;
  const actions = OrderService.actions(order.status, user?.role);
  return (
    <Sheet visible onClose={onClose} title={`Đơn #${order.code}`} width={620}
      footer={actions.length ? (
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
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
        <Txt size={14} color={colors.textSoft}>{order.deliveryStreet}, {order.zoneName}</Txt>
        {order.deliveryNote ? <Txt size={13} color={colors.muted}>Ghi chú giao: {order.deliveryNote}</Txt> : null}
        {order.note ? <Txt size={13} color={colors.warningText}>Ghi chú đơn: {order.note}</Txt> : null}
        <Txt size={12} color={colors.muted}>Tài khoản: {order.customerName} · {order.customerPhone}</Txt>
      </View>
      <View style={styles.block}>
        {order.items.map((i) => (
          <View key={i.id} style={styles.rowBetween}>
            <Txt size={14} style={{ flex: 1 }}>{i.quantity} × {i.name}{i.note ? <Txt size={13} color={colors.warningText}>{`  · ${i.note}`}</Txt> : null}</Txt>
            <Txt size={14}>{money(i.lineTotal)}</Txt>
          </View>
        ))}
        <View style={{ borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8, gap: 4 }}>
          <Line label="Tạm tính" value={money(order.subtotal)} />
          <Line label="Phí giao" value={money(order.deliveryFee)} />
          {order.discount > 0 ? <Line label={`Giảm giá (${order.voucherCode})`} value={`−${money(order.discount)}`} valueColor={colors.success} /> : null}
          <Line label={order.paid ? 'Đã thu (COD)' : 'Thu khi giao (COD)'} value={money(order.total)} strong />
        </View>
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

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 12, gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  phone: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 8 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', height: 38, borderRadius: 9, backgroundColor: colors.neutralSoft },
  block: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 12, gap: 6 },
  event: { flexDirection: 'row', gap: 10 },
});
