import { describe, expect, it } from 'vitest';

import { istanbulToIso, messageForSessionError, parseSessions, scheduleFieldErrors, scheduleSchema } from './sessions';

const id = '11111111-1111-4111-8111-111111111111';
const valid = { matchId: id, date: '2026-11-05', time: '17:30', duration: '30', url: 'https://meet.google.com/abc-defg-hij' };

describe('istanbulToIso', () => {
  it('İstanbul saatini UTC anına çevirir (UTC+3)', () => {
    expect(istanbulToIso('2026-11-05', '17:30')).toBe('2026-11-05T14:30:00.000Z');
  });
  it.each([['', ''], ['2026-13-40', '10:00'], ['2026-11-05', '25:00'], ['x', 'y']])('geçersiz girdi null: %j %j', (d, t) => {
    expect(istanbulToIso(d, t)).toBeNull();
  });
});

describe('scheduleSchema', () => {
  it('geçerli girdiyi kabul eder ve süreyi sayıya çevirir', () => {
    const result = scheduleSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.duration).toBe(30);
  });
  it('desteklenmeyen süre ve boş bağlantı reddedilir', () => {
    expect(scheduleSchema.safeParse({ ...valid, duration: '25' }).success).toBe(false);
    const bad = scheduleSchema.safeParse({ ...valid, url: '  ' });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(scheduleFieldErrors(bad.error).url).toBe('Meet ya da Zoom bağlantısı gerekli.');
  });
  it('gün ve saat eksikse alana bağlanır', () => {
    const bad = scheduleSchema.safeParse({ ...valid, date: '', time: '' });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(Object.keys(scheduleFieldErrors(bad.error))).toEqual(['date', 'time']);
  });
});

describe('messageForSessionError', () => {
  it('bilinen kodu çevirir', () => {
    expect(messageForSessionError('CAKISMA: bu saatte başka bir ders var')).toBe('Bu saatte başka bir ders var.');
  });
  it.each([undefined, '', 'permission denied', 'BILINMEYEN: x'])('bilinmeyen hata genel mesaj olur: %j', (raw) => {
    expect(messageForSessionError(raw)).toContain('Şu anda yapılamıyor');
  });
});

describe('parseSessions', () => {
  it('geçerli satırı çevirir, bozuk satırı atlar', () => {
    const rows = [
      { id, starts_at: '2026-11-05T14:30:00Z', duration_min: 30, status: 'planlandi', meeting_url: 'https://zoom.us/j/123', matches: { subjects: { name: 'Matematik' } } },
      { id: 'x' },
    ];
    expect(parseSessions(rows)).toEqual([
      { id, startsAt: '2026-11-05T14:30:00Z', durationMin: 30, status: 'planlandi', meetingUrl: 'https://zoom.us/j/123', subject: 'Matematik' },
    ]);
  });
  it('dizi değilse boş döner', () => {
    expect(parseSessions(null)).toEqual([]);
  });
});
