import type { OrderItemStatus, OrderStatus, PaymentStatus, RequestType } from './api';

export function money(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
}

export function todayIso(): string {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  COOKING: 'Đang chế biến',
  SERVED: 'Đã phục vụ',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export const itemStatusLabel: Record<OrderItemStatus, string> = {
  PENDING: 'Chờ',
  COOKING: 'Đang nấu',
  READY: 'Sẵn sàng',
  SERVED: 'Đã phục vụ',
  CANCELLED: 'Đã hủy',
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  PENDING: 'Chờ thu tiền',
  PAID: 'Đã thanh toán',
  FAILED: 'Thất bại',
};

export const requestTypeLabel: Record<RequestType, string> = {
  WATER: 'Thêm nước',
  HELP: 'Cần hỗ trợ',
  BILL: 'Tính tiền',
  OTHER: 'Khác',
};

export const methodLabel = { CASH: 'Tiền mặt', TRANSFER: 'Chuyển khoản', EWALLET: 'Ví điện tử' } as const;
