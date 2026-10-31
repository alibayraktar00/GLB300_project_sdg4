import type { Metadata } from 'next';

import { Button } from '@/components/Button';
import { Card, CardContent } from '@/components/Card';
import { SectionHeader } from '@/components/SectionHeader';
import { setAccountStatusAction } from '@/features/admin/userActions';
import styles from '@/features/questions/page.module.css';
import { parseUsers, USER_ROLES } from '@/lib/users-data';
import { requireAdminMfa } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.users.title };
export const dynamic = 'force-dynamic';

/** Kullanıcılar: role göre gruplu hesap listesi; askıya alma / yeniden etkinleştirme (yönetici hesapları değiştirilemez). */
export default async function UsersPage() {
  await requireAdminMfa();
  const users = await createSupabaseServerClient()
    .then((supabase) => supabase.from('profiles').select('id, display_name, role, status, created_at').order('created_at', { ascending: false }).limit(300))
    .then(({ data, error }) => (error ? [] : parseUsers(data)))
    .catch(() => []);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.users.title}</h1>
      <p className={styles.note}>{tr.users.help}</p>
      {users.length === 0 ? <p className={styles.note}>{tr.users.empty}</p> : null}

      {USER_ROLES.map((role) => {
        const own = users.filter((user) => user.role === role);
        if (own.length === 0) return null;
        return (
          <section key={role} className={styles.section} aria-labelledby={`rol-${role}`}>
            <SectionHeader id={`rol-${role}`} title={tr.users.roles[role]} subtitle={tr.users.count(own.length)} />
            <ul className={styles.pool}>
              {own.map((user) => (
                <li key={user.id}>
                  <Card tone={user.status === 'askida' ? 'warm' : 'neutral'}>
                    <CardContent title={user.name} description={tr.users.statuses[user.status]} />
                    {role !== 'yonetici' ? (
                      <form action={setAccountStatusAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="status" value={user.status === 'askida' ? 'aktif' : 'askida'} />
                        <Button type="submit" variant="secondary">
                          {user.status === 'askida' ? tr.users.activate : tr.users.suspend}
                        </Button>
                      </form>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
