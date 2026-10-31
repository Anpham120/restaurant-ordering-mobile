import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field } from '@/components/field';
import { Muted, Screen, Title } from '@/components/screen';
import { api, errorMessage, type RevenueReport } from '@/lib/api';
import { money, todayIso } from '@/lib/format';
import { colors } from '@/lib/theme';

export default function Report() {
  const [from, setFrom] = useState(todayIso());
  const [to, setTo] = useState(todayIso());
  const [report, setReport] = useState<RevenueReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    setError(null);
    try { setReport(await api.revenue(from, to)); } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  };

  useEffect(() => {
    api.revenue(todayIso(), todayIso()).then(setReport).catch((e: unknown) => setError(errorMessage(e)));
  }, []);

  return (
    <Screen error={error}>
      <Card>
        <Title>Khoảng thời gian</Title>
        <Field label="Từ ngày (YYYY-MM-DD)" value={from} onChangeText={setFrom} autoCapitalize="none" />
        <Field label="Đến ngày (YYYY-MM-DD)" value={to} onChangeText={setTo} autoCapitalize="none" />
        <Button small title="Xem báo cáo" onPress={load} loading={busy} />
      </Card>
      {report ? (
        <>
          <Card>
            <Muted>Tổng doanh thu ({report.from} → {report.to})</Muted>
            <Text style={styles.big}>{money(report.totalRevenue)}</Text>
            <Muted>{report.orderCount} đơn hoàn thành</Muted>
          </Card>
          <Card>
            <Title>Theo ngày</Title>
            {report.daily.length === 0 ? <Muted>Không có dữ liệu.</Muted> : null}
            {report.daily.map((d) => (
              <View key={d.date} style={styles.row}>
                <Text>{d.date}</Text>
                <Text>{d.orders} đơn · {money(d.revenue)}</Text>
              </View>
            ))}
          </Card>
          <Card>
            <Title>Món bán chạy</Title>
            {report.topItems.length === 0 ? <Muted>Không có dữ liệu.</Muted> : null}
            {report.topItems.map((t, i) => (
              <View key={t.menuItemId} style={styles.row}>
                <Text>{i + 1}. {t.name}</Text>
                <Text>{t.quantity} phần</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  big: { fontSize: 28, fontWeight: '800', color: colors.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, paddingVertical: 2 },
});
