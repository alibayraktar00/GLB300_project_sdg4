/**
 * CSP ihlal raporlarını güvenle özetler (plan 6.4 ve 9.1, madde 13: kişisel veri loglanmaz).
 *
 * Tarayıcılar iki biçimde rapor gönderir:
 *   - eski (`report-uri`): `{ "csp-report": { "violated-directive": ..., "blocked-uri": ... } }`
 *   - yeni (`report-to`): `[{ "type": "csp-violation", "body": { "effectiveDirective": ..., "blockedURL": ... } }]`
 *
 * Adreslerde sorgu parametreleri, parça (#...) ve yol ayrıntıları atılır; örnek kod parçası (script sample),
 * referrer ve kullanıcı bilgisi hiç okunmaz.
 */

export type CspViolationSummary = {
  /** Örn. "script-src-elem" */
  directive: string;
  /** Engellenen kaynak: dış sitelerde yalnızca köken, "inline"/"eval" gibi anahtar sözcükler olduğu gibi. */
  blocked: string;
  /** İhlalin olduğu sayfanın yalnızca ilk yol parçası, örn. "/ogrenci". */
  page: string;
  /** "report" (yalnızca rapor) ya da "enforce" (engellendi). */
  disposition: string;
};

const MAX_FIELD = 120;

function clip(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, MAX_FIELD) : '';
}

/** "https://ornek.com/a/b?x=1" -> "https://ornek.com". URL olmayan değerler (inline, eval, data) olduğu gibi kalır. */
function originOnly(value: unknown): string {
  const text = clip(value);
  if (!text) return '';
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : url.protocol;
  } catch {
    return text;
  }
}

/** "https://x.com/ogrenci/sorular/123?a=b" -> "/ogrenci" */
function firstPathSegment(value: unknown): string {
  const text = clip(value);
  try {
    const first = new URL(text).pathname.split('/')[1];
    return first ? `/${first}` : '/';
  } catch {
    return '';
  }
}

type Loose = Record<string, unknown>;
const isObject = (value: unknown): value is Loose => typeof value === 'object' && value !== null && !Array.isArray(value);

function fromLegacy(report: Loose): CspViolationSummary {
  return {
    directive: clip(report['effective-directive'] ?? report['violated-directive']),
    blocked: originOnly(report['blocked-uri']),
    page: firstPathSegment(report['document-uri']),
    disposition: clip(report['disposition']),
  };
}

function fromReportingApi(body: Loose): CspViolationSummary {
  return {
    directive: clip(body['effectiveDirective'] ?? body['violatedDirective']),
    blocked: originOnly(body['blockedURL']),
    page: firstPathSegment(body['documentURL']),
    disposition: clip(body['disposition']),
  };
}

/** Gelen JSON gövdesinden en çok 10 ihlal özeti çıkarır; tanınmayan biçim boş liste verir. */
export function summarizeCspReports(payload: unknown): CspViolationSummary[] {
  const summaries: CspViolationSummary[] = [];

  if (isObject(payload) && isObject(payload['csp-report'])) {
    summaries.push(fromLegacy(payload['csp-report']));
  } else if (Array.isArray(payload)) {
    for (const item of payload) {
      if (isObject(item) && item['type'] === 'csp-violation' && isObject(item['body'])) {
        summaries.push(fromReportingApi(item['body']));
      }
    }
  }
  return summaries.slice(0, 10);
}

/**
 * Basit hız sınırı: en çok `limit` rapor / `windowMs`. Süreç belleğinde tutulur (kişi bilgisi saklanmaz).
 * Sunucusuz ortamda her örnek ayrı sayar; amaç rapor taşkınını sınırlamaktır, kesin kota değil.
 */
export function createReportLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  let windowStart = now();
  let count = 0;
  return function allow(): boolean {
    const current = now();
    if (current - windowStart >= windowMs) {
      windowStart = current;
      count = 0;
    }
    count += 1;
    return count <= limit;
  };
}
