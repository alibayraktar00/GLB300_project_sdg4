/**
 * Güvenlik başlıkları (plan 9.1, madde 8). `src/proxy.ts` her istekte bunları çağırır.
 *
 * Bu dosya saf fonksiyonlardan oluşur (Next'e bağımlı değil), bu yüzden Vitest ile kolayca denenir.
 */

/**
 * CSP şimdilik YALNIZCA RAPOR modundadır (plan 9.1: H1-H8 rapor, H9'dan itibaren zorunlu).
 * Zorunlu moda geçmek için bu değeri `true` yap; başka bir şey değişmez:
 *   - başlık adı `Content-Security-Policy` olur (ihlaller engellenir),
 *   - `upgrade-insecure-requests` eklenir (rapor modunda zaten yok sayılır).
 */
export const CSP_ENFORCED = true;

/** CSP ihlal raporlarının gönderildiği adres (`src/app/api/csp-report/route.ts`). */
export const CSP_REPORT_PATH = '/api/csp-report';

/** Girişli kullanıcıya özel sayfaların adres önekleri. Bunlar `Cache-Control: private, no-store` ile sunulur. */
export const SESSION_PATH_PREFIXES = ['/ogrenci', '/veli', '/gonullu', '/yonetici', '/durum'] as const;

/** Görüntülü ders (JaaS) iframe'inin kökeni. Başka dış köken yoktur (plan 4.2). */
export const JAAS_ORIGIN = 'https://8x8.vc';

/** Her istek için tahmin edilemez, tek kullanımlık nonce üretir (16 rastgele bayt, base64). */
export function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** `/ogrenci/x` gibi adresin verilen önekin altında olup olmadığı (`/ogrencim` eşleşmez). */
function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isSessionPath(pathname: string): boolean {
  return SESSION_PATH_PREFIXES.some((prefix) => isUnder(pathname, prefix));
}

/** `/ogrenci/ders/[id]`, `/veli/ders/[id]`, `/gonullu/ders/[id]` */
export function isLessonPath(pathname: string): boolean {
  return ['/ogrenci/ders', '/veli/ders', '/gonullu/ders'].some((prefix) => isUnder(pathname, prefix));
}

/** Gönüllünün soru cevaplama sayfası (ses kaydı gerekir): `/gonullu/sorular/[id]` */
function isVolunteerAnswerPath(pathname: string): boolean {
  return isUnder(pathname, '/gonullu/sorular');
}

/**
 * Bir kaynak adresinden yalnızca kökeni (https://ornek.supabase.co) alır.
 * Geçersizse `null`. Üretimde yalnızca https kabul edilir.
 */
export function originOf(url: string | undefined, { allowHttp }: { allowHttp: boolean }): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || (allowHttp && parsed.protocol === 'http:')) return parsed.origin;
    return null;
  } catch {
    return null;
  }
}

export type CspOptions = {
  nonce: string;
  pathname: string;
  /** `next dev` çalışıyorsa true (React geliştirme modu `eval` ve canlı yenileme ister). */
  isDev: boolean;
  /** Supabase Storage'dan imzalı URL ile gelen foto ve ses için izin verilen köken. Yoksa yalnızca 'self'. */
  supabaseOrigin?: string | null;
  enforce?: boolean;
  /** `upgrade-insecure-requests` eklensin mi? Yalnızca zorunlu modda ve istek HTTPS ise. Verilmezse eklenir (güvenli varsayılan). */
  upgradeInsecure?: boolean;
};

