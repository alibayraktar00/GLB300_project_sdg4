'use server';

import { redirect } from 'next/navigation';

import { withdrawSchema } from '@/lib/account-data';
import { requireRole } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';

/**
 * Veli verdiği bir onayı geri çeker. Yetkiyi RLS verir (yalnızca kendi onayı ya da çocuğunun onayı); geri çekme zamanını
 * ve sonuçlarını (açık rıza için çocuk hesabının askıya alınması) veritabanı tetikleyicileri uygular.
 */
export async function withdrawConsentAction(formData: FormData): Promise<void> {
  await requireRole('veli');
  const parsed = withdrawSchema.safeParse({ consentId: String(formData.get('consentId') ?? '') });
  if (parsed.success) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.from('consents').update({ withdrawn_at: new Date().toISOString() }).eq('id', parsed.data.consentId);
    } catch {
      // Sayfa yeniden yüklenir; onay hâlâ listedeyse geri çekilememiştir.
    }
  }
  redirect('/veli/hesap');
}
