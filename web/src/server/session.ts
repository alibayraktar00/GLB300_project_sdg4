import 'server-only';

import { redirect } from 'next/navigation';

import { isAppRole } from '@/lib/auth';
import type { AppRole } from '@/lib/role-navigation';

import { createSupabaseServerClient, SupabaseNotConfiguredError } from './supabase';

/**
 * Oturum okuma yardımcıları (plan 6.4). Yetki kararı BURADA değil veritabanında (RLS) verilir; bu
 * yardımcılar yalnızca kullanıcıyı doğru sayfaya yönlendirmek içindir.
 */

export type SessionUser = {
  id: string;
  role: AppRole;
  /** `profiles.status`: aktif, beklemede, askida. */
  status: string;
};

/**
 * Oturum açmış kullanıcıyı döndürür; yoksa null. Kimlik `getClaims()` ile doğrulanır (JWT imzası kontrol
 * edilir), rol ve durum `profiles` tablosundan okunur (RLS: kullanıcı kendi satırını her durumda okur).
 * Supabase ayarlı değilse ya da sorgu başarısız olursa null döner; sayfa çökmez.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: claims } = await supabase.auth.getClaims();
    const id = claims?.claims?.sub;
    if (!id) return null;

    const { data: profile } = await supabase.from('profiles').select('role, status').eq('id', id).maybeSingle();
    if (!profile || !isAppRole(profile.role)) return null;
    return { id, role: profile.role, status: String(profile.status) };
  } catch (error) {
    if (error instanceof SupabaseNotConfiguredError) return null;
    return null;
  }
}

/** Oturum yoksa girişe gönderir (`devam` ile geri dönülecek adres taşınır). */
export async function requireUser(returnTo?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect(returnTo ? `/giris?devam=${encodeURIComponent(returnTo)}` : '/giris');
  }
  return user;
}

/**
 * Belirli bir rolü şart koşar. Hesap aktif değilse `/durum`, başka rolse kendi ana sayfasına gönderir.
 * (Gerçek erişim denetimi RLS'tedir; bu yalnızca kullanıcıyı yanlış sayfada bırakmamak içindir.)
 */
export async function requireRole(role: AppRole): Promise<SessionUser> {
  const user = await requireUser();
  if (user.status !== 'aktif') redirect('/durum');
  if (user.role !== role) redirect('/uygulama');
  return user;
}
