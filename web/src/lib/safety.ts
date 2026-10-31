import { z } from 'zod';

import '@/lib/zod-config';
import { UUID_PATTERN } from '@/lib/questions';

/** Güvenlik girdileri: engel nedeni ve şikayet türü LİSTEDEN seçilir; çocuktan serbest metin alınmaz. */
export const BLOCK_REASONS = ['uygunsuz_davranis', 'rahatsiz_edici', 'platform_disi_iletisim', 'tercih_etmiyorum', 'diger'] as const;
export const REPORT_CATEGORIES = ['uygunsuz_icerik', 'kisisel_bilgi_istendi', 'platform_disi_iletisim', 'taciz_zorbalik', 'yanlis_bilgi', 'diger'] as const;

const id = z.string().regex(UUID_PATTERN);

export const blockSchema = z.object({ studentId: id, volunteerId: id, reason: z.enum(BLOCK_REASONS) });
export const reportSchema = z.object({ messageId: id, category: z.enum(REPORT_CATEGORIES) });
export const handleReportSchema = z.object({
  reportId: id,
  status: z.enum(['inceleniyor', 'kapandi']),
  note: z.string().trim().max(1000).default(''),
});

/** Geri dönüş adresi yalnızca bir soru sayfası olabilir (açık yönlendirme yok). */
const THREAD_PATH = new RegExp(`^/(ogrenci|veli|gonullu)/sorular/${UUID_PATTERN.source.slice(1, -1)}$`);
const BLOCK_RETURN = new Set(['/ogrenci/dersler', '/veli/dersler']);

export const safeThreadPath = (value: string): string | null => (THREAD_PATH.test(value) ? value : null);
export const safeBlockReturn = (value: string): string => (BLOCK_RETURN.has(value) ? value : '/uygulama');
