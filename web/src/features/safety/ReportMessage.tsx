import { Button } from '@/components/Button';
import { REPORT_CATEGORIES } from '@/lib/safety';
import { tr } from '@/strings/tr';

import { reportMessageAction } from './actions';
import styles from './Safety.module.css';

/** Bir mesajı yöneticilere bildirme: açılır bölüm, tür listeden seçilir (çocuktan serbest metin alınmaz). */
export function ReportMessage({ messageId, returnTo }: { messageId: string; returnTo: string }) {
  return (
    <details className={styles.details}>
      <summary className={styles.summary}>{tr.safety.report}</summary>
      <form action={reportMessageAction} className={styles.form}>
        <p className={styles.help}>{tr.safety.reportHelp}</p>
        <input type="hidden" name="messageId" value={messageId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className={styles.field}>
          <span>{tr.safety.reportCategory}</span>
          <select name="category" defaultValue="uygunsuz_icerik" className={styles.select}>
            {REPORT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {tr.safety.reportCategories[category]}
              </option>
            ))}
          </select>
        </label>
        <div>
          <Button type="submit" variant="secondary">
            {tr.safety.reportSend}
          </Button>
        </div>
      </form>
    </details>
  );
}
