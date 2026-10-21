import type { Metadata } from 'next';

import { ButtonLink } from '@/components/Button';
import { PublicPage } from '@/components/PublicPage';
import { tr } from '@/strings/tr';

import styles from '../../giris/page.module.css';

import { SignupWizard } from './SignupWizard';

export const metadata: Metadata = { title: tr.signup.title };

/** Veli kaydı (docs/ekran-akislari.md V1). Öğrenci hesabını veli açar; öğrenci kendi kendine kayıt olamaz. */
export default function GuardianSignupPage() {
  return (
    <PublicPage>
      <div className={styles.layout}>
        <h1 className={styles.title}>{tr.signup.title}</h1>
        <p className={styles.intro}>{tr.signup.intro}</p>
        <SignupWizard />
        <div className={styles.links}>
          <ButtonLink href="/giris" variant="text" icon="arrow_back">
            {tr.signup.loginLink}
          </ButtonLink>
        </div>
      </div>
    </PublicPage>
  );
}
