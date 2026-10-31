import { describe, expect, it } from 'vitest';

import { parseConsents, withdrawSchema } from './account-data';

describe('parseConsents', () => {
  it('izinli türleri en yeni önce sıralar; yabancı tür ve bozuk satırı atlar', () => {
    const items = parseConsents([
      { id: 'a', type: 'aydinlatma_veli', doc_version: 'v1', accepted_at: '2026-10-01T10:00:00Z', student_id: null },
      { id: 'b', type: 'acik_riza_dolayli_saglik', doc_version: 'v1', accepted_at: '2026-10-02T10:00:00Z', student_id: 's' },
      { id: 'c', type: 'gonullu_taahhut', doc_version: 'v1', accepted_at: '2026-10-03T10:00:00Z', student_id: null },
      { id: 'd' },
    ]);
    expect(items.map((item) => item.id)).toEqual(['b', 'a']);
  });

  it('dizi değilse boş döner', () => {
    expect(parseConsents(null)).toEqual([]);
  });
});

describe('withdrawSchema', () => {
  it('yalnızca geçerli kimliği kabul eder', () => {
    expect(withdrawSchema.safeParse({ consentId: '11111111-1111-4111-8111-111111111111' }).success).toBe(true);
    expect(withdrawSchema.safeParse({ consentId: 'x' }).success).toBe(false);
  });
});
