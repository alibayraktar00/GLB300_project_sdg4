'use server';

import { redirect } from 'next/navigation';

import { UUID_PATTERN } from '@/lib/questions';
import { blockSchema, handleReportSchema, reportSchema, safeBlockReturn, safeThreadPath } from '@/lib/safety';
import { requireRole, requireUser } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';

/** Öğrenci ya da veli bir gönüllüyü engeller. Yetki ve etkiler (eşleşme biter, dersler iptal) veritabanındadır. */
export async function blockVolunteerAction(formData: FormData): Promise<void> {
  await requireUser();
  const back = safeBlockReturn(String(formData.get('returnTo') ?? ''));
  const parsed = blockSchema.safeParse({
    studentId: String(formData.get('studentId') ?? ''),
    volunteerId: String(formData.get('volunteerId') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  });
  if (parsed.success) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.rpc('block_volunteer', {
        p_student_id: parsed.data.studentId,
        p_volunteer_id: parsed.data.volunteerId,
        p_reason: parsed.data.reason,
      });
    } catch {
      // Sayfa yeniden yüklenir; gönüllü hâlâ listedeyse engel kaydedilememiştir.
    }
  }
  redirect(back);
}

/** Bir mesajı yöneticilere bildirir (tür listeden; serbest metin yok). RLS yalnızca bildirenin adına kayıt eklenmesine izin verir. */
export async function reportMessageAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const back = safeThreadPath(String(formData.get('returnTo') ?? '')) ?? '/uygulama';
  const parsed = reportSchema.safeParse({
    messageId: String(formData.get('messageId') ?? ''),
    category: String(formData.get('category') ?? ''),
  });
  if (parsed.success) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.from('reports').insert({
        reporter_id: user.id,
        target_type: 'mesaj',
        target_id: parsed.data.messageId,
        category: parsed.data.category,
      });
    } catch {
      // Bildirim kaydedilemedi; kullanıcı aynı sayfada yeniden deneyebilir.
    }
  }
  redirect(back);
}

/** Yönetici şikayeti incelemeye alır ya da kapatır (kısa not yönetim içindir). */
export async function handleReportAction(formData: FormData): Promise<void> {
  await requireRole('yonetici');
  const parsed = handleReportSchema.safeParse({
    reportId: String(formData.get('reportId') ?? ''),
    status: String(formData.get('status') ?? ''),
    note: String(formData.get('note') ?? ''),
  });
  if (parsed.success) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase
        .from('reports')
        .update({ status: parsed.data.status, ...(parsed.data.note ? { action_taken: parsed.data.note } : {}) })
        .eq('id', parsed.data.reportId);
    } catch {
      // Liste yeniden yüklenir; şikayet hâlâ eski durumdaysa işlem yapılamamıştır.
    }
  }
  redirect('/yonetici/sikayetler');
}

/** Yönetici bir engeli "incelendi" olarak işaretler. */
export async function reviewBlockAction(formData: FormData): Promise<void> {
  await requireRole('yonetici');
  const id = String(formData.get('blockId') ?? '');
  if (UUID_PATTERN.test(id)) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.from('volunteer_blocks').update({ reviewed_at: new Date().toISOString() }).eq('id', id);
    } catch {
      // Liste yeniden yüklenir.
    }
  }
  redirect('/yonetici/sikayetler');
}
