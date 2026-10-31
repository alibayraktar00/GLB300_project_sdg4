import type { Metadata } from 'next';

import { NoticesPage } from '@/features/notices/NoticesPage';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.notices.title };
export const dynamic = 'force-dynamic';

export default NoticesPage;
