import { describe, expect, it } from 'vitest';

import { childFieldErrors, childSchema } from './child';

const valid = { nickname: 'Mavi Kuş', grade: '6', username: 'MaviKus', password: 'sifre12345', consent: 'verdi' };

describe('childSchema', () => {
  it('geçerli bilgiler kabul edilir; kullanıcı adı küçültülür, sınıf sayıya çevrilir', () => {
    const result = childSchema.safeParse(valid);
    expect(result.success && result.data).toMatchObject({ nickname: 'Mavi Kuş', grade: 6, username: 'mavikus' });
  });

  it.each(['Ali 12', 'ali@x.com', 'Ali insta: ali', '', 'a'.repeat(31), 'Ali  Kaya'])(
    'rumuz: gerçek iletişim bilgisi ya da geçersiz ad reddedilir: %j',
    (nickname) => {
      expect(childSchema.safeParse({ ...valid, nickname }).success).toBe(false);
    },
  );

  it.each(['4', '9', '', 'abc', '6.5'])('sınıf 5-8 dışında reddedilir: %j', (grade) => {
    expect(childSchema.safeParse({ ...valid, grade }).success).toBe(false);
  });

  it.each(['ab', 'çağrı', 'ali kaya', '-ali', 'a'.repeat(31), ''])('geçersiz kullanıcı adı: %j', (username) => {
    expect(childSchema.safeParse({ ...valid, username }).success).toBe(false);
  });

  it('zayıf şifre reddedilir', () => {
    for (const password of ['kisa1', 'sadeceharfler', '1234567890']) {
      expect(childSchema.safeParse({ ...valid, password }).success, password).toBe(false);
    }
  });

  it('açık rıza yalnızca açıkça "verdi" gelirse kabul edilir (önceden seçili değil)', () => {
    for (const consent of [undefined, null, '', 'vermedi', 'on', 'true']) {
      const result = childSchema.safeParse({ ...valid, consent });
      expect(result.success, String(consent)).toBe(false);
      if (!result.success) {
        expect(childFieldErrors(result.error).consent).toBe('Devam etmek için bir seçim yapılmalı.');
      }
    }
  });
});
