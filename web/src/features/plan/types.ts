/** "Planım" ekranının veri biçimi. Gerçek veri `recovery_plans` ve `plan_items` tablolarından gelecek (Faz B). */
export type PlanItemStatus = 'tamamlandi' | 'siradaki' | 'atlandi' | 'bekliyor';

export type PlanItem = {
  id: string;
  title: string;
  subject: string;
  grade: number;
  status: PlanItemStatus;
};

export type PlanData = {
  items: PlanItem[];
};
