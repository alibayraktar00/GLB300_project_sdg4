import { ButtonLink } from '@/components/Button';
import { PublicPage } from '@/components/PublicPage';
import { StateView } from '@/components/StateViews';
import { tr } from '@/strings/tr';

/** Olmayan adres. Sakin dil: kullanıcıyı suçlamaz, tek çıkış yolu verir. */
export default function NotFound() {
  return (
    <PublicPage>
      <StateView
        icon="wb_twilight"
        headingLevel={1}
        title={tr.notFound.title}
        message={tr.notFound.body}
        action={<ButtonLink href="/">{tr.notFound.home}</ButtonLink>}
      />
    </PublicPage>
  );
}
