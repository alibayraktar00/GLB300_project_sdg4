import type { Metadata } from 'next';

import { LegalPlaceholder } from '@/components/LegalPlaceholder';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.legalPlaceholder.privacyTitle };

export default function PrivacyPage() {
  return <LegalPlaceholder title={tr.legalPlaceholder.privacyTitle} />;
}
