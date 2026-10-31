import { Button } from '@/components/Button';
import { BLOCK_REASONS } from '@/lib/safety';
import { tr } from '@/strings/tr';

import { blockVolunteerAction } from './actions';
import styles from './Safety.module.css';
import type { VolunteerCard } from './types';

/**
 * Eşleşmiş gönüllü kartları ve "Gönüllüyü engelle". Engel nedeni listeden seçilir (serbest metin yok).
 * Engel, açılır bölümün içindedir: yanlışlıkla tıklanmasın, ama her zaman görünür ve bulunabilir olsun.
 */
export function MyVolunteers({ items, returnTo }: { items: readonly VolunteerCard[]; returnTo: string }) {
  if (items.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="gonulluler">
      <h2 id="gonulluler" className={styles.heading}>
        {tr.safety.myVolunteerTitle}
      </h2>
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={`${item.studentId}-${item.volunteerId}`} className={styles.card}>
            <p className={styles.name}>{[item.name, item.university].filter(Boolean).join(' · ')}</p>
            <details className={styles.details}>
              <summary className={styles.summary}>{tr.safety.block}</summary>
              <form action={blockVolunteerAction} className={styles.form}>
                <p className={styles.help}>{tr.safety.blockHelp}</p>
                <input type="hidden" name="studentId" value={item.studentId} />
                <input type="hidden" name="volunteerId" value={item.volunteerId} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className={styles.field}>
                  <span>{tr.safety.blockReason}</span>
                  <select name="reason" defaultValue="rahatsiz_edici" className={styles.select}>
                    {BLOCK_REASONS.map((reason) => (
                      <option key={reason} value={reason}>
                        {tr.safety.blockReasons[reason]}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <Button type="submit" variant="secondary">
                    {tr.safety.blockConfirm}
                  </Button>
                </div>
              </form>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
