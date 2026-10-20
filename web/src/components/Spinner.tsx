import { Icon } from './Icon';
import styles from './Spinner.module.css';

/**
 * Yükleniyor göstergesi (süs; anlamı yanındaki metin verir). "Animasyonları azalt" açıkken dönen halka
 * yerine durağan bir kum saati gösterilir (docs/tasarim-sistemi.md 8).
 */
export function Spinner() {
  return (
    <span className={styles.spinner} aria-hidden="true">
      <svg className={styles.ring} viewBox="0 0 24 24" focusable="false">
        <circle
          cx="12"
          cy="12"
          r="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="42 100"
          strokeLinecap="round"
        />
      </svg>
      <Icon name="hourglass_empty" className={styles.static} />
    </span>
  );
}
