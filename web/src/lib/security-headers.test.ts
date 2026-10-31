import { describe, expect, it } from 'vitest';

import {
  applySecurityHeaders,
  buildCspValue,
  buildPermissionsPolicy,
  createNonce,
  cspHeaderName,
  isLessonPath,
  isSessionPath,
  originOf,
} from './security-headers';

const NONCE = 'dGVzdC1ub25jZQ==';
const base = { nonce: NONCE, pathname: '/', isDev: false };

/** CSP metnini {yönerge: [değerler]} nesnesine çevirir. */
function parseCsp(csp: string): Record<string, string[]> {
  return Object.fromEntries(
    csp.split('; ').map((part) => {
      const [name = '', ...values] = part.split(' ');
      return [name, values];
    }),
  );
}

describe('createNonce', () => {
  it('her çağrıda farklı ve base64 biçiminde değer üretir', () => {
    const a = createNonce();
    const b = createNonce();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/); // 16 bayt = 24 karakter base64
  });
});

describe('buildCspValue', () => {
  it('betik kaynaklarında nonce ve strict-dynamic var, unsafe-inline/unsafe-eval yok (üretim)', () => {
    const csp = parseCsp(buildCspValue(base));
    expect(csp['script-src']).toEqual(["'self'", `'nonce-${NONCE}'`, "'strict-dynamic'"]);
    expect(csp['style-src']).toEqual(["'self'", `'nonce-${NONCE}'`]);
  });

  it('geliştirmede unsafe-eval ve ws: ekler', () => {
    const csp = parseCsp(buildCspValue({ ...base, isDev: true }));
    expect(csp['script-src']).toContain("'unsafe-eval'");
    expect(csp['connect-src']).toContain('ws:');
  });

  it('plan 9.1 yönergelerini içerir', () => {
    const csp = parseCsp(buildCspValue(base));
    expect(csp['default-src']).toEqual(["'self'"]);
    expect(csp['object-src']).toEqual(["'none'"]);
    expect(csp['base-uri']).toEqual(["'none'"]);
    expect(csp['form-action']).toEqual(["'self'"]);
    expect(csp['frame-ancestors']).toEqual(["'none'"]);
    expect(csp['font-src']).toEqual(["'self'"]);
    expect(csp['connect-src']).toEqual(["'self'"]);
    expect(csp['worker-src']).toEqual(["'self'"]);
    expect(csp['manifest-src']).toEqual(["'self'"]);
    expect(csp['report-to']).toEqual(['csp']);
    expect(csp['report-uri']).toEqual(['/api/csp-report']);
  });

  it('Supabase kökenini yalnızca img-src ve media-src içine koyar', () => {
    const csp = parseCsp(buildCspValue({ ...base, supabaseOrigin: 'https://abc.supabase.co' }));
    expect(csp['img-src']).toContain('https://abc.supabase.co');
    expect(csp['media-src']).toContain('https://abc.supabase.co');
    expect(csp['connect-src']).not.toContain('https://abc.supabase.co');
    expect(csp['script-src']).not.toContain('https://abc.supabase.co');
  });

  it('iframe yalnızca ders sayfalarında JaaS için açılır', () => {
    expect(parseCsp(buildCspValue(base))['frame-src']).toEqual(["'none'"]);
    expect(parseCsp(buildCspValue({ ...base, pathname: '/ogrenci/ders/1' }))['frame-src']).toEqual(['https://8x8.vc']);
  });

  it('upgrade-insecure-requests yalnızca zorunlu modda eklenir', () => {
    expect(buildCspValue({ ...base, enforce: false })).not.toContain('upgrade-insecure-requests');
    expect(buildCspValue({ ...base, enforce: true })).toContain('upgrade-insecure-requests');
  });

  it('dış CDN, Google veya analitik alan adı içermez', () => {
    const csp = buildCspValue({ ...base, pathname: '/gonullu/ders/1', supabaseOrigin: 'https://abc.supabase.co' });
    for (const yasak of ['googleapis', 'gstatic', 'jsdelivr', 'unpkg', 'cdnjs', 'google-analytics', 'vercel']) {
      expect(csp).not.toContain(yasak);
    }
  });
});

