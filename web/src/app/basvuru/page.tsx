import type { Metadata } from 'next';

import { ButtonLink } from '@/components/Button';
import { PublicPage } from '@/components/PublicPage';
import { tr } from '@/strings/tr';

import styles from '../giris/page.module.css';

import { VolunteerSignup } from './VolunteerSignup';

export const metadata: Metadata = { title: tr.volunteer.title };

/** Gönüllü başvurusu (docs/ekran-akislari.md G1). Yalnızca üniversite (edu.tr) e-postasıyla. */
export default function VolunteerApplicationPage() {
  return (
    <PublicPage>
      <div className={styles.layout}>
        <h1 className={styles.title}>{tr.volunteer.title}</h1>
        <p className={styles.intro}>{tr.volunteer.intro}</p>
        <VolunteerSignup />
        <div className={styles.links}>
          <ButtonLink href="/giris" variant="text" icon="arrow_back">
            {tr.signup.loginLink}
          </ButtonLink>
        </div>
      </div>
    </PublicPage>
  );
}
