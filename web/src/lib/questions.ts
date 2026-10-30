import { z } from 'zod';

import { MVP_SUBJECTS } from '@/lib/scope';
import { tr } from '@/strings/tr';

/**
 * Soru-cevap girdi doğrulaması (saf yardımcılar). Asıl denetim `ask_question` / `post_message` RPC'lerinde ve
 * veritabanındadır; buradaki doğrulama erken ve anlaşılır geri bildirim içindir.
 */

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export const UUID_PATTERN = new RegExp(`^${UUID}$`);
/** Storage yolu: {öğrenci}/{soru}/{dosya}.jpg (veritabanı kısıtı ve Storage politikasıyla aynı biçim). */
export const PHOTO_PATH_PATTERN = new RegExp(`^${UUID}/${UUID}/${UUID}\\.jpg$`);

export const MAX_BODY = 4000;
export const MAX_PHOTOS = 3;

const bodyField = z.string().trim().max(MAX_BODY, tr.questions.errors.bodyTooLong);
const idField = z.string().regex(UUID_PATTERN, tr.questions.errors.invalid);
const pathsField = z
  .array(z.string().regex(PHOTO_PATH_PATTERN, tr.questions.errors.invalid))
  .max(MAX_PHOTOS, tr.questions.errors.tooManyPhotos);

function needsContent(value: { body: string; paths: string[] }, context: z.RefinementCtx) {
  if (value.body === '' && value.paths.length === 0) {
    context.addIssue({ code: 'custom', path: ['body'], message: tr.questions.errors.empty });
  }
}

/** Yeni soru: metin ve/veya fotoğraf. Ders kapsamla sınırlıdır (şimdilik yalnızca Matematik). */
export const askSchema = z
  .object({
    questionId: idField,
    subject: z.enum(MVP_SUBJECTS as [string, ...string[]], tr.questions.errors.invalid),
    body: bodyField,
    paths: pathsField,
  })
  .superRefine(needsContent);

/** Mevcut soruya mesaj: öğrencinin takip sorusu ya da gönüllünün cevabı. */
export const messageSchema = z
  .object({ questionId: idField, body: bodyField, paths: pathsField })
  .superRefine(needsContent);

export type QuestionFieldErrors = Partial<Record<'body' | 'subject' | 'paths' | 'questionId', string>>;

export function questionFieldErrors(error: z.ZodError): QuestionFieldErrors {
  const result: QuestionFieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (key === 'body' || key === 'subject' || key === 'paths' || key === 'questionId') {
      result[key] ??= issue.message;
    }
  }
  return result;
}

/** RPC hata iletisinin başındaki sabit kod (örn. "SORU_VAR: ...") -> kullanıcıya gösterilecek Türkçe metin. */
export function messageForRpcError(rawMessage: string | undefined): string {
  const code = rawMessage?.split(':')[0]?.trim() ?? '';
  const known = tr.questions.errors.rpc as Record<string, string | undefined>;
  return known[code] ?? tr.questions.errors.unavailable;
}
