import type { DiscountType, OrderStatus, Role } from './api';
import { colors } from './theme';

const nf = new Intl.NumberFormat('vi-VN');

/** 65000 -> "65.000đ" */
export function money(v: number | null | undefined): string {
  return `${nf.format(Math.round(v ?? 0))}đ`;
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
  PENDING: 'Đã đặt hàng',
  CONFIRMED: 'Cửa hàng đã xác nhận',
  PREPARING: 'Đang chuẩn bị món',
  READY: 'Món đã sẵn sàng',
  DELIVERING: 'Đang giao hàng',
  DELIVERED: 'Giao thành công',
  CANCELLED: 'Đơn đã hủy',
};

export const statusTone: Record<OrderStatus, { bg: string; fg: string }> = {
  PENDING: { bg: colors.primarySoft, fg: colors.primaryText },
  CONFIRMED: { bg: colors.warningSoft, fg: colors.warningText },
  PREPARING: { bg: colors.warningSoft, fg: colors.warningText },
  READY: { bg: colors.infoSoft, fg: colors.info },
  DELIVERING: { bg: colors.infoSoft, fg: colors.info },
  DELIVERED: { bg: colors.successSoft, fg: colors.success },
  CANCELLED: { bg: colors.neutralSoft, fg: colors.neutralText },
};

export const roleLabel: Record<Role, string> = {
  CUSTOMER: 'Khách hàng',
  STAFF: 'Nhân viên',
  KITCHEN: 'Bếp',
  MANAGER: 'Quản lý',
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
