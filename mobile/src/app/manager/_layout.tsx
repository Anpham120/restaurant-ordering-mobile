import { RoleTabs } from '@/components/role-nav';

export default function ManagerLayout() {
  return (
    <RoleTabs
      roles={['MANAGER']}
      title="Quản lý"
      screens={[
        { name: 'menu', title: 'Thực đơn', icon: '🍽️' },
        { name: 'tables', title: 'Bàn', icon: '🪑' },
        { name: 'vouchers', title: 'Voucher', icon: '🎟️' },
        { name: 'report', title: 'Báo cáo', icon: '📊' },
        { name: 'users', title: 'Nhân viên', icon: '👥' },
      ]}
    />
  );
}
