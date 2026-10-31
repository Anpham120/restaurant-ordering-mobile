import { Redirect, Stack, Tabs } from 'expo-router';
import { Text } from 'react-native';

import { Button } from '@/components/button';
import type { Role } from '@/lib/api';
import { useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

interface ScreenDef { name: string; title: string; icon: string }

function useGuard(roles: Role[]) {
  const { user, logout } = useSession();
  const allowed = !!user && roles.includes(user.role);
  const logoutButton = () => <Button small variant="ghost" title="Đăng xuất" onPress={logout} />;
  return { allowed, logoutButton };
}

const header = { headerStyle: { backgroundColor: colors.bg }, headerTitleAlign: 'center' as const };

/** Role-protected bottom tabs with a logout button; unauthenticated users go back to the entry screen. */
export function RoleTabs({ roles, screens, title }: { roles: Role[]; screens: ScreenDef[]; title: string }) {
  const { allowed, logoutButton } = useGuard(roles);
  if (!allowed) return <Redirect href="/" />;
  return (
    <Tabs screenOptions={{ ...header, tabBarActiveTintColor: colors.primary, headerRight: logoutButton }}>
      {screens.map((s) => (
        <Tabs.Screen key={s.name} name={s.name} options={{ title: `${title} · ${s.title}`, tabBarLabel: s.title, tabBarIcon: () => <Text style={{ fontSize: 18 }}>{s.icon}</Text> }} />
      ))}
    </Tabs>
  );
}

export function RoleStack({ roles, title }: { roles: Role[]; title: string }) {
  const { allowed, logoutButton } = useGuard(roles);
  if (!allowed) return <Redirect href="/" />;
  return (
    <Stack screenOptions={{ ...header, headerRight: logoutButton }}>
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}
