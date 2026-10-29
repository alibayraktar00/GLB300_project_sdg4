import type { Metadata } from 'next';

import { PlanWizard } from '@/features/plan/PlanWizard';
import { tr } from '@/strings/tr';

import styles from '../../../giris/page.module.css';

import { createPlan } from './actions';

export const metadata: Metadata = { title: tr.plan.wizardTitle };

/** Plan oluşturma sihirbazı (docs/ekran-akislari.md Ö2). */
export default function CreatePlanPage() {
  return (
    <div className={styles.layout}>
      <h1 className={styles.title}>{tr.plan.wizardTitle}</h1>
      <PlanWizard action={createPlan} />
    </div>
  );
}
