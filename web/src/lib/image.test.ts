import { describe, expect, it } from 'vitest';

import { fitWithin, MAX_EDGE, TARGET_BYTES } from './image';
import { MAX_PHOTO_BYTES } from './jpeg';

describe('fitWithin', () => {
  it('büyük yatay görüntüyü oranı koruyarak küçültür', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it('büyük dikey görüntüyü küçültür', () => {
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('küçük görüntüyü büyütmez', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it('çok ince görüntüde kenar en az 1 piksel kalır', () => {
    expect(fitWithin(10000, 1, 1600)).toEqual({ width: 1600, height: 1 });
  });

  it.each([[0, 10], [10, 0], [-5, 10], [Number.NaN, 10]])('geçersiz boyut (%s, %s) sıfır döner', (w, h) => {
    expect(fitWithin(w, h, 1600)).toEqual({ width: 0, height: 0 });
  });
});

describe('sabitler', () => {
  it('istemci hedefi sunucu sınırının altında pay bırakır', () => {
    expect(TARGET_BYTES).toBeLessThan(MAX_PHOTO_BYTES);
    expect(MAX_EDGE).toBeGreaterThan(0);
  });
});
