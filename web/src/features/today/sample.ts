import type { TodayData } from './types';

/**
 * ÖRNEK VERİ: yalnızca geliştirme önizlemesinde (/galeri/bugun) kullanılır. Gerçek sayfa veriyi `get_today_tasks`
 * RPC'sinden alacak (Faz B). Burada gerçek bir çocuğa ait hiçbir bilgi yoktur.
 */
export const SAMPLE_TODAY: TodayData = {
  nickname: 'Ela',
  tasks: [
    { id: 'ornek-1', title: 'Üslü ifadeler', subject: 'Matematik', grade: 8, shortMinutes: 5, fullMinutes: 25 },
    { id: 'ornek-2', title: 'Kareköklü ifadeler', subject: 'Matematik', grade: 8, shortMinutes: 5, fullMinutes: 20 },
  ],
  completed: 3,
  total: 10,
  upcomingLesson: { when: 'Yarın 16.00', volunteer: 'Ayşe K.' },
  newAnswers: 1,
};
