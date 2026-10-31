import type { Metadata } from 'next';

import { Button, ButtonLink } from '@/components/Button';
import { Card, CardContent } from '@/components/Card';
import { EmptyState } from '@/components/StateViews';
import { reviewVolunteerAction } from '@/features/admin/actions';
import styles from '@/features/questions/page.module.css';
import { loadApplications } from '@/server/admin';
import { requireAdminMfa } from '@/server/session';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.admin.applicationsTitle };
export const dynamic = 'force-dynamic';

/** Gönüllü başvuruları: onay ya da gerekçeli ret. Yönetici rolü MFA ister (RLS). */
export default async function ApplicationsPage() {
  await requireAdminMfa();
  const items = await loadApplications();
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.admin.applicationsTitle}</h1>
      <div>
        <ButtonLink href="/yonetici/olcum" variant="secondary">
          {tr.feedback.summaryLink}
        </ButtonLink>
      </div>
      {items.length === 0 ? (
        <EmptyState title={tr.admin.applicationsEmpty} message="" />
      ) : (
        <ul className={styles.pool}>
          {items.map((item) => (
            <li key={item.id}>
              <Card>
                <CardContent
                  title={`${item.name} · ${item.university}`}
                  description={[item.department, item.classYear ? `${item.classYear}. sınıf` : '', tr.admin.statuses[item.status]]
                    .filter(Boolean)
                    .join(' · ')}
                />
                <div className={styles.claimRow}>
                  {item.pledgeOk ? (
                    <form action={reviewVolunteerAction}>
                      <input type="hidden" name="volunteerId" value={item.id} />
                      <input type="hidden" name="decision" value="onayla" />
                      <Button type="submit">{tr.admin.approve}</Button>
                    </form>
                  ) : (
                    <p className={styles.note}>{tr.legalPledge.missingAdmin}</p>
                  )}
                  <form action={reviewVolunteerAction} className={styles.claimRow}>
                    <input type="hidden" name="volunteerId" value={item.id} />
                    <input type="hidden" name="decision" value="reddet" />
                    <label className={styles.note}>
                      <span>{tr.admin.rejectReason}</span>{' '}
                      <select name="reason" defaultValue="uygun_degil">
                        <option value="belge_eksik">{tr.admin.reasons.belge_eksik}</option>
                        <option value="uygun_degil">{tr.admin.reasons.uygun_degil}</option>
                        <option value="diger">{tr.admin.reasons.diger}</option>
                      </select>
                    </label>
                    <Button type="submit" variant="secondary">
                      {tr.admin.reject}
                    </Button>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
