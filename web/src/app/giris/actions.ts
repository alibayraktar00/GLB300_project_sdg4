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

type Credentials = { email: string; password: string; remember: boolean; next: string | null };

/** Formdaki gizli `devam` alanı (yalnızca metin; asıl denetim `landingPath` içinde). */
function nextFrom(formData: FormData): string | null {
  const value = formData.get('devam');
  return typeof value === 'string' ? value : null;
}

async function signIn({ email, password, remember, next }: Credentials): Promise<LoginState> {
  let destination: string;
  try {
    const supabase = await createSupabaseServerClient({ remember });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    // Hata nedeni (yanlış şifre / hesap yok) kullanıcıya ayrı ayrı söylenmez: hesap sızdırmayı önler.
    if (error || !data.user) return { formError: tr.auth.errors.wrongCredentials };

    await setRememberChoice(remember);

    // Rol `profiles` tablosundan okunur (RLS: kullanıcı kendi satırını okur). Profil yoksa ya da rol
    // tanınmıyorsa hesap kullanılamaz durumdadır.
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
    destination = profile && isAppRole(profile.role) ? landingPath(profile.role, next) : '/durum';
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
  return signIn({ ...parsed.data, next: nextFrom(formData) });
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
  return signIn({
    email,
    password: parsed.data.password,
    remember: parsed.data.remember,
    next: nextFrom(formData),
  });
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
