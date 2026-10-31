'use server';

import { redirect } from 'next/navigation';

import { otpSchema } from '@/lib/signup';
import {
  volunteerFieldErrors,
  volunteerProfileSchema,
  volunteerSignupSchema,
  type VolunteerFieldErrors,
} from '@/lib/volunteer';
import { MVP_GRADES, MVP_SUBJECTS } from '@/lib/scope';
import { recordConsents } from '@/server/consents';
import { createSupabaseServerClient, setRememberChoice } from '@/server/supabase';
import { tr } from '@/strings/tr';

export type VolunteerState =
  | { phase: 'form'; fieldErrors?: VolunteerFieldErrors; formError?: string }
  | {
      phase: 'otp';
      email: string;
      /** Kod adımına gizli alan olarak taşınan profil bilgileri (yalnızca kullanıcının kendi yazdıkları). */
      profile: Record<'givenName' | 'familyName' | 'university' | 'department' | 'classYear', string>;
      fieldErrors?: VolunteerFieldErrors;
      formError?: string;
    }
  | null;

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '');

/**
 * 1. adım: gönüllü hesabı oluşturulur, üniversite e-postasına 6 haneli kod gider. Profil bilgileri ve onaylar
 * e-posta doğrulanınca kaydedilir. Hesap zaten varsa da aynı yanıt döner (hesap var mı yok mu sızdırılmaz).
 */
export async function registerVolunteer(_previous: VolunteerState, formData: FormData): Promise<VolunteerState> {
  const parsed = volunteerSignupSchema.safeParse({
    givenName: formData.get('givenName'),
    familyName: formData.get('familyName'),
    email: formData.get('email'),
    password: formData.get('password'),
    university: formData.get('university'),
    department: formData.get('department') ?? '',
    classYear: formData.get('classYear'),
    readNotice: formData.get('readNotice'),
    readTerms: formData.get('readTerms'),
  });
  if (!parsed.success) return { phase: 'form', fieldErrors: volunteerFieldErrors(parsed.error) };

  try {
    const supabase = await createSupabaseServerClient({ remember: false });
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { role: 'gonullu', display_name: `${parsed.data.givenName} ${parsed.data.familyName}`.slice(0, 40) },
      },
    });
    if (error) return { phase: 'form', formError: tr.signup.errors.unavailable };
  } catch {
    return { phase: 'form', formError: tr.signup.errors.unavailable };
  }

  return {
    phase: 'otp',
    email: parsed.data.email,
    profile: {
      givenName: parsed.data.givenName,
      familyName: parsed.data.familyName,
      university: parsed.data.university,
      department: parsed.data.department ?? '',
      classYear: String(parsed.data.classYear),
    },
  };
}

/** 2. adım: kod doğrulanır; profil (volunteers) ve onaylar kaydedilir; başvuru sonraki adımlara geçer. */
export async function verifyVolunteerCode(_previous: VolunteerState, formData: FormData): Promise<VolunteerState> {
  const email = text(formData, 'email');
  const profile = {
    givenName: text(formData, 'givenName'),
    familyName: text(formData, 'familyName'),
    university: text(formData, 'university'),
    department: text(formData, 'department'),
    classYear: text(formData, 'classYear'),
  };
  const back = (extra: { fieldErrors?: VolunteerFieldErrors; formError?: string }): VolunteerState => ({
    phase: 'otp',
    email,
    profile,
    ...extra,
  });

  const code = otpSchema.safeParse({ email, code: formData.get('code') });
  if (!code.success) return back({ fieldErrors: { code: tr.signup.errors.codeInvalid } });
  const fields = volunteerProfileSchema.safeParse(profile);
  if (!fields.success) return back({ formError: tr.volunteer.errors.profileFailed });

  try {
    const supabase = await createSupabaseServerClient({ remember: false });
    const { data, error } = await supabase.auth.verifyOtp({ email: code.data.email, token: code.data.code, type: 'email' });
    if (error || !data.user) return back({ formError: tr.signup.errors.codeWrong });
    await setRememberChoice(false);

    // Gönüllü profili: başvuru aşamasında ('basvuru') gönüllünün kendisi ekler (RLS: volunteers_insert_own).
    const { error: insertError } = await supabase.from('volunteers').insert({
      profile_id: data.user.id,
      given_name: fields.data.givenName,
      family_name: fields.data.familyName,
      university: fields.data.university,
      department: fields.data.department,
      class_year: fields.data.classYear,
    });
    if (insertError) return back({ formError: tr.volunteer.errors.profileFailed });

    // Hangi ders ve sınıfta destek verebileceği: prototip kapsamı (8. sınıf Matematik) otomatik yazılır; eşleştirme
    // (propose_match) gönüllünün bu satırına bakar. Kapsam genişleyince bu satır seçim ekranına dönüşür.
    const userId = data.user.id;
    const { data: subjects } = await supabase.from('subjects').select('id, code').in('code', [...MVP_SUBJECTS]);
    const rows = (subjects ?? []).flatMap((subject) =>
      MVP_GRADES.map((grade) => ({ volunteer_id: userId, subject_id: subject.id, grade })),
    );
    if (rows.length > 0) {
      const { error: subjectError } = await supabase.from('volunteer_subjects').insert(rows);
      if (subjectError) return back({ formError: tr.volunteer.errors.profileFailed });
    }

    const recorded = await recordConsents(supabase, data.user.id, ['aydinlatma_gonullu', 'kullanim_kosullari']);
    if (!recorded) return back({ formError: tr.signup.errors.unavailable });
  } catch {
    return back({ formError: tr.signup.errors.unavailable });
  }
  redirect('/uygulama');
}
