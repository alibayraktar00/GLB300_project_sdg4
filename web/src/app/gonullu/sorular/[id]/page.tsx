import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Composer } from '@/features/questions/Composer';
import styles from '@/features/questions/page.module.css';
import { ThreadView } from '@/features/questions/ThreadView';
import { loadThread } from '@/server/questions';
import { requireRole } from '@/server/session';
import { tr } from '@/strings/tr';

import { postAnswer } from '../actions';

export const metadata: Metadata = { title: tr.questions.title };
export const dynamic = 'force-dynamic';

/** Gönüllünün soru sayfası (G5): öğrencinin sorusu ve cevap yazma. */
export default async function VolunteerQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole('gonullu');
  const thread = await loadThread(id, user.id);
  if (!thread) notFound();

  const closed = thread.status === 'kapandi';
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.questions.title}</h1>
      <ThreadView thread={thread} reportReturnTo={`/gonullu/sorular/${thread.id}`} />
      {closed ? (
        <p className={styles.note}>{tr.questions.closedNote}</p>
      ) : (
        <Composer key={thread.messages.length} mode="answer" action={postAnswer} questionId={thread.id} />
      )}
    </div>
  );
}
