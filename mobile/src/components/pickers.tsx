import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from './button';
import { Sheet } from './modal';
import { Txt } from './txt';
import { colors, radius } from '@/lib/theme';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const pad = (n: number) => String(n).padStart(2, '0');
/** Local calendar date as yyyy-mm-dd (not toISOString: that is UTC and can be a day off in Vietnam). */
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const parse = (v: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};

/** Month calendar in a sheet: weeks start on Monday, today is outlined, quick picks for the usual dates. */
export function DatePickerSheet({ visible, value, title, onPick, onClose }: {
  visible: boolean; value: string; title: string; onPick: (v: string) => void; onClose: () => void;
}) {
  const today = new Date();
  const selected = parse(value);
  const [month, setMonth] = useState(() => { const d = selected ?? today; return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [openedFor, setOpenedFor] = useState(value);
  // reopening for another value jumps to that value's month
  if (visible && openedFor !== value) {
    setOpenedFor(value);
    const d = selected ?? today;
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  const offset = (month.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i - offset + 1));
  const weeks = Array.from({ length: 6 }, (_, w) => cells.slice(w * 7, w * 7 + 7)).filter((wk) => wk.some((d) => d.getMonth() === month.getMonth()));
  const pick = (d: Date) => { onPick(ymd(d)); onClose(); };
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return (
    <Sheet visible={visible} onClose={onClose} title={title} width={400}
      footer={<View style={{ flexDirection: 'row', gap: 10 }}>
        {value ? <Button title="Xóa ngày" variant="secondary" onPress={() => { onPick(''); onClose(); }} style={{ flex: 1 }} /> : null}
        <Button title="Đóng" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
      </View>}>
      <View style={styles.quick}>
        {[['Hôm nay', today], ['Ngày mai', addDays(today, 1)], ['Sau 7 ngày', addDays(today, 7)], ['Cuối tháng', endOfMonth]].map(([label, d]) => (
          <Pressable key={label as string} accessibilityRole="button" onPress={() => pick(d as Date)} style={({ pressed }) => [styles.quickChip, pressed && { opacity: 0.7 }]}>
            <Txt weight="semibold" size={13} color={colors.primaryText}>{label as string}</Txt>
          </Pressable>
        ))}
      </View>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" accessibilityLabel="Tháng trước" onPress={() => shift(-1)} hitSlop={8} style={styles.nav}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Txt weight="extrabold" size={16}>Tháng {month.getMonth() + 1}, {month.getFullYear()}</Txt>
        <Pressable accessibilityRole="button" accessibilityLabel="Tháng sau" onPress={() => shift(1)} hitSlop={8} style={styles.nav}>
          <Ionicons name="chevron-forward" size={20} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.row}>
        {WEEKDAYS.map((w) => <View key={w} style={styles.cell}><Txt weight="semibold" size={12} color={w === 'CN' ? colors.danger : colors.muted}>{w}</Txt></View>)}
      </View>
      {weeks.map((wk) => (
        <View key={ymd(wk[0])} style={styles.row}>
          {wk.map((d) => {
            const inMonth = d.getMonth() === month.getMonth();
            const isSel = !!selected && ymd(d) === ymd(selected);
            const isToday = ymd(d) === ymd(today);
            return (
              <Pressable key={ymd(d)} accessibilityRole="button" accessibilityLabel={`Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`}
                accessibilityState={{ selected: isSel }} onPress={() => pick(d)} style={styles.cell}>
                {({ pressed }) => (
                  <View style={[styles.day, isToday && styles.today, isSel && styles.daySel, pressed && !isSel && { backgroundColor: colors.primarySoft }]}>
                    <Txt weight={isSel || isToday ? 'bold' : 'regular'} size={15} color={isSel ? colors.white : inMonth ? colors.text : colors.faint}>{d.getDate()}</Txt>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      ))}
    </Sheet>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

/** Hour and minute grids (5-minute steps); typing an exact minute in the field still works. */
export function TimePickerSheet({ visible, value, title, onPick, onClose }: {
  visible: boolean; value: string; title: string; onPick: (v: string) => void; onClose: () => void;
}) {
  const [h, m] = /^\d{2}:\d{2}$/.test(value) ? value.split(':') : ['', ''];
  return (
    <Sheet visible={visible} onClose={onClose} title={title} width={420}
      footer={<Button title="Xong" onPress={onClose} />}>
      <Txt weight="semibold" size={14}>Giờ</Txt>
      <View style={styles.grid}>
        {HOURS.map((x) => <Slot key={x} label={x} on={x === h} onPress={() => onPick(`${x}:${m || '00'}`)} />)}
      </View>
      <Txt weight="semibold" size={14}>Phút</Txt>
      <View style={styles.grid}>
        {MINUTES.map((x) => <Slot key={x} label={`:${x}`} on={x === m} onPress={() => onPick(`${h || '00'}:${x}`)} />)}
      </View>
      <Txt size={13} color={colors.muted}>Đang chọn: <Txt weight="bold" size={13}>{value || '--:--'}</Txt></Txt>
    </Sheet>
  );
}

function Slot({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress}
      style={({ pressed }) => [styles.slot, on && styles.slotOn, pressed && !on && { backgroundColor: colors.primarySoft }]}>
      <Txt weight={on ? 'bold' : 'medium'} size={14} color={on ? colors.white : colors.text}>{label}</Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: { paddingHorizontal: 12, height: 34, borderRadius: radius.pill, backgroundColor: colors.primarySoft, justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nav: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.neutralSoft },
  row: { flexDirection: 'row' },
  cell: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  day: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1.5, borderColor: colors.primary },
  daySel: { backgroundColor: colors.primary, borderColor: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: { width: 54, height: 40, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  slotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
