import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Button } from '@/components/Button';
import { Composer } from '@/features/questions/Composer';
import styles from '@/features/questions/page.module.css';
import { ThreadView } from '@/features/questions/ThreadView';
import { loadThread } from '@/server/questions';
import { requireRole } from '@/server/session';
import { tr } from '@/strings/tr';

import { closeQuestionAction, postFollowUp } from '../actions';

export const metadata: Metadata = { title: tr.questions.title };
export const dynamic = 'force-dynamic';

/** Soru ayrıntısı (Ö7): konuşma, takip sorusu ve "Anladım, soruyu kapat". */
export default async function StudentQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole('ogrenci');
  const thread = await loadThread(id, user.id);
  if (!thread) notFound();

  const closed = thread.status === 'kapandi';
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.questions.title}</h1>
      <ThreadView thread={thread} reportReturnTo={`/ogrenci/sorular/${thread.id}`} />
      {closed ? (
        <p className={styles.note}>{tr.questions.closedNote}</p>
      ) : (
        <>
          {/* Her yeni mesajda form sıfırlansın diye anahtar mesaj sayısıdır. */}
          <Composer key={thread.messages.length} mode="followup" action={postFollowUp} questionId={thread.id} />
          <form action={closeQuestionAction}>
            <input type="hidden" name="questionId" value={thread.id} />
            <Button type="submit" variant="secondary">
              {tr.questions.close}
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
