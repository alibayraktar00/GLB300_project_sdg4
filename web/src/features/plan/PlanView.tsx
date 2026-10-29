import { ButtonLink } from '@/components/Button';
import { CardContent, CardLink } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/StateViews';
import type { UiIconName } from '@/components/Icon';
import { tr } from '@/strings/tr';

import styles from './PlanView.module.css';
import type { PlanData, PlanItemStatus } from './types';

/** Durum için metin ve simge: durum yalnızca renkle değil, yazı ve simgeyle de verilir. */
const STATUS: Record<PlanItemStatus, { label: string; icon: UiIconName }> = {
  tamamlandi: { label: tr.plan.statusDone, icon: 'check_circle' },
  siradaki: { label: tr.plan.statusNext, icon: 'play_arrow' },
  atlandi: { label: tr.plan.statusSkipped, icon: 'refresh' },
  bekliyor: { label: tr.plan.statusWaiting, icon: 'hourglass_empty' },
};

/**
 * "Planım" (docs/ekran-akislari.md Ö3): sıralı konular ve basit ilerleme. Baskı yoktur: tarih, gecikme, puan
 * ve seri gösterilmez. Sunucu bileşenidir (etkileşim yok; satırlar bağlantıdır).
 */
export function PlanView({ data }: { data: PlanData }) {
  if (data.items.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>{tr.plan.title}</h1>
        <EmptyState title={tr.plan.emptyTitle} message={tr.plan.emptyBody} />
        <div>
          <ButtonLink href="/ogrenci/plan/olustur" icon="wb_twilight">
            {tr.plan.wizardTitle}
          </ButtonLink>
        </div>
      </div>
    );
  }

  const done = data.items.filter((item) => item.status === 'tamamlandi').length;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.plan.title}</h1>

      <ProgressBar
        value={done / data.items.length}
        label={tr.plan.progressLabel}
        caption={tr.plan.progressCaption(done, data.items.length)}
      />

      <CardLink href="/ogrenci/konular">
        <CardContent icon="info" title={tr.plan.browseTopics} description={tr.plan.browseTopicsHelp} chevron />
      </CardLink>

      <section className={styles.section} aria-labelledby="konular">
        <SectionHeader id="konular" title={tr.plan.topicsTitle} />
        <ol className={styles.list}>
          {data.items.map((item) => {
            const status = STATUS[item.status];
            return (
              <li key={item.id}>
                <CardLink href={`/ogrenci/plan/${item.id}`} tone={item.status === 'siradaki' ? 'primary' : 'neutral'}>
                  <CardContent
                    icon={status.icon}
                    title={item.title}
                    description={`${tr.plan.subjectLine(item.subject, item.grade)} · ${status.label}`}
                    chevron
                  />
                </CardLink>
              </li>
            );
          })}
        </ol>
      </section>

      <div>
        <ButtonLink href="/ogrenci/plan/olustur" variant="secondary" icon="wb_twilight">
          {tr.plan.newPlan}
        </ButtonLink>
      </div>
    </div>
  );
}
