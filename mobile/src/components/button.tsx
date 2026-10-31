import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface Props {
  title: string;
  onPress: () => void | Promise<void>;
  variant?: Variant;
  small?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const bg: Record<Variant, string> = { primary: colors.primary, secondary: '#FFEDD5', danger: colors.danger, ghost: 'transparent' };
const fg: Record<Variant, string> = { primary: colors.primaryText, secondary: colors.primary, danger: colors.primaryText, ghost: colors.primary };

export function Button({ title, onPress, variant = 'primary', small, disabled, loading, style }: Props) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => { void onPress(); }}
      disabled={off}
      style={({ pressed }) => [styles.base, small && styles.small, { backgroundColor: bg[variant] }, off && styles.off, pressed && styles.pressed, style]}>
      {loading ? <ActivityIndicator color={fg[variant]} /> : <Text style={[styles.text, small && styles.textSmall, { color: fg[variant] }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  small: { paddingVertical: 6, paddingHorizontal: 12, minHeight: 34, borderRadius: 8 },
  off: { opacity: 0.5 },
  pressed: { opacity: 0.8 },
  text: { fontSize: 16, fontWeight: '600' },
  textSmall: { fontSize: 14 },
});
