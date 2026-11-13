import { requireRole } from '@/server/session';
import type { AppRole } from '@/lib/role-navigation';
import { tr } from '@/strings/tr';

import { AppShell } from './AppShell';
import styles from './RoleHome.module.css';
import { SectionHeader } from './SectionHeader';
import { SignOutButton } from './SignOutButton';

/**
 * Rolün ana sayfası (şimdilik yalnızca karşılama ve çıkış). Rol ve hesap durumu `requireRole` ile denetlenir;
 * gerçek erişim denetimi veritabanındadır (RLS).
 */
export async function RoleHome({ appRole }: { appRole: AppRole }) {
  const user = await requireRole(appRole);
  return (
    <AppShell appRole={appRole}>
      <div className={styles.page}>
        <SectionHeader level={1} title={tr.auth.welcome(user.display_name)} />
        <SignOutButton />
      </div>
    </AppShell>
  );
}
