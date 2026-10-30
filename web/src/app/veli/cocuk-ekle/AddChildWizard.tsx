'use client';

import { useActionState, useState } from 'react';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { RadioCard, RadioCardGroup } from '@/components/RadioCard';
import { TextField } from '@/components/TextField';
import { childFieldErrors, childSchema } from '@/lib/child';
import { MVP_GRADES } from '@/lib/scope';
import { tr } from '@/strings/tr';

import { addChild, type AddChildState } from './actions';
import styles from './AddChildWizard.module.css';

type Choice = 'verdi' | 'vermedi' | null;

/**
 * Çocuk ekleme: 1. adım çocuğun bilgileri, 2. adım AYRI ekranda açık rıza (AR-1). Rıza seçeneklerinden hiçbiri
 * önceden seçili değildir; seçim yapılmadan "Hesabı oluştur" pasiftir. "Vermiyorum" seçilirse neden açıklanır ve
 * geri dönülebilir (docs/hukuk/acik-riza-veli.md §2).
 */
export function AddChildWizard() {
  const [state, formAction, pending] = useActionState(addChild, null as AddChildState);
  const [step, setStep] = useState<'info' | 'consent'>('info');
  const [values, setValues] = useState({
    nickname: '',
    // Kapsam: yalnızca 8. sınıf; tek seçenek önceden seçili gelir.
    grade: MVP_GRADES.length === 1 ? String(MVP_GRADES[0]) : '',
    username: '',
    password: '',
  });
  const [localErrors, setLocalErrors] = useState<ReturnType<typeof childFieldErrors>>({});
  const [choice, setChoice] = useState<Choice>(null);

  const errors = { ...state?.fieldErrors, ...localErrors };

  function goToConsent() {
    // Rıza henüz verilmediği için yalnızca bilgi alanlarını doğrula.
    const result = childSchema.safeParse({ ...values, consent: 'verdi' });
    if (!result.success) {
      setLocalErrors(childFieldErrors(result.error));
      return;
    }
    setLocalErrors({});
    setStep('consent');
  }

  if (step === 'info') {
    return (
      <div className={styles.form}>
        {state?.formError ? <Banner tone="error">{state.formError}</Banner> : null}
        <TextField
          label={tr.child.nickname}
          help={tr.child.nicknameHelp}
          name="nickname"
          value={values.nickname}
          onChange={(event) => setValues({ ...values, nickname: event.target.value })}
          autoComplete="off"
          required
          error={errors.nickname}
        />
        <div className={styles.field}>
          <label htmlFor="sinif" className={styles.label}>
            {tr.child.grade}
          </label>
          <select
            id="sinif"
            className={styles.select}
            value={values.grade}
            onChange={(event) => setValues({ ...values, grade: event.target.value })}
            aria-invalid={errors.grade ? true : undefined}
            required
          >
            <option value="" disabled>
              {tr.child.grade}
            </option>
            {MVP_GRADES.map((grade) => (
              <option key={grade} value={grade}>
                {tr.child.gradeOption(grade)}
              </option>
            ))}
          </select>
          {errors.grade ? <p className={styles.error}>{errors.grade}</p> : null}
        </div>
        <TextField
          label={tr.child.username}
          help={tr.child.usernameHelp}
          name="username"
          value={values.username}
          onChange={(event) => setValues({ ...values, username: event.target.value })}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          error={errors.username}
        />
        <TextField
          label={tr.child.password}
          help={tr.child.passwordHelp}
          name="password"
          type="password"
          value={values.password}
          onChange={(event) => setValues({ ...values, password: event.target.value })}
          autoComplete="new-password"
          required
          error={errors.password}
        />
        <Button type="button" expand onClick={goToConsent}>
          {tr.child.next}
        </Button>
      </div>
    );
  }

  const nickname = values.nickname.trim();
  return (
    <form action={formAction} className={styles.form}>
      {state?.formError ? <Banner tone="error">{state.formError}</Banner> : null}
      <input type="hidden" name="nickname" value={nickname} />
      <input type="hidden" name="grade" value={values.grade} />
      <input type="hidden" name="username" value={values.username} />
      <input type="hidden" name="password" value={values.password} />

      <h2 className={styles.subtitle}>{tr.legal.ar1Title}</h2>
      <p className={styles.text}>{tr.legal.ar1Intro(nickname)}</p>
      <ul className={styles.points}>
        {tr.legal.ar1Points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p className={styles.text}>{tr.legal.ar1Representative(nickname)}</p>

      <p className={styles.text}>{tr.legal.ar1Question(nickname)}</p>
      <RadioCardGroup legend={tr.child.consentChoiceLabel}>
        <RadioCard
          name="consent"
          value="verdi"
          title={tr.child.consentGive}
          checked={choice === 'verdi'}
          onChange={() => setChoice('verdi')}
        />
        <RadioCard
          name="consent"
          value="vermedi"
          title={tr.child.consentRefuse}
          checked={choice === 'vermedi'}
          onChange={() => setChoice('vermedi')}
        />
      </RadioCardGroup>

      {choice === 'vermedi' ? (
        <Banner tone="info" title={tr.child.refuseTitle}>
          {tr.child.refuseBody}
        </Banner>
      ) : null}

      <div className={styles.actions}>
        <Button type="submit" expand disabled={choice !== 'verdi'} loading={pending}>
          {tr.child.submit}
        </Button>
        <Button type="button" variant="secondary" expand onClick={() => setStep('info')}>
          {tr.child.back}
        </Button>
      </div>
    </form>
  );
}
