import type { Metadata } from 'next';

import { LegalPlaceholder } from '@/components/LegalPlaceholder';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.legalPlaceholder.cookiesTitle };

export default function CookiesPage() {
  return <LegalPlaceholder title={tr.legalPlaceholder.cookiesTitle} />;
}
