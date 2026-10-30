import type { SessionItem } from './types';

/** Yalnızca geliştirme önizlemesi ve testler içindir; gerçek veri değildir. */
export const SAMPLE_SESSIONS: SessionItem[] = [
  {
    id: '33333333-3333-4333-8333-333333333333',
    startsAt: '2099-11-05T14:30:00Z',
    durationMin: 30,
    status: 'planlandi',
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    subject: 'Matematik',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    startsAt: '2026-10-20T14:30:00Z',
    durationMin: 40,
    status: 'iptal',
    meetingUrl: null,
    subject: 'Matematik',
  },
];
