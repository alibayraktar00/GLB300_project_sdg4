import type { Metadata } from 'next';

import { ButtonLink } from '@/components/Button';
import { PublicPage } from '@/components/PublicPage';
import { safeNextPath } from '@/lib/auth';
import { tr } from '@/strings/tr';

import { loginStudent } from '../actions';
import { LoginForm } from '../LoginForm';
import styles from '../page.module.css';

export const metadata: Metadata = { title: tr.auth.studentTitle };

type PageProps = { searchParams: Promise<{ devam?: string | string[] }> };

/** Öğrenci girişi: velinin verdiği kullanıcı adı ve şifre (docs/ekran-akislari.md Ö0). */
export default async function StudentLoginPage({ searchParams }: PageProps) {
  const { devam } = await searchParams;
  const next = safeNextPath(Array.isArray(devam) ? devam[0] : devam) ?? undefined;

  return (
    <PublicPage>
      <div className={styles.layout}>
        <h1 className={styles.title}>{tr.auth.studentTitle}</h1>
        <p className={styles.intro}>{tr.auth.studentIntro}</p>
        <LoginForm mode="student" action={loginStudent} next={next} />
        <div className={styles.links}>
          <ButtonLink href="/giris" variant="text" icon="family_restroom">
            {tr.auth.adultLink}
          </ButtonLink>
        </div>
      </div>
    </PublicPage>
  );
}
