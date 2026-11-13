import type { Metadata } from 'next';

import { RoleHome } from '@/components/RoleHome';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.nav.guardianHome };

export default function GuardianHomePage() {
  return <RoleHome appRole="veli" />;
}
