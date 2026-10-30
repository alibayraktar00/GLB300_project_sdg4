import 'server-only';

import type { ChildProgress } from '@/features/progress/types';
import { buildProgress } from '@/lib/progress-data';

import { createSupabaseServerClient } from './supabase';

/**
 * Velinin çocukları için ilerleme özeti. Hangi çocukların verisinin görüneceğini RLS belirler (veli yalnızca
 * kendi çocuklarını okur); hata durumunda boş liste döner.
 */
export async function loadChildProgress(guardianId: string): Promise<ChildProgress[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const links = await supabase.from('guardian_students').select('student_id').eq('guardian_id', guardianId);
    const ids = links.error || !Array.isArray(links.data) ? [] : links.data.map((row) => String(row.student_id));
    if (ids.length === 0) return [];

    const [profiles, plans, questions, sessions] = await Promise.all([
      supabase.from('profiles').select('id, display_name').in('id', ids),
      supabase
        .from('recovery_plans')
        .select('student_id, absence_start, absence_end, plan_items(seq, status, topics(title))')
        .in('student_id', ids)
        .eq('status', 'aktif'),
      supabase.from('questions').select('student_id, status').in('student_id', ids).limit(500),
      supabase.from('sessions').select('starts_at, duration_min, status, matches(student_id)').limit(500),
    ]);
    return buildProgress({
      profiles: profiles.data,
      plans: plans.data,
      questions: questions.data,
      sessions: sessions.data,
      now: Date.now(),
    });
  } catch {
    return [];
  }
}
