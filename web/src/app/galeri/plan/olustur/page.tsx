import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/AppShell';
import { PlanWizard } from '@/features/plan/PlanWizard';
import { isGalleryEnabled } from '@/lib/gallery';
import { tr } from '@/strings/tr';

import styles from '../../../giris/page.module.css';

export const metadata: Metadata = { title: 'Plan oluştur (önizleme)' };

/** Önizlemede gönderim hiçbir şey kaydetmez. */
async function previewSubmit() {
  'use server';
  return null;
}

/** Geliştirme önizlemesi: plan oluşturma sihirbazı. Yalnızca geliştirmede açılır. */
export default function CreatePlanPreviewPage() {
  if (!isGalleryEnabled(process.env)) notFound();
  return (
    <AppShell appRole="ogrenci" currentPath="/ogrenci/plan">
      <div className={styles.layout}>
        <h1 className={styles.title}>{tr.plan.wizardTitle}</h1>
        <PlanWizard action={previewSubmit} />
      </div>
    </AppShell>
  );
}
