import Link from 'next/link';
import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';
import { roleActions, roleDestinations, type AppRole } from '@/lib/role-navigation';
import { tr } from '@/strings/tr';

import styles from './AppShell.module.css';
import { BrandMark } from './BrandMark';
import { Icon, NavIcon } from './Icon';
import { NavLink } from './NavLink';
import { NoticeRegion } from './Notice';

type AppShellProps = {
  appRole: AppRole;
  children: ReactNode;
  /**
   * Seçili hedefin adresi. Verilmezse `NavLink` tarayıcı adresine bakar (gerçek kullanım). Galeri örnekleri ve
   * testler adresi elle verir.
   */
  currentPath?: string;
  /**
   * Galeri örneği: sayfa içine gömülü gösterilir. `<main>`, `<header>` ve "içeriğe geç" hedefi yerine düz `div`
   * kullanılır (sayfada tek `main` kalsın) ve gezinmenin adı benzersiz olur.
   */
  embedded?: { navLabel: string };
};

/**
 * Rol bazlı duyarlı iskelet (docs/ekran-akislari.md 1.3, plan 7.1).
 *
 * - Telefon (< 600 px): üstte başlık çubuğu (marka + Bildirimler + Ayarlar), altta sabit gezinme.
 * - Orta ve geniş: solda dar şerit / geniş yan menü. Karar iskeletin kendi genişliğine bakar (container query).
 * - Tek `<nav aria-label="Ana gezinme">` vardır. Seçili hedef `aria-current="page"` ile işaretlenir.
 * - Sayfanın `<h1>`'i sayfanın kendisindedir (iskelet başlık dayatmaz).
 * - DOM sırası: başlık çubuğu, gezinme, içerik. "İçeriğe geç" bağlantısı kök düzendedir (SkipLink).
 *
 * Sunucu bileşenidir: ikonlar sunucuda çizilir, ikon verisi tarayıcıya gitmez.
 */
export function AppShell({ appRole, children, currentPath, embedded }: AppShellProps) {
  const destinations = roleDestinations(appRole);
  const actions = roleActions(appRole);
  const home = destinations[0]?.path ?? '/';
  const Header = embedded ? 'div' : 'header';
  const Main = embedded ? 'div' : 'main';

  return (
    <div className={cx(styles.root, embedded && styles.embedded)}>
      <div className={styles.layout}>
        <Header className={styles.header}>
          <Link href={home} className={styles.brand}>
            <BrandMark size="small" />
            <span className={styles.brandName}>{tr.appName}</span>
          </Link>
          <div className={styles.actions}>
            <Link href={actions.notifications} className={styles.action} aria-label={tr.shell.notifications}>
              <Icon name="notifications" />
            </Link>
            <Link href={actions.settings} className={styles.action} aria-label={tr.shell.settings}>
              <Icon name="settings" />
            </Link>
          </div>
        </Header>

        <nav className={styles.nav} aria-label={embedded?.navLabel ?? tr.shell.navLabel}>
          <ul className={styles.list}>
            {destinations.map((destination) => (
              <li key={destination.path}>
                <NavLink
                  href={destination.path}
                  label={destination.label}
                  icon={<NavIcon name={destination.icon} />}
                  activeIcon={<NavIcon name={destination.icon} filled />}
                  current={currentPath === undefined ? undefined : currentPath === destination.path}
                />
              </li>
            ))}
          </ul>
        </nav>

        <Main className={styles.main} {...(embedded ? {} : { id: 'icerik', tabIndex: -1 })}>
          <div className={styles.content}>{children}</div>
        </Main>

        {embedded ? null : <NoticeRegion />}
      </div>
    </div>
  );
}
