import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ReactNode } from 'react';

import { colors } from '@/lib/theme';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, gap: 8, borderWidth: 1, borderColor: colors.border },
});
