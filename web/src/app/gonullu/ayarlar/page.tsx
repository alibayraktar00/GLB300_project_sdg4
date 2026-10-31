import type { Metadata } from 'next';

import { SettingsPage } from '@/features/settings/SettingsPage';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.settings.title };

export default SettingsPage;
