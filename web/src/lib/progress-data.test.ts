import { describe, expect, it } from 'vitest';

import { buildProgress } from './progress-data';

const now = Date.parse('2026-11-05T12:00:00Z');

describe('buildProgress', () => {
  const profiles = [{ id: 'a', display_name: 'Ela' }, { bad: 1 }];
  const plans = [
    {
      student_id: 'a',
      absence_start: '2026-10-01',
      absence_end: '2026-10-20',
      plan_items: [
        { seq: 2, status: 'bekliyor', topics: { title: 'Üslü ifadeler' } },
        { seq: 1, status: 'tamamlandi', topics: [{ title: 'Çarpanlar' }] },
      ],
    },
  ];
  const questions = [
    { student_id: 'a', status: 'cevaplandi' },
    { student_id: 'a', status: 'havuzda' },
    { student_id: 'b', status: 'kapandi' },
  ];
  const sessions = [
    { starts_at: '2026-11-01T10:00:00Z', duration_min: 30, status: 'tamamlandi', matches: { student_id: 'a' } },
    { starts_at: '2026-11-09T10:00:00Z', duration_min: 30, status: 'planlandi', matches: { student_id: 'a' } },
    { starts_at: '2026-11-02T10:00:00Z', duration_min: 30, status: 'iptal', matches: { student_id: 'a' } },
    { starts_at: '2026-11-01T10:00:00Z', duration_min: 30, status: 'tamamlandi', matches: { student_id: 'b' } },
  ];

  it('plan konularını sıralar, soru ve ders sayılarını yalnızca o çocuk için hesaplar', () => {
    const [child, ...rest] = buildProgress({ profiles, plans, questions, sessions, now });
    expect(rest).toEqual([]);
    expect(child?.name).toBe('Ela');
    expect(child?.plan?.topics).toEqual([
      { title: 'Çarpanlar', status: 'tamamlandi' },
      { title: 'Üslü ifadeler', status: 'bekliyor' },
    ]);
    expect(child?.questions).toEqual({ total: 2, answered: 1 });
    expect(child?.sessions).toEqual({ done: 1, upcoming: 1 });
  });

  it('planı olmayan çocukta plan null olur; bozuk girdide çökmez', () => {
    expect(buildProgress({ profiles, plans: null, questions: 'x', sessions: undefined, now })[0]?.plan).toBeNull();
  });
});
