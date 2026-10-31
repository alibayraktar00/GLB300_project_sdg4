import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/AppShell';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { isGalleryEnabled } from '@/lib/gallery';

export const metadata: Metadata = { title: 'Ayarlar (önizleme)' };

/** Geliştirme önizlemesi: Ayarlar sayfası (giriş gerektirmeden). Yalnızca geliştirmede açılır. */
export default function SettingsPreviewPage() {
  if (!isGalleryEnabled(process.env)) notFound();
  return (
    <AppShell appRole="ogrenci" currentPath="/ogrenci/ayarlar">
      <SettingsPage />
    </AppShell>
  );
}
