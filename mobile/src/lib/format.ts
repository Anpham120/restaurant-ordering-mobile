import type { ChosenOption, DiscountType, FeedbackTopic, OrderStatus, Payment, Role } from './api';
import { colors } from './theme';

const nf = new Intl.NumberFormat('vi-VN');

/** 65000 -> "65.000đ" */
export function money(v: number | null | undefined): string {
  return `${nf.format(Math.round(v ?? 0))}đ`;
}

/** 3.4 -> "3,4 km" */
export function km(v: number | null | undefined): string {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(v ?? 0)} km`;
}

/** Server timestamps are Vietnam local time without an offset. */
export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}+07:00`);
}

const pad = (n: number) => String(n).padStart(2, '0');

function vnParts(d: Date) {
  // render in Vietnam time whatever the device timezone
  const v = new Date(d.getTime() + (d.getTimezoneOffset() + 420) * 60000);
  return { y: v.getFullYear(), m: v.getMonth() + 1, d: v.getDate(), h: v.getHours(), min: v.getMinutes() };
}

export function time(s: string | null | undefined): string {
  const d = parseDate(s);
  if (!d) return '';
  const p = vnParts(d);
  return `${pad(p.h)}:${pad(p.min)}`;
}

export function dateTime(s: string | null | undefined): string {
  const d = parseDate(s);
  if (!d) return '';
  const p = vnParts(d);
  return `${pad(p.d)}/${pad(p.m)} ${pad(p.h)}:${pad(p.min)}`;
}

/** "01/11/2026 14:05" (Vietnam time) for receipts. */
export function fullDateTime(s: string | null | undefined): string {
  const d = parseDate(s);
  if (!d) return '';
  const p = vnParts(d);
  return `${pad(p.d)}/${pad(p.m)}/${p.y} ${pad(p.h)}:${pad(p.min)}`;
}

export function dayLabel(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

const WEEKDAY = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export function weekday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return WEEKDAY[new Date(y, m - 1, d).getDay()];
}

/** "Hôm nay 18:52" / "28/10 12:10" */
export function friendlyDate(s: string | null | undefined, now: number): string {
  const d = parseDate(s);
  if (!d) return '';
  const a = vnParts(d);
  const b = vnParts(new Date(now));
  return a.d === b.d && a.m === b.m && a.y === b.y ? `Hôm nay ${pad(a.h)}:${pad(a.min)}` : dateTime(s);
}

/** Minutes elapsed since a server timestamp. */
export function minutesSince(s: string | null | undefined, now: number): number {
  const d = parseDate(s);
  return d ? Math.max(0, Math.floor((now - d.getTime()) / 60000)) : 0;
}

export function mmss(s: string | null | undefined, now: number): string {
  const d = parseDate(s);
  if (!d) return '00:00';
  const sec = Math.max(0, Math.floor((now - d.getTime()) / 1000));
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
}

/** Today in Vietnam as yyyy-mm-dd. */
export function todayIso(offsetDays = 0): string {
  const p = vnParts(new Date(Date.now() + offsetDays * 86400000));
  return `${p.y}-${pad(p.m)}-${pad(p.d)}`;
}

export const statusLabel: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: 'Chờ thanh toán',
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PREPARING: 'Đang chuẩn bị',
  READY: 'Chờ giao',
  DELIVERING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

/** Customer-facing timeline wording. */
export const timelineLabel: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: 'Đã đặt hàng',
  PENDING: 'Đã đặt hàng',
  CONFIRMED: 'Cửa hàng đã xác nhận',
  PREPARING: 'Đang chuẩn bị món',
  READY: 'Món đã sẵn sàng',
  DELIVERING: 'Đang giao hàng',
  DELIVERED: 'Giao thành công',
  CANCELLED: 'Đơn đã hủy',
};

export const statusTone: Record<OrderStatus, { bg: string; fg: string }> = {
  AWAITING_PAYMENT: { bg: colors.warningSoft, fg: colors.warningText },
  PENDING: { bg: colors.primarySoft, fg: colors.primaryText },
  CONFIRMED: { bg: colors.warningSoft, fg: colors.warningText },
  PREPARING: { bg: colors.warningSoft, fg: colors.warningText },
  READY: { bg: colors.infoSoft, fg: colors.info },
  DELIVERING: { bg: colors.infoSoft, fg: colors.info },
  DELIVERED: { bg: colors.successSoft, fg: colors.success },
  CANCELLED: { bg: colors.neutralSoft, fg: colors.neutralText },
};

export const feedbackTopicLabel: Record<FeedbackTopic, string> = {
  ORDER: 'Đơn hàng', FOOD: 'Món ăn', DELIVERY: 'Giao hàng', APP: 'Ứng dụng', OTHER: 'Khác',
};

