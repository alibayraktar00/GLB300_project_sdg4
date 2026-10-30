import type { Metadata } from 'next';

import { Button } from '@/components/Button';
import { SectionHeader } from '@/components/SectionHeader';
import { proposeMatchAction } from '@/features/admin/actions';
import styles from '@/features/questions/page.module.css';
import { loadMatching } from '@/server/admin';
import { requireAdminMfa } from '@/server/session';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.admin.matchingTitle };
export const dynamic = 'force-dynamic';

/** Eşleştirme: eşleşmesi olmayan öğrenciye onaylı gönüllü öner. Öneri velinin kararını bekler. */
export default async function MatchingPage() {
  await requireAdminMfa();
  const data = await loadMatching();
  const ready = data.subjectId !== null && data.students.length > 0 && data.volunteers.length > 0;
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.admin.matchingTitle}</h1>

      <section className={styles.section} aria-labelledby="oner">
        <SectionHeader id="oner" title={tr.admin.proposeTitle} subtitle={tr.admin.proposeHelp} />
        {ready ? (
          <form action={proposeMatchAction} className={styles.section}>
            <input type="hidden" name="subjectId" value={data.subjectId ?? ''} />
            <label className={styles.note}>
              <span>{tr.admin.student}</span>{' '}
              <select name="studentId" required>
                {data.students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.username} · {tr.admin.gradeLabel(s.grade)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.note}>
              <span>{tr.admin.volunteer}</span>{' '}
              <select name="volunteerId" required>
                {data.volunteers.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} · {v.university}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <Button type="submit">{tr.admin.propose}</Button>
            </div>
          </form>
        ) : (
          <p className={styles.note}>{data.students.length === 0 ? tr.admin.noStudents : tr.admin.noVolunteers}</p>
        )}
      </section>

      <section className={styles.section} aria-labelledby="bekleyen">
        <SectionHeader id="bekleyen" title={tr.admin.pendingTitle} />
        {data.proposals.length === 0 ? (
          <p className={styles.note}>{tr.admin.pendingEmpty}</p>
        ) : (
          <p className={styles.note}>{tr.admin.pendingCount(data.proposals.length)}</p>
        )}
      </section>
    </div>
  );
}
