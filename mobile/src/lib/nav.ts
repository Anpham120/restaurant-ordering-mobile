import type { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { Role } from './api';

export interface NavItem { href: string; label: string; icon: ComponentProps<typeof Ionicons>['name'] }

const ADMIN: NavItem[] = [
  { href: '/admin', label: 'Tổng quan', icon: 'grid-outline' },
  { href: '/store/orders', label: 'Bảng đơn hàng', icon: 'albums-outline' },
  { href: '/admin/orders', label: 'Tra cứu đơn', icon: 'search-outline' },
  { href: '/store/kitchen', label: 'Màn hình bếp', icon: 'flame-outline' },
  { href: '/admin/menu', label: 'Thực đơn', icon: 'restaurant-outline' },
  { href: '/admin/categories', label: 'Danh mục', icon: 'pricetags-outline' },
  { href: '/admin/vouchers', label: 'Khuyến mãi', icon: 'ticket-outline' },
  { href: '/admin/promotions', label: 'Chương trình', icon: 'megaphone-outline' },
  { href: '/admin/payments', label: 'Thanh toán', icon: 'card-outline' },
  { href: '/admin/zones', label: 'Khu vực giao', icon: 'map-outline' },
  { href: '/admin/staff', label: 'Nhân viên', icon: 'people-outline' },
  { href: '/admin/customers', label: 'Khách hàng', icon: 'person-circle-outline' },
  { href: '/admin/reviews', label: 'Đánh giá', icon: 'star-outline' },
  { href: '/admin/report', label: 'Báo cáo', icon: 'bar-chart-outline' },
  { href: '/admin/settings', label: 'Cài đặt cửa hàng', icon: 'settings-outline' },
];

const STAFF: NavItem[] = [
  { href: '/store/orders', label: 'Bảng đơn hàng', icon: 'albums-outline' },
  { href: '/store/history', label: 'Lịch sử đơn', icon: 'time-outline' },
  { href: '/store/stock', label: 'Món hết hàng', icon: 'remove-circle-outline' },
];

export function navFor(role: Role | undefined): NavItem[] {
  return role === 'MANAGER' ? ADMIN : STAFF;
}
