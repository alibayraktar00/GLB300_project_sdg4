import type { Metadata } from 'next';

import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/StateViews';
import { QuestionList } from '@/features/questions/QuestionList';
import styles from '@/features/questions/page.module.css';
import { loadQuestionList } from '@/server/questions';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.questions.mine };
export const dynamic = 'force-dynamic';

/** Öğrencinin soruları (docs/ekran-akislari.md Ö6). Kimin neyi göreceğini RLS belirler. */
export default async function StudentQuestionsPage() {
  const items = await loadQuestionList();
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.questions.mine}</h1>
      <div>
        <ButtonLink href="/ogrenci/sorular/yeni">{tr.questions.askLink}</ButtonLink>
      </div>
      {items.length === 0 ? (
        <EmptyState title={tr.questions.empty} message={tr.questions.emptyHelp} />
      ) : (
        <QuestionList items={items} hrefBase="/ogrenci/sorular" />
      )}
    </div>
  );
}
