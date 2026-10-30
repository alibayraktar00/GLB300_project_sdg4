import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import styles from '@/features/questions/page.module.css';
import { ThreadView } from '@/features/questions/ThreadView';
import { loadThread } from '@/server/questions';
import { requireRole } from '@/server/session';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.questions.parentTitle };
export const dynamic = 'force-dynamic';

/** Velinin salt okunur soru görünümü (V4): yazma kutusu yoktur. */
export default async function GuardianQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole('veli');
  const thread = await loadThread(id, user.id);
  if (!thread) notFound();
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.questions.parentTitle}</h1>
      <p className={styles.note}>{tr.questions.parentNote}</p>
      <ThreadView thread={thread} />
    </div>
  );
}
