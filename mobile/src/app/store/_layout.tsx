import { Platform } from 'react-native';
import { Redirect, Slot, usePathname } from 'expo-router';

import { BackOffice } from '@/components/backoffice';
import { homeFor, useSession } from '@/lib/session';

export default function StoreLayout() {
  const { user } = useSession();
  const path = usePathname();
  // the phone app is for customers: store pages exist only on the web
  if (Platform.OS !== 'web') return <Redirect href="/" />;
  if (!user) return <Redirect href="/login" />;
  if (user.role === 'CUSTOMER') return <Redirect href="/" />;
  // the kitchen display is a full-screen dark page without navigation
  if (path.startsWith('/store/kitchen')) return <Slot />;
  if (user.role === 'KITCHEN') return <Redirect href={homeFor(user.role)} />;
  return <BackOffice><Slot /></BackOffice>;
}
