import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { GalleryPage } from '@/features/gallery/GalleryPage';
import { isGalleryEnabled } from '@/lib/gallery';
import { APP_ROLES, type AppRole } from '@/lib/role-navigation';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: `${tr.gallery.title} | ${tr.appName}` };

/**
 * Bileşen galerisi: YALNIZCA geliştirmede açılır. Üretim derlemesinde (GALLERY=on yoksa) ve Vercel üretim
 * ortamında 404 döner; `src/lib/gallery.ts` kuralı ve `e2e/galeri.spec.ts` bunu denetler.
 * Bu kontrol her istekte çalışır (sayfa dinamiktir), derleme sırasında değil.
 */
export default async function GalleryRoute({ searchParams }: { searchParams: Promise<{ rol?: string }> }) {
  if (!isGalleryEnabled(process.env)) notFound();

  const { rol } = await searchParams;
  const role = APP_ROLES.find((item): item is AppRole => item === rol) ?? 'ogrenci';
  return <GalleryPage role={role} />;
}
