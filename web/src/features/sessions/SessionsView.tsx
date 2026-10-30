import pageStyles from '@/features/questions/page.module.css';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/StateViews';
import { tr } from '@/strings/tr';

import { SessionList } from './SessionList';
import type { SessionItem } from './types';

/** Planlı ve geçmiş dersler (ayrımı sunucu yapar); üç rol de aynı görünümü kullanır (RLS kimin neyi göreceğini belirler). */
export function SessionsView({
  upcoming,
  past,
  returnTo,
  emptyHelp = tr.sessions.emptyHelp,
  answered = [],
}: {
  upcoming: readonly SessionItem[];
  past: readonly SessionItem[];
  returnTo: string;
  emptyHelp?: string;
  /** Geri bildirim verilmiş derslerin kimlikleri. */
  answered?: readonly string[];
}) {
  return (
    <>
      <section className={pageStyles.section} aria-labelledby="planli">
        <SectionHeader id="planli" title={tr.sessions.upcoming} />
        {upcoming.length === 0 ? (
          <EmptyState title={tr.sessions.empty} message={emptyHelp} />
        ) : (
          <SessionList items={upcoming} returnTo={returnTo} />
        )}
      </section>
      {past.length > 0 ? (
        <section className={pageStyles.section} aria-labelledby="gecmis">
          <SectionHeader id="gecmis" title={tr.sessions.past} />
          <SessionList items={past} returnTo={returnTo} answered={answered} />
        </section>
      ) : null}
    </>
  );
}
