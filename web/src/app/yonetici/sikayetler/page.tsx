import type { Metadata } from 'next';

import { Button } from '@/components/Button';
import { Card, CardContent } from '@/components/Card';
import { SectionHeader } from '@/components/SectionHeader';
import { handleReportAction, reviewBlockAction } from '@/features/safety/actions';
import styles from '@/features/questions/page.module.css';
import { loadSafetyQueue } from '@/server/safety';
import { requireAdminMfa } from '@/server/session';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.safety.reportsTitle };
export const dynamic = 'force-dynamic';

const dayFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' });
const day = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : dayFormatter.format(date);
};

type CategoryKey = keyof typeof tr.safety.reportCategories;
type ReasonKey = keyof typeof tr.safety.blockReasons;

/** Güvenlik kuyruğu: şikayetler (incelemeye al / kapat) ve incelenmemiş gönüllü engelleri. Yalnızca MFA'lı yönetici. */
export default async function SafetyQueuePage() {
  await requireAdminMfa();
  const { reports, blocks } = await loadSafetyQueue();
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.safety.reportsTitle}</h1>

      <section className={styles.section} aria-labelledby="sikayet">
        <SectionHeader id="sikayet" title={tr.safety.reportsOpen} />
        {reports.length === 0 ? (
          <p className={styles.note}>{tr.safety.reportsEmpty}</p>
        ) : (
          <ul className={styles.pool}>
            {reports.map((report) => (
              <li key={report.id}>
                <Card tone={report.category === 'taciz_zorbalik' || report.category === 'kisisel_bilgi_istendi' ? 'warm' : 'neutral'}>
                  <CardContent
                    title={`${tr.safety.targetTypes[report.targetType]} · ${tr.safety.reportCategories[report.category as CategoryKey] ?? report.category}`}
                    description={`${tr.safety.status[report.status]} · ${day(report.createdAt)}`}
                  />
                  <form action={handleReportAction} className={styles.section}>
                    <input type="hidden" name="reportId" value={report.id} />
                    <label className={styles.note}>
                      <span>{tr.safety.actionNote}</span>{' '}
                      <input type="text" name="note" maxLength={1000} />
                    </label>
                    <div className={styles.claimRow}>
                      {report.status === 'yeni' ? (
                        <Button type="submit" name="status" value="inceleniyor" variant="secondary">
                          {tr.safety.takeAction}
                        </Button>
                      ) : null}
                      <Button type="submit" name="status" value="kapandi">
                        {tr.safety.closeReport}
                      </Button>
                    </div>
                  </form>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section} aria-labelledby="engel">
        <SectionHeader id="engel" title={tr.safety.blocksOpen} />
        {blocks.length === 0 ? (
          <p className={styles.note}>{tr.safety.blocksEmpty}</p>
        ) : (
          <ul className={styles.pool}>
            {blocks.map((block) => (
              <li key={block.id}>
                <Card>
                  <CardContent
                    title={`${tr.safety.blockedBy(block.blockedByRole)} · ${tr.safety.blockReasons[block.reason as ReasonKey] ?? block.reason}`}
                    description={day(block.createdAt)}
                  />
                  <form action={reviewBlockAction}>
                    <input type="hidden" name="blockId" value={block.id} />
                    <Button type="submit" variant="secondary">
                      {tr.safety.markReviewed}
                    </Button>
                  </form>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
