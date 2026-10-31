import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '@/lib/theme';
import { Txt } from './txt';

type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'success' | 'dark';
type IconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const palette: Record<Variant, { bg: string; pressed: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, fg: colors.white },
  secondary: { bg: colors.white, pressed: colors.divider, fg: colors.text, border: colors.border },
  soft: { bg: colors.primarySoft, pressed: '#FDE3D2', fg: colors.primaryText },
  ghost: { bg: 'transparent', pressed: colors.divider, fg: colors.primary },
  danger: { bg: colors.white, pressed: colors.dangerSoft, fg: colors.danger, border: colors.border },
  success: { bg: colors.success, pressed: '#166534', fg: colors.white },
  dark: { bg: colors.text, pressed: '#000', fg: colors.white },
};

export function Button({ title, onPress, variant = 'primary', size = 'md', icon, disabled, loading, style, accessibilityLabel }: Props) {
  const p = palette[variant];
  const h = size === 'sm' ? 38 : size === 'lg' ? 52 : 46;
  const fs = size === 'sm' ? 13 : size === 'lg' ? 16 : 15;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!off }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { height: h, backgroundColor: pressed ? p.pressed : p.bg, borderRadius: size === 'sm' ? 9 : radius.lg },
        p.border ? { borderWidth: 1.5, borderColor: p.border } : null,
        size === 'sm' ? { paddingHorizontal: 12 } : null,
        off ? styles.disabled : null,
        style,
      ]}>
      {loading ? <ActivityIndicator color={p.fg} /> : icon ? <Ionicons name={icon} size={fs + 3} color={p.fg} /> : null}
      <Txt weight="bold" size={fs} color={p.fg} numberOfLines={1}>{title}</Txt>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, color = colors.text, bg = 'transparent', size = 44 }: {
  icon: IconName; onPress?: () => void; label: string; color?: string; bg?: string; size?: number;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.divider : bg }]}>
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  disabled: { opacity: 0.5 },
});
