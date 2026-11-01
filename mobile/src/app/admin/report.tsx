import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Page } from '@/components/backoffice';
import { Button } from '@/components/button';
import { RevenueBars, TopItems } from '@/components/charts';
import { Txt } from '@/components/txt';
import { Card, Chip, ErrorBox, Field, Loading } from '@/components/ui';
import { api, type RevenueReport } from '@/lib/api';
import { money, todayIso } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { colors } from '@/lib/theme';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default function AdminReport() {
  const [from, setFrom] = useState(todayIso(-6));
  const [to, setTo] = useState(todayIso());
  const [range, setRange] = useState({ from: todayIso(-6), to: todayIso() });
  const report = useLoad<RevenueReport>(() => api.revenue(range.from, range.to), [range.from, range.to]);
  const preset = (days: number) => { const r = { from: todayIso(-(days - 1)), to: todayIso() }; setFrom(r.from); setTo(r.to); setRange(r); };
  const r = report.data;

  return (
    <Page title="Báo cáo doanh thu" subtitle="Tính theo đơn đã giao thành công (tiền món − giảm giá + phí giao)"
      actions={<>
        <Chip label="Hôm nay" onPress={() => preset(1)} active={range.from === todayIso() && range.to === todayIso()} />
        <Chip label="7 ngày" onPress={() => preset(7)} active={range.from === todayIso(-6) && range.to === todayIso()} />
        <Chip label="30 ngày" onPress={() => preset(30)} active={range.from === todayIso(-29) && range.to === todayIso()} />
      </>}>
      <Card style={styles.range}>
        <View style={{ width: 160 }}><Field label="Từ ngày" value={from} onChangeText={setFrom} placeholder="yyyy-mm-dd" /></View>
        <View style={{ width: 160 }}><Field label="Đến ngày" value={to} onChangeText={setTo} placeholder="yyyy-mm-dd" /></View>
        <Button title="Xem báo cáo" onPress={() => setRange({ from, to })} disabled={!DATE.test(from) || !DATE.test(to)} style={{ alignSelf: 'flex-end' }} />
      </Card>
      {report.error ? <ErrorBox message={report.error} onRetry={report.reload} /> : null}
      {report.loading && !r ? <Loading /> : r ? (
        <>
          <View style={styles.kpis}>
            <Kpi label="Doanh thu" value={money(r.revenue)} />
            <Kpi label="Đơn đã giao" value={String(r.deliveredOrders)} />
            <Kpi label="Đơn bị hủy" value={String(r.cancelledOrders)} />
            <Kpi label="Giá trị TB / đơn" value={money(r.averageOrderValue)} />
          </View>
          <View style={styles.split}>
            <Card style={[styles.panel, { flexGrow: 2 }]}>
              <Txt weight="extrabold" size={16}>Doanh thu theo ngày (triệu đồng)</Txt>
              <RevenueBars days={r.daily} />
            </Card>
            <Card style={styles.panel}>
              <Txt weight="extrabold" size={16}>Theo khoảng cách giao</Txt>
              {r.byDistance.length === 0 ? <Txt size={14} color={colors.muted}>Chưa có dữ liệu.</Txt> : r.byDistance.map((z) => (
                <View key={z.band} style={styles.zone}>
                  <Txt weight="semibold" size={14} style={{ flex: 1 }}>{z.band}</Txt>
                  <Txt size={13} color={colors.muted}>{z.orders} đơn</Txt>
                  <Txt weight="bold" size={14} style={{ width: 110, textAlign: 'right' }}>{money(z.revenue)}</Txt>
                </View>
              ))}
            </Card>
          </View>
          <Card style={{ gap: 14 }}>
            <Txt weight="extrabold" size={16}>Món bán chạy</Txt>
            <TopItems items={r.topItems} />
          </Card>
        </>
      ) : null}
    </Page>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: 200 }}>
      <Card style={{ gap: 6 }}>
        <Txt weight="semibold" size={13} color={colors.muted}>{label}</Txt>
        <Txt weight="extrabold" size={24}>{value}</Txt>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  range: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  split: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'flex-start' },
  panel: { flexGrow: 1, flexBasis: 340, gap: 14 },
  zone: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
});
