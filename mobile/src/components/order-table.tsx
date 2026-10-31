import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import type { Order } from '@/lib/api';
import { dateTime, money } from '@/lib/format';
import { colors } from '@/lib/theme';
import { Txt } from './txt';
import { StatusBadge } from './ui';

/** Compact order table (history, admin search, dashboard). */
export function OrderTable({ orders, onOpen }: { orders: Order[]; onOpen: (o: Order) => void }) {
  return (
    <ScrollView horizontal contentContainerStyle={{ minWidth: '100%' }}>
      <View style={{ minWidth: 760, flex: 1 }}>
        <View style={[styles.row, styles.head]}>
          <Txt weight="semibold" size={13} color={colors.muted} style={styles.c1}>Mã đơn</Txt>
          <Txt weight="semibold" size={13} color={colors.muted} style={styles.c2}>Khách hàng</Txt>
          <Txt weight="semibold" size={13} color={colors.muted} style={styles.c3}>Khu vực</Txt>
          <Txt weight="semibold" size={13} color={colors.muted} style={styles.c4}>Giờ đặt</Txt>
          <Txt weight="semibold" size={13} color={colors.muted} style={[styles.c5, { textAlign: 'right' }]}>Tổng tiền</Txt>
          <Txt weight="semibold" size={13} color={colors.muted} style={styles.c6}>Trạng thái</Txt>
        </View>
        {orders.map((o) => (
          <Pressable key={o.id} accessibilityRole="button" onPress={() => onOpen(o)} style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.bg }]}>
            <Txt weight="bold" size={14} style={styles.c1}>#{o.code}</Txt>
            <View style={styles.c2}>
              <Txt size={14} numberOfLines={1}>{o.recipientName}</Txt>
              <Txt size={12} color={colors.muted}>{o.recipientPhone}</Txt>
            </View>
            <Txt size={14} style={styles.c3}>{o.zoneName}</Txt>
            <Txt size={14} style={styles.c4}>{dateTime(o.createdAt)}</Txt>
            <Txt weight="bold" size={14} style={[styles.c5, { textAlign: 'right' }]}>{money(o.total)}</Txt>
            <View style={styles.c6}><StatusBadge status={o.status} /></View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: colors.divider, gap: 10 },
  head: { borderTopWidth: 0 },
  c1: { width: 140 },
  c2: { flex: 2, minWidth: 150 },
  c3: { width: 100 },
  c4: { width: 100 },
  c5: { width: 100 },
  c6: { width: 130, paddingLeft: 12 },
});
