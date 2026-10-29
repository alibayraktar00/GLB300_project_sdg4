import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/AppShell';
import { PlanView } from '@/features/plan/PlanView';
import { SAMPLE_PLAN } from '@/features/plan/sample';
import { isGalleryEnabled } from '@/lib/gallery';

export const metadata: Metadata = { title: 'Planım (önizleme)' };

/** Geliştirme önizlemesi: "Planım" ÖRNEK verilerle. Galeri ile aynı kuralla yalnızca geliştirmede açılır. */
export default function PlanPreviewPage() {
  if (!isGalleryEnabled(process.env)) notFound();
  return (
    <AppShell appRole="ogrenci" currentPath="/ogrenci/plan">
      <PlanView data={SAMPLE_PLAN} />
    </AppShell>
  );
}
