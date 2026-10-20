import { describe, expect, it } from 'vitest';

import {
  enforceSessionCookieOptions,
  hasSessionCookie,
  isRememberChoice,
  REMEMBER_COOKIE_NAME,
  REMEMBER_MAX_AGE_SECONDS,
  rememberCookie,
} from './session-cookies';

/** Supabase'in oturum çerezi yazarken verdiği seçenekler (kütüphane kodundan: 400 gün, httpOnly: false). */
const SUPABASE_WRITE_OPTIONS = { path: '/', sameSite: 'lax' as const, httpOnly: false, maxAge: 400 * 24 * 60 * 60 };

describe('enforceSessionCookieOptions: güvenlik', () => {
  it('Supabase httpOnly: false dese bile httpOnly, secure ve SameSite=Lax zorlar', () => {
    const result = enforceSessionCookieOptions({ httpOnly: false, secure: false, sameSite: 'none' as const });
    expect(result).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
  });

  it('seçenek verilmese de güvenli varsayılanları verir', () => {
    expect(enforceSessionCookieOptions()).toEqual({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' });
  });
});

describe('enforceSessionCookieOptions: çerez ömrü (KVKK Çerez Rehberi)', () => {
  it('varsayılan: Supabase 400 gün dese bile Max-Age ve Expires yoktur (tarayıcı oturumu çerezi)', () => {
    const result = enforceSessionCookieOptions({ ...SUPABASE_WRITE_OPTIONS, expires: new Date(Date.now() + 1e9) });
    expect(result).not.toHaveProperty('maxAge');
    expect(result).not.toHaveProperty('expires');
    expect(result).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax' });
  });

  it('"oturumum açık kalsın" seçiliyse Max-Age 30 gündür', () => {
    const result = enforceSessionCookieOptions(SUPABASE_WRITE_OPTIONS, { remember: true });
    expect(result.maxAge).toBe(30 * 24 * 60 * 60);
    expect(result.maxAge).toBe(REMEMBER_MAX_AGE_SECONDS);
    expect(result).not.toHaveProperty('expires');
  });

  it('silme çağrısı (maxAge: 0, çıkış) iki durumda da korunur; yoksa çıkış yapılamazdı', () => {
    expect(enforceSessionCookieOptions({ ...SUPABASE_WRITE_OPTIONS, maxAge: 0 }).maxAge).toBe(0);
    expect(enforceSessionCookieOptions({ ...SUPABASE_WRITE_OPTIONS, maxAge: 0 }, { remember: true }).maxAge).toBe(0);
  });

  it('geçmiş bir Expires de silme sayılır', () => {
    const result = enforceSessionCookieOptions({ expires: new Date(0) }, { remember: true });
    expect(result.maxAge).toBe(0);
  });

  it('varsayılan 30 günden uzun değildir', () => {
    expect(REMEMBER_MAX_AGE_SECONDS).toBe(2_592_000);
  });
});

describe('rememberCookie ("oturumum açık kalsın" tercih çerezi)', () => {
  it('işaretliyse 1 değerli, 30 günlük, httpOnly çerez yazar', () => {
    expect(rememberCookie(true)).toEqual({
      name: REMEMBER_COOKIE_NAME,
      value: '1',
      options: { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: REMEMBER_MAX_AGE_SECONDS },
    });
  });

  it('işaretli değilse çerezi siler (kalıcı bir şey bırakmaz)', () => {
    expect(rememberCookie(false)).toMatchObject({ name: REMEMBER_COOKIE_NAME, value: '', options: { maxAge: 0 } });
  });

  it('yalnızca "1" değerini tercih sayar', () => {
    expect(isRememberChoice('1')).toBe(true);
    for (const value of [undefined, '', '0', 'true', 'evet']) expect(isRememberChoice(value)).toBe(false);
  });
});

describe('hasSessionCookie', () => {
  it('Supabase oturum çerezini (parçalı olanlar dahil) tanır', () => {
    expect(hasSessionCookie(['sb-abcdef-auth-token'])).toBe(true);
    expect(hasSessionCookie(['x', 'sb-abcdef-auth-token.0', 'sb-abcdef-auth-token.1'])).toBe(true);
  });

  it('başka çerezleri, PKCE doğrulayıcısını ve tercih çerezini oturum saymaz', () => {
    expect(hasSessionCookie([])).toBe(false);
    expect(hasSessionCookie(['theme', 'sb-abcdef-auth-token-code-verifier', REMEMBER_COOKIE_NAME])).toBe(false);
  });
});
