import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/AppShell';
import { QuestionList } from '@/features/questions/QuestionList';
import styles from '@/features/questions/page.module.css';
import { SAMPLE_QUESTIONS, SAMPLE_THREAD } from '@/features/questions/sample';
import { ThreadView } from '@/features/questions/ThreadView';
import { isGalleryEnabled } from '@/lib/gallery';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: 'Sorular (önizleme)' };

/** Geliştirme önizlemesi: soru listesi ve konuşma ÖRNEK verilerle. Yalnızca geliştirmede açılır. */
export default function QuestionsPreviewPage() {
  if (!isGalleryEnabled(process.env)) notFound();
  return (
    <AppShell appRole="ogrenci" currentPath="/ogrenci/sorular">
      <div className={styles.page}>
        <h1 className={styles.title}>{tr.questions.mine}</h1>
        <QuestionList items={SAMPLE_QUESTIONS} hrefBase="/galeri/sorular" />
        <ThreadView thread={SAMPLE_THREAD} reportReturnTo={`/ogrenci/sorular/${SAMPLE_THREAD.id}`} />
      </div>
    </AppShell>
  );
}
