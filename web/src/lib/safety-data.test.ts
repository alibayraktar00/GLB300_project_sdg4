import { describe, expect, it } from 'vitest';

import { parseBlocks, parseReports, parseVolunteerCards } from './safety-data';

describe('parseVolunteerCards', () => {
  it('kısa ad üretir, bitmiş eşleşmeyi ve yinelenenleri atlar', () => {
    const raw = [
      { student_id: 's', volunteer_id: 'v', volunteer_name: 'Can İ.', match_status: 'aktif', university: 'U' },
      { student_id: 's', volunteer_id: 'v', volunteer_name: 'Can İ.', match_status: 'veli_onayi', university: 'U' },
      { student_id: 's', volunteer_id: 'w', volunteer_name: 'Ece K.', match_status: 'bitti', university: 'U' },
      { x: 1 },
    ];
    expect(parseVolunteerCards(raw)).toEqual([{ studentId: 's', volunteerId: 'v', name: 'Can İ.', university: 'U' }]);
  });

  it('dizi değilse boş döner', () => {
    expect(parseVolunteerCards(null)).toEqual([]);
  });
});

describe('parseReports / parseBlocks', () => {
  it('çevirir ve bozuk satırı atlar', () => {
    expect(parseReports([{ id: 'r', target_type: 'mesaj', category: 'diger', status: 'yeni', created_at: 'd' }, { id: 'x' }])).toHaveLength(1);
    expect(parseBlocks([{ id: 'b', blocked_by_role: 'veli', reason_code: null, created_at: 'd' }])).toEqual([
      { id: 'b', blockedByRole: 'veli', reason: 'diger', createdAt: 'd' },
    ]);
  });
});
