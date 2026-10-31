/**
 * Ders bağlantısı yalnızca Google Meet ya da Zoom olabilir. Veritabanı CHECK kısıtı bunu zaten zorlar; bu işlev
 * ekranda SAVUNMA katmanıdır: veri kaynağı ne olursa olsun `href`e yalnızca izinli bir https adresi girer
 * (javascript:, data:, başka site ya da kullanıcı bilgisi içeren adresler null döner).
 */
const ALLOWED = [/^meet\.google\.com$/, /^([a-z0-9-]+\.)?zoom\.us$/];

export function safeMeetingUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    return ALLOWED.some((pattern) => pattern.test(url.hostname)) ? url.toString() : null;
  } catch {
    return null;
  }
}
