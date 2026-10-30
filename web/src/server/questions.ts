import 'server-only';

import type { QuestionSummary, ThreadData } from '@/features/questions/types';
import { UUID_PATTERN } from '@/lib/questions';
import { attachmentPaths, parseQuestionList, parseThread } from '@/lib/questions-data';

import { createSupabaseServerClient } from './supabase';

/**
 * Soru-cevap okuma yardımcıları. Kim neyi görür sorusunu RLS cevaplar (öğrenci kendi sorularını, veli çocuğunun
 * sorularını, gönüllü atanmış ve uygun havuz sorularını okur); burada ek yetki kararı verilmez. Hata ya da ayar
 * eksikliğinde boş sonuç döner, sayfa çökmez.
 */

const SIGNED_URL_SECONDS = 600;
const LIST_COLUMNS = 'id, status, created_at, subjects(name)';

export async function loadQuestionList(): Promise<QuestionSummary[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('questions')
      .select(LIST_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(50);
    return error ? [] : parseQuestionList(data);
  } catch {
    return [];
  }
}

/** Gönüllü panosu: kendisine atanan sorular ve (uygun ders/sınıfta) havuzdakiler. */
export async function loadVolunteerBoard(volunteerId: string): Promise<{ assigned: QuestionSummary[]; pool: QuestionSummary[] }> {
  try {
    const supabase = await createSupabaseServerClient();
    const [assigned, pool] = await Promise.all([
      supabase
        .from('questions')
        .select(LIST_COLUMNS)
        .eq('assigned_volunteer_id', volunteerId)
        .in('status', ['atandi', 'cevaplandi'])
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('questions').select(LIST_COLUMNS).eq('status', 'havuzda').order('created_at', { ascending: true }).limit(50),
    ]);
    return {
      assigned: assigned.error ? [] : parseQuestionList(assigned.data),
      pool: pool.error ? [] : parseQuestionList(pool.data),
    };
  } catch {
    return { assigned: [], pool: [] };
  }
}

/** Tek bir sorunun konuşması + fotoğrafların süreli imzalı adresleri. Bulunamazsa ya da erişilemezse null. */
export async function loadThread(questionId: string, viewerId: string): Promise<ThreadData | null> {
  if (!UUID_PATTERN.test(questionId)) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const [question, messages] = await Promise.all([
      supabase.from('questions').select(LIST_COLUMNS).eq('id', questionId).maybeSingle(),
      supabase
        .from('question_messages')
        .select('id, kind, body, created_at, hidden_at, sender_id, attachments(storage_path)')
        .eq('question_id', questionId)
        .order('created_at', { ascending: true })
        .limit(200),
    ]);
    if (question.error || !question.data || messages.error) return null;

    const paths = attachmentPaths(messages.data);
    const signedUrls: Record<string, string> = {};
    if (paths.length > 0) {
      const { data } = await supabase.storage.from('soru-ekleri').createSignedUrls(paths, SIGNED_URL_SECONDS);
      for (const item of data ?? []) {
        if (item.path && item.signedUrl && !item.error) signedUrls[item.path] = item.signedUrl;
      }
    }
    return parseThread({ question: question.data, messages: messages.data }, viewerId, signedUrls);
  } catch {
    return null;
  }
}
