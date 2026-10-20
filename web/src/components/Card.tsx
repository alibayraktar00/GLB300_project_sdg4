import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cx } from '@/lib/cx';

import styles from './Card.module.css';
import { Icon, type UiIconName } from './Icon';

export type CardTone = 'neutral' | 'primary' | 'warm' | 'success';

function toneClass(tone: CardTone) {
  if (tone === 'primary') return styles.primary;
  if (tone === 'warm') return styles.warm;
  if (tone === 'success') return styles.success;
  return undefined;
}

type CardContentProps = {
  icon?: UiIconName;
  title: ReactNode;
  description?: ReactNode;
  /** Sağdaki ok. Etkileşimli kartlarda açık olması önerilir. */
  chevron?: boolean;
};

/**
 * Kartın iç düzeni: simge, başlık, açıklama, ok. Düğme/bağlantı içinde geçerli olması için yalnızca
 * `<span>` kullanır (HTML'de düğme içinde blok öğe olmaz).
 */
export function CardContent({ icon, title, description, chevron = false }: CardContentProps) {
  return (
    <span className={styles.row}>
      {icon ? <Icon name={icon} size="lg" className={styles.lead} /> : null}
      <span className={styles.text}>
        <span className={styles.title}>{title}</span>
        {' '}
        {description ? <span className={styles.description}>{description}</span> : null}
      </span>
      {chevron ? <Icon name="chevron_right" className={styles.chevron} /> : null}
    </span>
  );
}

/** Durağan kart: yalnızca bilgi gösterir; kendisi etkileşimli değildir, içindeki öğeler kendi rolünü taşır. */
export function Card({ tone = 'neutral', children }: { tone?: CardTone; children: ReactNode }) {
  return <div className={cx(styles.card, toneClass(tone))}>{children}</div>;
}

/** Kartın tamamı tek bağlantı (sayfa değiştirir). Erişilebilir adı kartın tüm metnidir. */
export function CardLink({
  href,
  tone = 'neutral',
  children,
}: {
  href: string;
  tone?: CardTone;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cx(styles.card, styles.interactive, toneClass(tone))}>
      {children}
    </Link>
  );
}

type CardButtonProps = { tone?: CardTone; children: ReactNode } & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'style' | 'children'
>;

/** Kartın tamamı tek düğme (bir eylem yapar). */
export function CardButton({ tone = 'neutral', children, type = 'button', ...rest }: CardButtonProps) {
  return (
    <button {...rest} type={type} className={cx(styles.card, styles.interactive, toneClass(tone))}>
      {children}
    </button>
  );
}
