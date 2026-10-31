import type { Order, OrderStatus, Role } from './api';

const FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED'];

export interface Step { status: OrderStatus; at: string | null; note: string | null; state: 'done' | 'now' | 'todo' | 'cancel' }

export interface Action { to: OrderStatus; label: string; variant: 'primary' | 'success' | 'danger' | 'secondary'; needsReason?: boolean; reasonTitle?: string }

export const OrderService = {
  /** Customer timeline: what happened (from history) plus the steps still to come. */
  timeline(order: Order): Step[] {
    const at = new Map<OrderStatus, { at: string; note: string | null }>();
    order.timeline.forEach((e) => at.set(e.status, { at: e.at, note: e.note }));
    if (order.status === 'CANCELLED') {
      const done: Step[] = FLOW.filter((s) => at.has(s)).map((s) => ({ status: s, at: at.get(s)!.at, note: null, state: 'done' }));
      const c = at.get('CANCELLED');
      return [...done, { status: 'CANCELLED', at: c?.at ?? null, note: c?.note ?? null, state: 'cancel' }];
    }
    const idx = FLOW.indexOf(order.status);
    return FLOW.map((s, i) => ({
      status: s, at: at.get(s)?.at ?? null, note: null,
      state: i < idx || order.status === 'DELIVERED' ? 'done' : i === idx ? 'now' : 'todo',
    }));
  },

  /** Status changes the signed-in store role may make (mirrors the backend rules). */
  actions(status: OrderStatus, role: Role | undefined): Action[] {
    const staff = role === 'STAFF' || role === 'MANAGER';
    const kitchen = role === 'KITCHEN' || role === 'MANAGER';
    const out: Action[] = [];
    if (status === 'PENDING' && staff) out.push({ to: 'CONFIRMED', label: 'Xác nhận', variant: 'primary' });
    if (status === 'CONFIRMED' && kitchen) out.push({ to: 'PREPARING', label: 'Bắt đầu nấu', variant: 'primary' });
    if (status === 'PREPARING' && kitchen) out.push({ to: 'READY', label: 'Món đã xong', variant: 'success' });
    if (status === 'READY' && staff) out.push({ to: 'DELIVERING', label: 'Bắt đầu giao', variant: 'primary' });
    if (status === 'DELIVERING' && staff) out.push({ to: 'DELIVERED', label: 'Đã giao', variant: 'success' });
    if ((status === 'PENDING' || status === 'CONFIRMED') && staff)
      out.push({ to: 'CANCELLED', label: 'Hủy', variant: 'danger', needsReason: true, reasonTitle: 'Hủy đơn hàng' });
    if (status === 'DELIVERING' && staff)
      out.push({ to: 'CANCELLED', label: 'Giao thất bại', variant: 'danger', needsReason: true, reasonTitle: 'Giao hàng thất bại' });
    return out;
  },
};
