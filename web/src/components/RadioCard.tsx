import type { InputHTMLAttributes, ReactNode } from 'react';

import { Icon } from './Icon';
import styles from './RadioCard.module.css';

/**
 * Seçilebilir kartlar grubu: `<fieldset>` + `<legend>` ve yerel radyo düğmeleri. Form içinde JavaScript
 * olmadan da çalışır; anlık tepki gerekiyorsa (Bugün'de mod seçimi) küçük bir istemci adası dinler.
 */
export function RadioCardGroup({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      {children}
    </fieldset>
  );
}

type RadioCardProps = {
  title: string;
  description?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className' | 'style' | 'children' | 'title'>;

/** Tek seçenek. `name` ve `value` zorunludur; ekran okuyucu radyo rolünü ve "seçili" durumunu bildirir. */
export function RadioCard({ title, description, ...input }: RadioCardProps) {
  return (
    <label className={styles.item}>
      <input {...input} type="radio" className={styles.input} />
      <span className={styles.face}>
        <Icon name="radio_button_unchecked" className={styles.indicatorOff} />
        <Icon name="radio_button_checked" className={styles.indicatorOn} />
        <span className={styles.text}>
          <span className={styles.title}>{title}</span>
          {' '}
          {description ? <span className={styles.description}>{description}</span> : null}
        </span>
      </span>
    </label>
  );
}
