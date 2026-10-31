import { z } from 'zod';

import '@/lib/zod-config';
import { UUID_PATTERN } from '@/lib/questions';

/** Uygulama içi bildirim listesi. Yanıt güvenilir sayılmaz: bozuk satır atlanır; yönlendirme yolu izin listesinden geçer. */
export type NoticeItem = { id: string; title: string; unread: boolean; createdAt: string; path: string | null };

const UUID = UUID_PATTERN.source.slice(1, -1);
/** Yalnızca uygulamanın kendi rol alanlarındaki sabit yollar ve soru sayfaları (açık yönlendirme yok). */
const PATH = new RegExp(
  `^(/(ogrenci|veli|gonullu)/(sorular|dersler|ozet|panel|pano|ogrenciler|takvim)(/${UUID})?|/yonetici/(basvurular|eslestirme|sikayetler))$`,
);

export const safeNoticePath = (value: unknown): string | null => (typeof value === 'string' && PATH.test(value) ? value : null);

const row = z.object({
  id: z.string().min(1),
  title: z.string(),
  read_at: z.string().nullable(),
  created_at: z.string(),
  data: z.unknown().optional(),
});

export function parseNotices(raw: unknown): NoticeItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const parsed = row.safeParse(item);
    if (!parsed.success) return [];
    const data = parsed.data.data;
    const path = typeof data === 'object' && data !== null ? safeNoticePath((data as Record<string, unknown>).path) : null;
    return [{ id: parsed.data.id, title: parsed.data.title, unread: parsed.data.read_at === null, createdAt: parsed.data.created_at, path }];
  });
}
