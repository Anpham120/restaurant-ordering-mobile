import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

type Tone = 'neutral' | 'info' | 'success' | 'warn' | 'danger';
const tone: Record<Tone, string> = { neutral: colors.muted, info: colors.info, success: colors.success, warn: colors.warn, danger: colors.danger };

/** Maps backend status strings to a colour. */
export function toneOf(status: string): Tone {
  switch (status) {
    case 'COMPLETED': case 'PAID': case 'DONE': case 'READY': case 'SERVED': case 'FREE': return 'success';
    case 'CANCELLED': case 'FAILED': return 'danger';
    case 'COOKING': case 'CONFIRMED': return 'info';
    case 'PENDING': case 'OPEN': case 'OCCUPIED': return 'warn';
    default: return 'neutral';
  }
}

export function Badge({ label, status }: { label: string; status?: string }) {
  const c = tone[status ? toneOf(status) : 'neutral'];
  return (
    <View style={[styles.badge, { borderColor: c }]}>
      <Text style={[styles.text, { color: c }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 },
  text: { fontSize: 12, fontWeight: '600' },
});
