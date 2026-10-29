import type { Metadata } from 'next';

import { TodayView } from '@/features/today/TodayView';
import type { TodayData } from '@/features/today/types';
import { emptyToday, parseTodayTasks } from '@/lib/today-data';
import { getSessionUser } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: 'Bugün' };
export const dynamic = 'force-dynamic';

async function loadToday(): Promise<TodayData> {
  const user = await getSessionUser();
  let nickname: string = tr.today.fallbackName;
  try {
    const supabase = await createSupabaseServerClient();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
      if (profile?.display_name) nickname = profile.display_name;
    }
    const { data, error } = await supabase.rpc('get_today_tasks');
    if (!error) return parseTodayTasks(data, nickname);
  } catch {
    // Ayar yoksa ya da ağ hatası varsa aşağıdaki boş durum gösterilir.
  }
  return emptyToday(nickname);
}

/**
 * Öğrenci "Bugün" ekranı. Görevler `get_today_tasks` RPC'sinden gelir (tarihe bağlı değil; kaçırılan gün borç
 * yaratmaz). Veri alınamazsa ekran çökmez, "Henüz bir planın yok" durumu gösterilir. Rol denetimi
 * `ogrenci/layout.tsx` içindedir; asıl erişim denetimi veritabanındadır (RPC aktif öğrenci ister).
 * TODO(Faz C/D): yaklaşan ders ve yeni cevap sayıları.
 */
export default async function TodayPage() {
  return <TodayView data={await loadToday()} />;
}
