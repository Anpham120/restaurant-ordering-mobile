import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/lib/theme';
import { Txt } from './txt';

/** Customer screens are phone-first; on wide web they sit in a centered phone-width column. */
export function PhoneFrame({ children, bg = colors.bg }: { children: ReactNode; bg?: string }) {
  return (
    <View style={styles.outer}>
      <View style={[styles.column, { backgroundColor: bg }]}>{children}</View>
    </View>
  );
}

export function TopBar({ title, right, onBack }: { title: string; right?: ReactNode; onBack?: () => void }) {
  const insets = useSafeAreaInsets();
  const back = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')));
  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={back} style={styles.back} hitSlop={6}>
        <Ionicons name="chevron-back" size={24} color={colors.text} />
      </Pressable>
      <Txt weight="extrabold" size={18} style={{ flex: 1 }} numberOfLines={1}>{title}</Txt>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#E7E0DA', alignItems: 'center' },
  column: { flex: 1, width: '100%', maxWidth: 480 },
  bar: { backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, minHeight: 60, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
