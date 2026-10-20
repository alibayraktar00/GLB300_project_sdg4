import { describe, expect, it } from 'vitest';

import {
  APPEARANCE_STORAGE_KEY,
  applyAppearance,
  appearanceToAttributes,
  DEFAULT_APPEARANCE,
  isDefaultAppearance,
  parseStoredAppearance,
  readAppearance,
  saveAppearance,
  type Appearance,
  type KeyValueStorage,
} from './appearance';

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

describe('görünüm tercihleri', () => {
  it('varsayılan: hiçbir öznitelik yazılmaz (sistem ayarı geçerli)', () => {
    expect(appearanceToAttributes(DEFAULT_APPEARANCE)).toEqual({});
    expect(isDefaultAppearance(DEFAULT_APPEARANCE)).toBe(true);
  });

  it('tema ve yüksek kontrast birleşimi data-theme değerine eşlenir', () => {
    const attr = (patch: Partial<Appearance>) =>
      appearanceToAttributes({ ...DEFAULT_APPEARANCE, ...patch })['data-theme'];
    expect(attr({ theme: 'light' })).toBe('light');
    expect(attr({ theme: 'dark' })).toBe('dark');
    expect(attr({ highContrast: true })).toBe('hc');
    expect(attr({ theme: 'light', highContrast: true })).toBe('hc-light');
    expect(attr({ theme: 'dark', highContrast: true })).toBe('hc-dark');
  });

  it('yazı boyutu kademeleri ve animasyon azaltma', () => {
    expect(appearanceToAttributes({ ...DEFAULT_APPEARANCE, textScale: 1.15 })['data-text-scale']).toBe('1.15');
    expect(appearanceToAttributes({ ...DEFAULT_APPEARANCE, textScale: 1.3 })['data-text-scale']).toBe('1.3');
    expect(appearanceToAttributes({ ...DEFAULT_APPEARANCE, reduceMotion: true })['data-motion']).toBe('reduce');
  });

  it('bozuk ya da yabancı depo değeri varsayılana düşer', () => {
    expect(parseStoredAppearance(null)).toBeNull();
    expect(parseStoredAppearance('{bozuk')).toBeNull();
    expect(parseStoredAppearance('42')).toBeNull();
    expect(parseStoredAppearance(JSON.stringify({ theme: 'mor', textScale: 9, highContrast: 'evet' }))).toEqual(
      DEFAULT_APPEARANCE,
    );
  });

  it('YALNIZCA kullanıcı değiştirince yazılır: okumak hiçbir şey yazmaz', () => {
    const storage = memoryStorage();
    expect(readAppearance(storage)).toEqual(DEFAULT_APPEARANCE);
    expect(storage.data).toEqual({});
  });

  it('değişiklik yazılır; varsayılana dönünce anahtar silinir (cihazda iz kalmaz)', () => {
    const storage = memoryStorage();
    saveAppearance(storage, { ...DEFAULT_APPEARANCE, theme: 'dark' });
    expect(Object.keys(storage.data)).toEqual([APPEARANCE_STORAGE_KEY]);
    expect(readAppearance(storage).theme).toBe('dark');

    saveAppearance(storage, DEFAULT_APPEARANCE);
    expect(storage.data).toEqual({});
  });

  it('depo hata verse bile (özel gezinti, kota) çökmez', () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error('erişim yok');
      },
      setItem: () => {
        throw new Error('kota');
      },
      removeItem: () => {
        throw new Error('erişim yok');
      },
    };
    expect(readAppearance(broken)).toEqual(DEFAULT_APPEARANCE);
    expect(() => saveAppearance(broken, { ...DEFAULT_APPEARANCE, theme: 'dark' })).not.toThrow();
  });

  it('applyAppearance öznitelikleri yazar ve olmayanları kaldırır', () => {
    const root = document.createElement('html');
    applyAppearance(root, { theme: 'dark', highContrast: true, textScale: 1.3, reduceMotion: true });
    expect(root.getAttribute('data-theme')).toBe('hc-dark');
    expect(root.getAttribute('data-text-scale')).toBe('1.3');
    expect(root.getAttribute('data-motion')).toBe('reduce');

    applyAppearance(root, DEFAULT_APPEARANCE);
    expect(root.getAttributeNames()).toEqual([]);
  });
});
