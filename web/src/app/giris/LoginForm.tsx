'use client';

import { useActionState } from 'react';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Switch } from '@/components/Switch';
import { TextField } from '@/components/TextField';
import { tr } from '@/strings/tr';

import type { LoginState } from './actions';
import styles from './LoginForm.module.css';

type LoginFormProps = {
  mode: 'email' | 'student';
  action: (previous: LoginState, formData: FormData) => Promise<LoginState>;
  /** Girişten sonra dönülecek adres (sunucuda yeniden denetlenir). */
  next?: string;
};

/**
 * Giriş formu. JavaScript olmadan da çalışır (düz form gönderimi); `useActionState` yalnızca hata
 * mesajlarını sayfa yenilenmeden gösterir. Şifre alanında yapıştırma serbesttir.
 */
export function LoginForm({ mode, action, next }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const isStudent = mode === 'student';

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state?.formError ? <Banner tone="error">{state.formError}</Banner> : null}
      {next ? <input type="hidden" name="devam" value={next} /> : null}

      {isStudent ? (
        <TextField
          label={tr.auth.username}
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          error={state?.fieldErrors?.username}
        />
      ) : (
        <TextField
          label={tr.auth.email}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          error={state?.fieldErrors?.email}
        />
      )}

      <TextField
        label={tr.auth.password}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state?.fieldErrors?.password}
      />

      <Switch name="remember" label={tr.auth.remember} help={tr.auth.rememberHelp} />

      <Button type="submit" expand loading={pending}>
        {tr.auth.submit}
      </Button>
    </form>
  );
}
