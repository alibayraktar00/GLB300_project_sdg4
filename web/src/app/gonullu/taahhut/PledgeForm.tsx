'use client';

import { useActionState } from 'react';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { Switch } from '@/components/Switch';
import styles from '@/features/questions/page.module.css';
import { pledgeFieldName } from '@/lib/pledge';
import { tr } from '@/strings/tr';

import { submitPledge } from './actions';

/** Madde madde onay: hiçbiri önceden işaretli değildir; eksik bırakılan maddenin altında yazıyla uyarı çıkar. */
export function PledgeForm() {
  const [state, action, pending] = useActionState(submitPledge, null);
  return (
    <form action={action} className={styles.section} noValidate>
      {state?.formError ? <Banner tone="error">{state.formError}</Banner> : null}
      {tr.legalPledge.items.map((item, index) => (
        <div key={item.title}>
          <Switch name={pledgeFieldName(index)} label={`${index + 1}. ${item.title}`} help={item.text} />
          {state?.missing?.includes(index) ? (
            <p className={styles.note} role="alert">
              {tr.legalPledge.missing}
            </p>
          ) : null}
        </div>
      ))}
      <div>
        <Button type="submit" loading={pending}>
          {tr.legalPledge.submit}
        </Button>
      </div>
    </form>
  );
}
