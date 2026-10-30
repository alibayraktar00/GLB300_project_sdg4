import type { Metadata } from 'next';

import pageStyles from '@/features/questions/page.module.css';
import { SessionsView } from '@/features/sessions/SessionsView';
import { loadSessions } from '@/server/sessions';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.sessions.title };
export const dynamic = 'force-dynamic';

/** Öğrencinin dersleri: Meet/Zoom bağlantısı ve iptal. */
export default async function StudentSessionsPage() {
  const { upcoming, past } = await loadSessions();
  return (
    <div className={pageStyles.page}>
      <h1 className={pageStyles.title}>{tr.sessions.title}</h1>
      <SessionsView upcoming={upcoming} past={past} returnTo="/ogrenci/dersler" />
    </div>
  );
}
