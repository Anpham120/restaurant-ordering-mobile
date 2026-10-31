import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Page } from '@/components/backoffice';
import { RevenueBars, TopItems } from '@/components/charts';
import { OrderDetailSheet, useStatusChange } from '@/components/order-ops';
import { OrderTable } from '@/components/order-table';
import { Txt } from '@/components/txt';
import { Badge, Card, ErrorBox, Loading } from '@/components/ui';
import { api, type Dashboard, type Order } from '@/lib/api';
import { money } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { colors } from '@/lib/theme';

export default function AdminDashboard() {
  const d = useLoad<Dashboard>(() => api.dashboard(), [], 30000);
  const [open, setOpen] = useState<Order | null>(null);
  const { trigger, busy, dialog } = useStatusChange((o) => { setOpen(o); void d.reload(); });
  const today = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());

  return (
    <Page title="Tổng quan" subtitle={today.charAt(0).toUpperCase() + today.slice(1)}
      actions={d.data ? <Badge label={d.data.acceptingOrders ? 'Đang nhận đơn' : 'Tạm ngưng nhận đơn'}
        bg={d.data.acceptingOrders ? colors.successSoft : colors.dangerSoft} fg={d.data.acceptingOrders ? colors.success : colors.danger} size={13} /> : null}>
      {d.error ? <ErrorBox message={d.error} onRetry={d.reload} /> : null}
      {d.loading && !d.data ? <Loading /> : d.data ? <Body d={d.data} onOpen={setOpen} /> : null}
      <OrderDetailSheet order={open} onClose={() => setOpen(null)} onAction={trigger} busy={busy} />
      {dialog}
    </Page>
  );
}

function Body({ d, onOpen }: { d: Dashboard; onOpen: (o: Order) => void }) {
  const diff = d.revenueYesterday > 0 ? Math.round(((d.revenueToday - d.revenueYesterday) / d.revenueYesterday) * 100) : null;
  return (
    <>
      <View style={styles.kpis}>
        <Kpi label="Doanh thu hôm nay" value={money(d.revenueToday)}
          sub={diff == null ? `Hôm qua ${money(d.revenueYesterday)}` : `${diff >= 0 ? '▲' : '▼'} ${Math.abs(diff)}% so với hôm qua`}
          tone={diff == null ? 'muted' : diff >= 0 ? 'up' : 'down'} />
        <Kpi label="Đơn đã giao hôm nay" value={String(d.deliveredToday)} sub={`${d.cancelledToday} đơn hủy`} tone="muted" />
        <Kpi label="Đơn đang xử lý" value={String(d.activeOrders)} sub={`${d.pendingOrders} đơn chờ xác nhận`} tone={d.pendingOrders > 0 ? 'down' : 'muted'}
          onPress={() => router.navigate('/store/orders')} />
        <Kpi label="Giá trị TB mỗi đơn" value={money(d.averageOrderValueToday)} sub={`${d.newCustomersToday} khách mới hôm nay`} tone="muted" />
        <Kpi label="Đánh giá 7 ngày" value={d.ratingAvg7d != null ? `${d.ratingAvg7d.toFixed(1)} ★` : '—'} sub={`${d.ratingCount7d} lượt đánh giá`} tone="muted" />
      </View>
      <View style={styles.split}>
        <Card style={[styles.panel, { flexGrow: 2 }]}>
          <Txt weight="extrabold" size={16}>Doanh thu 7 ngày (triệu đồng)</Txt>
          <RevenueBars days={d.last7Days} />
        </Card>
        <Card style={styles.panel}>
          <Txt weight="extrabold" size={16}>Món bán chạy hôm nay</Txt>
          <TopItems items={d.topItemsToday} />
        </Card>
      </View>
      <Card style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Txt weight="extrabold" size={16}>Đơn gần đây</Txt>
          <Pressable accessibilityRole="link" onPress={() => router.navigate('/admin/orders')}><Txt weight="semibold" size={14} color={colors.primary}>Xem tất cả</Txt></Pressable>
        </View>
        <OrderTable orders={d.recentOrders} onOpen={onOpen} />
      </Card>
    </>
  );
}

function Kpi({ label, value, sub, tone, onPress }: { label: string; value: string; sub: string; tone: 'up' | 'down' | 'muted'; onPress?: () => void }) {
  const color = tone === 'up' ? colors.success : tone === 'down' ? colors.danger : colors.muted;
  const body = (
    <Card style={{ gap: 6 }}>
      <Txt weight="semibold" size={13} color={colors.muted}>{label}</Txt>
      <Txt weight="extrabold" size={24}>{value}</Txt>
      <Txt weight={tone === 'muted' ? 'regular' : 'bold'} size={13} color={color}>{sub}</Txt>
    </Card>
  );
  return <View style={styles.kpi}>{onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{body}</Pressable> : body}</View>;
}

const styles = StyleSheet.create({
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  kpi: { flexGrow: 1, flexBasis: 200 },
  split: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' },
  panel: { flexGrow: 1, flexBasis: 340, gap: 14 },
});
