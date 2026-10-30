'use server';

import { redirect } from 'next/navigation';

import type { ComposerState } from '@/features/questions/types';
import { messageForRpcError, messageSchema, questionFieldErrors, UUID_PATTERN } from '@/lib/questions';
import { requireRole } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';
import { tr } from '@/strings/tr';

/** Atanmış gönüllünün cevabı (metin + en çok 3 JPEG). Yetki `post_message` RPC'sindedir (`can_answer_question`). */
export async function postAnswer(_previous: ComposerState, formData: FormData): Promise<ComposerState> {
  await requireRole('gonullu');

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
  redirect(`/gonullu/sorular/${parsed.data.questionId}`);
}

/** Havuzdaki soruyu üstlenir. Tek kazanan; kaybedenin panosu yeniden yüklenir. */
export async function claimQuestionAction(formData: FormData): Promise<void> {
  await requireRole('gonullu');
  const questionId = String(formData.get('questionId') ?? '');
  if (!UUID_PATTERN.test(questionId)) redirect('/gonullu/pano');
  let claimed = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.rpc('claim_question', { p_question_id: questionId });
    claimed = !error;
  } catch {
    claimed = false;
  }
  redirect(claimed ? `/gonullu/sorular/${questionId}` : '/gonullu/pano');
}
