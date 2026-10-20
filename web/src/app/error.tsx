'use client';

import { Button, ButtonLink } from '@/components/Button';
import { PublicPage } from '@/components/PublicPage';
import { ErrorState } from '@/components/StateViews';
import { tr } from '@/strings/tr';

/**
 * Sayfa çizilirken beklenmeyen bir hata olursa gösterilir (ör. Supabase ayarları eksikken).
 * Üretimde teknik ayrıntı ASLA gösterilmez ve konsola yazılmaz; yalnızca genel bir mesaj vardır.
 * Dil suçlamaz, panik yaratmaz; iki çıkış yolu verir: tekrar dene, ana sayfaya dön.
 */
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PublicPage>
      <ErrorState
        headingLevel={1}
        title={tr.error.title}
        message={tr.error.body}
        action={
          <>
            <Button icon="refresh" onClick={() => reset()}>
              {tr.error.retry}
            </Button>
            <ButtonLink href="/" variant="secondary">
              {tr.error.home}
            </ButtonLink>
          </>
        }
      />
    </PublicPage>
  );
}
