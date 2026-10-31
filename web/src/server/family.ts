import 'server-only';

import { buildChildCards, parseMyStudents, type ChildCard, type MyStudent } from '@/lib/family-data';

import { createSupabaseServerClient } from './supabase';

/** Velinin çocukları ve özellik anahtarları. Hangi çocukların görüneceğini RLS belirler; hata olursa boş liste. */
export async function loadChildren(guardianId: string): Promise<ChildCard[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const links = await supabase.from('guardian_students').select('student_id').eq('guardian_id', guardianId);
    const ids = links.error || !Array.isArray(links.data) ? [] : links.data.map((row) => String(row.student_id));
    if (ids.length === 0) return [];
    const [profiles, students, features] = await Promise.all([
      supabase.from('profiles').select('id, display_name').in('id', ids),
      supabase.from('students').select('profile_id, grade, username').in('profile_id', ids),
      supabase.from('student_features').select('student_id, qa_enabled, video_enabled').in('student_id', ids),
    ]);
    return buildChildCards({ profiles: profiles.data, students: students.data, features: features.data });
  } catch {
    return [];
  }
}

/** Gönüllünün aktif eşleşmesindeki öğrenciler: yalnızca rumuz ve sınıf (görünüm başka alan vermez). */
export async function loadMyStudents(): Promise<MyStudent[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('matched_students').select('match_id, nickname, grade').limit(50);
    return error ? [] : parseMyStudents(data);
  } catch {
    return [];
  }
}
