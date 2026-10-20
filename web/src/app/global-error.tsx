'use client';

import { Button, ButtonLink } from '@/components/Button';
import { PublicPage } from '@/components/PublicPage';
import { ErrorState } from '@/components/StateViews';
import { tr } from '@/strings/tr';

import { atkinsonHeavy, atkinson } from './fonts';

import '@/styles/reset.css';
import '@/styles/tokens.css';
import '@/styles/global.css';

/**
 * Kök düzen (layout) bile çizilemezse gösterilir; bu yüzden kendi <html> ve <body> etiketlerini taşır.
 * Kök düzenin satır içi görünüm betiği burada yoktur: tema yalnızca sistem ayarından (CSS medya sorguları) gelir.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr" className={`${atkinson.variable} ${atkinsonHeavy.variable}`}>
      <body>
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
      </body>
    </html>
  );
}
