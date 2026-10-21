import { describe, expect, it } from 'vitest';

import {
  emailLoginSchema,
  fieldErrors,
  homePathFor,
  landingPath,
  normalizeUsername,
  safeNextPath,
  studentEmail,
  studentLoginSchema,
} from './auth';

describe('studentEmail', () => {
  it('kullanıcı adını sentetik Auth e-postasına çevirir (büyük harf ve boşluk sadeleşir)', () => {
    expect(studentEmail('  MaviKus ')).toBe('mavikus@ogrenci.ornek.test');
  });

  it('Türkçe büyük İ doğru küçülür', () => {
    expect(normalizeUsername('İPEK')).toBe('ipek');
  });

  it.each(['', 'ab', 'a b c', 'ali@x.com', '-ali', 'a'.repeat(31), 'ça ğ'])('geçersiz ad reddedilir: %j', (name) => {
    expect(studentEmail(name)).toBeNull();
  });
});

describe('giriş şemaları', () => {
  it('geçerli e-posta girişi kabul edilir; işaretsiz "açık kalsın" false olur', () => {
    const result = emailLoginSchema.safeParse({ email: ' veli@example.com ', password: 'x', remember: null });
    expect(result.success && result.data).toEqual({ email: 'veli@example.com', password: 'x', remember: false });
  });

  it('işaretli "açık kalsın" true olur', () => {
    const result = studentLoginSchema.safeParse({ username: 'mavikus', password: 'x', remember: 'on' });
    expect(result.success && result.data.remember).toBe(true);
  });

  it('hatalar alan başına Türkçe mesaj verir ve şifre kuralı dayatılmaz', () => {
    const result = emailLoginSchema.safeParse({ email: 'yanlis', password: '', remember: null });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(errors.email).toBe('E-posta adresi geçerli görünmüyor.');
      expect(errors.password).toBe('Şifre yazılmalı.');
    }
  });
});

describe('safeNextPath (açık yönlendirme koruması)', () => {
  it.each(['/ogrenci/bugun', '/veli/panel?x=1'])('kabul: %s', (path) => {
    expect(safeNextPath(path)).toBe(path);
  });

  it.each([
    'https://evil.example',
    '//evil.example',
    '/' + String.fromCharCode(92) + 'evil.example',
    'ogrenci/bugun',
    '/a\nb',
    '',
    null,
    undefined,
    `/${'a'.repeat(250)}`,
  ])('red: %j', (path) => {
    expect(safeNextPath(path)).toBeNull();
  });
});

describe('landingPath', () => {
  it('rolün kendi alanındaki adres korunur', () => {
    expect(landingPath('ogrenci', '/ogrenci/plan')).toBe('/ogrenci/plan');
  });

  it('başka rolün alanındaki ya da güvensiz adres yok sayılır', () => {
    expect(landingPath('ogrenci', '/yonetici/denetim')).toBe(homePathFor('ogrenci'));
    expect(landingPath('veli', 'https://evil.example')).toBe('/veli/panel');
  });

  it('öneksiz benzer adres (/ogrencix) kabul edilmez', () => {
    expect(landingPath('ogrenci', '/ogrencix/bugun')).toBe('/ogrenci/bugun');
  });
});
