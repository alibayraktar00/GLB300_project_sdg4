import { BrandMark } from '@/components/BrandMark';
import { ButtonLink } from '@/components/Button';
import { PublicPage } from '@/components/PublicPage';
import { SectionHeader } from '@/components/SectionHeader';
import { WelcomeChoices } from '@/components/WelcomeChoices';
import { isGalleryEnabled } from '@/lib/gallery';
import { tr } from '@/strings/tr';

import styles from './page.module.css';

/**
 * Açılış ekranı: "Veliyim / Gönüllüyüm / Öğrenciyim" (docs/ekran-akislari.md, O1).
 * Oturum varsa rolün ana sayfasına yönlendirme Faz A'da eklenecek.
 */
export default function HomePage() {
  const showGalleryLink = isGalleryEnabled(process.env);

  return (
    <PublicPage>
      <div className={styles.layout}>
        <div className={styles.intro}>
          <BrandMark size="large" />
          <h1 className={styles.title}>{tr.home.title}</h1>
          <p className={styles.description}>{tr.home.description}</p>
        </div>

        <section className={styles.choices} aria-labelledby="giris-secenekleri">
          <SectionHeader id="giris-secenekleri" title={tr.home.chooseTitle} />
          <WelcomeChoices />
          <p className={styles.note}>{tr.home.studentNote}</p>
          {showGalleryLink ? (
            <div>
              <ButtonLink href="/galeri" variant="text" icon="palette">
                {tr.home.galleryLink}
              </ButtonLink>
            </div>
          ) : null}
        </section>
      </div>
    </PublicPage>
  );
}
