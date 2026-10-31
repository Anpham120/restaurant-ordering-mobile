import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/lib/theme';

interface Props {
  children: ReactNode;
  error?: string | null;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
}

/** Scrollable page body with an optional error banner and pull-to-refresh. */
export function Screen({ children, error, onRefresh, refreshing }: Props) {
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={() => { void onRefresh(); }} /> : undefined}>
      <View style={styles.inner}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {children}
      </View>
    </ScrollView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Row({ children, gap = 8 }: { children: ReactNode; gap?: number }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap }}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, alignItems: 'center' },
  inner: { width: '100%', maxWidth: 640, gap: 12 },
  error: { color: colors.danger, backgroundColor: '#FEE2E2', padding: 10, borderRadius: 8 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  muted: { color: colors.muted, fontSize: 14 },
});
