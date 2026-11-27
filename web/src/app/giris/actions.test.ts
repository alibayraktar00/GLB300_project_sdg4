import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tr } from '@/strings/tr';

const signInWithPassword = vi.fn();

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/server/supabase', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { signInWithPassword } })),
  setRememberChoice: vi.fn(async () => undefined),
}));

const { loginStudent, loginWithEmail } = await import('./actions');

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe('giriş eylemleri: bilgiler eşleşmediğinde', () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    signInWithPassword.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid login credentials' } });
  });

  it('e-posta girişi e-postaya özgü mesajı gösterir', async () => {
    const state = await loginWithEmail(null, form({ email: 'veli@example.com', password: 'yanlis-sifre' }));
    expect(state).toEqual({ formError: tr.auth.errors.invalidEmailLogin });
  });

  it('öğrenci girişi kullanıcı adına özgü mesajı gösterir', async () => {
    const state = await loginStudent(null, form({ username: 'ogrenci1', password: 'yanlis-sifre' }));
    expect(state).toEqual({ formError: tr.auth.errors.invalidStudentLogin });
  });

  it('geçersiz kullanıcı adında Supabase çağrılmadan öğrenci mesajı gösterilir', async () => {
    const state = await loginStudent(null, form({ username: '!!', password: 'sifre' }));
    expect(state).toEqual({ formError: tr.auth.errors.invalidStudentLogin });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });
});
