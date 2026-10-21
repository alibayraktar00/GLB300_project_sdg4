import type { ReactNode } from 'react';

import { AppShell } from '@/components/AppShell';
import { requireRole } from '@/server/session';

/** Oturumlu alan: rol denetimi + rol iskeleti. Gerçek erişim denetimi veritabanında (RLS) yapılır. */
export default async function Layout({ children }: { children: ReactNode }) {
  await requireRole('ogrenci');
  return <AppShell appRole="ogrenci">{children}</AppShell>;
}
