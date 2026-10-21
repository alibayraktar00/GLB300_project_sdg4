import { SignOutButton } from '@/components/SignOutButton';
import { EmptyState } from '@/components/StateViews';
import { tr } from '@/strings/tr';

/** Geçici sayfa: bu bölüm sonraki fazlarda yazılacak. */
export default function Page() {
  return (
    <>
      <EmptyState title={tr.auth.comingSoonTitle} message={tr.auth.comingSoonBody} />
      <SignOutButton />
    </>
  );
}
