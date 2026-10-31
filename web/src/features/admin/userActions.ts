'use server';

import { redirect } from 'next/navigation';

import { accountStatusSchema } from '@/lib/users-data';
import { requireRole } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';

/** Yönetici bir hesabı askıya alır ya da yeniden etkinleştirir. Kurallar (MFA, yönetici hesabı, kendi hesabı) RPC'dedir. */
export async function setAccountStatusAction(formData: FormData): Promise<void> {
  await requireRole('yonetici');
  const parsed = accountStatusSchema.safeParse({
    userId: String(formData.get('userId') ?? ''),
    status: String(formData.get('status') ?? ''),
  });
  if (parsed.success) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.rpc('set_account_status', { p_user_id: parsed.data.userId, p_status: parsed.data.status });
    } catch {
      // Liste yeniden yüklenir; durum değişmediyse işlem yapılamamıştır.
    }
  }
  redirect('/yonetici/kullanicilar');
}
