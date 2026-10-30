import type { QuestionSummary, ThreadData } from './types';

/** Yalnızca geliştirme önizlemesi ve testler içindir; gerçek veri değildir. */
export const SAMPLE_QUESTIONS: QuestionSummary[] = [
  { id: '11111111-1111-4111-8111-111111111111', status: 'cevaplandi', subject: 'Matematik', createdAt: '2026-10-28T09:30:00Z' },
  { id: '22222222-2222-4222-8222-222222222222', status: 'havuzda', subject: 'Matematik', createdAt: '2026-10-29T14:10:00Z' },
];

export const SAMPLE_THREAD: ThreadData = {
  id: '11111111-1111-4111-8111-111111111111',
  status: 'cevaplandi',
  subject: 'Matematik',
  messages: [
    { id: 'm1', kind: 'soru', body: '3x + 5 = 20 denkleminde x kaçtır?', createdAt: '2026-10-28T09:30:00Z', hidden: false, mine: true, photos: [] },
    { id: 'm2', kind: 'cevap', body: 'Önce iki taraftan 5 çıkar: 3x = 15. Sonra 3e böl: x = 5.', createdAt: '2026-10-28T11:05:00Z', hidden: false, mine: false, photos: [] },
    { id: 'm3', kind: 'takip', body: '', createdAt: '2026-10-28T11:20:00Z', hidden: true, mine: true, photos: [] },
  ],
};