describe('cspHeaderName', () => {
  it('rapor modunda Report-Only, zorunlu modda normal başlık adı verir', () => {
    expect(cspHeaderName(false)).toBe('Content-Security-Policy-Report-Only');
    expect(cspHeaderName(true)).toBe('Content-Security-Policy');
  });
});

describe('buildPermissionsPolicy', () => {
  it('varsayılan olarak tüm özel özellikleri kapatır', () => {
    expect(buildPermissionsPolicy('/')).toBe(
      'camera=(), microphone=(), display-capture=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
    );
  });

  it('öğrenci ve veli ders sayfasında kamera/mikrofon açık, ekran paylaşımı kapalı', () => {
    for (const path of ['/ogrenci/ders/abc', '/veli/ders/abc']) {
      const policy = buildPermissionsPolicy(path);
      expect(policy).toContain('camera=(self "https://8x8.vc")');
      expect(policy).toContain('microphone=(self "https://8x8.vc")');
      expect(policy).toContain('display-capture=()');
    }
  });

  it('ekran paylaşımı yalnızca gönüllü ders sayfasında açık', () => {
    expect(buildPermissionsPolicy('/gonullu/ders/abc')).toContain('display-capture=(self "https://8x8.vc")');
  });

  it('gönüllü cevap sayfasında yalnızca mikrofon açık', () => {
    const policy = buildPermissionsPolicy('/gonullu/sorular/42');
    expect(policy).toContain('microphone=(self)');
    expect(policy).toContain('camera=()');
  });
});

describe('yol yardımcıları', () => {
  it('önek sınırına dikkat eder', () => {
    expect(isSessionPath('/ogrenci')).toBe(true);
    expect(isSessionPath('/ogrenci/bugun')).toBe(true);
    expect(isSessionPath('/ogrencim')).toBe(false);
    expect(isSessionPath('/')).toBe(false);
    expect(isLessonPath('/veli/ders/1')).toBe(true);
    expect(isLessonPath('/veli/dersler')).toBe(false);
  });
});

describe('originOf', () => {
  it('yalnızca kökeni döndürür ve üretimde http kabul etmez', () => {
    expect(originOf('https://abc.supabase.co/rest/v1', { allowHttp: false })).toBe('https://abc.supabase.co');
    expect(originOf('http://127.0.0.1:54321', { allowHttp: false })).toBeNull();
    expect(originOf('http://127.0.0.1:54321', { allowHttp: true })).toBe('http://127.0.0.1:54321');
    expect(originOf('javascript:alert(1)', { allowHttp: true })).toBeNull();
    expect(originOf(undefined, { allowHttp: true })).toBeNull();
  });
});

describe('applySecurityHeaders', () => {
  const options = { ...base, hasSession: false, isProduction: true };

  it('plan 9.1 başlıklarını yazar', () => {
    const headers = new Headers();
    applySecurityHeaders(headers, options);
    expect(headers.get('Content-Security-Policy')).toContain(`'nonce-${NONCE}'`);
    expect(headers.get('Content-Security-Policy-Report-Only')).toBeNull(); // artık zorunlu
    expect(headers.get('Reporting-Endpoints')).toBe('csp="/api/csp-report"');
    expect(headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('X-Frame-Options')).toBe('DENY');
    expect(headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin');
    expect(headers.get('Strict-Transport-Security')).toBe('max-age=63072000; includeSubDomains');
    expect(headers.get('Permissions-Policy')).toContain('camera=()');
  });

  it('HSTS geliştirmede gönderilmez', () => {
    const headers = new Headers();
    applySecurityHeaders(headers, { ...options, isProduction: false });
    expect(headers.get('Strict-Transport-Security')).toBeNull();
  });

  it('herkese açık sayfada Cache-Control eklemez; oturumlu olanlarda no-store ekler', () => {
    const open = new Headers();
    applySecurityHeaders(open, options);
    expect(open.get('Cache-Control')).toBeNull();

    const bySession = new Headers();
    applySecurityHeaders(bySession, { ...options, hasSession: true });
    expect(bySession.get('Cache-Control')).toBe('private, no-store');

    const byPath = new Headers();
    applySecurityHeaders(byPath, { ...options, pathname: '/yonetici/kullanicilar' });
    expect(byPath.get('Cache-Control')).toBe('private, no-store');
  });
});
