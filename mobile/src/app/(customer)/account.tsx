import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Txt } from '@/components/txt';
import { Card } from '@/components/ui';
import { api, type Store } from '@/lib/api';
import { confirmAction } from '@/lib/confirm';
import { initials } from '@/lib/format';
import { useLoad } from '@/lib/hooks';
import { useSession } from '@/lib/session';
import { colors, radius, shadow } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

export default function AccountTab() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useSession();
  const store = useLoad<Store>(() => api.store());

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={[styles.head, { paddingTop: insets.top + 20 }]}>
        {user ? (
          <>
            <View style={styles.avatar}><Txt weight="extrabold" size={20} color={colors.primaryText}>{initials(user.fullName)}</Txt></View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt weight="extrabold" size={18}>{user.fullName}</Txt>
              <Txt size={14} color={colors.muted} numberOfLines={1}>{user.phone}{user.email ? ` · ${user.email}` : ''}</Txt>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Sửa thông tin" onPress={() => router.push('/profile')} style={styles.edit}>
              <Ionicons name="create-outline" size={21} color={colors.text} />
            </Pressable>
          </>
        ) : (
          <View style={{ flex: 1, gap: 10 }}>
            <Txt weight="extrabold" size={20}>Chào mừng đến Atlas Restaurant</Txt>
            <Txt size={14} color={colors.muted}>Đăng nhập để đặt món, lưu địa chỉ và theo dõi đơn hàng.</Txt>
            <Button title="Đăng nhập / Đăng ký" onPress={() => router.push('/login')} />
          </View>
        )}
      </View>

      <View style={{ padding: 16, gap: 12 }}>
        {user ? (
          <View style={[styles.menu, shadow]}>
            <Row icon="location-outline" label="Sổ địa chỉ" onPress={() => router.push('/addresses')} />
            <Row icon="receipt-outline" label="Đơn hàng của tôi" onPress={() => router.push('/orders')} />
            <Row icon="heart-outline" label="Món yêu thích" onPress={() => router.push('/favorites')} />
            <Row icon="chatbubble-ellipses-outline" label="Góp ý & hỗ trợ" onPress={() => router.push('/feedback')} />
            <Row icon="key-outline" label="Thông tin & mật khẩu" onPress={() => router.push('/profile')} last />
          </View>
        ) : null}

        {store.data ? (
          <Card style={{ gap: 6 }}>
            <Txt weight="extrabold" size={15}>{store.data.storeName}</Txt>
            <Txt size={14} color={colors.textSoft}>{store.data.storeAddress}</Txt>
            <Txt size={14} color={colors.textSoft}>Giờ nhận đơn: {store.data.openTime.slice(0, 5)} – {store.data.closeTime.slice(0, 5)}</Txt>
            <Pressable accessibilityRole="button" onPress={() => void Linking.openURL(`tel:${store.data!.hotline}`)} style={styles.hotline}>
              <Ionicons name="call" size={16} color={colors.primary} />
              <Txt weight="bold" size={14} color={colors.primary}>Hotline {store.data.hotline}</Txt>
            </Pressable>
          </Card>
        ) : null}

        {user ? (
          <View style={[styles.menu, shadow]}>
            <Pressable accessibilityRole="button" style={styles.row}
              onPress={async () => { if (await confirmAction('Đăng xuất khỏi tài khoản?', 'Đăng xuất')) { logout(); router.replace('/'); } }}>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <Txt weight="semibold" size={15} color={colors.danger}>Đăng xuất</Txt>
            </Pressable>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

function Row({ icon, label, onPress, last }: { icon: IconName; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && { backgroundColor: colors.bg }]}>
      <Ionicons name={icon} size={20} color={colors.text} />
      <Txt size={15} style={{ flex: 1 }}>{label}</Txt>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  head: { backgroundColor: colors.white, paddingHorizontal: 16, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  edit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  menu: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 14 },
  rowLine: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  hotline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, minHeight: 32 },
});
