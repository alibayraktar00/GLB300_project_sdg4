import { describe, expect, it } from 'vitest';

import { parseNotices, safeNoticePath } from './notices-data';

const id = '11111111-1111-4111-8111-111111111111';

describe('safeNoticePath', () => {
  it.each(['/ogrenci/dersler', '/veli/dersler', '/gonullu/ogrenciler', `/ogrenci/sorular/${id}`, `/veli/sorular/${id}`, '/yonetici/sikayetler'])(
    'izinli yol geçer: %s',
    (path) => {
      expect(safeNoticePath(path)).toBe(path);
    },
  );

  it.each(['https://evil.com', '//evil.com', '/ogrenci/sorular/abc', `/ogrenci/sorular/${id}/x`, '/yonetici/kullanicilar', '/admin', 'javascript:alert(1)', '', null, 42])(
    'izinsiz yol null olur: %s',
    (path) => {
      expect(safeNoticePath(path)).toBeNull();
    },
  );
});

describe('parseNotices', () => {
  it('okunmamışı işaretler, yolu doğrular, bozuk satırı atlar', () => {
    const items = parseNotices([
      { id: 'a', title: 'Sorun cevaplandı', read_at: null, created_at: 'd', data: { path: `/ogrenci/sorular/${id}` } },
      { id: 'b', title: 'Eski', read_at: 'x', created_at: 'd', data: { path: 'https://evil.com' } },
      { nope: 1 },
    ]);
    expect(items).toEqual([
      { id: 'a', title: 'Sorun cevaplandı', unread: true, createdAt: 'd', path: `/ogrenci/sorular/${id}` },
      { id: 'b', title: 'Eski', unread: false, createdAt: 'd', path: null },
    ]);
    expect(parseNotices(null)).toEqual([]);
  });
});
