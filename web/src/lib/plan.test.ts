import { describe, expect, it } from 'vitest';

import { dayNumber, formatShortDate, planFieldErrors, planSchema } from './plan';

const valid = { grade: '6', subjects: ['MAT', 'FEN'], start: '2026-10-05', end: '2026-11-02', dailyGoal: '2' };

describe('dayNumber', () => {
  it('geçerli tarihi gün sayısına çevirir; ardışık günler 1 fark eder', () => {
    const a = dayNumber('2026-10-05');
    const b = dayNumber('2026-10-06');
    expect(a).not.toBeNull();
    expect((b as number) - (a as number)).toBe(1);
  });

  it.each(['', '2026-02-30', '2026-13-01', '26-10-05', '2026/10/05', 'abc', '2026-10-5'])('geçersiz: %j', (value) => {
    expect(dayNumber(value)).toBeNull();
  });

  it('artık yıl: 29 Şubat 2028 geçerli, 29 Şubat 2027 geçersiz', () => {
    expect(dayNumber('2028-02-29')).not.toBeNull();
    expect(dayNumber('2027-02-29')).toBeNull();
  });
});

describe('planSchema', () => {
  it('geçerli plan kabul edilir; sayılar dönüşür, tekrarlı dersler teklenir', () => {
    const result = planSchema.safeParse({ ...valid, subjects: ['MAT', 'MAT'] });
    expect(result.success && result.data).toMatchObject({ grade: 6, subjects: ['MAT'], dailyGoal: 2 });
  });

  it('bir günlük aralık (başlangıç = bitiş) geçerlidir', () => {
    expect(planSchema.safeParse({ ...valid, start: '2026-10-05', end: '2026-10-05' }).success).toBe(true);
  });

  it('bitiş başlangıçtan önceyse bitiş alanına hata verir', () => {
    const result = planSchema.safeParse({ ...valid, start: '2026-11-02', end: '2026-10-05' });
    expect(result.success).toBe(false);
    if (!result.success) expect(planFieldErrors(result.error).end).toBe('Bitiş tarihi başlangıçtan önce olamaz.');
  });

  it('öğretim yılı başlamadan önceki tarih reddedilir', () => {
    const result = planSchema.safeParse({ ...valid, start: '2026-08-31' });
    expect(result.success).toBe(false);
    if (!result.success) expect(planFieldErrors(result.error).start).toBe('Tarih 1 Eylül 2026 ya da sonrası olmalı.');
  });

  it('bir yıldan uzun aralık reddedilir', () => {
    const result = planSchema.safeParse({ ...valid, start: '2026-09-01', end: '2027-09-05' });
    expect(result.success).toBe(false);
    if (!result.success) expect(planFieldErrors(result.error).end).toBe('Tarih aralığı en çok bir yıl olabilir.');
  });

  it.each(['4', '9', '', 'x', '6.5'])('sınıf 5-8 dışında reddedilir: %j', (grade) => {
    expect(planSchema.safeParse({ ...valid, grade }).success).toBe(false);
  });

  it('ders seçilmediyse ya da bilinmeyen ders varsa reddedilir', () => {
    expect(planSchema.safeParse({ ...valid, subjects: [] }).success).toBe(false);
    expect(planSchema.safeParse({ ...valid, subjects: ['TAR'] }).success).toBe(false);
  });

  it.each(['0', '4', '', 'x'])('günlük konu sayısı 1-3 dışında reddedilir: %j', (dailyGoal) => {
    expect(planSchema.safeParse({ ...valid, dailyGoal }).success).toBe(false);
  });

  it('geçersiz takvim tarihi (30 Şubat) reddedilir', () => {
    expect(planSchema.safeParse({ ...valid, start: '2027-02-30', end: '2027-03-05' }).success).toBe(false);
  });
});

describe('formatShortDate', () => {
  it('kısa Türkçe biçim üretir', () => {
    expect(formatShortDate('2026-09-07')).toBe('7 Eyl 2026');
    expect(formatShortDate('2026-12-31')).toBe('31 Ara 2026');
  });

  it('geçersiz tarihte boş dize döner', () => {
    expect(formatShortDate('2026-02-30')).toBe('');
  });
});
