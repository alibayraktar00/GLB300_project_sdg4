import { describe, expect, it } from 'vitest';

import { guardianSignupSchema, otpSchema, signupFieldErrors } from './signup';

const valid = {
  name: 'Ayşe Yılmaz',
  email: 'veli@example.com',
  password: 'sifre12345',
  readNotice: 'on',
  readTerms: 'on',
};

describe('guardianSignupSchema', () => {
  it('geçerli kayıt kabul edilir', () => {
    expect(guardianSignupSchema.safeParse(valid).success).toBe(true);
  });

  it.each(['Ayşe', "O'Neil", 'Ali-Veli Kaya', 'İpek Çelik'])('geçerli ad: %s', (name) => {
    expect(guardianSignupSchema.safeParse({ ...valid, name }).success).toBe(true);
  });

  it.each(['Ali 0555 123 45 67', 'ali@x.com', 'Ali insta: ali', '', 'a'.repeat(61), ' ', 'Ali  Kaya'])(
    'ad alanına iletişim bilgisi ya da geçersiz ad yazılamaz: %j',
    (name) => {
      expect(guardianSignupSchema.safeParse({ ...valid, name }).success).toBe(false);
    },
  );

  it('kısa şifre ve yalnızca harf ya da yalnızca rakam şifre reddedilir', () => {
    for (const password of ['kisa1', 'sadeceharfler', '1234567890']) {
      const result = guardianSignupSchema.safeParse({ ...valid, password });
      expect(result.success, password).toBe(false);
    }
  });

  it('iki onay da işaretlenmeden devam edilemez ve hata alana bağlanır', () => {
    const result = guardianSignupSchema.safeParse({ ...valid, readNotice: null, readTerms: undefined });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = signupFieldErrors(result.error);
      expect(errors.readNotice).toBe('Devam etmek için metni okuduğunu işaretlemelisin.');
      expect(errors.readTerms).toBe('Devam etmek için metni okuduğunu işaretlemelisin.');
    }
  });
});

describe('otpSchema', () => {
  it('6 haneli kod kabul edilir', () => {
    expect(otpSchema.safeParse({ email: 'veli@example.com', code: ' 123456 ' }).success).toBe(true);
  });

  it.each(['12345', '1234567', 'abcdef', '12 456', ''])('geçersiz kod: %j', (code) => {
    expect(otpSchema.safeParse({ email: 'veli@example.com', code }).success).toBe(false);
  });
});
