import type { Metadata } from 'next';

import { RoleHome } from '@/components/RoleHome';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.nav.volunteerHome };

export default function VolunteerHomePage() {
  return <RoleHome appRole="gonullu" />;
}
