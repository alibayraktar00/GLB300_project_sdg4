import { ButtonLink } from '@/components/Button';
import { SectionHeader } from '@/components/SectionHeader';
import { SignOutButton } from '@/components/SignOutButton';
import { tr } from '@/strings/tr';

/** Veli paneli (geçici): çocuk ekleme bağlantısı. Çocuk listesi ve ilerleme sonraki fazda eklenecek. */
export default function GuardianPanelPage() {
  return (
    <>
      <SectionHeader title={tr.nav.guardianHome} level={1} />
      <ButtonLink href="/veli/cocuk-ekle" icon="family_restroom">
        {tr.child.title}
      </ButtonLink>
      <ButtonLink href="/veli/ozet" variant="secondary" icon="check_circle">
        {tr.childProgress.summaryLink}
      </ButtonLink>
      <SignOutButton />
    </>
  );
}
