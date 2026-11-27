import type { Metadata } from 'next';

import { RoleHome } from '@/components/RoleHome';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.nav.today };

export default function StudentTodayPage() {
  return <RoleHome appRole="ogrenci" />;
}
