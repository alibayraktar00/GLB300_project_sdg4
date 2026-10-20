import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

import { cx } from '@/lib/cx';
import { tr } from '@/strings/tr';

import styles from './Button.module.css';
import { Icon, type UiIconName } from './Icon';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'text';

type CommonProps = {
  variant?: ButtonVariant;
  /** Satırı doldurur (telefonda ana eylemler için). */
  expand?: boolean;
  icon?: UiIconName;
  children: ReactNode;
};

function classes(variant: ButtonVariant, expand: boolean | undefined, loading: boolean | undefined) {
  return cx(
    styles.button,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'text' && styles.text,
    expand && styles.expand,
    loading && styles.loading,
  );
}

function Content({ icon, loading, children }: { icon?: UiIconName; loading?: boolean; children: ReactNode }) {
  return (
    <span className={styles.content}>
      {loading ? <Spinner /> : icon ? <Icon name={icon} /> : null}
      <span className={styles.label}>{children}</span>
      {loading ? <span className="sr-only">{`, ${tr.states.loading}`}</span> : null}
    </span>
  );
}

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'style' | 'children'> & {
    /**
     * Yükleniyor: düğme tıklanmaz ama görünümü pasife dönmez; ekran okuyucu "etiket, Yükleniyor" okur,
     * `aria-busy` işaretlenir. Boyut değişmez.
     */
    loading?: boolean;
  };

/**
 * Düğme. Bir ekranda en fazla BİR birincil düğme bulunur. Bir `<form>` içinde `type="submit"` verilirse
 * gönderir; diğer yerlerde varsayılan `type="button"` olur.
 *
 * Yükleniyor durumunda düğme tıklanamaz: `type` zorla `button` olur (form gönderilmez) ve `onClick` bağlanmaz.
 * Böylece bileşen kendisi olay işleyicisi üretmez ve sunucu bileşenlerinde de (işleyici vermeden) kullanılabilir.
 */
export function Button({
  variant = 'primary',
  expand,
  icon,
  loading,
  type = 'button',
  onClick,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={loading ? 'button' : type}
      className={classes(variant, expand, loading)}
      aria-busy={loading || undefined}
      aria-disabled={loading || undefined}
      onClick={loading ? undefined : onClick}
    >
      <Content icon={icon} loading={loading}>
        {children}
      </Content>
    </button>
  );
}

type ButtonLinkProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'style' | 'children' | 'href'> & {
    href: string;
    /** Harici adres: `rel="noopener noreferrer"` eklenir (yönlendiren bilgisi gitmez, plan 9.1). */
    external?: boolean;
  };

/** Düğme görünümlü bağlantı (gezinme için). Eylem değil, sayfa değiştiriyorsa `<a>` doğru öğedir. */
export function ButtonLink({ variant = 'primary', expand, icon, external, href, children, ...rest }: ButtonLinkProps) {
  const className = classes(variant, expand, false);
  if (external) {
    return (
      <a {...rest} href={href} className={className} rel="noopener noreferrer">
        <Content icon={icon}>{children}</Content>
      </a>
    );
  }
  return (
    <Link {...rest} href={href} className={className}>
      <Content icon={icon}>{children}</Content>
    </Link>
  );
}
