import { describe, expect, it } from 'vitest';

import { isEduTrEmail, volunteerFieldErrors, volunteerProfileSchema, volunteerSignupSchema } from './volunteer';

const valid = {
  givenName: 'Ayşe',
  familyName: 'Kaya',
  email: 'ayse@ogr.ankara.edu.tr',
  password: 'sifre12345',
  university: 'Ankara Üniversitesi',
  department: 'Matematik Öğretmenliği',
  classYear: '3',
  readNotice: 'on',
  readTerms: 'on',
};

describe('isEduTrEmail', () => {
  it.each(['ayse@ogr.ankara.edu.tr', 'ali@itu.edu.tr', ' AYSE@METU.EDU.TR '])('kabul: %s', (email) => {
    expect(isEduTrEmail(email)).toBe(true);
  });

  it.each(['ali@gmail.com', 'ali@edu.tr.example.com', 'ali@fakeedu.tr', 'ali@edu.tr', 'ali@x.edu.tr.', 'edu.tr'])(
    'red: %s',
    (email) => {
      expect(isEduTrEmail(email)).toBe(false);
    },
  );
});

describe('volunteerSignupSchema', () => {
  it('geçerli başvuru kabul edilir; boş bölüm null olur', () => {
    const result = volunteerSignupSchema.safeParse({ ...valid, department: '' });
    expect(result.success && result.data).toMatchObject({ classYear: 3, department: null });
  });

  it('edu.tr olmayan e-posta alan hatası verir', () => {
    const result = volunteerSignupSchema.safeParse({ ...valid, email: 'ayse@gmail.com' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(volunteerFieldErrors(result.error).email).toBe(
        'Gönüllü olmak için edu.tr uzantılı üniversite e-postası gerekli.',
      );
    }
  });

  it.each([
    ['givenName', 'Ali 0555'],
    ['givenName', 'ali@x.com'],
    ['familyName', 'Kaya insta: ali'],
    ['university', 'Ankara 1. Üniversite'],
    ['department', 'Matematik tel: 555'],
  ])('%s alanına iletişim bilgisi yazılamaz: %j', (field, value) => {
    expect(volunteerSignupSchema.safeParse({ ...valid, [field]: value }).success).toBe(false);
  });

  it.each(['0', '7', '', 'x'])('sınıf 1-6 dışında reddedilir: %j', (classYear) => {
    expect(volunteerSignupSchema.safeParse({ ...valid, classYear }).success).toBe(false);
  });

  it('iki onay da gerekir', () => {
    expect(volunteerSignupSchema.safeParse({ ...valid, readNotice: undefined }).success).toBe(false);
    expect(volunteerSignupSchema.safeParse({ ...valid, readTerms: null }).success).toBe(false);
  });
});

describe('volunteerProfileSchema (e-posta doğrulandıktan sonra yeniden doğrulama)', () => {
  it('yalnızca profil alanlarını doğrular', () => {
    const { givenName, familyName, university, department, classYear } = valid;
    expect(volunteerProfileSchema.safeParse({ givenName, familyName, university, department, classYear }).success).toBe(
      true,
    );
  });

  it('gizli alanlara oynanırsa reddedilir', () => {
    const { familyName, university, department, classYear } = valid;
    expect(
      volunteerProfileSchema.safeParse({ givenName: 'Ali 0555', familyName, university, department, classYear }).success,
    ).toBe(false);
  });
});
