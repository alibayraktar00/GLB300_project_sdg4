'use client';

import { useActionState } from 'react';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import styles from '@/features/questions/page.module.css';
import { tr } from '@/strings/tr';

import { startEnrollment, verifyMfa, type MfaState } from './actions';

/**
 * İki adımlı doğrulama: doğrulanmış bir faktör varsa yalnızca kod sorulur; yoksa önce kurulum (QR + anahtar),
 * sonra ilk kod. QR bir data: adresidir (CSP img-src izin verir); anahtar elle girmek isteyenler içindir.
 */
export function MfaForm({ verifiedFactorId }: { verifiedFactorId: string | null }) {
  const [enrollment, enroll, enrolling] = useActionState<MfaState, FormData>(startEnrollment, null);
  const [state, verify, verifying] = useActionState(verifyMfa, enrollment);
  const factorId = verifiedFactorId ?? enrollment?.factorId ?? null;
  const shown = state?.qr ? state : enrollment;
  const error = state?.formError ?? enrollment?.formError;

  if (!factorId) {
    return (
      <form action={enroll} className={styles.section}>
        <p className={styles.intro}>{tr.mfa.enrollIntro}</p>
        {error ? <Banner tone="error">{error}</Banner> : null}
        <div>
          <Button type="submit" loading={enrolling}>
            {tr.mfa.start}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form action={verify} className={styles.section} noValidate>
      {shown?.qr ? (
        <>
          <p className={styles.intro}>{tr.mfa.enrollIntro}</p>
          {/* data: adresi; boyutu sabit olduğu için next/image gerekmez. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown.qr} alt={tr.mfa.qrAlt} width={200} height={200} />
          <p className={styles.note}>
            {tr.mfa.secretHelp} <code>{shown.secret}</code>
          </p>
        </>
      ) : null}
      <p className={styles.intro}>{tr.mfa.verifyIntro}</p>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <input type="hidden" name="factorId" value={factorId} />
      <TextField label={tr.mfa.code} name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required />
      <div>
        <Button type="submit" loading={verifying}>
          {tr.mfa.submit}
        </Button>
      </div>
    </form>
  );
}
