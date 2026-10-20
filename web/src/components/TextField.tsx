import { useId, type InputHTMLAttributes } from 'react';

import { cx } from '@/lib/cx';
import { tr } from '@/strings/tr';

import { Icon } from './Icon';
import styles from './TextField.module.css';

type TextFieldProps = {
  label: string;
  help?: string;
  /** Hata metni. Verilirse alan `aria-invalid` olur ve metin `aria-describedby` ile bağlanır. */
  error?: string;
  optional?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'style' | 'children' | 'id'>;

/**
 * Metin alanı: `<label>` + `<input>` + yardım + hata. `autoComplete` ve `inputMode` belirtilmelidir.
 * Şifre ve OTP alanlarında yapıştırma ENGELLENMEZ (WCAG 3.3.8): `onPaste` ile engelleme yapmayın.
 * Doğrulama asıl olarak sunucuda yapılır; buradaki HTML kısıtları (`required`, `minLength`) yalnızca kolaylıktır.
 */
export function TextField({ label, help, error, optional, ...input }: TextFieldProps) {
  const id = useId();
  const helpId = `${id}-yardim`;
  const errorId = `${id}-hata`;
  const describedBy = [help ? helpId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
        {optional ? <span className={styles.optional}>{` (${tr.form.optional})`}</span> : null}
      </label>
      <input
        {...input}
        id={id}
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
