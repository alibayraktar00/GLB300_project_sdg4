import { tr } from '@/strings/tr';

import styles from './Progress.module.css';
import type { ChildProgress } from './types';

const dayFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeZone: 'Europe/Istanbul' });
function formatDay(value: string): string {
  const date = new Date(`${value}T12:00:00+03:00`);
  return Number.isNaN(date.getTime()) ? value : dayFormatter.format(date);
}

/** Çocuk başına ilerleme: plan konuları (durum yazıyla), soru ve ders sayıları. Sunucu bileşenidir; yazdırılabilir. */
export function ProgressView({ items }: { items: readonly ChildProgress[] }) {
  return (
    <>
      {items.map((child) => {
        const done = child.plan?.topics.filter((topic) => topic.status === 'tamamlandi').length ?? 0;
        return (
          <section key={child.id} className={styles.child} aria-labelledby={`cocuk-${child.id}`}>
            <h2 id={`cocuk-${child.id}`} className={styles.name}>
              {child.name}
            </h2>

            <h3 className={styles.heading}>{tr.childProgress.planTitle}</h3>
            {child.plan ? (
              <>
                <p className={styles.line}>{tr.childProgress.planRange(formatDay(child.plan.start), formatDay(child.plan.end))}</p>
                <p className={styles.line}>{tr.childProgress.topicsDone(done, child.plan.topics.length)}</p>
                <ol className={styles.topics}>
                  {child.plan.topics.map((topic, index) => (
                    <li key={`${index}-${topic.title}`}>
                      {topic.title} · {tr.childProgress.topicStatus[topic.status]}
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className={styles.line}>{tr.childProgress.noPlan}</p>
            )}

            <h3 className={styles.heading}>{tr.childProgress.questionsTitle}</h3>
            <p className={styles.line}>{tr.childProgress.questionsLine(child.questions.total, child.questions.answered)}</p>

            <h3 className={styles.heading}>{tr.childProgress.sessionsTitle}</h3>
            <p className={styles.line}>{tr.childProgress.sessionsLine(child.sessions.done, child.sessions.upcoming)}</p>
          </section>
        );
      })}
    </>
  );
}
