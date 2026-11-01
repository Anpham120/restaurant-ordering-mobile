import { BeVietnamPro_400Regular } from '@expo-google-fonts/be-vietnam-pro/400Regular';
import { BeVietnamPro_500Medium } from '@expo-google-fonts/be-vietnam-pro/500Medium';
import { BeVietnamPro_600SemiBold } from '@expo-google-fonts/be-vietnam-pro/600SemiBold';
import { BeVietnamPro_700Bold } from '@expo-google-fonts/be-vietnam-pro/700Bold';
import { BeVietnamPro_800ExtraBold } from '@expo-google-fonts/be-vietnam-pro/800ExtraBold';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { router, Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Loading } from '@/components/ui';
import { CartProvider } from '@/lib/cart';
import { SessionProvider, useSession } from '@/lib/session';
import { colors } from '@/lib/theme';
import { ToastProvider } from '@/lib/toast';

function Gate() {
  const { ready, user, notice } = useSession();
  const segments = useSegments();
  const here = segments[0] ?? '';
  const mustChange = !!user?.mustChangePassword;
  useEffect(() => {
    if (!ready) return;
    // temporary password: the API only allows /me and /change-password, so nothing else can be opened
    if (mustChange && here !== 'set-password') router.replace('/set-password');
    // session expired or revoked: back to the login screen, which explains why
    else if (!user && notice && here !== 'login' && here !== 'forgot-password') router.replace('/login');
  }, [ready, mustChange, user, notice, here]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}><Loading /></View>;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="set-password" options={{ gestureEnabled: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    BeVietnamPro_400Regular, BeVietnamPro_500Medium, BeVietnamPro_600SemiBold, BeVietnamPro_700Bold, BeVietnamPro_800ExtraBold,
    ...Ionicons.font,
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <CartProvider>
          <ToastProvider>
            <StatusBar style="dark" />
            <Gate />
          </ToastProvider>
        </CartProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
