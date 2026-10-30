'use server';

import { redirect } from 'next/navigation';

import type { ComposerState } from '@/features/questions/types';
import { askSchema, messageForRpcError, messageSchema, questionFieldErrors, UUID_PATTERN } from '@/lib/questions';
import { requireRole } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';
import { tr } from '@/strings/tr';

/**
 * Yeni soru. Fotoğraflar tarayıcıdan `/api/soru-eki` ile yüklenmiştir; burada yalnızca dosya YOLLARI gelir ve
 * `ask_question` RPC'si bunları (yol biçimi, sahiplik, dosyanın var olması) yeniden doğrular.
 * Soru kimliği fotoğrafla birlikte istemcide üretilmişse kullanılır; yoksa burada üretilir.
 */
export async function askQuestion(_previous: ComposerState, formData: FormData): Promise<ComposerState> {
  await requireRole('ogrenci');

  const questionId = String(formData.get('questionId') ?? '') || crypto.randomUUID();
  const parsed = askSchema.safeParse({
    questionId,
    subject: String(formData.get('subject') ?? ''),
    body: String(formData.get('body') ?? ''),
    paths: formData.getAll('paths').map(String),
  });
  if (!parsed.success) return { fieldErrors: questionFieldErrors(parsed.error) };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('ask_question', {
      p_question_id: parsed.data.questionId,
      p_subject_code: parsed.data.subject,
      p_body: parsed.data.body,
      p_attachment_paths: parsed.data.paths,
    });
    if (error) return { formError: messageForRpcError(error.message) };
  } catch {
    return { formError: tr.questions.errors.unavailable };
  }
  redirect(`/ogrenci/sorular/${parsed.data.questionId}`);
}

/** Takip sorusu (cevaplanmış soru yeniden aynı gönüllüye cevap bekler). */
export async function postFollowUp(_previous: ComposerState, formData: FormData): Promise<ComposerState> {
  await requireRole('ogrenci');

  const parsed = messageSchema.safeParse({
    questionId: String(formData.get('questionId') ?? ''),
    body: String(formData.get('body') ?? ''),
    paths: formData.getAll('paths').map(String),
  });
  if (!parsed.success) return { fieldErrors: questionFieldErrors(parsed.error) };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('post_message', {
      p_question_id: parsed.data.questionId,
      p_body: parsed.data.body,
      p_attachment_paths: parsed.data.paths,
    });
    if (error) return { formError: messageForRpcError(error.message) };
  } catch {
    return { formError: tr.questions.errors.unavailable };
  }
  redirect(`/ogrenci/sorular/${parsed.data.questionId}`);
}

/** "Anladım": öğrenci soruyu kapatır. */
export async function closeQuestionAction(formData: FormData): Promise<void> {
  await requireRole('ogrenci');
  const questionId = String(formData.get('questionId') ?? '');
  if (!UUID_PATTERN.test(questionId)) redirect('/ogrenci/sorular');
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.rpc('close_question', { p_question_id: questionId });
  } catch {
    // Kapatılamazsa soru açık kalır; sayfa yeniden yüklenince durum görünür.
  }
  redirect(`/ogrenci/sorular/${questionId}`);
}
