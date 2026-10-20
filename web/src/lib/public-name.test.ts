import { describe, expect, it } from 'vitest';

import { shortPublicName } from './public-name';

describe('shortPublicName ("Ad S.")', () => {
  it('ad ve soyadın baş harfi', () => {
    expect(shortPublicName('Ayşe Kaya')).toBe('Ayşe K.');
  });

  it('birden fazla ad korunur', () => {
    expect(shortPublicName('Ayşe Nur Kaya')).toBe('Ayşe Nur K.');
  });

  it('Türkçe baş harf: i -> İ, ı -> I', () => {
    expect(shortPublicName('Mehmet iplik')).toBe('Mehmet İ.');
    expect(shortPublicName('Elif ışık')).toBe('Elif I.');
    expect(shortPublicName('Can Özdemir')).toBe('Can Ö.');
  });

  it('tek sözcük ve fazla boşluk', () => {
    expect(shortPublicName('Zeynep')).toBe('Zeynep');
    expect(shortPublicName('  Ali   Veli  ')).toBe('Ali V.');
    expect(shortPublicName('   ')).toBe('');
  });
});
