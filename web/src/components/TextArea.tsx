import { useId, type TextareaHTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

import { Icon } from './Icon';
import styles from './TextField.module.css';

type TextAreaProps = {
  label: string;
  help?: string;
  /** Hata metni. Verilirse alan `aria-invalid` olur ve metin `aria-describedby` ile bağlanır. */
  error?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'style' | 'children' | 'id'>;

/**
 * Çok satırlı metin alanı (soru, cevap). TextField ile aynı görünüm ve kurallar: etiket üstte, yardım ve hata
 * metni yazıyla altta. Yapıştırma serbesttir. Doğrulama asıl olarak sunucudadır.
 */
export function TextArea({ label, help, error, rows = 5, ...textarea }: TextAreaProps) {
  const id = useId();
  const helpId = `${id}-yardim`;
  const errorId = `${id}-hata`;
  const describedBy = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <textarea
        {...textarea}
        id={id}
        rows={rows}
        className={cx(styles.input, error && styles.invalid)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
      />
      {help ? (
        <p id={helpId} className={styles.help}>
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error}>
          <Icon name="error" size="sm" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
