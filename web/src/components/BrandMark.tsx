import { cx } from '@/lib/cx';

import styles from './BrandMark.module.css';

/**
 * Marka işareti: gün doğumunda bir köprü kemeri. Süstür; ekran okuyucudan gizlenir (uygulama adı yanında
 * metin olarak zaten vardır). Boyutlar rem'dir, yazı boyutu ayarıyla birlikte ölçeklenir.
 */
export function BrandMark({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  return (
    <svg
      className={cx(styles.mark, size === 'small' && styles.small, size === 'large' && styles.large)}
      viewBox="0 0 100 100"
      width="72"
      height="72"
      focusable="false"
      aria-hidden="true"
    >
      <rect className={styles.tile} width="100" height="100" rx="28" />
      <circle className={styles.sun} cx="50" cy="50" r="17" />
      <path className={styles.deck} d="M0 72 V74 H100 V72 A28 28 0 0 1 72 100 H28 A28 28 0 0 1 0 72 Z" />
      <path className={styles.arch} d="M12 74 Q50 28 88 74" fill="none" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}
