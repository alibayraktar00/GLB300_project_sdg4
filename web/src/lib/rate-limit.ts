/**
 * Basit sabit pencereli istek sınırlayıcı (bellekte). Tek sunucu örneği için en iyi çabadır: sunucusuz ortamda
 * her örneğin kendi sayacı vardır, bu yüzden asıl sınırlar veritabanındadır (günlük soru sınırı, Storage kotası).
 * Buradaki amaç, bir oturumun yükleme ucunu kısa sürede yüzlerce kez çağırmasını ucuza kesmektir.
 */

const MAX_KEYS = 5000;

export type RateLimiter = { allow: (key: string, now?: number) => boolean };

export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return {
    allow(key, now = Date.now()) {
      const entry = hits.get(key);
      if (!entry || entry.resetAt <= now) {
        if (hits.size >= MAX_KEYS) {
          // Bellek sınırsız büyümesin: önce süresi dolanları, yetmezse en eskileri at.
          for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
          if (hits.size >= MAX_KEYS) hits.clear();
        }
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return true;
      }
      if (entry.count >= limit) return false;
      entry.count += 1;
      return true;
    },
  };
}
