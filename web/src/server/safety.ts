import 'server-only';

import type { BlockItem, ReportItem, VolunteerCard } from '@/features/safety/types';
import { parseBlocks, parseReports, parseVolunteerCards } from '@/lib/safety-data';

import { createSupabaseServerClient } from './supabase';

/** Öğrencinin ya da velinin gönüllü kartları (kısa ad). Yetkiyi görünümler verir; hata olursa boş liste. */
export async function loadMyVolunteers(role: 'ogrenci' | 'veli'): Promise<VolunteerCard[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const view = role === 'ogrenci' ? 'matched_volunteers_for_student' : 'matched_volunteers_for_guardian';
    const columns =
      role === 'ogrenci' ? 'student_id, volunteer_id, volunteer_name, match_status' : 'student_id, volunteer_id, volunteer_name, match_status, university';
    const { data, error } = await supabase.from(view).select(columns).limit(20);
    return error ? [] : parseVolunteerCards(data);
  } catch {
    return [];
  }
}

/** Yönetici kuyruğu: kapanmamış şikayetler ve incelenmemiş engeller (RLS yalnızca MFA'lı yöneticiye verir). */
export async function loadSafetyQueue(): Promise<{ reports: ReportItem[]; blocks: BlockItem[] }> {
  try {
    const supabase = await createSupabaseServerClient();
    const [reports, blocks] = await Promise.all([
      supabase.from('reports').select('id, target_type, category, status, created_at').neq('status', 'kapandi').order('created_at').limit(100),
      supabase.from('volunteer_blocks').select('id, blocked_by_role, reason_code, created_at').is('reviewed_at', null).order('created_at').limit(100),
    ]);
    return { reports: reports.error ? [] : parseReports(reports.data), blocks: blocks.error ? [] : parseBlocks(blocks.data) };
  } catch {
    return { reports: [], blocks: [] };
  }
}
