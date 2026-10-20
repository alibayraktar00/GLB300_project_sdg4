import Link from 'next/link';

import { tr } from '@/strings/tr';

import styles from './SiteFooter.module.css';

/**
 * Site altbilgisi: her herkese açık sayfanın sonunda gizlilik ve çerez politikası bağlantıları
 * (`cerez-politikasi.md` §1 sonuç 3: "Her sayfanın alt kısmında /cerezler bağlantısı bulunur").
 * Giriş yapılmış alanlarda bu bağlantılar Ayarlar > Yasal metinler'dedir.
 */
export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.name}>{tr.appName}</p>
        <nav aria-label={tr.footer.label}>
          <ul className={styles.list}>
            <li>
              <Link href="/gizlilik" className={styles.link}>
                {tr.footer.privacy}
              </Link>
            </li>
            <li>
              <Link href="/cerezler" className={styles.link}>
                {tr.footer.cookies}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
