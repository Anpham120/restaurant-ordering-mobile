import { RoleTabs } from '@/components/role-nav';

export default function StaffLayout() {
  return (
    <RoleTabs
      roles={['STAFF']}
      title="Nhân viên"
      screens={[{ name: 'orders', title: 'Đơn hàng', icon: '🧾' }, { name: 'requests', title: 'Yêu cầu', icon: '🔔' }]}
    />
  );
}
