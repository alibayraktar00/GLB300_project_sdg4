import { useId, type InputHTMLAttributes } from 'react';

import { Icon } from './Icon';
import styles from './Switch.module.css';

type SwitchProps = {
  label: string;
  /** Görünen açıklama ("Bu ayar yalnızca bu cihazda saklanır."); `aria-describedby` ile bağlanır. */
  help?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'role' | 'className' | 'style' | 'children' | 'id'>;

/**
 * Anahtar: yerel onay kutusu + `role="switch"`. Form içinde JavaScript olmadan da çalışır.
 * Açık durumda düğme üzerinde onay işareti, kapalıda çarpı vardır (renk dışı ipucu).
 */
export function Switch({ label, help, ...input }: SwitchProps) {
  const id = useId();
  const helpId = `${id}-yardim`;
  return (
    <div className={styles.row}>
      <div className={styles.text}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        {help ? (
          <span id={helpId} className={styles.help}>
            {help}
          </span>
        ) : null}
      </div>
      <input
        {...input}
        id={id}
        type="checkbox"
        role="switch"
        className={styles.input}
        aria-describedby={help ? helpId : undefined}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb}>
          <Icon name="close" className={styles.off} />
          <Icon name="check" className={styles.on} />
        </span>
      </span>
    </div>
  );
}
