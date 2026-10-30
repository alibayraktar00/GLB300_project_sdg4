import { z } from 'zod';

import type { QuestionStatus, QuestionSummary, ThreadData, ThreadMessage } from '@/features/questions/types';

/**
 * PostgREST yanıtlarını ekran verisine çevirir. Yanıt güvenilir sayılmaz: şemaya uymayan satır atlanır,
 * uymayan bütün yanıt boş sayılır (ekran çökmez). Testlerle korunur.
 */

const STATUSES = ['acik', 'atandi', 'havuzda', 'cevaplandi', 'kapandi'] as const;
const status = z.enum(STATUSES);

/** Gömülü ilişki bazen nesne, bazen tek elemanlı dizi gelir; ikisini de kabul et. */
const one = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema).min(1).transform((items) => items[0] as z.infer<T>)]).nullable();

const subjectRef = one(z.object({ name: z.string() }));

const questionRow = z.object({
  id: z.string().min(1),
  status,
  created_at: z.string(),
  subjects: subjectRef.optional(),
});

export function parseQuestionList(raw: unknown): QuestionSummary[] {
  if (!Array.isArray(raw)) return [];
  const result: QuestionSummary[] = [];
  for (const row of raw) {
    const parsed = questionRow.safeParse(row);
    if (!parsed.success) continue;
    result.push({
      id: parsed.data.id,
      status: parsed.data.status,
      subject: parsed.data.subjects?.name ?? '',
      createdAt: parsed.data.created_at,
    });
  }
  return result;
}

const messageRow = z.object({
  id: z.string().min(1),
  kind: z.enum(['soru', 'cevap', 'takip']),
  body: z.string(),
  created_at: z.string(),
  hidden_at: z.string().nullable().optional(),
  sender_id: z.string().nullable().optional(),
  attachments: z.array(z.object({ storage_path: z.string() })).optional().default([]),
});

export type RawThread = { question: unknown; messages: unknown };

/** `signedUrls`: storage_path -> süreli imzalı adres. Adresi olmayan fotoğraf gösterilmez. */
export function parseThread(raw: RawThread, viewerId: string, signedUrls: Record<string, string>): ThreadData | null {
  const question = questionRow.safeParse(raw.question);
  if (!question.success || !Array.isArray(raw.messages)) return null;

  const messages: ThreadMessage[] = [];
  for (const row of raw.messages) {
    const parsed = messageRow.safeParse(row);
    if (!parsed.success) continue;
    const hidden = Boolean(parsed.data.hidden_at);
    messages.push({
      id: parsed.data.id,
      kind: parsed.data.kind,
      body: hidden ? '' : parsed.data.body,
      createdAt: parsed.data.created_at,
      hidden,
      mine: parsed.data.sender_id === viewerId,
      photos: hidden
        ? []
        : parsed.data.attachments.map((item) => signedUrls[item.storage_path]).filter((url): url is string => Boolean(url)),
    });
  }
  messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {
    id: question.data.id,
    status: question.data.status,
    subject: question.data.subjects?.name ?? '',
    messages,
  };
}

/** Bir dizi mesajdaki tüm ek yolları (imzalı adres üretmek için). */
export function attachmentPaths(rawMessages: unknown): string[] {
  if (!Array.isArray(rawMessages)) return [];
  const paths: string[] = [];
  for (const row of rawMessages) {
    const parsed = messageRow.safeParse(row);
    if (parsed.success && !parsed.data.hidden_at) paths.push(...parsed.data.attachments.map((item) => item.storage_path));
  }
  return paths;
}

export type { QuestionStatus };
