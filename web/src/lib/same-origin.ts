/**
 * Durum değiştiren API uçları için kaynak denetimi (CSRF'e karşı ikinci hat; çerezler zaten SameSite=Lax).
 * `Origin` başlığı istek adresinin kökeniyle aynı olmalı. Tarayıcılar POST isteklerine Origin ekler; başlık
 * yoksa (ya da "null" ise) istek reddedilir. Sunucudan sunucuya çağrılar bu uçları kullanmaz.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
