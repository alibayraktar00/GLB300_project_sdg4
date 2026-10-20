import { describe, expect, it } from 'vitest';

import { contrastRatio, luminance, parseHex } from './contrast';

describe('WCAG kontrast oranı', () => {
  it('siyah/beyaz 21:1, aynı renk 1:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#336699', '#336699')).toBeCloseTo(1, 5);
  });

  it('bilinen sınır değeri: #767676 beyaz üzerinde 4.54:1 (AA geçer), #777777 geçmez', () => {
    expect(contrastRatio('#767676', '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(4.5);
  });

  it('sıra önemli değil', () => {
    expect(contrastRatio('#1f2230', '#fbf8f3')).toBeCloseTo(contrastRatio('#fbf8f3', '#1f2230'), 10);
  });

  it('#rgb kısa yazımı ve büyük harf kabul edilir; geçersiz renk hata verir', () => {
    expect(parseHex('#FFF')).toEqual([255, 255, 255]);
    expect(luminance('#000')).toBe(0);
    expect(() => parseHex('kırmızı')).toThrow();
  });
});
