import type { Metadata } from 'next';

import { PublicPage } from '@/components/PublicPage';
import { EmptyState } from '@/components/StateViews';
import { tr } from '@/strings/tr';

import { SignOutButton } from '@/components/SignOutButton';

export const metadata: Metadata = { title: tr.auth.statusTitle };

/** Hesap etkin değilken (beklemede / askıda) gösterilen sakin bilgi sayfası. Nedeni açıklamaz. */
export default function StatusPage() {
  return (
    <PublicPage>
      <EmptyState title={tr.auth.statusTitle} message={tr.auth.statusBody} icon="info" />
      <SignOutButton />
    </PublicPage>
  );
}
