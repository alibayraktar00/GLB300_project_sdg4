import { describe, expect, it } from 'vitest';

import { messageForSlotError, parseSlots, removeSchema, slotFieldErrors, slotSchema } from './availability';

describe('slotSchema', () => {
  it('geçerli aralığı kabul eder ve günü sayıya çevirir', () => {
    const result = slotSchema.safeParse({ weekday: '3', start: '16:00', end: '17:30' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.weekday).toBe(3);
  });

  it('08:00 öncesi ve 21:00 sonrası reddedilir', () => {
    for (const range of [{ start: '07:30', end: '09:00' }, { start: '20:00', end: '21:30' }]) {
      const result = slotSchema.safeParse({ weekday: '1', ...range });
      expect(result.success).toBe(false);
      if (!result.success) expect(slotFieldErrors(result.error).start).toBe('Saatler 08:00 ile 21:00 arasında olmalı.');
    }
  });

  it('bitiş başlangıçtan sonra olmalı', () => {
    const result = slotSchema.safeParse({ weekday: '1', start: '12:00', end: '12:00' });
    expect(result.success).toBe(false);
    if (!result.success) expect(slotFieldErrors(result.error).end).toBe('Bitiş saati başlangıçtan sonra olmalı.');
  });

  it.each([{ weekday: '0' }, { weekday: '8' }, { weekday: 'x' }, { start: '9:00' }, { end: '25:00' }])('geçersiz alan reddedilir: %j', (patch) => {
    expect(slotSchema.safeParse({ weekday: '2', start: '10:00', end: '11:00', ...patch }).success).toBe(false);
  });
});

describe('parseSlots', () => {
  it('saniyeyi atar, sıralar ve bozuk satırı atlar', () => {
    const slots = parseSlots([
      { id: 'b', weekday: 2, start_time: '10:00:00', end_time: '11:00:00' },
      { id: 'a', weekday: 1, start_time: '15:00:00', end_time: '16:00:00' },
      { id: 'c', weekday: 9, start_time: '10:00:00', end_time: '11:00:00' },
      { nope: 1 },
    ]);
    expect(slots).toEqual([
      { id: 'a', weekday: 1, start: '15:00', end: '16:00' },
      { id: 'b', weekday: 2, start: '10:00', end: '11:00' },
    ]);
    expect(parseSlots(null)).toEqual([]);
  });
});

describe('messageForSlotError / removeSchema', () => {
  it('bilinen kodları çevirir, ham metni göstermez', () => {
    expect(messageForSlotError('23505', 'duplicate key')).toBe('Bu başlangıç saati zaten ekli.');
    expect(messageForSlotError('42501', 'permission denied')).toContain('Şu anda yapılamıyor');
  });
  it('geçersiz kimlik reddedilir', () => {
    expect(removeSchema.safeParse({ slotId: 'x' }).success).toBe(false);
  });
});
