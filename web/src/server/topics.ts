import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/** Müfredat ünitesi (`public.topics`). RLS: aktif hesabı olan herkes okur. */
export type Topic = { id: number; title: string; sort_order: number };

/** Üniteleri `sort_order` sırasıyla döndürür. Sorgu başarısız olursa null döner (sayfa hata durumunu gösterir). */
export async function listTopics(supabase: SupabaseClient): Promise<Topic[] | null> {
  const { data, error } = await supabase.from('topics').select('id, title, sort_order').order('sort_order', { ascending: true });
  if (error || !data) return null;
  return data as Topic[];
}
