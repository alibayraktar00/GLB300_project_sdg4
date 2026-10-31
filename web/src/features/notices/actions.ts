'use server';

import { redirect } from 'next/navigation';

import { requireUser } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';

/** Kullanıcı kendi okunmamış bildirimlerini okundu yapar (RLS yalnızca kendi satırlarına izin verir). */
export async function markAllReadAction(): Promise<void> {
  const user = await requireUser();
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', user.id).is('read_at', null);
  } catch {
    // Liste yeniden yüklenir; bildirimler hâlâ "yeni" görünüyorsa işaretlenememiştir.
  }
  redirect(`/${user.role}/bildirimler`);
}
