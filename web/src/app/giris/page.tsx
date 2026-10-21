import type { Metadata } from 'next';

import { ButtonLink } from '@/components/Button';
import { PublicPage } from '@/components/PublicPage';
import { safeNextPath } from '@/lib/auth';
import { tr } from '@/strings/tr';

import { loginWithEmail } from './actions';
import { LoginForm } from './LoginForm';
import styles from './page.module.css';

export const metadata: Metadata = { title: tr.auth.loginTitle };

type PageProps = { searchParams: Promise<{ devam?: string | string[] }> };

/** Veli, gönüllü ve yönetici girişi (docs/ekran-akislari.md O1). Öğrenci girişi ayrı sayfadadır. */
export default async function LoginPage({ searchParams }: PageProps) {
  const { devam } = await searchParams;
  const next = safeNextPath(Array.isArray(devam) ? devam[0] : devam) ?? undefined;

  return (
    <PublicPage>
      <div className={styles.layout}>
        <h1 className={styles.title}>{tr.auth.loginTitle}</h1>
        <p className={styles.intro}>{tr.auth.loginIntro}</p>
        <LoginForm mode="email" action={loginWithEmail} next={next} />
        <div className={styles.links}>
          <ButtonLink href="/kayit/veli" variant="text" icon="family_restroom">
            {tr.auth.signupPrompt}
          </ButtonLink>
          <ButtonLink href="/giris/ogrenci" variant="text" icon="backpack">
            {tr.auth.studentLink}
          </ButtonLink>
        </div>
      </div>
    </PublicPage>
  );
}
