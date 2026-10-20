// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resetSupabaseConfigReportForTests } from '@/lib/supabase-config';

// Next.js'in `cookies()` fonksiyonu ve Supabase istemcisi sahtelenir.
const cookieStore = { getAll: vi.fn(), get: vi.fn(), set: vi.fn() };
const createServerClient = vi.fn();
vi.mock('next/headers', () => ({ cookies: async () => cookieStore }));
vi.mock('@supabase/ssr', () => ({ createServerClient: (...args: unknown[]) => createServerClient(...args) }));

import { createSupabaseServerClient, setRememberChoice, SupabaseNotConfiguredError } from './supabase';

type SetAll = (cookies: Array<{ name: string; value: string; options: Record<string, unknown> }>) => void;

/** Supabase'in oturum çerezi yazarken gerçekte verdiği seçenekler. */
const SUPABASE_WRITE = { httpOnly: false, sameSite: 'lax', path: '/', maxAge: 400 * 24 * 60 * 60 };

function stubSupabaseEnv() {
  vi.stubEnv('SUPABASE_URL', 'https://abcdefgh.supabase.co');
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_ornek');
}

function lastSetAll(): SetAll {
  const call = createServerClient.mock.calls.at(-1)!;
  return (call[2] as { cookies: { setAll: SetAll } }).cookies.setAll;
}

beforeEach(() => {
  resetSupabaseConfigReportForTests();
  cookieStore.getAll.mockReset().mockReturnValue([]);
  cookieStore.get.mockReset().mockReturnValue(undefined);
  cookieStore.set.mockReset();
  createServerClient.mockReset().mockReturnValue({});
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => resetSupabaseConfigReportForTests());

describe('createSupabaseServerClient', () => {
  it('Supabase ayarları eksikken anlaşılır bir hata fırlatır (geliştirmede açıklayıcı)', async () => {
    await expect(createSupabaseServerClient()).rejects.toBeInstanceOf(SupabaseNotConfiguredError);
    await expect(createSupabaseServerClient()).rejects.toThrow(/\.env\.example/);
    expect(console.warn).toHaveBeenCalledTimes(1); // uyarı bir kez
  });

  describe('ayarlar tamamken', () => {
    beforeEach(() => stubSupabaseEnv());

    it('publishable anahtarla ve httpOnly çerez seçenekleriyle istemci oluşturur', async () => {
      await createSupabaseServerClient();
      const [url, key, options] = createServerClient.mock.calls[0]!;
      expect(url).toBe('https://abcdefgh.supabase.co');
      expect(key).toBe('sb_publishable_ornek');
      expect(options.cookieOptions).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
    });

    it('VARSAYILAN: oturum çerezini Max-Age olmadan (tarayıcı oturumu) yazar', async () => {
      await createSupabaseServerClient();
      lastSetAll()([{ name: 'sb-x-auth-token', value: 'jeton', options: SUPABASE_WRITE }]);

      const [name, value, options] = cookieStore.set.mock.calls[0]!;
      expect([name, value]).toEqual(['sb-x-auth-token', 'jeton']);
      expect(options).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
      expect(options).not.toHaveProperty('maxAge');
      expect(options).not.toHaveProperty('expires');
    });

    it('tercih çerezi "1" ise oturum çerezi 30 gün yaşar', async () => {
      cookieStore.get.mockImplementation((name: string) => (name === 'ek-kalici-oturum' ? { value: '1' } : undefined));
      await createSupabaseServerClient();
      lastSetAll()([{ name: 'sb-x-auth-token', value: 'jeton', options: SUPABASE_WRITE }]);
      expect(cookieStore.set.mock.calls[0]![2]).toMatchObject({ maxAge: 2_592_000 });
    });

    it('giriş eylemi için remember seçeneği çerezdeki tercihi geçersiz kılar', async () => {
      await createSupabaseServerClient({ remember: true });
      lastSetAll()([{ name: 'sb-x-auth-token', value: 'jeton', options: SUPABASE_WRITE }]);
      expect(cookieStore.set.mock.calls[0]![2]).toMatchObject({ maxAge: 2_592_000 });

      cookieStore.set.mockClear();
      cookieStore.get.mockReturnValue({ value: '1' });
      await createSupabaseServerClient({ remember: false });
      lastSetAll()([{ name: 'sb-x-auth-token', value: 'jeton', options: SUPABASE_WRITE }]);
      expect(cookieStore.set.mock.calls[0]![2]).not.toHaveProperty('maxAge');
    });

    it('çıkışta silme (Max-Age=0) korunur', async () => {
      await createSupabaseServerClient();
      lastSetAll()([{ name: 'sb-x-auth-token', value: '', options: { ...SUPABASE_WRITE, maxAge: 0 } }]);
      expect(cookieStore.set.mock.calls[0]![2]).toMatchObject({ maxAge: 0 });
    });

    it('Server Component içinde çerez yazılamazsa (Next hata verir) çökmez', async () => {
      cookieStore.set.mockImplementation(() => {
        throw new Error('Cookies can only be modified in a Server Action or Route Handler');
      });
      await createSupabaseServerClient();
      expect(() => lastSetAll()([{ name: 'sb-x-auth-token', value: 'j', options: SUPABASE_WRITE }])).not.toThrow();
    });
  });
});

describe('setRememberChoice', () => {
  it('işaretliyse 30 günlük httpOnly tercih çerezi yazar', async () => {
    await setRememberChoice(true);
    expect(cookieStore.set).toHaveBeenCalledWith('ek-kalici-oturum', '1', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 2_592_000,
    });
  });

  it('işaretli değilse çerezi siler', async () => {
    await setRememberChoice(false);
    expect(cookieStore.set).toHaveBeenCalledWith('ek-kalici-oturum', '', expect.objectContaining({ maxAge: 0 }));
  });
});
