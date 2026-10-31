import 'server-only';

import type { ApplicationItem, MatchingData, MatchProposal } from '@/features/admin/types';
import { parseFeedbackSummary, type FeedbackSummary } from '@/lib/feedback';
import { parseApplications, parseMatchingData, parseProposals } from '@/lib/admin-data';
import { MVP_GRADES, MVP_SUBJECTS } from '@/lib/scope';

import { createSupabaseServerClient } from './supabase';

/**
 * Yönetici okuma yardımcıları. Yetkiyi RLS verir (private.is_admin: MFA şart); yetkisiz ya da hata durumunda
 * boş sonuç döner. Çocuğun adı yoktur: öğrenci yalnızca kullanıcı adı ve sınıfıyla listelenir.
 */

export async function loadApplications(): Promise<ApplicationItem[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('volunteers')
      .select('profile_id, given_name, family_name, university, department, class_year, status')
      .in('status', ['basvuru', 'egitim', 'inceleme'])
      .order('created_at', { ascending: true })
      .limit(100);
    const items = error ? [] : parseApplications(data);
    if (items.length === 0) return items;
    const consents = await supabase
      .from('consents')
      .select('user_id, type')
      .in('user_id', items.map((item) => item.id))
      .in('type', ['gonullu_taahhut', 'gonullu_davranis_kurallari'])
      .eq('granted', true)
      .is('withdrawn_at', null);
    const held = new Map<string, Set<string>>();
    for (const row of consents.error || !Array.isArray(consents.data) ? [] : consents.data) {
      const set = held.get(String(row.user_id)) ?? new Set<string>();
      set.add(String(row.type));
      held.set(String(row.user_id), set);
    }
    return items.map((item) => ({ ...item, pledgeOk: held.get(item.id)?.size === 2 }));
  } catch {
    return [];
  }
}

const EMPTY: MatchingData = { students: [], volunteers: [], subjectId: null, proposals: [] };

export async function loadMatching(): Promise<MatchingData> {
  try {
    const supabase = await createSupabaseServerClient();
    const subject = await supabase.from('subjects').select('id').eq('code', MVP_SUBJECTS[0]).maybeSingle();
    const subjectId = typeof subject.data?.id === 'number' ? subject.data.id : null;
    if (subjectId === null) return EMPTY;

    const [students, volunteers, open] = await Promise.all([
      supabase.from('students').select('profile_id, grade, username').in('grade', [...MVP_GRADES]).order('created_at').limit(200),
      supabase
        .from('volunteers')
        .select('profile_id, given_name, family_name, university, volunteer_subjects(subject_id, grade)')
        .eq('status', 'onayli')
        .order('created_at')
        .limit(200),
      supabase
        .from('matches')
        .select('id, subject_id, status, student_id, subjects(name)')
        .eq('subject_id', subjectId)
        .in('status', ['onerildi', 'veli_onayi', 'aktif'])
        .limit(500),
    ]);

    const taken = new Set<string>();
    if (Array.isArray(open.data)) for (const row of open.data) taken.add(String((row as { student_id?: string }).student_id));
    const parsed = parseMatchingData(students.error ? [] : students.data, volunteers.error ? [] : volunteers.data);
    const proposals: MatchProposal[] = parseProposals(open.error ? [] : open.data, []);
    return {
      students: parsed.students.filter((s) => !taken.has(s.id)),
      volunteers: parsed.volunteers,
      subjectId,
      proposals,
    };
  } catch {
    return EMPTY;
  }
}

/** Velinin karar bekleyen önerileri. Gönüllü adı veli görünümünden gelir ("Ad S."). */
export async function loadPendingProposals(): Promise<MatchProposal[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const [matches, volunteers] = await Promise.all([
      supabase.from('matches').select('id, subject_id, status, subjects(name)').eq('status', 'onerildi').limit(20),
      supabase.from('matched_volunteers_for_guardian').select('match_id, volunteer_name, university').eq('match_status', 'onerildi').limit(20),
    ]);
    return parseProposals(matches.error ? [] : matches.data, volunteers.error ? [] : volunteers.data);
  } catch {
    return [];
  }
}

/** Geri bildirim özeti (yalnızca yönetici, MFA). Hata ya da yetki yoksa boş özet döner. */
export async function loadFeedbackSummary(): Promise<FeedbackSummary> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc('get_feedback_summary');
    return error ? parseFeedbackSummary(null) : parseFeedbackSummary(data);
  } catch {
    return parseFeedbackSummary(null);
  }
}
