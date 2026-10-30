import { Button, ButtonLink } from '@/components/Button';
import { CANCEL_REASONS } from '@/lib/sessions';
import { tr } from '@/strings/tr';

import { cancelSessionAction } from './actions';
import { FeedbackForm } from './FeedbackForm';
import styles from './SessionList.module.css';
import type { SessionItem } from './types';

const formatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Istanbul' });
function formatStart(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : formatter.format(date);
}

/**
 * Ders satırları. Durum yazıyla verilir. Planlı derste Meet/Zoom bağlantısı yeni sekmede açılır ve iptal
 * formu vardır (iptal gerekçesi listeden seçilir; serbest metin yok). `cancel` false ise iptal gösterilmez.
 */
export function SessionList({
  items,
  returnTo,
  cancel = true,
  answered,
}: {
  items: readonly SessionItem[];
  returnTo: string;
  cancel?: boolean;
  /** Verilirse geçmiş dersler listesidir: iptal edilmemiş derslerde geri bildirim formu (cevaplandıysa teşekkür) gösterilir. */
  answered?: readonly string[];
}) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.id} className={styles.item}>
          <p className={styles.when}>
            <time dateTime={item.startsAt}>{formatStart(item.startsAt)}</time>
          </p>
          <p className={styles.meta}>
            {[item.subject, tr.sessions.minutes(item.durationMin), tr.sessions.statuses[item.status]].filter(Boolean).join(' · ')}
          </p>
          {answered && item.status !== 'iptal' ? (
            answered.includes(item.id) ? (
              <p className={styles.meta}>{tr.feedback.thanks}</p>
            ) : (
              <FeedbackForm sessionId={item.id} returnTo={returnTo} />
            )
          ) : null}
          {!answered && item.status === 'planlandi' ? (
            <div className={styles.actions}>
              {item.meetingUrl ? (
                <ButtonLink href={item.meetingUrl} external target="_blank" icon="play_arrow">
                  {tr.sessions.join}
                </ButtonLink>
              ) : null}
              {cancel ? (
                <form action={cancelSessionAction} className={styles.cancel}>
                  <input type="hidden" name="sessionId" value={item.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <label className={styles.reasonLabel}>
                    <span>{tr.sessions.cancelReason}</span>
                    <select name="reason" defaultValue={CANCEL_REASONS[0]} className={styles.select}>
                      {CANCEL_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                          {tr.sessions.reasons[reason]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button type="submit" variant="secondary">
                    {tr.sessions.cancel}
                  </Button>
                </form>
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
