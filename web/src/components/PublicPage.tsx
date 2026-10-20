import type { ReactNode } from 'react';

import { NoticeRegion } from './Notice';
import styles from './PublicPage.module.css';
import { SiteFooter } from './SiteFooter';

/**
 * Oturum gerektirmeyen sayfaların çerçevesi: `<main id="icerik">` + bildirim bölgesi + site altbilgisi.
 * Açılış, yasal sayfalar, hata ve 404 sayfaları bunu kullanır. Oturumlu alanlar `AppShell` kullanır.
 */
export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className={styles.frame}>
      <main id="icerik" tabIndex={-1} className={styles.main}>
        {children}
      </main>
      <NoticeRegion />
      <SiteFooter />
    </div>
  );
}
