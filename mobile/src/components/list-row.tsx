import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors } from '@/lib/theme';

/** Row inside a white card list; tap to edit. */
export function ListRow({ children, onPress, first, selected, dim }: { children: ReactNode; onPress?: () => void; first?: boolean; selected?: boolean; dim?: boolean }) {
  const style = [styles.row, !first && styles.line, selected && { backgroundColor: colors.primarySoft }, dim && { opacity: 0.6 }];
  if (!onPress) return <View style={style}>{children}</View>;
  return <Pressable onPress={onPress} style={({ pressed }) => [...style, pressed && { backgroundColor: colors.bg }]}>{children}</Pressable>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, flexWrap: 'wrap' },
  line: { borderTopWidth: 1, borderTopColor: colors.divider },
});
