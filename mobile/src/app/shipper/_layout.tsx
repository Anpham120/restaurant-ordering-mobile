import { Redirect, Stack } from 'expo-router';

import { homeFor, useSession } from '@/lib/session';
import { colors } from '@/lib/theme';

/** Shipper app: phone-first screens, only for SHIPPER accounts. */
export default function ShipperLayout() {
  const { user } = useSession();
  if (!user) return <Redirect href="/login" />;
  if (user.role !== 'SHIPPER') return <Redirect href={homeFor(user.role)} />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}
