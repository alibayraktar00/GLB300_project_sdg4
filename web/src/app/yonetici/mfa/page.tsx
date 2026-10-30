import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { MfaForm } from '@/features/mfa/MfaForm';
import styles from '@/features/questions/page.module.css';
import { requireRole } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.mfa.title };
export const dynamic = 'force-dynamic';

/** Yönetici iki adımlı doğrulama: kurulum ya da kod girişi. Zaten aal2 ise doğrudan yönetime gider. */
export default async function MfaPage() {
  await requireRole('yonetici');
  let verifiedFactorId: string | null = null;
  let alreadyVerified = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    alreadyVerified = level?.currentLevel === 'aal2';
    const { data: factors } = await supabase.auth.mfa.listFactors();
    verifiedFactorId = factors?.totp?.find((factor) => factor.status === 'verified')?.id ?? null;
  } catch {
    // Ayar ya da ağ sorunu: kurulum formu gösterilir, eylem kendi hatasını verir.
  }
  if (alreadyVerified) redirect('/yonetici/basvurular');
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{tr.mfa.title}</h1>
      <MfaForm verifiedFactorId={verifiedFactorId} />
    </div>
  );
}
