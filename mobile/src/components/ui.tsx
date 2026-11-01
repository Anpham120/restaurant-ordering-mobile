import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState, type ComponentProps, type ReactNode, type Ref } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, TextInput, View, type StyleProp, type TextInputInstance, type TextInputProps, type ViewStyle,
} from 'react-native';

import type { OrderStatus } from '@/lib/api';
import { statusLabel, statusTone } from '@/lib/format';
import { colors, fonts, radius, shadow } from '@/lib/theme';
import { Txt } from './txt';

type IconName = ComponentProps<typeof Ionicons>['name'];

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  return <View style={[styles.card, padded && styles.cardPad, shadow, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Txt weight="extrabold" size={18}>{children}</Txt>
      {right}
    </View>
  );
}

export function Field({ label, hint, error, style, ref, secureTextEntry, ...input }: TextInputProps & {
  label?: string; hint?: string; error?: string | null; ref?: Ref<TextInputInstance>;
}) {
  // password fields get an eye button to show what was typed
  const [shown, setShown] = useState(false);
  return (
    <View style={styles.field}>
      {label ? <Txt weight="semibold" size={14}>{label}</Txt> : null}
      <View>
        <TextInput
          ref={ref}
          placeholderTextColor={colors.faint}
          accessibilityLabel={input.accessibilityLabel ?? label}
          {...input}
          secureTextEntry={!!secureTextEntry && !shown}
          style={[styles.input, input.multiline && styles.inputMulti, secureTextEntry ? { paddingRight: 48 } : null,
            error ? { borderColor: colors.danger } : null, style]}
        />
        {secureTextEntry ? (
          <Pressable accessibilityRole="button" accessibilityLabel={shown ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} hitSlop={8}
            onPress={() => setShown((v) => !v)} style={styles.eye}>
            <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={21} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Txt size={12} color={colors.danger}>{error}</Txt> : hint ? <Txt size={12} color={colors.muted}>{hint}</Txt> : null}
    </View>
  );
}

export function SearchBox(props: TextInputProps) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color={colors.muted} />
      <TextInput placeholderTextColor={colors.muted} {...props} style={styles.searchInput} />
    </View>
  );
}

export function Badge({ label, bg, fg, size = 12 }: { label: string; bg: string; fg: string; size?: number }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Txt weight="bold" size={size} color={fg}>{label}</Txt>
    </View>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const t = statusTone[status];
  return <Badge label={statusLabel[status]} bg={t.bg} fg={t.fg} />;
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={onPress}
      style={[styles.chip, active ? styles.chipOn : styles.chipOff]}>
      {icon ? <Ionicons name={icon} size={15} color={active ? colors.white : colors.textSoft} /> : null}
      <Txt weight="semibold" size={14} color={active ? colors.white : colors.textSoft}>{label}</Txt>
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.seg} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(o.value)}
            style={[styles.segItem, on && styles.segOn]}>
            <Txt weight={on ? 'bold' : 'semibold'} size={14} color={on ? colors.text : colors.neutralText}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({ value, onChange, min = 0, max = 99, size = 32, outline = false }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; size?: number; outline?: boolean;
}) {
  const btn = (icon: IconName, next: number, label: string, filled: boolean) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={next < min || next > max} onPress={() => onChange(next)}
      style={({ pressed }) => [{
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: filled ? (pressed ? colors.primaryPressed : colors.primary) : pressed ? colors.divider : colors.white,
        borderWidth: filled ? 0 : 1.5, borderColor: outline ? '#D6CFC9' : colors.primary, opacity: next < min || next > max ? 0.4 : 1,
      }]}>
      <Ionicons name={icon} size={size * 0.45} color={filled ? colors.white : outline ? colors.text : colors.primary} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {btn('remove', value - 1, 'Bớt', false)}
      <Txt weight="bold" size={15} style={{ minWidth: 18, textAlign: 'center' }}>{value}</Txt>
      {btn('add', value + 1, 'Thêm', !outline)}
    </View>
  );
}

export function AddButton({ onPress, size = 32, label = 'Thêm vào giỏ' }: { onPress: () => void; size?: number; label?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [{ width: size, height: size, borderRadius: size / 2, backgroundColor: pressed ? colors.primaryPressed : colors.primary, alignItems: 'center', justifyContent: 'center' }]}>
      <Ionicons name="add" size={size * 0.6} color={colors.white} />
    </Pressable>
  );
}

