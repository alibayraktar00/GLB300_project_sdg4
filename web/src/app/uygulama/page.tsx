import { redirect } from 'next/navigation';

import { homePathFor } from '@/lib/auth';
import { getSessionUser } from '@/server/session';

export const dynamic = 'force-dynamic';

/** Oturum sonrası dağıtıcı: kullanıcıyı rolünün ana sayfasına, oturum yoksa girişe, hesap aktif değilse /durum'a gönderir. */
export default async function AppEntryPage() {
  const user = await getSessionUser();
  if (!user) redirect('/giris');
  if (user.status !== 'aktif') redirect('/durum');
  redirect(homePathFor(user.role));
}
