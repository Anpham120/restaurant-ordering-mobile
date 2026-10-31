import { Redirect, Tabs } from 'expo-router';
import { Text } from 'react-native';

import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

export default function CustomerLayout() {
  const { tableToken, tableCode, cart } = useSession();
  if (!tableToken) return <Redirect href="/" />;
  const count = cart.reduce((n, l) => n + l.quantity, 0);
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerStyle: { backgroundColor: colors.bg }, headerTitleAlign: 'center' }}>
      <Tabs.Screen name="menu" options={{ title: `Thực đơn · Bàn ${tableCode}`, tabBarLabel: 'Thực đơn', tabBarIcon: () => <Text style={{ fontSize: 18 }}>🍽️</Text> }} />
      <Tabs.Screen name="cart" options={{ title: 'Giỏ hàng', tabBarIcon: () => <Text style={{ fontSize: 18 }}>🛒</Text>, tabBarBadge: count > 0 ? count : undefined }} />
      <Tabs.Screen name="orders" options={{ title: 'Đơn của tôi', tabBarIcon: () => <Text style={{ fontSize: 18 }}>🧾</Text> }} />
    </Tabs>
  );
}
