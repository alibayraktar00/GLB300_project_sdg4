// @vitest-environment node
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetSupabaseConfigReportForTests } from '@/lib/supabase-config';

// Gerçek Supabase'e gitmemek için istemci sahtelenir.
const getClaims = vi.fn();
const createServerClient = vi.fn();
vi.mock('@supabase/ssr', () => ({ createServerClient: (...args: unknown[]) => createServerClient(...args) }));

import { proxy } from './proxy';

const SESSION_COOKIE = 'sb-abcdefgh-auth-token';

function request(path = '/', cookies?: string) {
  return new NextRequest(`http://localhost:3000${path}`, { headers: cookies ? { cookie: cookies } : {} });
}

function nonceOf(response: Response): string {
  const csp = response.headers.get('content-security-policy') ?? '';
  return /'nonce-([^']+)'/.exec(csp)?.[1] ?? '';
}

function stubSupabaseEnv() {
  vi.stubEnv('SUPABASE_URL', 'https://abcdefgh.supabase.co');
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_ornek');
}

/** Supabase kütüphanesinin gerçekte verdiği seçenekler: 400 gün Max-Age ve httpOnly: false. */
const SUPABASE_WRITE = { httpOnly: false, secure: false, sameSite: 'none', path: '/', maxAge: 400 * 24 * 60 * 60 };

/** getClaims() çağrılınca Supabase'in setAll ile çerez yazmasını taklit eder. */
function supabaseWrites(options: Record<string, unknown>, value = 'yeni-jeton') {
  getClaims.mockImplementation(async () => {
    const { cookies } = createServerClient.mock.calls[0]![2] as {
      cookies: { setAll: (c: unknown[], h: Record<string, string>) => void };
    };
    cookies.setAll([{ name: SESSION_COOKIE, value, options }], {
      'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
      Expires: '0',
      Pragma: 'no-cache',
    });
    return { data: null, error: null };
  });
}

beforeEach(() => {
  resetSupabaseConfigReportForTests();
  getClaims.mockReset().mockResolvedValue({ data: null, error: null });
  createServerClient.mockReset().mockReturnValue({ auth: { getClaims } });
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => resetSupabaseConfigReportForTests());

describe('proxy: güvenlik başlıkları', () => {
  it('her istek için nonce\'lu zorunlu CSP ve diğer başlıkları ekler', async () => {
    const response = await proxy(request('/'));
    expect(nonceOf(response)).not.toBe('');
    expect(response.headers.get('content-security-policy-report-only')).toBeNull();
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('permissions-policy')).toContain('camera=()');
  });

  it('nonce her istekte farklıdır', async () => {
    const [a, b] = [await proxy(request('/')), await proxy(request('/'))];
    expect(nonceOf(a)).not.toBe(nonceOf(b));
  });

  it('nonce ve CSP, Next.js\'in sayfayı çizerken okuyacağı İSTEK başlıklarına da yazılır', async () => {
    const response = await proxy(request('/'));
    const nonce = nonceOf(response);
    expect(response.headers.get('x-middleware-request-x-nonce')).toBe(nonce);
    expect(response.headers.get('x-middleware-request-content-security-policy')).toContain(`'nonce-${nonce}'`);
  });

  it('ders sayfasında Permissions-Policy kamera/mikrofon açar', async () => {
    const response = await proxy(request('/ogrenci/ders/1'));
    expect(response.headers.get('permissions-policy')).toContain('camera=(self "https://8x8.vc")');
  });
});

describe('proxy: Supabase ayarları eksikken', () => {
  it('çökmez, sayfa açılır; geliştirmede uyarı yazar ve oturum yenilemeyi atlar', async () => {
    const response = await proxy(request('/', `${SESSION_COOKIE}=eski`));
    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });
});

describe('proxy: oturum yenileme', () => {
  beforeEach(() => stubSupabaseEnv());

  it('oturum çerezi yoksa Supabase\'e hiç gitmez', async () => {
    await proxy(request('/'));
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('oturum çerezi varsa getClaims() ile oturumu yeniler', async () => {
    const response = await proxy(request('/ogrenci/bugun', `${SESSION_COOKIE}=eski`));
    expect(createServerClient).toHaveBeenCalledTimes(1);
    expect(getClaims).toHaveBeenCalledTimes(1);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('yenilenen oturum çerezini httpOnly, Secure ve SameSite=Lax yazar (Supabase aksini istese bile)', async () => {
    supabaseWrites(SUPABASE_WRITE);

    const response = await proxy(request('/', `${SESSION_COOKIE}=eski`));
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(`${SESSION_COOKIE}=yeni-jeton`);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/Secure/i);
    expect(setCookie).toMatch(/SameSite=lax/i);
    expect(setCookie).not.toMatch(/SameSite=none/i);
    // Çerez yazan yanıt CDN'de önbelleğe alınmaz.
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('pragma')).toBe('no-cache');
    // Güvenlik başlıkları, yeni oluşturulan yanıtta da durur.
    expect(nonceOf(response)).not.toBe('');
  });

  it('VARSAYILAN: oturum çerezi tarayıcı oturumu çerezidir (Max-Age ve Expires yok; kütüphane 400 gün dese bile)', async () => {
    supabaseWrites({ ...SUPABASE_WRITE, expires: new Date(Date.now() + 1e10) });

    const response = await proxy(request('/', `${SESSION_COOKIE}=eski`));
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain(`${SESSION_COOKIE}=yeni-jeton`);
    expect(setCookie).not.toMatch(/Max-Age/i);
    expect(setCookie).not.toMatch(/Expires/i);
  });

  it('"oturumum açık kalsın" çerezi varsa oturum çerezi 30 gün yaşar', async () => {
    supabaseWrites(SUPABASE_WRITE);

    const response = await proxy(request('/', `${SESSION_COOKIE}=eski; ek-kalici-oturum=1`));
    const setCookie = response.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/Max-Age=2592000(;|$)/i);
    expect(setCookie).toMatch(/HttpOnly/i);
  });

  it('tercih çerezi "1" değilse (ör. 0) yine tarayıcı oturumu çerezi yazılır', async () => {
    supabaseWrites(SUPABASE_WRITE);

    const response = await proxy(request('/', `${SESSION_COOKIE}=eski; ek-kalici-oturum=0`));
    expect(response.headers.get('set-cookie') ?? '').not.toMatch(/Max-Age/i);
  });

  it('çıkışta Supabase çerezi siler (Max-Age=0); silme hiçbir durumda bozulmaz', async () => {
    supabaseWrites({ ...SUPABASE_WRITE, maxAge: 0 }, '');

    for (const cookie of [`${SESSION_COOKIE}=eski`, `${SESSION_COOKIE}=eski; ek-kalici-oturum=1`]) {
      createServerClient.mockClear();
      const response = await proxy(request('/', cookie));
      expect(response.headers.get('set-cookie') ?? '', cookie).toMatch(/Max-Age=0/i);
    }
  });

  it('getClaims hata fırlatırsa sayfa yine açılır ve hata ayrıntısı loglanmaz', async () => {
    getClaims.mockRejectedValue(new Error('ayrıntı: ogrenci@ornek.com'));
    const response = await proxy(request('/', `${SESSION_COOKIE}=eski`));
    expect(response.status).toBe(200);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('ogrenci@ornek.com');
  });

  it('CSP img-src içine Supabase kökenini ekler', async () => {
    const response = await proxy(request('/'));
    expect(response.headers.get('content-security-policy')).toContain('img-src \'self\' blob: data: https://abcdefgh.supabase.co');
  });
});
