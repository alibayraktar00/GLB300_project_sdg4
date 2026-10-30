import type { Metadata } from 'next';

import pageStyles from '@/features/questions/page.module.css';
import { PendingMatches } from '@/features/admin/PendingMatches';
import { SessionsView } from '@/features/sessions/SessionsView';
import { loadPendingProposals } from '@/server/admin';
import { loadSessions } from '@/server/sessions';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.sessions.title };
export const dynamic = 'force-dynamic';

/** Velinin görünümü: çocuğunun dersleri. Veli iptal edebilir (RPC yetkiyi denetler). */
export default async function GuardianSessionsPage() {
  const [{ upcoming, past }, proposals] = await Promise.all([loadSessions(), loadPendingProposals()]);
  return (
    <div className={pageStyles.page}>
      <h1 className={pageStyles.title}>{tr.sessions.title}</h1>
      <PendingMatches items={proposals} />
      <p className={pageStyles.note}>{tr.sessions.parentNote}</p>
      <SessionsView upcoming={upcoming} past={past} returnTo="/veli/dersler" />
    </div>
  );
}
