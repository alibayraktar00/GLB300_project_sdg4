'use client';

import { useActionState } from 'react';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { DURATIONS } from '@/lib/sessions';
import { tr } from '@/strings/tr';

import styles from './ScheduleForm.module.css';
import type { MatchOption, ScheduleAction } from './types';

/** Gönüllünün ders planlama formu. JavaScript olmadan da çalışır; hata durumunda yazılanlar sunucuya yeniden gönderilmez, form korunur. */
export function ScheduleForm({ matches, action }: { matches: readonly MatchOption[]; action: ScheduleAction }) {
  const [state, formAction, pending] = useActionState(action, null);
  const errors = state?.fieldErrors;

  return (
    <form action={formAction} className={styles.form} noValidate>
      <p className={styles.help}>{tr.sessions.scheduleHelp}</p>
      {state?.formError ? <Banner tone="error">{state.formError}</Banner> : null}

      <label className={styles.field}>
        <span className={styles.label}>{tr.sessions.match}</span>
        <select name="matchId" className={styles.select} required>
          {matches.map((match, index) => (
            <option key={match.id} value={match.id}>
              {tr.sessions.matchOption(index + 1, match.subject)}
            </option>
          ))}
        </select>
      </label>

      <TextField label={tr.sessions.date} name="date" type="date" required error={errors?.date} />
      <TextField label={tr.sessions.time} name="time" type="time" required help={tr.sessions.timeHelp} error={errors?.time} />

      <label className={styles.field}>
        <span className={styles.label}>{tr.sessions.duration}</span>
        <select name="duration" className={styles.select} defaultValue="30">
          {DURATIONS.map((minutes) => (
            <option key={minutes} value={minutes}>
              {tr.sessions.minutes(minutes)}
            </option>
          ))}
        </select>
      </label>

      <TextField
        label={tr.sessions.link}
        name="url"
        type="url"
        inputMode="url"
        autoComplete="off"
        required
        help={tr.sessions.linkHelp}
        error={errors?.url}
      />

      <Button type="submit" expand loading={pending}>
        {tr.sessions.submit}
      </Button>
    </form>
  );
}
