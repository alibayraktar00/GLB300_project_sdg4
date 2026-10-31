import { describe, expect, it } from 'vitest';

import { blockSchema, handleReportSchema, reportSchema, safeBlockReturn, safeThreadPath } from './safety';

const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';

describe('blockSchema / reportSchema', () => {
  it('geçerli girdiyi kabul eder', () => {
    expect(blockSchema.safeParse({ studentId: a, volunteerId: b, reason: 'rahatsiz_edici' }).success).toBe(true);
    expect(reportSchema.safeParse({ messageId: a, category: 'taciz_zorbalik' }).success).toBe(true);
  });
  it('listede olmayan neden/tür ve bozuk kimlik reddedilir', () => {
    expect(blockSchema.safeParse({ studentId: a, volunteerId: b, reason: 'serbest metin' }).success).toBe(false);
    expect(blockSchema.safeParse({ studentId: 'x', volunteerId: b, reason: 'diger' }).success).toBe(false);
    expect(reportSchema.safeParse({ messageId: a, category: 'baska' }).success).toBe(false);
  });
});

describe('handleReportSchema', () => {
  it('yalnızca inceleniyor/kapandı; not 1000 karakteri geçemez', () => {
    expect(handleReportSchema.safeParse({ reportId: a, status: 'kapandi', note: ' tamam ' }).data?.note).toBe('tamam');
    expect(handleReportSchema.safeParse({ reportId: a, status: 'yeni' }).success).toBe(false);
    expect(handleReportSchema.safeParse({ reportId: a, status: 'kapandi', note: 'x'.repeat(1001) }).success).toBe(false);
  });
});

describe('geri dönüş adresleri', () => {
  it('yalnızca soru sayfası ve izinli liste kabul edilir', () => {
    expect(safeThreadPath(`/ogrenci/sorular/${a}`)).toBe(`/ogrenci/sorular/${a}`);
    for (const bad of ['https://evil.com', '//evil.com', `/ogrenci/sorular/${a}/x`, '/yonetici/basvurular', '/ogrenci/sorular/abc']) {
      expect(safeThreadPath(bad)).toBeNull();
    }
    expect(safeBlockReturn('/veli/dersler')).toBe('/veli/dersler');
    expect(safeBlockReturn('https://evil.com')).toBe('/uygulama');
  });
});