/** Dish photo with a neutral placeholder when there is no URL or it fails to load. */
export function FoodImage({ uri, style, rounded = 10 }: { uri: string | null | undefined; style: StyleProp<ViewStyle>; rounded?: number }) {
  return (
    <View style={[{ borderRadius: rounded, overflow: 'hidden', backgroundColor: colors.input, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Ionicons name="restaurant-outline" size={22} color={colors.faint} style={{ position: 'absolute' }} />
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} accessibilityIgnoresInvertColors /> : null}
    </View>
  );
}

export function Stars({ value, size = 14, onChange }: { value: number; size?: number; onChange?: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: onChange ? 6 : 1 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const icon = <Ionicons name={i <= value ? 'star' : 'star-outline'} size={size} color={colors.star} />;
        return onChange ? (
          <Pressable key={i} accessibilityRole="button" accessibilityLabel={`${i} sao`} onPress={() => onChange(i)} hitSlop={4}>{icon}</Pressable>
        ) : <View key={i}>{icon}</View>;
      })}
    </View>
  );
}

export function RatingPill({ avg, count }: { avg: number | null; count?: number }) {
  if (avg == null) return null;
  return (
    <View style={styles.ratingPill}>
      <Ionicons name="star" size={12} color={colors.star} />
      <Txt weight="bold" size={12}>{avg.toFixed(1)}</Txt>
      {count != null ? <Txt size={12} color={colors.muted}>({count})</Txt> : null}
    </View>
  );
}

export function Toggle({ value, onChange, label, disabled }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value, disabled }} disabled={disabled}
      onPress={() => onChange(!value)}
      style={[styles.toggle, { backgroundColor: value ? colors.success : '#D6D3D1', justifyContent: value ? 'flex-end' : 'flex-start', opacity: disabled ? 0.5 : 1 }]}>
      <View style={styles.knob} />
    </Pressable>
  );
}

export function Loading({ label = 'Đang tải…', dark }: { label?: string; dark?: boolean }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={dark ? colors.kitchenAccent : colors.primary} />
      <Txt size={14} color={dark ? colors.kitchenMuted : colors.muted}>{label}</Txt>
    </View>
  );
}

export function Empty({ icon = 'file-tray-outline', title, text, action }: { icon?: IconName; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={[styles.center, { paddingVertical: 40 }]}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={28} color={colors.primary} /></View>
      <Txt weight="bold" size={16} style={{ textAlign: 'center' }}>{title}</Txt>
      {text ? <Txt size={14} color={colors.muted} style={{ textAlign: 'center', maxWidth: 300 }}>{text}</Txt> : null}
      {action}
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Txt size={14} color={colors.danger} style={{ flex: 1 }}>{message}</Txt>
      {onRetry ? <Pressable onPress={onRetry} accessibilityRole="button"><Txt weight="bold" size={14} color={colors.danger}>Thử lại</Txt></Pressable> : null}
    </View>
  );
}

export function Notice({ icon = 'information-circle', text, tone = 'warning' }: { icon?: IconName; text: string; tone?: 'warning' | 'success' | 'info' | 'danger' }) {
  const map = {
    warning: [colors.warningSoft, colors.warningText], success: [colors.successSoft, colors.success],
    info: [colors.infoSoft, colors.info], danger: [colors.dangerSoft, colors.danger],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={[styles.notice, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={16} color={fg} />
      <Txt weight="semibold" size={13} color={fg} style={{ flex: 1 }}>{text}</Txt>
    </View>
  );
}

export function Divider() { return <View style={{ height: 1, backgroundColor: colors.divider }} />; }

export function Line({ label, value, strong, valueColor }: { label: string; value: string; strong?: boolean; valueColor?: string }) {
  return (
    <View style={styles.line}>
      <Txt size={14} color={strong ? colors.text : colors.muted} weight={strong ? 'semibold' : 'regular'}>{label}</Txt>
      <Txt size={strong ? 18 : 14} weight={strong ? 'extrabold' : 'regular'} color={valueColor ?? (strong ? colors.primary : colors.text)}>{value}</Txt>
    </View>
  );
}

export const inputStyle = { fontFamily: fonts.regular };

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg },
  cardPad: { padding: 14 },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  field: { gap: 6 },
  input: {
    fontFamily: fonts.regular, fontSize: 15, color: colors.text, height: 48, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 12, paddingHorizontal: 14, backgroundColor: colors.white,
  },
  inputMulti: { height: 76, paddingTop: 12, textAlignVertical: 'top' },
  eye: { position: 'absolute', right: 4, top: 0, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.input, borderRadius: 12, paddingHorizontal: 14, height: 46 },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, height: 46 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipOn: { backgroundColor: colors.text },
  chipOff: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  seg: { flexDirection: 'row', backgroundColor: '#EDE7E2', borderRadius: 12, padding: 4, gap: 4 },
  segItem: { flex: 1, height: 38, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: colors.white },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  toggle: { width: 42, height: 24, borderRadius: 12, padding: 3, flexDirection: 'row' },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.white },
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.dangerSoft, borderRadius: 10, padding: 12 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
