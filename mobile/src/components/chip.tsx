import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors } from '@/lib/theme';

interface Option<T extends string | number> { value: T; label: string }

/** Single-select chip row. */
export function Chips<T extends string | number>({ options, value, onChange }: { options: Option<T>[]; value: T | null; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.text, on && styles.textOn]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { color: colors.text, fontSize: 14 },
  textOn: { color: colors.primaryText, fontWeight: '600' },
});
