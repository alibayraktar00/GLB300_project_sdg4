'use client';

import { useActionState } from 'react';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Switch } from '@/components/Switch';
import { TextField } from '@/components/TextField';
import { tr } from '@/strings/tr';

import { registerGuardian, verifyGuardianCode, type SignupState } from './actions';
import styles from './SignupWizard.module.css';

/**
 * Veli kaydı: önce hesap bilgileri ve iki onay ("Okudum, anladım"; "kabul ediyorum" denmez), sonra e-postaya gelen
 * 6 haneli kod. İki adım ayrı formdur ve JavaScript olmadan da çalışır. Onaylar kod doğrulanınca sunucuda kaydedilir.
 * Açık rıza (AR-1) bu akışta DEĞİL, çocuk eklenirken ayrı bir ekranda alınır (docs/hukuk/acik-riza-veli.md).
 */
export function SignupWizard() {
  const [formState, formAction, formPending] = useActionState(registerGuardian, null as SignupState);
  const [otpState, otpAction, otpPending] = useActionState(verifyGuardianCode, null as SignupState);

  // Kod adımı: 1. adım başarılıysa ya da kod hatalıysa gösterilir.
  const email = otpState?.phase === 'otp' ? otpState.email : formState?.phase === 'otp' ? formState.email : null;

  if (email) {
    const errors = otpState?.phase === 'otp' ? otpState : null;
    return (
      <form action={otpAction} className={styles.form} noValidate>
        <h2 className={styles.subtitle}>{tr.signup.otpTitle}</h2>
        <p className={styles.text}>{tr.signup.otpIntro}</p>
        {errors?.formError ? <Banner tone="error">{errors.formError}</Banner> : null}
        <input type="hidden" name="email" value={email} />
        <TextField
          label={tr.signup.otpLabel}
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          error={errors?.fieldErrors?.code}
        />
        <Button type="submit" expand loading={otpPending}>
          {tr.signup.otpSubmit}
        </Button>
      </form>
    );
  }

  const errors = formState?.phase === 'form' ? formState : null;
  return (
    <form action={formAction} className={styles.form} noValidate>
      {errors?.formError ? <Banner tone="error">{errors.formError}</Banner> : null}
      <TextField
        label={tr.signup.name}
        help={tr.signup.nameHelp}
        name="name"
        type="text"
        autoComplete="name"
        required
        error={errors?.fieldErrors?.name}
      />
      <TextField
        label={tr.auth.email}
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        error={errors?.fieldErrors?.email}
      />
      <TextField
        label={tr.signup.password}
        help={tr.signup.passwordHelp}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        error={errors?.fieldErrors?.password}
      />
      <div className={styles.consents}>
        <Switch name="readNotice" label={tr.signup.readNotice} />
        {errors?.fieldErrors?.readNotice ? <p className={styles.error}>{errors.fieldErrors.readNotice}</p> : null}
        <Switch name="readTerms" label={tr.signup.readTerms} help={tr.signup.legalLinks} />
        {errors?.fieldErrors?.readTerms ? <p className={styles.error}>{errors.fieldErrors.readTerms}</p> : null}
      </div>
      <Button type="submit" expand loading={formPending}>
        {tr.signup.submit}
      </Button>
    </form>
  );
}
