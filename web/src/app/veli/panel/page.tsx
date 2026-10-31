import type { Metadata } from 'next';

import { Button, ButtonLink } from '@/components/Button';
import { Card, CardContent } from '@/components/Card';
import { SectionHeader } from '@/components/SectionHeader';
import { SignOutButton } from '@/components/SignOutButton';
import { EmptyState } from '@/components/StateViews';
import { setFeatureAction } from '@/features/family/actions';
import styles from '@/features/questions/page.module.css';
import { loadChildren } from '@/server/family';
import { requireRole } from '@/server/session';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.nav.guardianHome };
export const dynamic = 'force-dynamic';

const FEATURES = [
  { key: 'qa_enabled', label: tr.family.qa, pick: (child: { qaEnabled: boolean }) => child.qaEnabled },
  { key: 'video_enabled', label: tr.family.video, pick: (child: { videoEnabled: boolean }) => child.videoEnabled },
] as const;

/** Veli paneli: çocuklar, özellik anahtarları (soru sorma, görüntülü ders), özet ve çocuk ekleme. */
export default async function GuardianPanelPage() {
  const user = await requireRole('veli');
  const children = await loadChildren(user.id);

  return (
    <div className={styles.page}>
      <SectionHeader title={tr.family.childrenTitle} level={1} />

      {children.length === 0 ? (
        <EmptyState title={tr.family.noChildren} message={tr.family.noChildrenHelp} />
      ) : (
        <ul className={styles.pool}>
          {children.map((child) => (
            <li key={child.id}>
              <Card>
                <CardContent title={child.name} description={tr.family.gradeLine(child.grade, child.username)} />
                <p className={styles.note}>{tr.family.featureHelp}</p>
                {FEATURES.map((feature) => {
                  const enabled = feature.pick(child);
                  return (
                    <form key={feature.key} action={setFeatureAction} className={styles.claimRow}>
                      <input type="hidden" name="studentId" value={child.id} />
                      <input type="hidden" name="feature" value={feature.key} />
                      <input type="hidden" name="value" value={String(!enabled)} />
                      <p className={styles.note}>
                        {feature.label}: <strong>{enabled ? tr.family.on : tr.family.off}</strong>
                      </p>
                      <Button type="submit" variant="secondary" aria-label={tr.family.featureAria(feature.label, child.name)}>
                        {enabled ? tr.family.turnOff : tr.family.turnOn}
                      </Button>
                    </form>
                  );
                })}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.claimRow}>
        <ButtonLink href="/veli/cocuk-ekle" icon="family_restroom">
          {tr.family.addChild}
        </ButtonLink>
        <ButtonLink href="/veli/ozet" variant="secondary" icon="check_circle">
          {tr.childProgress.summaryLink}
        </ButtonLink>
      </div>
      <SignOutButton />
    </div>
  );
}
