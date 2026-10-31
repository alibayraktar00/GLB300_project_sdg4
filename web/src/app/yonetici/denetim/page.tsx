import type { Metadata } from 'next';

import styles from '@/features/questions/page.module.css';
import { loadAuditLog } from '@/server/audit';
import { requireAdminMfa } from '@/server/session';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.family.auditTitle };
export const dynamic = 'force-dynamic';

const formatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' });
const when = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : formatter.format(date);
};

/** Denetim kaydı: yönetici ve sistem işlemleri (salt okunur; ayrıntı alanı kişisel veri içerebileceği için gösterilmez). */
export default async function AuditPage() {
  await requireAdminMfa();
  const items = await loadAuditLog();
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.family.auditTitle}</h1>
      <p className={styles.note}>{tr.family.auditHelp}</p>
      {items.length === 0 ? (
        <p className={styles.note}>{tr.family.auditEmpty}</p>
      ) : (
        <ul className={styles.pool}>
          {items.map((item) => (
            <li key={item.id} className={styles.note}>
              <time dateTime={item.createdAt}>{when(item.createdAt)}</time> · {item.action} · {item.entity}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
