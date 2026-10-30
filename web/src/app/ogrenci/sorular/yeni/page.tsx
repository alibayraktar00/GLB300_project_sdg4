import type { Metadata } from 'next';

import { Composer } from '@/features/questions/Composer';
import styles from '@/features/questions/page.module.css';
import { tr } from '@/strings/tr';

import { askQuestion } from '../actions';

export const metadata: Metadata = { title: tr.questions.askTitle };

/** Soru sorma (docs/ekran-akislari.md Ö5): metin ve/veya fotoğraf. */
export default function AskQuestionPage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.questions.askTitle}</h1>
      <p className={styles.intro}>{tr.questions.askIntro}</p>
      <Composer mode="ask" action={askQuestion} />
    </div>
  );
}
