import Link from 'next/link';

import { Button } from '@/components/Button';
import { Card, CardContent } from '@/components/Card';
import { EmptyState } from '@/components/StateViews';
import pageStyles from '@/features/questions/page.module.css';
import { parseNotices } from '@/lib/notices-data';
import { createSupabaseServerClient } from '@/server/supabase';
import { tr } from '@/strings/tr';

import { markAllReadAction } from './actions';

const formatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' });
const when = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : formatter.format(date);
};

/** Dört rolün ortak Bildirimler sayfası: son 50 bildirim, yeniler yazıyla işaretli; rol denetimini iskelet (layout) yapar. */
export async function NoticesPage() {
  const items = await createSupabaseServerClient()
    .then((supabase) => supabase.from('notifications').select('id, title, read_at, created_at, data').order('created_at', { ascending: false }).limit(50))
    .then(({ data, error }) => (error ? [] : parseNotices(data)))
    .catch(() => []);
  const hasUnread = items.some((item) => item.unread);

  return (
    <div className={pageStyles.page}>
      <h1 className={pageStyles.title}>{tr.notices.title}</h1>
      {items.length === 0 ? (
        <EmptyState title={tr.notices.empty} message={tr.notices.emptyHelp} />
      ) : (
        <>
          {hasUnread ? (
            <form action={markAllReadAction}>
              <Button type="submit" variant="secondary">
                {tr.notices.markAll}
              </Button>
            </form>
          ) : null}
          <ul className={pageStyles.pool}>
            {items.map((item) => (
              <li key={item.id}>
                <Card tone={item.unread ? 'primary' : 'neutral'}>
                  <CardContent
                    title={item.unread ? `${tr.notices.unread} · ${item.title}` : item.title}
                    description={when(item.createdAt)}
                  />
                  {item.path ? <Link href={item.path}>{tr.notices.open}</Link> : null}
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
