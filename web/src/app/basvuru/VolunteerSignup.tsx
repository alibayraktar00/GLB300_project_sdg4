'use client';

import { useActionState } from 'react';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Switch } from '@/components/Switch';
import { TextField } from '@/components/TextField';
import { tr } from '@/strings/tr';

import { registerVolunteer, verifyVolunteerCode, type VolunteerState } from './actions';
import styles from './VolunteerSignup.module.css';

/**
 * Gönüllü başvurusunun 1. adımı: hesap + profil + iki onay, ardından e-posta kodu. İki adım ayrı formdur; profil
 * bilgileri kod adımına gizli alan olarak taşınır ve e-posta doğrulanınca sunucuda kaydedilir. Belge yükleme,
 * davranış kuralları, taahhüt ve eğitim sonraki adımlardır (docs/ekran-akislari.md G1).
 */
export function VolunteerSignup() {
  const [formState, formAction, formPending] = useActionState(registerVolunteer, null as VolunteerState);
  const [otpState, otpAction, otpPending] = useActionState(verifyVolunteerCode, null as VolunteerState);

  const otp = otpState?.phase === 'otp' ? otpState : formState?.phase === 'otp' ? formState : null;

  if (otp) {
    const current = otpState?.phase === 'otp' ? otpState : null;
    return (
      <form action={otpAction} className={styles.form} noValidate>
        <h2 className={styles.subtitle}>{tr.volunteer.otpTitle}</h2>
        <p className={styles.text}>{tr.volunteer.otpIntro}</p>
        {current?.formError ? <Banner tone="error">{current.formError}</Banner> : null}
        <input type="hidden" name="email" value={otp.email} />
        {Object.entries(otp.profile).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <TextField
          label={tr.signup.otpLabel}
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          error={current?.fieldErrors?.code}
        />
        <Button type="submit" expand loading={otpPending}>
          {tr.volunteer.otpSubmit}
        </Button>
      </form>
    );
  }

  const state = formState?.phase === 'form' ? formState : null;
  const errors = state?.fieldErrors;
  return (
    <form action={formAction} className={styles.form} noValidate>
      {state?.formError ? <Banner tone="error">{state.formError}</Banner> : null}
      <TextField
        label={tr.volunteer.givenName}
        name="givenName"
        type="text"
        autoComplete="given-name"
        required
        error={errors?.givenName}
      />
      <TextField
        label={tr.volunteer.familyName}
        help={tr.volunteer.nameHelp}
        name="familyName"
        type="text"
        autoComplete="family-name"
        required
        error={errors?.familyName}
      />
      <TextField
        label={tr.volunteer.email}
        help={tr.volunteer.emailHelp}
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        error={errors?.email}
      />
      <TextField
        label={tr.signup.password}
        help={tr.signup.passwordHelp}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={errors?.password}
      />
      <TextField
        label={tr.volunteer.university}
        name="university"
        type="text"
        autoComplete="organization"
        required
        error={errors?.university}
      />
      <TextField
        label={tr.volunteer.department}
        name="department"
        type="text"
        autoComplete="off"
        optional
        error={errors?.department}
      />
      <div className={styles.field}>
        <label htmlFor="sinif-yili" className={styles.label}>
          {tr.volunteer.classYear}
        </label>
        <select
          id="sinif-yili"
          name="classYear"
          className={styles.select}
          defaultValue=""
          required
          aria-invalid={errors?.classYear ? true : undefined}
        >
          <option value="" disabled>
            {tr.volunteer.classYear}
          </option>
          {[1, 2, 3, 4, 5, 6].map((year) => (
            <option key={year} value={year}>
              {tr.volunteer.classYearOption(year)}
            </option>
          ))}
        </select>
        {errors?.classYear ? <p className={styles.error}>{errors.classYear}</p> : null}
      </div>
      <div className={styles.consents}>
        <Switch name="readNotice" label={tr.volunteer.readNotice} />
        {errors?.readNotice ? <p className={styles.error}>{errors.readNotice}</p> : null}
        <Switch name="readTerms" label={tr.volunteer.readTerms} help={tr.signup.legalLinks} />
        {errors?.readTerms ? <p className={styles.error}>{errors.readTerms}</p> : null}
      </div>
      <Button type="submit" expand loading={formPending}>
        {tr.volunteer.submit}
      </Button>
    </form>
  );
}
