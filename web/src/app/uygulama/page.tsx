import { redirect } from 'next/navigation';

import { homePathFor } from '@/lib/auth';
import { requireUser } from '@/server/session';

/** Oturumlu kullanıcıyı kendi ana sayfasına gönderir (başka rolün sayfasına girmeye çalışınca da buraya gelinir). */
export default async function AppEntryPage() {
  const user = await requireUser();
  if (user.status !== 'aktif') redirect('/durum');
  redirect(homePathFor(user.role));
}
