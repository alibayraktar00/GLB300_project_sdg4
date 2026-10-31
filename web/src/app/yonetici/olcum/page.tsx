import type { Metadata } from 'next';

import { Card, CardContent } from '@/components/Card';
import styles from '@/features/questions/page.module.css';
import { loadFeedbackSummary } from '@/server/admin';
import { requireAdminMfa } from '@/server/session';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.feedback.summaryTitle };
export const dynamic = 'force-dynamic';

const ROLES = ['ogrenci', 'veli', 'gonullu'] as const;

/** Geri bildirim özeti (rapordaki memnuniyet hedefi için): rol bazında cevap sayısı, ortalama, memnuniyet ve devam isteği. */
export default async function MeasurementPage() {
  await requireAdminMfa();
  const summary = await loadFeedbackSummary();
  const rows = ROLES.flatMap((role) => {
    const item = summary.byRole[role];
    return item ? [{ role, item }] : [];
  });
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.feedback.summaryTitle}</h1>
      <p className={styles.note}>{tr.feedback.summaryIntro}</p>
      <p className={styles.intro}>{tr.feedback.sessionsDone(summary.completedSessions)}</p>
      <p className={styles.intro}>
        {tr.feedback.attendance}: {tr.feedback.attendanceLine(summary.attendance.attended, summary.attendance.missed, summary.attendance.pct)}
      </p>
      {rows.length === 0 ? (
        <p className={styles.note}>{tr.feedback.noData}</p>
      ) : (
        <ul className={styles.pool}>
          {rows.map(({ role, item }) => (
            <li key={role}>
              <Card>
                <CardContent
                  title={tr.feedback.roles[role]}
                  description={[
                    `${tr.feedback.responses}: ${item.responses}`,
                    `${tr.feedback.average}: ${item.avgRating}`,
                    `${tr.feedback.satisfied}: %${item.satisfiedPct}`,
                    `${tr.feedback.wouldContinue}: %${item.continuePct}`,
                  ].join(' · ')}
                />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
