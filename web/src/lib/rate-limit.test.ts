import { describe, expect, it } from 'vitest';

import { createRateLimiter } from './rate-limit';

describe('createRateLimiter', () => {
  it('sınıra kadar izin verir, sonra reddeder, pencere dolunca sıfırlar', () => {
    const limiter = createRateLimiter(2, 1000);
    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('a', 10)).toBe(true);
    expect(limiter.allow('a', 20)).toBe(false);
    expect(limiter.allow('a', 1001)).toBe(true);
  });

  it('anahtarlar birbirinden bağımsızdır', () => {
    const limiter = createRateLimiter(1, 1000);
    expect(limiter.allow('a', 0)).toBe(true);
    expect(limiter.allow('b', 0)).toBe(true);
    expect(limiter.allow('a', 1)).toBe(false);
  });

  it('çok sayıda anahtarda bellek sınırlı kalır ve çökmez', () => {
    const limiter = createRateLimiter(1, 60_000);
    for (let i = 0; i < 6000; i += 1) expect(limiter.allow(`k${i}`, 0)).toBe(true);
  });
});
