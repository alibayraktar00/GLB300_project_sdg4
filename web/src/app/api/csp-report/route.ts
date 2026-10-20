import { createReportLimiter, summarizeCspReports } from '@/lib/csp-report';

/**
 * CSP ihlal raporu uç noktası (plan 6.4 ve 9.1). Tarayıcı, CSP'ye uymayan bir şey gördüğünde
 * buraya otomatik POST atar. Şimdilik CSP "rapor modunda" olduğu için bu raporlar, kuralı
 * zorunlu yapmadan önce neyin bozulacağını görmemizi sağlar.
 *
 * Kurallar:
 *   - Kişisel veri loglanmaz: adresler köke, sayfa ilk yol parçasına indirilir (bkz. csp-report.ts).
 *   - Gövde boyutu sınırlıdır, istek hız sınırlıdır.
 *   - Başka bir siteden gelen istek reddedilir.
 *   - Rapor göndermek için oturum gerekmez (tarayıcı çerezsiz gönderir).
 */
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 16 * 1024;
const allow = createReportLimiter(60, 60_000); // dakikada en çok 60 rapor

const ACCEPTED_TYPES = ['application/csp-report', 'application/reports+json', 'application/json'];

/**
 * `Origin` yoksa ya da "null" ise kabul edilir: `Referrer-Policy: no-referrer` olduğunda tarayıcılar
 * Origin'i "null" gönderir. Başka bir kökenden geliyorsa reddedilir.
 */
function isSameOriginOrAbsent(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return true;
  return origin === new URL(request.url).origin;
}

/** Gövdeyi en çok MAX_BODY_BYTES kadar okur; fazlası gelirse okumayı keser ve null döner (bellek taşmasını önler). */
async function readBodyWithLimit(request: Request): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

function noContent(status: number): Response {
  return new Response(null, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  if (!isSameOriginOrAbsent(request)) return noContent(403);

  const contentType = request.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
  if (!ACCEPTED_TYPES.includes(contentType)) return noContent(415);

  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  if (declaredLength > MAX_BODY_BYTES) return noContent(413);

  if (!allow()) return noContent(429);

  const text = await readBodyWithLimit(request);
  if (text === null) return noContent(413);

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return noContent(400);
  }

  for (const summary of summarizeCspReports(payload)) {
    console.warn('[csp-report]', JSON.stringify(summary));
  }
  return noContent(204);
}
