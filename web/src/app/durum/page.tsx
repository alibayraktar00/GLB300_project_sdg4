import type { Metadata } from 'next';

import { PublicPage } from '@/components/PublicPage';
import { SignOutButton } from '@/components/SignOutButton';
import { StateView } from '@/components/StateViews';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.auth.statusTitle };

/** Hesap aktif değilken (`profiles.status` ≠ `aktif`) `requireRole` buraya gönderir. */
export default function AccountStatusPage() {
  return (
    <PublicPage>
      <StateView
        icon="info"
        headingLevel={1}
        title={tr.auth.statusTitle}
        message={tr.auth.statusBody}
        action={<SignOutButton />}
      />
    </PublicPage>
  );
}
