import type { Metadata } from 'next';

import { AppShell } from '@/components/AppShell';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState, ErrorState } from '@/components/StateViews';
import { requireRole } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';
import { listTopics, type Topic } from '@/server/topics';
import { tr } from '@/strings/tr';

import styles from './page.module.css';

export const metadata: Metadata = { title: tr.nav.plan };

/** Ünite listesini okur; Supabase ayarlı değilse ya da sorgu başarısızsa null. */
async function loadTopics(): Promise<Topic[] | null> {
  try {
    return await listTopics(await createSupabaseServerClient());
  } catch {
    return null;
  }
}

/** Öğrencinin planı (şimdilik): 8. sınıf matematik ünitelerinin sıralı listesi. */
export default async function StudentPlanPage() {
  await requireRole('ogrenci');
  const topics = await loadTopics();
  const text = tr.studentPlan;

  return (
    <AppShell appRole="ogrenci" currentPath="/ogrenci/plan">
      <div className={styles.page}>
        <SectionHeader level={1} title={text.title} subtitle={text.intro} />
        {topics === null ? (
          <ErrorState />
        ) : topics.length === 0 ? (
          <EmptyState title={text.emptyTitle} message={text.emptyMessage} />
        ) : (
          <ol className={styles.list}>
            {topics.map((topic) => (
              <li key={topic.id} className={styles.item}>
                {topic.title}
              </li>
            ))}
          </ol>
        )}
      </div>
    </AppShell>
  );
}
