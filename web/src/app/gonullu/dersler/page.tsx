import type { Metadata } from 'next';

import { SectionHeader } from '@/components/SectionHeader';
import pageStyles from '@/features/questions/page.module.css';
import { scheduleSession } from '@/features/sessions/actions';
import { ScheduleForm } from '@/features/sessions/ScheduleForm';
import { SessionsView } from '@/features/sessions/SessionsView';
import { requireRole } from '@/server/session';
import { loadActiveMatches, loadSessions } from '@/server/sessions';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.sessions.title };
export const dynamic = 'force-dynamic';

/** Gönüllünün dersleri: yeni ders planla (Meet/Zoom bağlantısıyla) ve planlıları gör/iptal et. */
export default async function VolunteerSessionsPage() {
  const user = await requireRole('gonullu');
  const [{ upcoming, past }, matches] = await Promise.all([loadSessions(), loadActiveMatches(user.id)]);
  return (
    <div className={pageStyles.page}>
      <h1 className={pageStyles.title}>{tr.sessions.title}</h1>
      <section className={pageStyles.section} aria-labelledby="yeni">
        <SectionHeader id="yeni" title={tr.sessions.scheduleTitle} />
        {matches.length === 0 ? (
          <p className={pageStyles.note}>{tr.sessions.emptyVolunteer}</p>
        ) : (
          <ScheduleForm matches={matches} action={scheduleSession} />
        )}
      </section>
      <SessionsView upcoming={upcoming} past={past} returnTo="/gonullu/dersler" emptyHelp="" />
    </div>
  );
}