/** Content-Security-Policy değerini üretir (plan 9.1 tablosu). */
export function buildCspValue({ nonce, pathname, isDev, supabaseOrigin, enforce = CSP_ENFORCED, upgradeInsecure = true }: CspOptions): string {
  const storage = supabaseOrigin ? [supabaseOrigin] : [];
  const nonceSource = `'nonce-${nonce}'`;

  const directives: Array<[string, string[]]> = [
    ['default-src', ["'self'"]],
    ['script-src', ["'self'", nonceSource, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])]],
    // Geliştirmede Next, nonce'suz satır içi stil ekleyebilir (Next belgesindeki öneri); üretimde nonce şart.
    ['style-src', ["'self'", ...(isDev ? ["'unsafe-inline'"] : [nonceSource])]],
    // Sunucuda üretilen style="" öznitelikleri nonce alamaz. Gerekli olup olmadığı spike'ta (CSP rapor
    // modu) belirlenir; gerekmiyorsa bu satır silinir (plan 9.1, dipnot 1).
    ['style-src-attr', ["'unsafe-inline'"]],
    ['img-src', ["'self'", 'blob:', 'data:', ...storage]],
    ['media-src', ["'self'", 'blob:', ...storage]],
    ['font-src', ["'self'"]],
    ['connect-src', ["'self'", ...(isDev ? ['ws:', 'wss:'] : [])]],
    // İframe yalnızca ders sayfalarında, yalnızca JaaS için (plan 4.2).
    ['frame-src', isLessonPath(pathname) ? [JAAS_ORIGIN] : ["'none'"]],
    ['worker-src', ["'self'"]],
    ['manifest-src', ["'self'"]],
    ['object-src', ["'none'"]],
    ['base-uri', ["'none'"]],
    ['form-action', ["'self'"]],
    ['frame-ancestors', ["'none'"]],
    // `upgrade-insecure-requests` rapor modunda tarayıcı tarafından yok sayılır ve konsola uyarı yazar.
    ...(enforce && upgradeInsecure ? ([['upgrade-insecure-requests', []]] as Array<[string, string[]]>) : []),
    // `report-to` Chromium için, `report-uri` Firefox ve Safari için (onlar henüz report-to desteklemiyor).
    ['report-uri', [CSP_REPORT_PATH]],
    ['report-to', ['csp']],
  ];

  return directives.map(([name, values]) => (values.length > 0 ? `${name} ${values.join(' ')}` : name)).join('; ');
}

/** Başlık adı: rapor modunda `Content-Security-Policy-Report-Only`, zorunlu modda `Content-Security-Policy`. */
export function cspHeaderName(enforce: boolean = CSP_ENFORCED): string {
  return enforce ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only';
}

/**
 * Permissions-Policy değeri. Varsayılan: hiçbir özel özellik yok.
 *  - Ders sayfaları: kamera ve mikrofon yalnızca kendimiz ve JaaS; ekran paylaşımı yalnızca gönüllüde.
 *  - Gönüllü cevap sayfası: mikrofon (ses kaydı için) yalnızca kendimiz.
 */
export function buildPermissionsPolicy(pathname: string): string {
  const jaas = `(self "${JAAS_ORIGIN}")`;
  let camera = '()';
  let microphone = '()';
  let displayCapture = '()';

  if (isLessonPath(pathname)) {
    camera = jaas;
    microphone = jaas;
    if (isUnder(pathname, '/gonullu/ders')) displayCapture = jaas;
  } else if (isVolunteerAnswerPath(pathname)) {
    microphone = '(self)';
  }

  return [
    `camera=${camera}`,
    `microphone=${microphone}`,
    `display-capture=${displayCapture}`,
    'geolocation=()',
    'payment=()',
    'usb=()',
    'browsing-topics=()',
  ].join(', ');
}

export type SecurityHeaderOptions = CspOptions & {
  /** İstekte Supabase oturum çerezi var mı? Varsa yanıt kişiseldir. */
  hasSession: boolean;
  isProduction: boolean;
};

/**
 * Yanıt başlıklarına güvenlik başlıklarını yazar. (CSP isteğe de ayrıca yazılır; bkz. proxy.ts.)
 * HSTS yalnızca üretimde gönderilir: geliştirmede `localhost` adresini tarayıcıda kalıcı olarak HTTPS'e
 * kilitleyebilir.
 */
export function applySecurityHeaders(headers: Headers, options: SecurityHeaderOptions): void {
  const enforce = options.enforce ?? CSP_ENFORCED;
  headers.set(cspHeaderName(enforce), buildCspValue({ ...options, enforce }));
  headers.set('Reporting-Endpoints', `csp="${CSP_REPORT_PATH}"`);
  headers.set('X-Content-Type-Options', 'nosniff');
  // CSP rapor modunda `frame-ancestors` engellemez; çerçeveleme koruması bu başlıkla sağlanır.
  headers.set('X-Frame-Options', 'DENY');
  // Dış sitelere "Eğitim Köprüsü'nden geldi" bilgisi gitmez (plan 9.1, madde 8 ve 9.3).
  headers.set('Referrer-Policy', 'no-referrer');
  headers.set('Permissions-Policy', buildPermissionsPolicy(options.pathname));
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  if (options.isProduction) {
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains');
  }
  if (options.hasSession || isSessionPath(options.pathname)) {
    headers.set('Cache-Control', 'private, no-store');
  }
}
