'use server';

import { redirect } from 'next/navigation';

import { MFA_CODE_PATTERN } from '@/lib/mfa';
import { requireMfaUser } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';
import { tr } from '@/strings/tr';

export type MfaState = { factorId?: string; qr?: string; secret?: string; formError?: string } | null;

/**
 * TOTP kurulumunu başlatır. Yarım kalmış (doğrulanmamış) eski kurulum silinir; yeni anahtar ve QR döner.
 * Anahtar yalnızca bu yanıtta görünür ve saklanmaz.
 */
export async function startEnrollment(): Promise<MfaState> {
  await requireMfaUser();
  try {
    const supabase = await createSupabaseServerClient();
    const { data: factors } = await supabase.auth.mfa.listFactors();
    for (const factor of factors?.all ?? []) {
      if (factor.factor_type === 'totp' && factor.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Yönetici' });
    if (error || !data) return { formError: tr.mfa.errors.unavailable };
    return { factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
  } catch {
    return { formError: tr.mfa.errors.unavailable };
  }
}

/** Kodu doğrular; başarıda oturum aal2'ye çıkar (yeni JWT çerezi yazılır) ve yönetici sayfasına gidilir. */
export async function verifyMfa(previous: MfaState, formData: FormData): Promise<MfaState> {
  const user = await requireMfaUser();
  const factorId = String(formData.get('factorId') ?? '');
  const code = String(formData.get('code') ?? '').replace(/\s/g, '');
  const keep = previous?.qr ? { factorId: previous.factorId, qr: previous.qr, secret: previous.secret } : { factorId };
  if (!factorId || !MFA_CODE_PATTERN.test(code)) return { ...keep, formError: tr.mfa.errors.invalidCode };

  try {
    const supabase = await createSupabaseServerClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) return { ...keep, formError: tr.mfa.errors.unavailable };
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    if (error) return { ...keep, formError: tr.mfa.errors.invalidCode };
  } catch {
    return { ...keep, formError: tr.mfa.errors.unavailable };
  }
  redirect(user.role === 'yonetici' ? '/yonetici/basvurular' : '/veli/panel');
}
