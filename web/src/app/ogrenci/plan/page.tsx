import type { Metadata } from 'next';

import { PlanView } from '@/features/plan/PlanView';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.plan.title };

/**
 * "Planım". Plan verisi (`recovery_plans` + `plan_items`) Faz B'de bağlanacak; o zamana kadar plan yokmuş gibi
 * boş durum gösterilir. Rol denetimi `ogrenci/layout.tsx` içindedir.
 */
export default function PlanPage() {
  return <PlanView data={{ items: [] }} />;
}
