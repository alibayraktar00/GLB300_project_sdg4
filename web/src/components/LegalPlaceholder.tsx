import { ButtonLink } from '@/components/Button';
import { PublicPage } from '@/components/PublicPage';
import { SectionHeader } from '@/components/SectionHeader';
import { tr } from '@/strings/tr';

import styles from './LegalPlaceholder.module.css';

/**
 * Yasal sayfalar için GEÇİCİ yer tutucu. Gerçek metinler (`docs/hukuk/`) avukat incelemesinden sonra
 * `legal_documents` tablosundan okunup bu adreslerde gösterilecek (Faz A, "S" bileşeni, anon okuma).
 * Altbilgideki `/gizlilik` ve `/cerezler` bağlantıları böylece 404 vermez.
 */
export function LegalPlaceholder({ title }: { title: string }) {
  return (
    <PublicPage>
      <div className={styles.page}>
        <SectionHeader level={1} title={title} />
        <p className={styles.body}>{tr.legalPlaceholder.body}</p>
        <div>
          <ButtonLink href="/" variant="secondary" icon="arrow_back">
            {tr.common.homeLink}
          </ButtonLink>
        </div>
      </div>
    </PublicPage>
  );
}
