import { describe, expect, it } from 'vitest';

import { askSchema, messageSchema, messageForRpcError, PHOTO_PATH_PATTERN, questionFieldErrors } from './questions';

const id1 = '11111111-1111-4111-8111-111111111111';
const id2 = '22222222-2222-4222-8222-222222222222';
const id3 = '33333333-3333-4333-8333-333333333333';
const path = `${id1}/${id2}/${id3}.jpg`;

describe('askSchema', () => {
  it('yalnızca metinli soru kabul edilir', () => {
    expect(askSchema.safeParse({ questionId: id2, subject: 'MAT', body: '  3x + 5 = 20 ', paths: [] }).success).toBe(true);
  });

  it('yalnızca fotoğraflı soru kabul edilir (metinsiz)', () => {
    expect(askSchema.safeParse({ questionId: id2, subject: 'MAT', body: '', paths: [path] }).success).toBe(true);
  });

  it('ne metin ne fotoğraf varsa reddedilir ve hata metne bağlanır', () => {
    const result = askSchema.safeParse({ questionId: id2, subject: 'MAT', body: '   ', paths: [] });
    expect(result.success).toBe(false);
    if (!result.success) expect(questionFieldErrors(result.error).body).toBe('Soru için bir şey yazmalı ya da fotoğraf eklemelisin.');
  });

  it('kapsam dışı ders (Fen) reddedilir', () => {
    expect(askSchema.safeParse({ questionId: id2, subject: 'FEN', body: 'x', paths: [] }).success).toBe(false);
  });

  it('4000 karakterden uzun metin ve 3\'ten fazla fotoğraf reddedilir', () => {
    expect(askSchema.safeParse({ questionId: id2, subject: 'MAT', body: 'a'.repeat(4001), paths: [] }).success).toBe(false);
    expect(askSchema.safeParse({ questionId: id2, subject: 'MAT', body: 'x', paths: [path, path, path, path] }).success).toBe(false);
  });

  it.each(['', 'abc', '../../etc/passwd', `${id1}/${id2}/${id3}.png`, `${id2}/${id3}.jpg`, `${path}/../x`, `${path}?x=1`])(
    'geçersiz fotoğraf yolu reddedilir: %j',
    (bad) => {
      expect(askSchema.safeParse({ questionId: id2, subject: 'MAT', body: 'x', paths: [bad] }).success).toBe(false);
    },
  );

  it('geçersiz soru kimliği reddedilir', () => {
    expect(askSchema.safeParse({ questionId: 'x', subject: 'MAT', body: 'x', paths: [] }).success).toBe(false);
  });
});

describe('messageSchema', () => {
  it('takip / cevap metni kabul edilir; boş reddedilir', () => {
    expect(messageSchema.safeParse({ questionId: id2, body: 'Neden 15?', paths: [] }).success).toBe(true);
    expect(messageSchema.safeParse({ questionId: id2, body: '', paths: [] }).success).toBe(false);
  });
});

describe('PHOTO_PATH_PATTERN', () => {
  it('yalnızca tam biçimi kabul eder', () => {
    expect(PHOTO_PATH_PATTERN.test(path)).toBe(true);
    expect(PHOTO_PATH_PATTERN.test(`x${path}`)).toBe(false);
  });
});

describe('messageForRpcError', () => {
  it('bilinen RPC kodunu Türkçe metne çevirir', () => {
    expect(messageForRpcError('GUNLUK_SINIR: 24 saatte en çok 20 soru sorulabilir')).toBe('Bugün çok soru sordun. Yarın yeniden sorabilirsin.');
  });

  it.each([undefined, '', 'bilinmeyen_hata: x', 'permission denied for function'])('bilinmeyen hata genel mesaj olur ve ham metin sızmaz: %j', (raw) => {
    const text = messageForRpcError(raw);
    expect(text).toContain('Şu anda yapılamıyor');
    expect(text).not.toContain('permission');
  });
});
