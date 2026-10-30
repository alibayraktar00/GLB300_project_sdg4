import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/AppShell';
import pageStyles from '@/features/questions/page.module.css';
import { SAMPLE_SESSIONS } from '@/features/sessions/sample';
import { splitSessions } from '@/features/sessions/split';
import { SessionsView } from '@/features/sessions/SessionsView';
import { isGalleryEnabled } from '@/lib/gallery';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: 'Dersler (önizleme)' };

/** Geliştirme önizlemesi: ders listesi ÖRNEK verilerle. Yalnızca geliştirmede açılır. */
export default function SessionsPreviewPage() {
  if (!isGalleryEnabled(process.env)) notFound();
  const { upcoming, past } = splitSessions(SAMPLE_SESSIONS, Date.parse('2026-11-01T00:00:00Z'));
  return (
    <AppShell appRole="ogrenci" currentPath="/ogrenci/dersler">
      <div className={pageStyles.page}>
        <h1 className={pageStyles.title}>{tr.sessions.title}</h1>
        <SessionsView upcoming={upcoming} past={past} returnTo="/ogrenci/dersler" />
      </div>
    </AppShell>
  );
}