export const roleLabel: Record<Role, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
  KITCHEN: 'Bếp',
  MANAGER: 'Quản lý',
  SHIPPER: 'Shipper',
};

export function discountLabel(type: DiscountType, value: number, max: number | null): string {
  if (type === 'PERCENT') return `Giảm ${value}%${max ? ` tối đa ${money(max)}` : ''}`;
  return `Giảm ${money(value)}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (a + b).toUpperCase();
}

/** "Size L · 70% đường · Trân châu trắng" */
export function optionText(options: ChosenOption[] | null | undefined): string {
  return (options ?? []).map((o) => o.name).join(' · ');
}

/** Short label + colours describing how an order is paid. */
export function paymentChip(p: Payment | null | undefined): { label: string; bg: string; fg: string } {
  if (!p) return { label: 'Thanh toán khi nhận hàng', bg: colors.neutralSoft, fg: colors.neutralText };
  if (p.method === 'COD') {
    if (p.status === 'PAID') return { label: 'Đã thu tiền mặt', bg: colors.successSoft, fg: colors.success };
    if (p.status === 'FAILED') return { label: 'COD · không thu', bg: colors.neutralSoft, fg: colors.neutralText };
    return { label: 'COD · thu khi giao', bg: colors.neutralSoft, fg: colors.neutralText };
  }
  switch (p.status) {
    case 'PENDING': return { label: 'Chờ chuyển khoản', bg: colors.warningSoft, fg: colors.warningText };
    case 'PAID': return { label: 'Đã chuyển khoản', bg: colors.successSoft, fg: colors.success };
    case 'REFUND_PENDING': return { label: 'Chờ hoàn tiền', bg: colors.dangerSoft, fg: colors.danger };
    case 'REFUNDED': return { label: 'Đã hoàn tiền', bg: colors.infoSoft, fg: colors.info };
    default: return { label: 'Chưa thanh toán', bg: colors.neutralSoft, fg: colors.neutralText };
  }
}

/** Common VietQR bank codes for the settings form. */
export const BANKS: { code: string; name: string }[] = [
  { code: 'VCB', name: 'Vietcombank' }, { code: 'BIDV', name: 'BIDV' }, { code: 'ICB', name: 'VietinBank' }, { code: 'TCB', name: 'Techcombank' },
  { code: 'MB', name: 'MB Bank' }, { code: 'ACB', name: 'ACB' }, { code: 'VPB', name: 'VPBank' }, { code: 'TPB', name: 'TPBank' },
  { code: 'STB', name: 'Sacombank' }, { code: 'VIB', name: 'VIB' },
];

export function bankName(code: string | null | undefined): string {
  return BANKS.find((b) => b.code === code)?.name ?? code ?? '';
}

/** "05:09" until a server timestamp; "00:00" when passed. */
export function countdown(s: string | null | undefined, now: number): string {
  const d = parseDate(s);
  if (!d) return '';
  const sec = Math.max(0, Math.floor((d.getTime() - now) / 1000));
  return `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
}

export type InputMask = 'date' | 'time';

/**
 * Formats what was typed into a date (yyyy-mm-dd) or time (HH:mm) as the user types: only digits are kept and the
 * separators are inserted for them ("2026" -> "2026-", "07" -> "07:"). Backspace never gets stuck on a separator.
 */
export function applyMask(mask: InputMask, next: string, prev = ''): string {
  const groups = mask === 'date' ? [4, 2, 2] : [2, 2];
  const sep = mask === 'date' ? '-' : ':';
  let digits = next.replace(/\D/g, '').slice(0, groups.reduce((a, b) => a + b, 0));
  const deleting = next.length < prev.length;
  // backspace at the end removed only the separator: remove the digit before it too
  if (deleting && prev.startsWith(next) && digits === prev.replace(/\D/g, '')) digits = digits.slice(0, -1);
  let out = '', at = 0;
  groups.forEach((n, g) => {
    const part = digits.slice(at, at + n);
    if (!part) return;
    out += (g > 0 ? sep : '') + part;
    at += n;
    if (!deleting && g < groups.length - 1 && part.length === n && digits.length === at) out += sep;
  });
  return out;
}

/** Completes a masked value when the field is left: "2026-11-9" -> "2026-11-09", "7" or "07:" -> "07:00". */
export function completeMask(mask: InputMask, v: string): string {
  if (mask === 'date') {
    const m = /^(\d{4})-(\d{1,2})-(\d)$/.exec(v);
    return m ? `${m[1]}-${m[2].padStart(2, '0')}-0${m[3]}` : v;
  }
  const m = /^(\d{1,2}):?$/.exec(v);
  return m ? `${m[1].padStart(2, '0')}:00` : v;
}

/** "1250000" -> "1.250.000" (Vietnamese thousands separator) for money typed into a field; "" stays "". */
export const thousands = (digits: string): string => digits.replace(/\D/g, '').replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
