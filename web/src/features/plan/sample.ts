import type { PlanData } from './types';

/** ÖRNEK VERİ: yalnızca geliştirme önizlemesinde (/galeri/plan). Gerçek bir çocuğa ait bilgi yoktur. */
export const SAMPLE_PLAN: PlanData = {
  items: [
    { id: 'ornek-a', title: 'Çarpanlar ve katlar', subject: 'Matematik', grade: 8, status: 'tamamlandi' },
    { id: 'ornek-b', title: 'Veri analizi', subject: 'Matematik', grade: 8, status: 'tamamlandi' },
    { id: 'ornek-c', title: 'Olasılık', subject: 'Matematik', grade: 8, status: 'atlandi' },
    { id: 'ornek-1', title: 'Üslü ifadeler', subject: 'Matematik', grade: 8, status: 'siradaki' },
    { id: 'ornek-2', title: 'Kareköklü ifadeler', subject: 'Matematik', grade: 8, status: 'bekliyor' },
    { id: 'ornek-d', title: 'Cebirsel ifadeler', subject: 'Matematik', grade: 8, status: 'bekliyor' },
  ],
};
