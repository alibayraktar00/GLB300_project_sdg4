'use server';

import { redirect } from 'next/navigation';

import type { ScheduleState } from '@/features/sessions/types';
import { feedbackSchema } from '@/lib/feedback';
import { cancelSchema, istanbulToIso, messageForSessionError, scheduleFieldErrors, scheduleSchema } from '@/lib/sessions';
import { requireRole, requireUser } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';
import { tr } from '@/strings/tr';

/** Gönüllü ders planlar. Yetki ve tüm kurallar `schedule_session` RPC'sindedir; burası yalnızca erken geri bildirimdir. */
export async function scheduleSession(_previous: ScheduleState, formData: FormData): Promise<ScheduleState> {
  await requireRole('gonullu');

  const parsed = scheduleSchema.safeParse({
    matchId: String(formData.get('matchId') ?? ''),
    date: String(formData.get('date') ?? ''),
    time: String(formData.get('time') ?? ''),
    duration: String(formData.get('duration') ?? ''),
    url: String(formData.get('url') ?? ''),
  });
  if (!parsed.success) return { fieldErrors: scheduleFieldErrors(parsed.error) };
  const startsAt = istanbulToIso(parsed.data.date, parsed.data.time);
  if (!startsAt) return { fieldErrors: { date: tr.sessions.errors.dateRequired } };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('schedule_session', {
      p_match_id: parsed.data.matchId,
      p_starts_at: startsAt,
      p_duration_min: parsed.data.duration,
      p_meeting_url: parsed.data.url,
    });
    if (error) return { formError: messageForSessionError(error.message) };
  } catch {
    return { formError: tr.sessions.errors.unavailable };
  }
  redirect('/gonullu/dersler');
}

/** Bitmiş ders için puan ve devam isteği. Yetki ve tek cevap kuralı `submit_feedback` RPC'sindedir. */
export async function submitFeedbackAction(formData: FormData): Promise<void> {
  await requireUser();
  const returnTo = String(formData.get('returnTo') ?? '');
  const back = RETURN_PATHS.has(returnTo) ? returnTo : '/uygulama';
  const parsed = feedbackSchema.safeParse({
    sessionId: String(formData.get('sessionId') ?? ''),
    rating: String(formData.get('rating') ?? ''),
    wouldContinue: String(formData.get('wouldContinue') ?? ''),
  });
  if (parsed.success) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.rpc('submit_feedback', {
        p_session_id: parsed.data.sessionId,
        p_rating: parsed.data.rating,
        p_would_continue: parsed.data.wouldContinue,
      });
    } catch {
      // Sayfa yeniden yüklenir; form hâlâ görünüyorsa cevap kaydedilmemiştir.
    }
  }
  redirect(back);
}

const RETURN_PATHS = new Set(['/gonullu/dersler', '/ogrenci/dersler', '/veli/dersler']);

/** Öğrenci, veli ya da gönüllü planlı dersi iptal eder (gerekçe listeden). `cancel_session` RPC'si yetkiyi denetler. */
export async function cancelSessionAction(formData: FormData): Promise<void> {
  await requireUser();
  const returnTo = String(formData.get('returnTo') ?? '');
  const back = RETURN_PATHS.has(returnTo) ? returnTo : '/uygulama';
  const parsed = cancelSchema.safeParse({
    sessionId: String(formData.get('sessionId') ?? ''),
    reason: String(formData.get('reason') ?? ''),
  });
  if (parsed.success) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.rpc('cancel_session', { p_session_id: parsed.data.sessionId, p_reason: parsed.data.reason });
    } catch {
      // Sayfa yeniden yüklenir; ders hâlâ planlıysa kullanıcı yeniden deneyebilir.
    }
  }
  redirect(back);
}
