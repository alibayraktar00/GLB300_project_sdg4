import type { Metadata } from 'next';

import pageStyles from '@/features/questions/page.module.css';
import { MyVolunteers } from '@/features/safety/MyVolunteers';
import { SessionsView } from '@/features/sessions/SessionsView';
import { loadMyVolunteers } from '@/server/safety';
import { loadSessions } from '@/server/sessions';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.sessions.title };
export const dynamic = 'force-dynamic';

/** Öğrencinin dersleri: Meet/Zoom bağlantısı ve iptal. */
export default async function StudentSessionsPage() {
  const [{ upcoming, past, answered }, volunteers] = await Promise.all([loadSessions(), loadMyVolunteers('ogrenci')]);
  return (
    <div className={pageStyles.page}>
      <h1 className={pageStyles.title}>{tr.sessions.title}</h1>
      <MyVolunteers items={volunteers} returnTo="/ogrenci/dersler" />
      <SessionsView upcoming={upcoming} past={past} answered={answered} returnTo="/ogrenci/dersler" />
    </div>
  );
}
