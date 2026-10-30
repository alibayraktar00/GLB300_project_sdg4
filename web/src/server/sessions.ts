import 'server-only';

import type { MatchOption, SessionItem } from '@/features/sessions/types';
import { splitSessions } from '@/features/sessions/split';
import { parseSessions } from '@/lib/sessions';

import { createSupabaseServerClient } from './supabase';

/** Ders okuma yardımcıları. Kim neyi görür sorusunu RLS cevaplar; hata olursa boş sonuç döner. */

const COLUMNS = 'id, starts_at, duration_min, status, meeting_url, matches(subjects(name))';

export async function loadSessions(): Promise<{ upcoming: SessionItem[]; past: SessionItem[]; answered: string[] }> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('sessions').select(COLUMNS).order('starts_at', { ascending: true }).limit(100);
    const feedback = await supabase.from('session_feedback').select('session_id').limit(200);
    const answered = feedback.error || !Array.isArray(feedback.data) ? [] : feedback.data.map((row) => String(row.session_id));
    return { ...splitSessions(error ? [] : parseSessions(data), Date.now()), answered };
  } catch {
    return { upcoming: [], past: [], answered: [] };
  }
}

/** Gönüllünün aktif eşleşmeleri (ders planlanabilecek öğrenciler). Öğrencinin adı gösterilmez. */
export async function loadActiveMatches(volunteerId: string): Promise<MatchOption[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('matches')
      .select('id, subjects(name)')
      .eq('volunteer_id', volunteerId)
      .eq('status', 'aktif')
      .order('created_at', { ascending: true })
      .limit(20);
    if (error || !Array.isArray(data)) return [];
    return data.map((row) => {
      const subjects = (row as { subjects?: { name?: string } | { name?: string }[] | null }).subjects;
      const name = Array.isArray(subjects) ? subjects[0]?.name : subjects?.name;
      return { id: String((row as { id: string }).id), subject: name ?? '' };
    });
  } catch {
    return [];
  }
}
