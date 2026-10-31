import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirmAction } from '@/lib/confirm';
import { roleLabel } from '@/lib/format';
import { useWide } from '@/lib/hooks';
import { navFor } from '@/lib/nav';
import { useSession } from '@/lib/session';
import { colors, radius } from '@/lib/theme';
import { Txt } from './txt';

/** Store and admin pages: dark sidebar on wide screens, scrollable top navigation on phones. */
export function BackOffice({ children }: { children: ReactNode }) {
  const wide = useWide(900);
  const insets = useSafeAreaInsets();
  const path = usePathname();
  const { user, logout } = useSession();
  const items = navFor(user?.role);
  const isActive = (href: string) => (href === '/admin' ? path === '/admin' : path === href || path.startsWith(`${href}/`));

  const signOut = async () => {
    if (await confirmAction('Đăng xuất khỏi tài khoản?', 'Đăng xuất')) { logout(); router.replace('/login'); }
  };

  if (!wide) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
          <View style={styles.topRow}>
            <Txt weight="extrabold" size={18} color={colors.white}>Atlas Restaurant</Txt>
            <Pressable accessibilityRole="button" accessibilityLabel="Đăng xuất" onPress={signOut} style={styles.topIcon}>
              <Ionicons name="log-out-outline" size={22} color={colors.sidebarText} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingRight: 12 }}>
            {items.map((n) => (
              <Pressable key={n.href} accessibilityRole="link" onPress={() => router.navigate(n.href as never)}
                style={[styles.topItem, isActive(n.href) && styles.itemOn]}>
                <Txt weight="semibold" size={13} color={isActive(n.href) ? colors.white : colors.sidebarText}>{n.label}</Txt>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        <View style={{ flex: 1 }}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.wide}>
      <View style={styles.side}>
        <Txt weight="extrabold" size={20} color={colors.white} style={{ paddingHorizontal: 10, paddingBottom: 14 }}>Atlas Restaurant</Txt>
        <ScrollView contentContainerStyle={{ gap: 4 }}>
          {items.map((n) => {
            const on = isActive(n.href);
            return (
              <Pressable key={n.href} accessibilityRole="link" accessibilityState={{ selected: on }} onPress={() => router.navigate(n.href as never)}
                style={({ pressed }) => [styles.item, on && styles.itemOn, pressed && !on && { backgroundColor: '#292524' }]}>
                <Ionicons name={n.icon} size={18} color={on ? colors.white : colors.kitchenMuted} />
                <Txt weight="semibold" size={15} color={on ? colors.white : colors.sidebarText}>{n.label}</Txt>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.me}>
          <Txt weight="semibold" size={14} color={colors.white} numberOfLines={1}>{user?.fullName}</Txt>
          <Txt size={12} color={colors.kitchenMuted}>{user ? roleLabel[user.role] : ''}</Txt>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/profile')} hitSlop={6}>
              <Txt weight="semibold" size={13} color={colors.kitchenAccent}>Tài khoản</Txt>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={signOut} hitSlop={6}>
              <Txt weight="semibold" size={13} color={colors.kitchenAccent}>Đăng xuất</Txt>
            </Pressable>
          </View>
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
    </View>
  );
}

/** Page header + scrollable body used by every back-office page. */
export function Page({ title, subtitle, actions, children, scroll = true }: {
  title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; scroll?: boolean;
}) {
  const head = (
    <View style={styles.pageHead}>
      <View style={{ gap: 2, flexShrink: 1 }}>
        <Txt weight="extrabold" size={24}>{title}</Txt>
        {subtitle ? <Txt size={14} color={colors.muted}>{subtitle}</Txt> : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
  if (!scroll) return <View style={[styles.page, { flex: 1 }]}>{head}{children}</View>;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {head}
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wide: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  side: { width: 240, backgroundColor: colors.sidebar, paddingVertical: 20, paddingHorizontal: 14 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 42, paddingHorizontal: 10, borderRadius: radius.md },
  itemOn: { backgroundColor: colors.primary },
  me: { borderTopWidth: 1, borderTopColor: '#292524', paddingTop: 12, paddingHorizontal: 10, marginTop: 10 },
  topbar: { backgroundColor: colors.sidebar, paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 4 },
  topIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topItem: { height: 36, paddingHorizontal: 12, borderRadius: radius.md, justifyContent: 'center' },
  page: { padding: 24, gap: 16, paddingBottom: 48 },
  pageHead: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
});
