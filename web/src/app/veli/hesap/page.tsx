import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/Button';
import { Card, CardContent } from '@/components/Card';
import { SectionHeader } from '@/components/SectionHeader';
import { SignOutButton } from '@/components/SignOutButton';
import { withdrawConsentAction } from '@/features/account/actions';
import styles from '@/features/questions/page.module.css';
import { parseConsents } from '@/lib/account-data';
import { requireRole } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.account.title };
export const dynamic = 'force-dynamic';

const dayFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeZone: 'Europe/Istanbul' });
const day = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : dayFormatter.format(date);
};

type ConsentKey = keyof typeof tr.account.consentTypes;

/** Veli hesabı: e-posta, verdiği onaylar (geri çekme) ve yasal bağlantılar. */
export default async function GuardianAccountPage() {
  await requireRole('veli');
  let email = '';
  let consents: ReturnType<typeof parseConsents> = [];
  try {
    const supabase = await createSupabaseServerClient();
    const [claims, rows] = await Promise.all([
      supabase.auth.getClaims(),
      supabase.from('consents').select('id, type, doc_version, accepted_at, student_id').eq('granted', true).is('withdrawn_at', null).limit(100),
    ]);
    email = typeof claims.data?.claims?.email === 'string' ? claims.data.claims.email : '';
    consents = rows.error ? [] : parseConsents(rows.data);
  } catch {
    // Ayar ya da ağ sorunu: sayfa boş listeyle açılır.
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.account.title}</h1>
      {email ? (
        <p className={styles.intro}>
          {tr.account.emailLabel}: {email}
        </p>
      ) : null}

      <section className={styles.section} aria-labelledby="onaylar">
        <SectionHeader id="onaylar" title={tr.account.consentsTitle} subtitle={tr.account.consentsHelp} />
        {consents.length === 0 ? (
          <p className={styles.note}>{tr.account.consentsEmpty}</p>
        ) : (
          <ul className={styles.pool}>
            {consents.map((item) => (
                <li key={item.id}>
                  <Card tone={item.type === 'acik_riza_dolayli_saglik' ? 'warm' : 'neutral'}>
                    <CardContent
                      title={tr.account.consentTypes[item.type as ConsentKey] ?? item.type}
                      description={tr.account.consentLine(item.version, day(item.acceptedAt))}
                    />
                    <form action={withdrawConsentAction} className={styles.section}>
                      <input type="hidden" name="consentId" value={item.id} />
                      {item.type === 'acik_riza_dolayli_saglik' ? <p className={styles.note}>{tr.account.withdrawWarning}</p> : null}
                      <div>
                        <Button type="submit" variant="secondary">
                          {tr.account.withdraw}
                        </Button>
                      </div>
                    </form>
                  </Card>
                </li>
            ))}
          </ul>
        )}
      </section>

      <p className={styles.note}>{tr.account.rightsNote}</p>
      <p className={styles.note}>
        <Link href="/gizlilik">{tr.account.privacyLink}</Link> · <Link href="/cerezler">{tr.account.cookiesLink}</Link>
      </p>
      <SignOutButton />
    </div>
  );
}
