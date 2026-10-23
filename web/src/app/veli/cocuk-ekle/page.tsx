import type { Metadata } from 'next';

import { tr } from '@/strings/tr';

import styles from '../../giris/page.module.css';

import { AddChildWizard } from './AddChildWizard';

export const metadata: Metadata = { title: tr.child.title };

/** Çocuk hesabı ekleme (docs/ekran-akislari.md V2). Rol denetimi `veli/layout.tsx` içinde yapılır. */
export default function AddChildPage() {
  return (
    <div className={styles.layout}>
      <h1 className={styles.title}>{tr.child.title}</h1>
      <p className={styles.intro}>{tr.child.intro}</p>
      <AddChildWizard />
    </div>
  );
}
