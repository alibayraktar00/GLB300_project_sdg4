'use server';

import { redirect } from 'next/navigation';

import {
  emailLoginSchema,
  fieldErrors,
  isAppRole,
  landingPath,
  studentEmail,
  studentLoginSchema,
  type FieldErrors,
} from '@/lib/auth';
import { createSupabaseServerClient, setRememberChoice } from '@/server/supabase';
import { tr } from '@/strings/tr';

/** Form durumu: sunucudan dönen hata (başarıda yönlendirme yapıldığı için durum dönmez). */
export type LoginState = { fieldErrors?: FieldErrors; formError?: string } | null;

type Credentials = { email: string; password: string; remember: boolean };

async function signIn({ email, password, remember }: Credentials, next: FormDataEntryValue | null): Promise<LoginState> {
  let destination: string;
  try {
    const supabase = await createSupabaseServerClient({ remember });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    // Hata nedeni (yanlış şifre / hesap yok) kullanıcıya ayrı ayrı söylenmez: hesap sızdırmayı önler.
    if (error || !data.user) return { formError: tr.auth.errors.wrongCredentials };

    await setRememberChoice(remember);

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
    destination = isAppRole(profile?.role)
      ? landingPath(profile.role, typeof next === 'string' ? next : null)
      : '/uygulama';
  } catch {
    return { formError: tr.auth.errors.unavailable };
  }
  // redirect() bir istisna fırlatır; try/catch dışında çağrılmalı.
  redirect(destination);
}

/** Veli, gönüllü ve yönetici girişi (e-posta + şifre). */
export async function loginWithEmail(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = emailLoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    remember: formData.get('remember'),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  return signIn(parsed.data, formData.get('devam'));
}

/** Öğrenci girişi (kullanıcı adı + şifre). Kullanıcı adı sentetik e-postaya çevrilir. */
export async function loginStudent(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = studentLoginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
    remember: formData.get('remember'),
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };

  const email = studentEmail(parsed.data.username);
  if (!email) return { formError: tr.auth.errors.wrongCredentials };
  return signIn({ email, password: parsed.data.password, remember: parsed.data.remember }, formData.get('devam'));
}

/** Çıkış: oturumu ve "açık kalsın" tercihini siler. */
export async function signOut(): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    await setRememberChoice(false);
  } catch {
    // Ayar yoksa ya da ağ hatası varsa yine de ana sayfaya dön.
  }
  redirect('/');
}
