'use server';

import { redirect } from 'next/navigation';

import { guardianSignupSchema, otpSchema, signupFieldErrors, type SignupFieldErrors } from '@/lib/signup';
import { recordConsents } from '@/server/consents';
import { createSupabaseServerClient, setRememberChoice } from '@/server/supabase';
import { tr } from '@/strings/tr';

export type SignupState =
  | { phase: 'form'; fieldErrors?: SignupFieldErrors; formError?: string }
  | { phase: 'otp'; email: string; fieldErrors?: SignupFieldErrors; formError?: string }
  | null;

/**
 * 1. adım: veli hesabı oluşturulur ve e-postaya 6 haneli kod gider. Aydınlatma ve kullanım koşulları onayları
 * henüz yazılmaz; e-posta doğrulanınca kaydedilir (docs/ekran-akislari.md V1). Hesap zaten varsa da aynı yanıt
 * döner (hesap var mı yok mu sızdırılmaz).
 */
export async function registerGuardian(_previous: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = guardianSignupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    readNotice: formData.get('readNotice'),
    readTerms: formData.get('readTerms'),
  });
  if (!parsed.success) return { phase: 'form', fieldErrors: signupFieldErrors(parsed.error) };

  try {
    const supabase = await createSupabaseServerClient({ remember: false });
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { role: 'veli', display_name: parsed.data.name } },
    });
    if (error) return { phase: 'form', formError: tr.signup.errors.unavailable };
  } catch {
    return { phase: 'form', formError: tr.signup.errors.unavailable };
  }
  return { phase: 'otp', email: parsed.data.email };
}

/** 2. adım: kod doğrulanır, onaylar kaydedilir, kullanıcı rolünün alanına gider. */
export async function verifyGuardianCode(_previous: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = otpSchema.safeParse({ email: formData.get('email'), code: formData.get('code') });
  const email = String(formData.get('email') ?? '');
  if (!parsed.success) return { phase: 'otp', email, fieldErrors: signupFieldErrors(parsed.error) };

  try {
    const supabase = await createSupabaseServerClient({ remember: false });
    const { data, error } = await supabase.auth.verifyOtp({
      email: parsed.data.email,
      token: parsed.data.code,
      type: 'email',
    });
    if (error || !data.user) return { phase: 'otp', email, formError: tr.signup.errors.codeWrong };

    await setRememberChoice(false);
    // Onaylar yalnızca e-posta doğrulanınca ve en güncel yayımlanmış metin sürümüyle yazılır.
    const recorded = await recordConsents(supabase, data.user.id, ['aydinlatma_veli', 'kullanim_kosullari']);
    if (!recorded) return { phase: 'otp', email, formError: tr.signup.errors.unavailable };
  } catch {
    return { phase: 'otp', email, formError: tr.signup.errors.unavailable };
  }
  redirect('/uygulama');
}
