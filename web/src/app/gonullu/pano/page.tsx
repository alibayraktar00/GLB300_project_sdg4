import type { Metadata } from 'next';

import { Banner } from '@/components/Banner';
import { Button, ButtonLink } from '@/components/Button';
import { Card, CardContent } from '@/components/Card';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/StateViews';
import { QuestionList } from '@/features/questions/QuestionList';
import styles from '@/features/questions/page.module.css';
import { missingConsents } from '@/server/consents';
import { loadVolunteerBoard } from '@/server/questions';
import { createSupabaseServerClient } from '@/server/supabase';
import { requireRole } from '@/server/session';
import { tr } from '@/strings/tr';

import { claimQuestionAction } from '../sorular/actions';

export const metadata: Metadata = { title: tr.questions.volunteerBoard };
export const dynamic = 'force-dynamic';

/** Gönüllü panosu (docs/ekran-akislari.md G2): sana atanan sorular ve havuz. */
export default async function VolunteerBoardPage() {
  const user = await requireRole('gonullu');
  const { assigned, pool } = await loadVolunteerBoard(user.id);
  const missing = await createSupabaseServerClient()
    .then((supabase) => missingConsents(supabase, user.id, ['gonullu_taahhut', 'gonullu_davranis_kurallari']))
    .catch(() => []);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.questions.volunteerBoard}</h1>
      {missing.length > 0 ? (
        <Banner
          tone="warning"
          action={<ButtonLink href="/gonullu/taahhut">{tr.legalPledge.link}</ButtonLink>}
        >
          {tr.legalPledge.needed}
        </Banner>
      ) : null}

      <section className={styles.section} aria-labelledby="atanan">
        <SectionHeader id="atanan" title={tr.questions.assignedTitle} />
        {assigned.length === 0 ? (
          <p className={styles.note}>{tr.questions.emptyVolunteer}</p>
        ) : (
          <QuestionList items={assigned} hrefBase="/gonullu/sorular" />
        )}
      </section>

      <section className={styles.section} aria-labelledby="havuz">
        <SectionHeader id="havuz" title={tr.questions.poolTitle} subtitle={tr.questions.poolHelp} />
        {pool.length === 0 ? (
          <EmptyState title={tr.questions.emptyVolunteer} message="" />
        ) : (
          <ul className={styles.pool}>
            {pool.map((item) => (
              <li key={item.id}>
                <Card>
                  <div className={styles.claimRow}>
                    <CardContent title={item.subject || tr.questions.title} description={tr.questions.statuses.havuzda} />
                    <form action={claimQuestionAction}>
                      <input type="hidden" name="questionId" value={item.id} />
                      <Button type="submit">{tr.questions.claim}</Button>
                    </form>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
