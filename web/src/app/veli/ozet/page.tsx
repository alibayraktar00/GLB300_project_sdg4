import type { Metadata } from 'next';

import { EmptyState } from '@/components/StateViews';
import { PrintButton } from '@/features/progress/PrintButton';
import { ProgressView } from '@/features/progress/ProgressView';
import pageStyles from '@/features/questions/page.module.css';
import { loadChildProgress } from '@/server/progress';
import { requireRole } from '@/server/session';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.childProgress.title };
export const dynamic = 'force-dynamic';

const dateFormatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long', timeZone: 'Europe/Istanbul' });

/** Velinin yazdırılabilir ilerleme özeti: çocuk başına plan, soru ve ders durumu. Kişisel veri yalnızca velinin kendi çocuğudur. */
export default async function GuardianSummaryPage() {
  const user = await requireRole('veli');
  const items = await loadChildProgress(user.id);
  return (
    <div className={pageStyles.page}>
      <h1 className={pageStyles.title}>{tr.childProgress.title}</h1>
      <p className={pageStyles.note}>{tr.childProgress.intro}</p>
      {items.length === 0 ? (
        <EmptyState title={tr.childProgress.noChildren} message="" />
      ) : (
        <>
          <p className={pageStyles.note}>{tr.childProgress.printedOn(dateFormatter.format(new Date()))}</p>
          <ProgressView items={items} />
          <PrintButton />
        </>
      )}
    </div>
  );
}
