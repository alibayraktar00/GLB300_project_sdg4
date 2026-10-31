import { describe, expect, it } from 'vitest';

import { accountStatusSchema, parseUsers } from './users-data';

describe('parseUsers', () => {
  it('geçerli satırı çevirir, bozuk rol/durumu atlar', () => {
    const users = parseUsers([
      { id: 'a', display_name: 'Ela', role: 'veli', status: 'aktif', created_at: 'd' },
      { id: 'b', display_name: 'X', role: 'root', status: 'aktif', created_at: 'd' },
      { id: 'c', display_name: 'Y', role: 'veli', status: 'silindi', created_at: 'd' },
      { nope: 1 },
    ]);
    expect(users).toEqual([{ id: 'a', name: 'Ela', role: 'veli', status: 'aktif', createdAt: 'd' }]);
    expect(parseUsers(null)).toEqual([]);
  });
});

describe('accountStatusSchema', () => {
  it('yalnızca aktif/askıda ve geçerli kimlik kabul edilir', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    expect(accountStatusSchema.safeParse({ userId: id, status: 'askida' }).success).toBe(true);
    expect(accountStatusSchema.safeParse({ userId: id, status: 'beklemede' }).success).toBe(false);
    expect(accountStatusSchema.safeParse({ userId: 'x', status: 'aktif' }).success).toBe(false);
  });
});
