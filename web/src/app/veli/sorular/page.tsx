import type { Metadata } from 'next';

import { EmptyState } from '@/components/StateViews';
import { QuestionList } from '@/features/questions/QuestionList';
import styles from '@/features/questions/page.module.css';
import { loadQuestionList } from '@/server/questions';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.questions.parentTitle };
export const dynamic = 'force-dynamic';

/** Velinin görünümü (V4): çocuğunun soruları, yalnızca okunur. Hangi çocukların sorusu görüneceğini RLS belirler. */
export default async function GuardianQuestionsPage() {
  const items = await loadQuestionList();
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.questions.parentTitle}</h1>
      <p className={styles.note}>{tr.questions.parentNote}</p>
      {items.length === 0 ? (
        <EmptyState title={tr.questions.empty} message="" />
      ) : (
        <QuestionList items={items} hrefBase="/veli/sorular" />
      )}
    </div>
  );
}
