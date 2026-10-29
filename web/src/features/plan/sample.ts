import type { PlanData } from './types';

/** ÖRNEK VERİ: yalnızca geliştirme önizlemesinde (/galeri/plan). Gerçek bir çocuğa ait bilgi yoktur. */
export const SAMPLE_PLAN: PlanData = {
  items: [
    { id: 'ornek-a', title: 'Doğal sayılar', subject: 'Matematik', grade: 5, status: 'tamamlandi' },
    { id: 'ornek-b', title: 'Kesirler', subject: 'Matematik', grade: 5, status: 'tamamlandi' },
    { id: 'ornek-c', title: 'Güneş, Dünya ve Ay', subject: 'Fen Bilimleri', grade: 5, status: 'atlandi' },
    { id: 'ornek-1', title: 'Kesirleri karşılaştırma', subject: 'Matematik', grade: 5, status: 'siradaki' },
    { id: 'ornek-2', title: 'Eğim ve yüzde', subject: 'Matematik', grade: 5, status: 'bekliyor' },
    { id: 'ornek-d', title: 'Canlıların sınıflandırılması', subject: 'Fen Bilimleri', grade: 5, status: 'bekliyor' },
  ],
};
