import { Redirect, Slot } from 'expo-router';

import { BackOffice } from '@/components/backoffice';
import { homeFor, useSession } from '@/lib/session';

export default function AdminLayout() {
  const { user } = useSession();
  if (!user) return <Redirect href="/login" />;
  if (user.role !== 'MANAGER') return <Redirect href={homeFor(user.role)} />;
  return <BackOffice><Slot /></BackOffice>;
}
