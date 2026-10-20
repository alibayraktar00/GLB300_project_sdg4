import { describe, expect, it } from 'vitest';

import { lowerAscii, lowerTr, upperTr } from './turkish';

describe('Türkçe büyük/küçük harf', () => {
  it('noktalı ve noktasız i harflerini doğru büyütür', () => {
    expect(upperTr('ışık')).toBe('IŞIK');
    expect(upperTr('iğne')).toBe('İĞNE');
  });

  it('noktalı ve noktasız i harflerini doğru küçültür', () => {
    expect(lowerTr('IŞIK')).toBe('ışık');
    expect(lowerTr('İĞNE')).toBe('iğne');
  });

  it('lowerAscii yalnızca A-Z harflerini küçültür', () => {
    expect(lowerAscii('Ogrenci@Okul.EDU.TR')).toBe('ogrenci@okul.edu.tr');
    expect(lowerAscii('IMAGE/JPEG')).toBe('image/jpeg');
    expect(lowerAscii('İ')).toBe('İ');
  });
});
