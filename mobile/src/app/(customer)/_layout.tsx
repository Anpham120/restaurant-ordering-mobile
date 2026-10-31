import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { PhoneFrame } from '@/components/phone';
import { homeFor, useSession } from '@/lib/session';
import { colors, fonts } from '@/lib/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const icon = (on: IconName, off: IconName) => function TabIcon({ focused, color }: { focused: boolean; color: ColorValue }) {
  return <Ionicons name={focused ? on : off} size={23} color={color as string} />;
};

export default function CustomerTabs() {
  const { user } = useSession();
  // store staff never see the shopping app
  if (user && user.role !== 'CUSTOMER') return <Redirect href={homeFor(user.role)} />;
  return (
    <PhoneFrame>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: { height: 72, paddingTop: 8, paddingBottom: 10, borderTopColor: colors.border, backgroundColor: colors.white },
          tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
          sceneStyle: { backgroundColor: colors.bg },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Trang chủ', tabBarIcon: icon('home', 'home-outline') }} />
        <Tabs.Screen name="orders" options={{ title: 'Đơn hàng', tabBarIcon: icon('receipt', 'receipt-outline') }} />
        <Tabs.Screen name="favorites" options={{ title: 'Yêu thích', tabBarIcon: icon('heart', 'heart-outline') }} />
        <Tabs.Screen name="account" options={{ title: 'Tài khoản', tabBarIcon: icon('person', 'person-outline') }} />
      </Tabs>
    </PhoneFrame>
  );
}
