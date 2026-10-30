import { CardContent, CardLink } from '@/components/Card';
import { tr } from '@/strings/tr';

import styles from './QuestionList.module.css';
import type { QuestionSummary } from './types';

const formatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeZone: 'Europe/Istanbul' });
function formatDay(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : formatter.format(date);
}

/** Soru satırları: ders, gün ve durum. Durum yalnızca renkle değil yazıyla verilir. Her satır tek bağlantıdır. */
export function QuestionList({ items, hrefBase }: { items: readonly QuestionSummary[]; hrefBase: string }) {
  return (
    <ul className={styles.list}>
      {items.map((item) => (
        <li key={item.id}>
          <CardLink href={`${hrefBase}/${item.id}`} tone={item.status === 'cevaplandi' ? 'primary' : 'neutral'}>
            <CardContent
              icon={item.status === 'cevaplandi' ? 'check_circle' : 'info'}
              title={`${item.subject || tr.questions.title} · ${formatDay(item.createdAt)}`}
              description={tr.questions.statuses[item.status]}
              chevron
            />
          </CardLink>
        </li>
      ))}
    </ul>
  );
}
