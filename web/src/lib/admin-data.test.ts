import { describe, expect, it } from 'vitest';

import { parseApplications, parseMatchingData, parseProposals } from './admin-data';

describe('parseApplications', () => {
  it('kısa ad üretir, bozuk ve kapsam dışı satırı atlar', () => {
    const rows = [
      { profile_id: 'a', given_name: 'Ayşe', family_name: 'ışık', university: 'U', department: null, class_year: 3, status: 'basvuru' },
      { profile_id: 'b', given_name: 'X', family_name: 'Y', university: 'U', status: 'onayli' },
      { nope: 1 },
    ];
    expect(parseApplications(rows)).toEqual([
      { id: 'a', name: 'Ayşe I.', university: 'U', department: '', classYear: 3, status: 'basvuru' },
    ]);
  });
  it('dizi değilse boş döner', () => {
    expect(parseApplications(null)).toEqual([]);
  });
});

describe('parseMatchingData', () => {
  it('öğrenci ve gönüllü seçeneklerini çevirir', () => {
    const data = parseMatchingData(
      [{ profile_id: 's', grade: 8, username: 'ali.k' }, { x: 1 }],
      [{ profile_id: 'v', given_name: 'Can', family_name: 'iplik', university: 'U', volunteer_subjects: [{ subject_id: 1, grade: 8 }] }],
    );
    expect(data.students).toEqual([{ id: 's', grade: 8, username: 'ali.k' }]);
    expect(data.volunteers).toEqual([{ id: 'v', name: 'Can İ.', university: 'U', teaches: [{ subjectId: 1, grade: 8 }] }]);
  });
});

describe('parseProposals', () => {
  it('yalnızca karar bekleyenleri ve gönüllü kısa adını döndürür', () => {
    const matches = [
      { id: 'm1', subject_id: 1, status: 'onerildi', subjects: { name: 'Matematik' } },
      { id: 'm2', subject_id: 1, status: 'aktif', subjects: { name: 'Matematik' } },
    ];
    const volunteers = [{ match_id: 'm1', volunteer_name: 'Can İ.', university: 'U' }];
    expect(parseProposals(matches, volunteers)).toEqual([{ id: 'm1', subject: 'Matematik', volunteerName: 'Can İ.', university: 'U' }]);
  });
});
