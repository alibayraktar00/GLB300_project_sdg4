import { Button } from '@/components/Button';
import { Card, CardContent } from '@/components/Card';
import { SectionHeader } from '@/components/SectionHeader';
import styles from '@/features/questions/page.module.css';
import { tr } from '@/strings/tr';

import { decideMatchAction } from './actions';
import type { MatchProposal } from './types';

/** Velinin karar bekleyen eşleşme önerileri: gönüllünün kısa adı, üniversitesi ve dersi; onayla ya da onaylama. */
export function PendingMatches({ items }: { items: readonly MatchProposal[] }) {
  if (items.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="oneri">
      <SectionHeader id="oneri" title={tr.matches.pendingTitle} />
      <p className={styles.note}>{tr.matches.pendingHelp}</p>
      <ul className={styles.pool}>
        {items.map((item) => (
          <li key={item.id}>
            <Card tone="warm">
              <CardContent
                title={[item.volunteerName, item.university].filter(Boolean).join(' · ')}
                description={`${tr.matches.subject}: ${item.subject}`}
              />
              <div className={styles.claimRow}>
                {[true, false].map((approve) => (
                  <form key={String(approve)} action={decideMatchAction}>
                    <input type="hidden" name="matchId" value={item.id} />
                    <input type="hidden" name="approve" value={String(approve)} />
                    <Button type="submit" variant={approve ? 'primary' : 'secondary'}>
                      {approve ? tr.matches.approve : tr.matches.decline}
                    </Button>
                  </form>
                ))}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
