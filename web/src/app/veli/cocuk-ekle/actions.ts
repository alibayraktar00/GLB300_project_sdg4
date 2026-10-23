'use server';

import { redirect } from 'next/navigation';

import { childFieldErrors, childSchema, type ChildFieldErrors } from '@/lib/child';
import { requireRole } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';
import { tr } from '@/strings/tr';

export type AddChildState = { fieldErrors?: ChildFieldErrors; formError?: string } | null;

/** `create-child-account` Edge Function'ının her zaman 200 ile döndürdüğü yanıt. */
type FunctionResult = { ok: true } | { ok: false; code: 'username_taken' | 'limit' | 'consent' | 'invalid' | 'forbidden' };

/**
 * Çocuk hesabı ekler. Hesabı Edge Function açar (servis anahtarı yalnızca orada bulunur): Auth kullanıcısı,
 * öğrenci kaydı, veli bağı ve AR-1 açık rıza kaydı tek adımda oluşturulur. Rıza kaydı, hesap açılamadığında
 * yazılmaz. Burada yalnızca doğrulama yapılır; asıl denetim (rol, rıza, sınır) Edge Function ve veritabanındadır.
 */
export async function addChild(_previous: AddChildState, formData: FormData): Promise<AddChildState> {
  await requireRole('veli');

  const parsed = childSchema.safeParse({
    nickname: formData.get('nickname'),
    grade: formData.get('grade'),
    username: formData.get('username'),
    password: formData.get('password'),
    consent: formData.get('consent'),
  });
  if (!parsed.success) return { fieldErrors: childFieldErrors(parsed.error) };

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.functions.invoke<FunctionResult>('create-child-account', {
      body: {
        nickname: parsed.data.nickname,
        grade: parsed.data.grade,
        username: parsed.data.username,
        password: parsed.data.password,
        ar1: true,
      },
    });
    if (error || !data) return { formError: tr.child.errors.unavailable };
    if (!data.ok) {
      if (data.code === 'username_taken') return { fieldErrors: { username: tr.child.errors.usernameTaken } };
      if (data.code === 'limit') return { formError: tr.child.errors.limit };
      return { formError: tr.child.errors.unavailable };
    }
  } catch {
    return { formError: tr.child.errors.unavailable };
  }
  redirect('/veli/panel');
}
