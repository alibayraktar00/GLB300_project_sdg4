import type { ReactNode } from 'react';

import styles from './SectionHeader.module.css';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  /** Başlık düzeyi: sayfanın ana başlığı 1, bölümler 2, alt bölümler 3. Başlık sırası atlanmaz. */
  level?: 1 | 2 | 3;
  /** Sağdaki eylem (genellikle metin düğmesi ya da bağlantı: "Tümünü gör"). */
  action?: ReactNode;
  id?: string;
};

/**
 * Bölüm başlığı: sayfadaki bir grubun adı, isteğe bağlı alt yazı ve sağda bir eylem. Gerçek `<h1>`-`<h3>`
 * öğesidir; ekran okuyucu kullanıcılar başlıktan başlığa atlayabilir.
 */
export function SectionHeader({ title, subtitle, level = 2, action, id }: SectionHeaderProps) {
  const Heading = `h${level}` as const;
  return (
    <div className={styles.header}>
      <div className={styles.text}>
        <Heading id={id} className={level === 1 ? styles.titleLarge : styles.title}>
          {title}
        </Heading>
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
