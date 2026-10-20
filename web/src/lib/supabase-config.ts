/**
 * Supabase ortam değişkenlerini okur ve doğrular.
 *
 * Değişkenler bilerek `NEXT_PUBLIC_` ile BAŞLAMAZ: tarayıcıda Supabase istemcisi yoktur (plan 3.7),
 * bu yüzden değerler tarayıcı paketine hiç girmez; yalnızca sunucuda çalışma anında okunur.
 *
 * Supabase projesi yoksa (ya da değişkenler boşsa) uygulama ÇÖKMEZ:
 *   - geliştirmede terminale açık bir uyarı yazılır,
 *   - üretimde günlüğe yalnızca değişken ADLARI yazılır; kullanıcıya genel bir hata gösterilir.
 */

export const SUPABASE_URL_NAME = 'SUPABASE_URL';
export const SUPABASE_KEY_NAME = 'SUPABASE_PUBLISHABLE_KEY';

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
  /** `https://<proje>.supabase.co`: CSP'de img-src ve media-src için kullanılır. */
  origin: string;
};

export type SupabaseConfigResult = { ok: true; config: SupabaseConfig } | { ok: false; problems: string[] };

type EnvLike = Record<string, string | undefined>;

/**
 * Değişkenleri doğrular. Anahtarın KENDİSİ hiçbir hata mesajına yazılmaz.
 * @param isProduction true ise yalnızca https adresi kabul edilir.
 */
export function readSupabaseConfig(env: EnvLike, isProduction: boolean): SupabaseConfigResult {
  const problems: string[] = [];
  const rawUrl = env[SUPABASE_URL_NAME]?.trim();
  const rawKey = env[SUPABASE_KEY_NAME]?.trim();

  let url: URL | null = null;
  if (!rawUrl) {
    problems.push(`${SUPABASE_URL_NAME} tanımlı değil.`);
  } else {
    try {
      url = new URL(rawUrl);
      if (url.protocol !== 'https:' && (isProduction || url.protocol !== 'http:')) {
        problems.push(`${SUPABASE_URL_NAME} https:// ile başlamalı.`);
        url = null;
      }
    } catch {
      problems.push(`${SUPABASE_URL_NAME} geçerli bir adres değil.`);
    }
  }

  if (!rawKey) {
    problems.push(`${SUPABASE_KEY_NAME} tanımlı değil.`);
  } else if (rawKey.startsWith('sb_secret_')) {
    problems.push(
      `${SUPABASE_KEY_NAME} alanına GİZLİ anahtar (sb_secret_...) konmuş. Hemen sil ve Supabase panelinden anahtarı yenile. ` +
        'Web uygulaması gizli anahtar kullanmaz.',
    );
  } else if (rawKey.startsWith('eyJ')) {
    problems.push(
      `${SUPABASE_KEY_NAME} eski biçimde (JWT) bir anahtar. Eski anon/service_role anahtarları kullanılmaz; sb_publishable_ ile başlayan anahtarı kullan.`,
    );
  } else if (!rawKey.startsWith('sb_publishable_')) {
    problems.push(`${SUPABASE_KEY_NAME} sb_publishable_ ile başlamalı.`);
  }

  if (problems.length > 0 || !url || !rawKey) return { ok: false, problems };
  return { ok: true, config: { url: url.toString().replace(/\/$/, ''), publishableKey: rawKey, origin: url.origin } };
}

let reported = false;

/**
 * Yapılandırma sorunlarını süreç başına BİR kez günlüğe yazar.
 * Geliştirmede açık bir uyarı, üretimde kısa bir hata satırı (yalnızca sorun metni; sır yok).
 */
export function reportSupabaseConfigProblems(problems: string[], isProduction: boolean): void {
  if (reported) return;
  reported = true;
  if (isProduction) {
    console.error(`[supabase] Yapılandırma eksik veya hatalı: ${problems.join(' ')}`);
    return;
  }
  console.warn(
    [
      '',
      '  [UYARI] Supabase ayarları eksik. Ana sayfa çalışır, ancak giriş ve veri gerektiren sayfalar çalışmaz.',
      ...problems.map((sorun) => `          - ${sorun}`),
      '          Çözüm: web/.env.example dosyasını web/.env.local olarak kopyala ve değerleri doldur.',
      '          (Supabase projesi henüz yoksa bu uyarıyı yok sayabilirsin.)',
      '',
    ].join('\n'),
  );
}

/** Yalnızca testler için: "bir kez yaz" durumunu sıfırlar. */
export function resetSupabaseConfigReportForTests(): void {
  reported = false;
}
