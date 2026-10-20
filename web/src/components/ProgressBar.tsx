import { formatPercent } from '@/lib/format';
import { tr } from '@/strings/tr';

import styles from './ProgressBar.module.css';

type ProgressBarProps = {
  /** 0 ile 1 arası. */
  value: number;
  /** Çubuğun neyi ölçtüğü ("Plan ilerlemesi"); ekran okuyucu adı olarak okunur. */
  label: string;
  /** Çubuğun üstünde görünen kısa metin ("3 / 10 konu"): değer renk ve uzunluğa ek olarak yazıyla da verilir. */
  caption?: string;
};

/**
 * Basit ilerleme çubuğu (Planım). Baskı yaratmaz: rozet, seri ya da "geride kaldın" yok; yalnızca ne kadarının
 * tamamlandığı görünür. Ekran okuyucu: "Plan ilerlemesi, %30 tamamlandı".
 */
export function ProgressBar({ value, label, caption }: ProgressBarProps) {
  const clamped = Math.min(1, Math.max(0, value));
  const percent = Math.round(clamped * 100);
  return (
    <div className={styles.wrap}>
      {caption ? <span className={styles.caption}>{caption}</span> : null}
      <progress
        className={styles.bar}
        value={percent}
        max={100}
        aria-label={label}
        aria-valuetext={`${formatPercent(clamped)} ${tr.progress.completed}`}
      />
    </div>
  );
}
