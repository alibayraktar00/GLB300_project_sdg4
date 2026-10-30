import { Button } from '@/components/Button';
import { RadioCard, RadioCardGroup } from '@/components/RadioCard';
import { tr } from '@/strings/tr';

import { submitFeedbackAction } from './actions';
import styles from './SessionList.module.css';

/** Bitmiş ders için kısa form: 1-5 puan ve devam isteği. JavaScript gerekmez; serbest metin yoktur. */
export function FeedbackForm({ sessionId, returnTo }: { sessionId: string; returnTo: string }) {
  return (
    <form action={submitFeedbackAction} className={styles.feedback}>
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <h3 className={styles.when}>{tr.feedback.title}</h3>
      <RadioCardGroup legend={tr.feedback.rating}>
        {tr.feedback.scale.map((label, index) => (
          <RadioCard key={label} name="rating" value={String(index + 1)} title={`${index + 1} · ${label}`} required />
        ))}
      </RadioCardGroup>
      <RadioCardGroup legend={tr.feedback.continueLabel}>
        <RadioCard name="wouldContinue" value="evet" title={tr.feedback.yes} required />
        <RadioCard name="wouldContinue" value="hayir" title={tr.feedback.no} />
      </RadioCardGroup>
      <div>
        <Button type="submit">{tr.feedback.submit}</Button>
      </div>
    </form>
  );
}
