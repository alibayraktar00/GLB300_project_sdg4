'use client';

import { useEffect, useState } from 'react';

import { ButtonLink } from '@/components/Button';
import { Card, CardContent, CardLink } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { RadioCard, RadioCardGroup } from '@/components/RadioCard';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/StateViews';
import { tr } from '@/strings/tr';

import styles from './TodayView.module.css';
import type { TodayData, TodayMode, TodayTask } from './types';

/** Seçilen mod yalnızca bu cihazda tutulur ve yalnızca kullanıcı değiştirince yazılır (hukuk: cerez-politikasi.md). */
export const MODE_STORAGE_KEY = 'ek-gunluk-mod';

function readStoredMode(): TodayMode | null {
  try {
    const value = window.localStorage.getItem(MODE_STORAGE_KEY);
    return value === 'short' || value === 'full' ? value : null;
  } catch {
    return null;
  }
}

function storeMode(mode: TodayMode) {
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    // Depolama kapalıysa (özel pencere vb.) seçim yalnızca bu oturumda geçerli olur.
  }
}

/**
 * Öğrenci "Bugün" ekranı (docs/ekran-akislari.md Ö1). Tek bakışta ne yapılacağını söyler; tarih, borç, gecikme
 * ve seri göstermez. İlk açılışta "5 dakika" önerilir ama saklanmaz; saklama için kullanıcının dokunması gerekir.
 * Mod değişince görev kartı anında güncellenir.
 */
export function TodayView({ data }: { data: TodayData }) {
  const [mode, setMode] = useState<TodayMode>('short');

  // Kayıtlı tercih varsa açılışta uygula (sunucuda çizilen "5 dakika" yalnızca ilk önerilen durumdur).
  useEffect(() => {
    const stored = readStoredMode();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tarayıcı depolamasından tek seferlik okuma
    if (stored) setMode(stored);
  }, []);

  function choose(next: TodayMode) {
    setMode(next);
    storeMode(next);
  }

  if (data.tasks.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.greeting}>{tr.today.greeting(data.nickname)}</h1>
        <EmptyState title={tr.today.emptyTitle} message={tr.today.emptyBody} />
        <div>
          <ButtonLink href="/ogrenci/plan" icon="wb_twilight">
            {tr.today.createPlan}
          </ButtonLink>
        </div>
      </div>
    );
  }

  const [next, ...later] = data.tasks;
  if (!next) return null; // yukarıdaki boş durum zaten ele alındı; tür denetimi için
  const duration = (task: TodayTask) =>
    mode === 'short' ? tr.today.shortDuration(task.shortMinutes) : tr.today.fullDuration(task.fullMinutes);

  return (
    <div className={styles.page}>
      <div className={styles.hello}>
        <h1 className={styles.greeting}>{tr.today.greeting(data.nickname)}</h1>
        <p className={styles.lead}>{tr.today.tasksWaiting(data.tasks.length)}</p>
      </div>

      <section className={styles.section}>
        <RadioCardGroup legend={tr.today.timeTitle}>
          <RadioCard
            name="gunluk-mod"
            value="short"
            title={tr.today.short}
            description={tr.today.shortHelp}
            checked={mode === 'short'}
            onChange={() => choose('short')}
          />
          <RadioCard
            name="gunluk-mod"
            value="full"
            title={tr.today.full}
            description={tr.today.fullHelp}
            checked={mode === 'full'}
            onChange={() => choose('full')}
          />
        </RadioCardGroup>
        <p className={styles.note}>{tr.today.deviceNote}</p>
      </section>

      <section className={styles.section} aria-labelledby="siradaki-gorev">
        <SectionHeader id="siradaki-gorev" title={tr.today.nextTask} />
        <Card tone="primary">
          <div className={styles.task}>
            <p className={styles.taskTitle}>{next.title}</p>
            <p className={styles.taskMeta}>{tr.today.subjectLine(next.subject, next.grade)}</p>
            <p className={styles.taskMeta} aria-live="polite">
              {duration(next)}
            </p>
            <ButtonLink href={`/ogrenci/plan/${next.id}`} icon="play_arrow">
              {tr.today.start}
            </ButtonLink>
          </div>
        </Card>
      </section>

      {later.length > 0 ? (
        <section className={styles.section} aria-labelledby="sonraki-gorevler">
          <SectionHeader id="sonraki-gorevler" title={tr.today.laterTasks} />
          <ul className={styles.list}>
            {later.map((task) => (
              <li key={task.id}>
                <CardLink href={`/ogrenci/plan/${task.id}`}>
                  <CardContent
                    title={task.title}
                    description={tr.today.subjectLine(task.subject, task.grade)}
                    chevron
                  />
                </CardLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {data.upcomingLesson ? (
        <section className={styles.section} aria-labelledby="yaklasan-ders">
          <SectionHeader id="yaklasan-ders" title={tr.today.upcomingLesson} />
          <CardLink href="/ogrenci/dersler">
            <CardContent
              icon="check_circle"
              title={`${data.upcomingLesson.when} · ${data.upcomingLesson.volunteer}`}
              chevron
            />
          </CardLink>
        </section>
      ) : null}

      {data.newAnswers > 0 ? (
        <section className={styles.section} aria-labelledby="yeni-cevaplar">
          <SectionHeader id="yeni-cevaplar" title={tr.today.newAnswersTitle} />
          <CardLink href="/ogrenci/sorular">
            <CardContent icon="info" title={tr.today.newAnswers(data.newAnswers)} chevron />
          </CardLink>
        </section>
      ) : null}

      <section className={styles.section} aria-labelledby="ilerleme">
        <SectionHeader id="ilerleme" title={tr.today.progressTitle} />
        <ProgressBar
          value={data.total === 0 ? 0 : data.completed / data.total}
          label={tr.today.progressLabel}
          caption={tr.today.progressCaption(data.completed, data.total)}
        />
      </section>
    </div>
  );
}
