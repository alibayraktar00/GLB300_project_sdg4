import type { Metadata } from 'next';

import { TodayView } from '@/features/today/TodayView';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: 'Bugün' };

/**
 * Öğrenci "Bugün" ekranı. Plan verisi (`get_today_tasks`) Faz B'de bağlanacak; o zamana kadar plan yokmuş gibi
 * "Henüz bir planın yok" durumu gösterilir. Rol denetimi `ogrenci/layout.tsx` içindedir.
 * TODO(Faz B): rumuzu `profiles.display_name`'den ve görevleri RPC'den oku.
 */
export default function TodayPage() {
  return <TodayView data={{ nickname: tr.today.fallbackName, tasks: [], completed: 0, total: 0, newAnswers: 0 }} />;
}
