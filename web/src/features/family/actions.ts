'use server';

import { redirect } from 'next/navigation';

import { UUID_PATTERN } from '@/lib/questions';
import { requireRole } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';

const FEATURES = new Set(['qa_enabled', 'video_enabled']);

/**
 * Veli, çocuğunun bir özelliğini (soru sorma / görüntülü ders) açar ya da kapatır. Yetkiyi RLS verir: yalnızca o çocuğun
 * velisi güncelleyebilir; kapalı özellik veritabanında da zorlanır (soru açılamaz, ders planlanamaz).
 */
export async function setFeatureAction(formData: FormData): Promise<void> {
  await requireRole('veli');
  const studentId = String(formData.get('studentId') ?? '');
  const feature = String(formData.get('feature') ?? '');
  const value = String(formData.get('value') ?? '');
  if (UUID_PATTERN.test(studentId) && FEATURES.has(feature) && (value === 'true' || value === 'false')) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.from('student_features').update({ [feature]: value === 'true' }).eq('student_id', studentId);
    } catch {
      // Sayfa yeniden yüklenir; anahtar eski konumdaysa değişiklik yapılamamıştır.
    }
  }
  redirect('/veli/panel');
}
