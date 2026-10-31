import { describe, expect, it } from 'vitest';

import { buildChildCards, parseMyStudents } from './family-data';

describe('buildChildCards', () => {
  const profiles = [{ id: 'a', display_name: 'Ela' }, { id: 'b', display_name: 'Can' }, { bad: 1 }];
  const students = [
    { profile_id: 'a', grade: 8, username: 'ela.k' },
    { profile_id: 'b', grade: 8, username: 'can.y' },
  ];

  it('özellik satırı yoksa varsayılan açık; varsa kapalı değer taşınır', () => {
    const cards = buildChildCards({ profiles, students, features: [{ student_id: 'b', qa_enabled: false, video_enabled: true }] });
    expect(cards).toEqual([
      { id: 'a', name: 'Ela', grade: 8, username: 'ela.k', qaEnabled: true, videoEnabled: true },
      { id: 'b', name: 'Can', grade: 8, username: 'can.y', qaEnabled: false, videoEnabled: true },
    ]);
  });

  it('öğrenci satırı olmayan profili atlar; bozuk girdide çökmez', () => {
    expect(buildChildCards({ profiles, students: [], features: null })).toEqual([]);
    expect(buildChildCards({ profiles: 'x', students: undefined, features: 3 })).toEqual([]);
  });
});

describe('parseMyStudents', () => {
  it('rumuz ve sınıfı çevirir', () => {
    expect(parseMyStudents([{ match_id: 'm', nickname: 'Ela', grade: 8 }, { x: 1 }])).toEqual([{ matchId: 'm', nickname: 'Ela', grade: 8 }]);
    expect(parseMyStudents(null)).toEqual([]);
  });
});
