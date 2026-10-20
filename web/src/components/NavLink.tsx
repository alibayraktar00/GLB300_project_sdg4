'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

import styles from './AppShell.module.css';

type NavLinkProps = {
  href: string;
  label: string;
  /** Seçili değilken çizgili ikon (sunucuda çizilmiş öğe olarak gelir; ikon verisi tarayıcıya gitmez). */
  icon: ReactNode;
  /** Seçiliyken DOLU ikon: durum yalnızca renkle değil biçimle de belli olur. */
  activeIcon: ReactNode;
  /** Verilirse adres karşılaştırması yapılmaz (galeri örnekleri ve testler). */
  current?: boolean;
};

/**
 * Ana gezinme bağlantısı. Seçili hedef `aria-current="page"` ile işaretlenir (ekran okuyucu "geçerli sayfa" der);
 * görünüm olarak da üç şekilde ayrışır: dolu ikon, gösterge zemini ve kalın etiket.
 */
export function NavLink({ href, label, icon, activeIcon, current }: NavLinkProps) {
  const pathname = usePathname() ?? '';
  const isCurrent = current ?? (pathname === href || pathname.startsWith(`${href}/`));

  return (
    <Link href={href} className={cx(styles.link)} aria-current={isCurrent ? 'page' : undefined}>
      <span className={styles.indicator}>{isCurrent ? activeIcon : icon}</span>
      <span className={styles.label}>{label}</span>
    </Link>
  );
}
