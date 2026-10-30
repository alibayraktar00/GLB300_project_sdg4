'use client';

import { useActionState, useState } from 'react';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { ProgressBar } from '@/components/ProgressBar';
import { RadioCard, RadioCardGroup } from '@/components/RadioCard';
import { Switch } from '@/components/Switch';
import { TextField } from '@/components/TextField';
import { formatShortDate, planFieldErrors, planSchema, type PlanFieldErrors, type SubjectCode } from '@/lib/plan';
import { MVP_GRADES, MVP_SUBJECTS } from '@/lib/scope';
import { tr } from '@/strings/tr';

import styles from './PlanWizard.module.css';

export type CreatePlanAction = (
  previous: { fieldErrors?: PlanFieldErrors; formError?: string } | null,
  formData: FormData,
) => Promise<{ fieldErrors?: PlanFieldErrors; formError?: string } | null>;

type Values = { grade: string; subjects: SubjectCode[]; start: string; end: string; dailyGoal: string };

/** Hangi adımda hangi alanlar doğrulanır; hata ilk hatalı adımda gösterilir. */
const STEP_FIELDS: Record<1 | 2 | 3, ReadonlyArray<keyof PlanFieldErrors>> = {
  1: ['grade', 'subjects'],
  2: ['start', 'end'],
  3: ['dailyGoal'],
};

/**
 * Plan oluşturma sihirbazı (docs/ekran-akislari.md Ö2): (1) sınıf ve dersler, (2) derslere ara verilen tarihler,
 * (3) günde kaç konu, ardından özet ve "Planı oluştur". Her adımda görünür "Geri" düğmesi vardır (jestsiz).
 * Girdiler hata olsa da korunur. Ara verme NEDENİ sorulmaz.
 */
export function PlanWizard({ action }: { action: CreatePlanAction }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [values, setValues] = useState<Values>({
    // Tek seçenek varsa önceden seçili gelir (kapsam: 8. sınıf Matematik).
    grade: MVP_GRADES.length === 1 ? String(MVP_GRADES[0]) : '',
    subjects: MVP_SUBJECTS.length === 1 ? [...MVP_SUBJECTS] : [],
    start: '',
    end: '',
    dailyGoal: '',
  });
  const [errors, setErrors] = useState<PlanFieldErrors>({});

  const merged = { ...state?.fieldErrors, ...errors };

  function next(current: 1 | 2 | 3) {
    const result = planSchema.safeParse(values);
    const all = result.success ? {} : planFieldErrors(result.error);
    const relevant: PlanFieldErrors = {};
    for (const key of STEP_FIELDS[current]) {
      const message = all[key];
      if (message) relevant[key] = message;
    }
    setErrors(relevant);
    if (Object.keys(relevant).length === 0) setStep((current + 1) as 2 | 3 | 4);
  }

  function back() {
    setErrors({});
    setStep((current) => (current > 1 ? ((current - 1) as 1 | 2 | 3) : current));
  }

  const toggleSubject = (code: SubjectCode) =>
    setValues((previous) => ({
      ...previous,
      subjects: previous.subjects.includes(code)
        ? previous.subjects.filter((item) => item !== code)
        : [...previous.subjects, code],
    }));

  const stepNumber = Math.min(step, 3);

  return (
    <form action={formAction} className={styles.form} noValidate>
      <ProgressBar value={stepNumber / 3} label={tr.plan.stepProgress} caption={tr.plan.step(stepNumber)} />
      {state?.formError ? <Banner tone="error">{state.formError}</Banner> : null}

      {step === 1 ? (
        <>
          <h2 className={styles.stepTitle}>{tr.plan.step1Title}</h2>
          <RadioCardGroup legend={tr.plan.gradeLegend}>
            {MVP_GRADES.map((grade) => (
              <RadioCard
                key={grade}
                name="gradeChoice"
                value={String(grade)}
                title={tr.plan.gradeOption(grade)}
                checked={values.grade === String(grade)}
                onChange={() => setValues({ ...values, grade: String(grade) })}
              />
            ))}
          </RadioCardGroup>
          {merged.grade ? <p className={styles.error}>{merged.grade}</p> : null}

          <fieldset className={styles.group}>
            <legend className={styles.legend}>{tr.plan.subjectsLegend}</legend>
            {MVP_SUBJECTS.map((code) => (
              <Switch
                key={code}
                name="subjectChoice"
                value={code}
                label={tr.plan.subjects[code]}
                checked={values.subjects.includes(code)}
                onChange={() => toggleSubject(code)}
              />
            ))}
          </fieldset>
          {merged.subjects ? <p className={styles.error}>{merged.subjects}</p> : null}
        </>
      ) : null}

      {step === 2 ? (
        <>
          <h2 className={styles.stepTitle}>{tr.plan.step2Title}</h2>
          <p className={styles.help}>{tr.plan.step2Help}</p>
          <TextField
            label={tr.plan.startDate}
            name="startChoice"
            type="date"
            value={values.start}
            onChange={(event) => setValues({ ...values, start: event.target.value })}
            required
            error={merged.start}
          />
          <TextField
            label={tr.plan.endDate}
            name="endChoice"
            type="date"
            value={values.end}
            onChange={(event) => setValues({ ...values, end: event.target.value })}
            required
            error={merged.end}
          />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <h2 className={styles.stepTitle}>{tr.plan.step3Title}</h2>
          <p className={styles.help}>{tr.plan.step3Help}</p>
          <RadioCardGroup legend={tr.plan.step3Title}>
            {[1, 2, 3].map((count) => (
              <RadioCard
                key={count}
                name="goalChoice"
                value={String(count)}
                title={tr.plan.goalOption(count)}
                checked={values.dailyGoal === String(count)}
                onChange={() => setValues({ ...values, dailyGoal: String(count) })}
              />
            ))}
          </RadioCardGroup>
          {merged.dailyGoal ? <p className={styles.error}>{merged.dailyGoal}</p> : null}
        </>
      ) : null}

      {step === 4 ? (
        <>
          <h2 className={styles.stepTitle}>{tr.plan.summaryTitle}</h2>
          <p className={styles.summary}>
            {tr.plan.summaryLine(
              Number(values.grade),
              values.subjects.map((code) => tr.plan.subjects[code]).join(', '),
              formatShortDate(values.start),
              formatShortDate(values.end),
              Number(values.dailyGoal),
            )}
          </p>
          <Banner tone="info">{tr.plan.summaryNote}</Banner>
          {/* Gerçek gönderim alanları: yalnızca son adımda forma girer. */}
          <input type="hidden" name="grade" value={values.grade} />
          {values.subjects.map((code) => (
            <input key={code} type="hidden" name="subjects" value={code} />
          ))}
          <input type="hidden" name="start" value={values.start} />
          <input type="hidden" name="end" value={values.end} />
          <input type="hidden" name="dailyGoal" value={values.dailyGoal} />
        </>
      ) : null}

      <div className={styles.actions}>
        {step < 4 ? (
          <Button type="button" expand onClick={() => next(step as 1 | 2 | 3)}>
            {tr.plan.next}
          </Button>
        ) : (
          <Button type="submit" expand loading={pending}>
            {tr.plan.create}
          </Button>
        )}
        {step > 1 ? (
          <Button type="button" variant="secondary" expand onClick={back}>
            {tr.plan.back}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
