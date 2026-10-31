'use client';

import { useActionState } from 'react';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { tr } from '@/strings/tr';

import { addSlot } from './actions';
import styles from './Availability.module.css';

/** Müsait saat ekleme formu. JavaScript olmadan da çalışır; hata ilgili alanın altında yazıyla gösterilir. */
export function SlotForm() {
  const [state, action, pending] = useActionState(addSlot, null);
  const errors = state?.fieldErrors;
  return (
    <form action={action} className={styles.form} noValidate>
      {state?.formError ? <Banner tone="error">{state.formError}</Banner> : null}
      <label className={styles.field}>
        <span className={styles.label}>{tr.availability.weekday}</span>
        <select name="weekday" defaultValue="1" className={styles.select} aria-invalid={errors?.weekday ? true : undefined}>
          {tr.availability.days.map((day, index) => (
            <option key={day} value={index + 1}>
              {day}
            </option>
          ))}
        </select>
        {errors?.weekday ? <span className={styles.error}>{errors.weekday}</span> : null}
      </label>
      <TextField label={tr.availability.start} name="start" type="time" min="08:00" max="21:00" required error={errors?.start} />
      <TextField label={tr.availability.end} name="end" type="time" min="08:00" max="21:00" required error={errors?.end} />
      <Button type="submit" loading={pending}>
        {tr.availability.add}
      </Button>
    </form>
  );
}
