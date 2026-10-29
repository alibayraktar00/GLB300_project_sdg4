import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/AppShell';
import { TodayView } from '@/features/today/TodayView';
import { SAMPLE_TODAY } from '@/features/today/sample';
import { isGalleryEnabled } from '@/lib/gallery';

export const metadata: Metadata = { title: 'Bugün (önizleme)' };

/** Geliştirme önizlemesi: öğrenci "Bugün" ekranı ÖRNEK verilerle. Galeri ile aynı kuralla yalnızca geliştirmede açılır. */
export default function TodayPreviewPage() {
  if (!isGalleryEnabled(process.env)) notFound();
  return (
    <AppShell appRole="ogrenci" currentPath="/ogrenci/bugun">
      <TodayView data={SAMPLE_TODAY} />
    </AppShell>
  );
}
