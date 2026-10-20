import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readSupabaseConfig, reportSupabaseConfigProblems, resetSupabaseConfigReportForTests } from './supabase-config';

const validEnv = {
  SUPABASE_URL: 'https://abcdefgh.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_ornekanahtar',
};

describe('readSupabaseConfig', () => {
  it('geçerli değerleri kabul eder ve kökeni verir', () => {
    const result = readSupabaseConfig(validEnv, true);
    expect(result).toEqual({
      ok: true,
      config: {
        url: 'https://abcdefgh.supabase.co',
        publishableKey: 'sb_publishable_ornekanahtar',
        origin: 'https://abcdefgh.supabase.co',
      },
    });
  });

  it('değişkenler yoksa çökmez, sorunları listeler', () => {
    const result = readSupabaseConfig({}, false);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problems).toHaveLength(2);
  });

  it('boş dizeyi (örnek dosyadan kopyalanmış) eksik sayar', () => {
    const result = readSupabaseConfig({ SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '  ' }, false);
    expect(result.ok).toBe(false);
  });

  it('gizli anahtarı (sb_secret_) reddeder ve anahtarı mesaja yazmaz', () => {
    const gizli = 'sb_secret_COK_GIZLI_DEGER_123';
    const result = readSupabaseConfig({ ...validEnv, SUPABASE_PUBLISHABLE_KEY: gizli }, true);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problems.join(' ')).toContain('GİZLİ anahtar');
      expect(result.problems.join(' ')).not.toContain('COK_GIZLI_DEGER_123');
    }
  });

  it('eski JWT biçimli anahtarları (anon/service_role) reddeder', () => {
    const result = readSupabaseConfig({ ...validEnv, SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiJ9.x.y' }, true);
    expect(result.ok).toBe(false);
  });

  it('üretimde http adresini reddeder, geliştirmede yerel Supabase için kabul eder', () => {
    const env = { ...validEnv, SUPABASE_URL: 'http://127.0.0.1:54321' };
    expect(readSupabaseConfig(env, true).ok).toBe(false);
    expect(readSupabaseConfig(env, false).ok).toBe(true);
  });

  it('geçersiz adresi reddeder', () => {
    expect(readSupabaseConfig({ ...validEnv, SUPABASE_URL: 'adres degil' }, false).ok).toBe(false);
  });
});

describe('reportSupabaseConfigProblems', () => {
  beforeEach(() => resetSupabaseConfigReportForTests());
  afterEach(() => resetSupabaseConfigReportForTests());

  it('geliştirmede açık bir uyarı yazar ve yalnızca bir kez yazar', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    reportSupabaseConfigProblems(['SUPABASE_URL tanımlı değil.'], false);
    reportSupabaseConfigProblems(['SUPABASE_URL tanımlı değil.'], false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('.env.example');
  });

  it('üretimde console.error ile kısa bir satır yazar', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    reportSupabaseConfigProblems(['SUPABASE_URL tanımlı değil.'], true);
    expect(error).toHaveBeenCalledTimes(1);
  });
});
