import type { Order, OrderStatus, Role } from './api';

const FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED'];
const TRANSFER_FLOW: OrderStatus[] = ['AWAITING_PAYMENT', ...FLOW];

export interface Step { status: OrderStatus; label: string; at: string | null; note: string | null; state: 'done' | 'now' | 'todo' | 'cancel' }

const LABEL: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: 'Đã đặt hàng · chờ chuyển khoản', PENDING: 'Đã đặt hàng', CONFIRMED: 'Cửa hàng đã xác nhận', PREPARING: 'Đang chuẩn bị món',
  READY: 'Món đã sẵn sàng', DELIVERING: 'Đang giao hàng', DELIVERED: 'Giao thành công', CANCELLED: 'Đơn đã hủy',
};

export interface Action { to: OrderStatus; label: string; variant: 'primary' | 'success' | 'danger' | 'secondary'; needsReason?: boolean; reasonTitle?: string }

export const OrderService = {
  /** A receipt exists once the order is delivered, or as soon as a bank transfer has been received. */
  hasReceipt(order: Order): boolean {
    return order.status === 'DELIVERED' || (order.payment?.method === 'BANK_TRANSFER' && !!order.payment.paidAt);
  },

  /** Cash the shipper must collect at the door; 0 when the customer already paid by transfer. */
  cashToCollect(order: Order): number {
    return order.payment?.method === 'COD' && order.payment.status === 'PENDING' ? order.total : 0;
  },

  /** Customer timeline: what happened (from history) plus the steps still to come. */
  timeline(order: Order): Step[] {
    const at = new Map<OrderStatus, { at: string; note: string | null }>();
    order.timeline.forEach((e) => at.set(e.status, { at: e.at, note: e.note }));
    const transfer = order.payment?.method === 'BANK_TRANSFER';
    const flow = transfer ? TRANSFER_FLOW : FLOW;
    const label = (s: OrderStatus) => (transfer && s === 'PENDING' ? 'Đã thanh toán · chờ xác nhận' : LABEL[s]);
    if (order.status === 'CANCELLED') {
      const done: Step[] = flow.filter((s) => at.has(s)).map((s) => ({ status: s, label: label(s), at: at.get(s)!.at, note: null, state: 'done' }));
      const c = at.get('CANCELLED');
      return [...done, { status: 'CANCELLED', label: LABEL.CANCELLED, at: c?.at ?? null, note: c?.note ?? null, state: 'cancel' }];
    }
    const idx = flow.indexOf(order.status);
    return flow.map((s, i) => ({
      status: s, label: label(s), at: at.get(s)?.at ?? null, note: null,
      state: i < idx || order.status === 'DELIVERED' ? 'done' : i === idx ? 'now' : 'todo',
    }));
  },

  /** Status changes the signed-in store role may make on the board (mirrors the backend rules; shipper steps excluded). */
  actions(status: OrderStatus, role: Role | undefined): Action[] {
    const staff = role === 'STAFF' || role === 'MANAGER';
    const kitchen = role === 'KITCHEN' || role === 'MANAGER';
    const out: Action[] = [];
    if (status === 'PENDING' && staff) out.push({ to: 'CONFIRMED', label: 'Xác nhận', variant: 'primary' });
    if (status === 'CONFIRMED' && kitchen) out.push({ to: 'PREPARING', label: 'Bắt đầu nấu', variant: 'primary' });
    if (status === 'PREPARING' && kitchen) out.push({ to: 'READY', label: 'Món đã xong', variant: 'success' });
    // READY → DELIVERING → DELIVERED belong to the shipper app (claim, then confirm with a doorstep photo)
    if ((status === 'PENDING' || status === 'CONFIRMED') && staff)
      out.push({ to: 'CANCELLED', label: 'Hủy', variant: 'danger', needsReason: true, reasonTitle: 'Hủy đơn hàng' });
    if (status === 'DELIVERING' && staff)
      out.push({ to: 'CANCELLED', label: 'Giao thất bại', variant: 'danger', needsReason: true, reasonTitle: 'Giao hàng thất bại' });
    return out;
  },
};
