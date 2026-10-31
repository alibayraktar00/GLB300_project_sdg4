import type { Metadata } from 'next';

import { Banner } from '@/components/Banner';
import styles from '@/features/questions/page.module.css';
import { tr } from '@/strings/tr';

import { PledgeForm } from './PledgeForm';

export const metadata: Metadata = { title: tr.legalPledge.title };

/** Gönüllü taahhütnamesi: eşleşme önerilmeden ve gönüllü onaylanmadan önce okunup madde madde işaretlenir. */
export default function PledgePage() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.legalPledge.title}</h1>
      <Banner tone="warning">{tr.legalPledge.draftNote}</Banner>
      <p className={styles.intro}>{tr.legalPledge.intro}</p>
      <PledgeForm />
    </div>
  );
}
