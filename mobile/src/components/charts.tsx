import { StyleSheet, View } from 'react-native';

import type { DailyRevenue, TopItem } from '@/lib/api';
import { money, weekday, dayLabel } from '@/lib/format';
import { colors } from '@/lib/theme';
import { Txt } from './txt';
import { FoodImage } from './ui';

/** Simple bar chart of daily revenue (millions), the last bar highlighted. */
export function RevenueBars({ days, height = 200 }: { days: DailyRevenue[]; height?: number }) {
  const max = Math.max(1, ...days.map((d) => d.revenue));
  const many = days.length > 10;
  return (
    <View style={{ gap: 8 }}>
      <View style={[styles.bars, { height }]}>
        {days.map((d, i) => {
          const h = Math.max(d.revenue > 0 ? 4 : 2, Math.round((d.revenue / max) * (height - 28)));
          return (
            <View key={d.date} style={styles.barCol} accessibilityLabel={`${dayLabel(d.date)}: ${money(d.revenue)}`}>
              {!many ? <Txt weight="bold" size={11} color={colors.textSoft}>{d.revenue ? (d.revenue / 1e6).toFixed(1).replace('.', ',') : '0'}</Txt> : null}
              <View style={[styles.bar, { height: h, backgroundColor: i === days.length - 1 ? colors.primary : '#F3C9B2' }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {days.map((d, i) => (
          <Txt key={d.date} size={11} color={colors.muted} style={{ flex: 1, textAlign: 'center' }}>
            {many ? (i % Math.ceil(days.length / 8) === 0 ? dayLabel(d.date) : '') : `${weekday(d.date)} ${dayLabel(d.date)}`}
          </Txt>
        ))}
      </View>
    </View>
  );
}

export function TopItems({ items }: { items: TopItem[] }) {
  if (items.length === 0) return <Txt size={14} color={colors.muted}>Chưa có món nào được giao trong khoảng này.</Txt>;
  return (
    <View style={{ gap: 12 }}>
      {items.map((t, i) => (
        <View key={t.menuItemId} style={styles.top}>
          <Txt weight="extrabold" size={14} color={colors.muted} style={{ width: 20 }}>{i + 1}</Txt>
          <FoodImage uri={t.imageUrl} style={{ width: 40, height: 40 }} rounded={8} />
          <Txt weight="semibold" size={14} style={{ flex: 1 }} numberOfLines={1}>{t.name}</Txt>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt size={14} color={colors.textSoft}>{t.quantity} phần</Txt>
            <Txt size={12} color={colors.muted}>{money(t.revenue)}</Txt>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 2 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4, height: '100%' },
  bar: { width: '100%', maxWidth: 44, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  labels: { flexDirection: 'row', gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
