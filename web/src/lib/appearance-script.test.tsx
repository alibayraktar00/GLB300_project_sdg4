import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  APPEARANCE_STORAGE_KEY,
  appearanceToAttributes,
  COOKIE_NOTICE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  TEXT_SCALES,
  type Appearance,
  type ThemeChoice,
} from './appearance';
import { appearanceScript } from './appearance-script';

/** Satır içi betiği izole bir `<html>` ve sahte `localStorage` ile çalıştırır. */
function run(stored: Record<string, string>) {
  const root = document.createElement('html');
  const fakeWindow = {
    localStorage: { getItem: (key: string) => stored[key] ?? null },
  };
  new Function('window', 'document', appearanceScript)(fakeWindow, { documentElement: root });
  return root;
}

describe('görünüm satır içi betiği (ilk boyamadan önce çalışır)', () => {
  it('hiçbir şey saklanmamışsa hiçbir öznitelik yazmaz', () => {
    expect(run({}).getAttributeNames()).toEqual([]);
  });

  it('TS eşlemesiyle (appearanceToAttributes) 36 birleşimin hepsinde birebir aynı sonucu verir', () => {
    const themes: ThemeChoice[] = ['system', 'light', 'dark'];
    for (const theme of themes) {
      for (const highContrast of [false, true]) {
        for (const textScale of TEXT_SCALES) {
          for (const reduceMotion of [false, true]) {
            const appearance: Appearance = { theme, highContrast, textScale, reduceMotion };
            const root = run({ [APPEARANCE_STORAGE_KEY]: JSON.stringify(appearance) });
            const expected = appearanceToAttributes(appearance);
            const actual = Object.fromEntries(root.getAttributeNames().map((name) => [name, root.getAttribute(name)]));
            expect(actual, JSON.stringify(appearance)).toEqual(expected);
          }
        }
      }
    }
  });

  it('bozuk depo değeri hata vermez ve hiçbir şey yazmaz', () => {
    expect(run({ [APPEARANCE_STORAGE_KEY]: '{bozuk' }).getAttributeNames()).toEqual([]);
    expect(run({ [APPEARANCE_STORAGE_KEY]: JSON.stringify(DEFAULT_APPEARANCE) }).getAttributeNames()).toEqual([]);
  });

  it('çerez notu daha önce kapatıldıysa data-cerez="tamam" yazar', () => {
    expect(run({ [COOKIE_NOTICE_STORAGE_KEY]: '1' }).getAttribute('data-cerez')).toBe('tamam');
    expect(run({}).getAttribute('data-cerez')).toBeNull();
  });

  it('depoya erişim hata verirse (engelli çerez/depo) sessizce geçer', () => {
    const root = document.createElement('html');
    const blocked = {
      get localStorage(): never {
        throw new Error('erişim engellendi');
      },
    };
    expect(() => new Function('window', 'document', appearanceScript)(blocked, { documentElement: root })).not.toThrow();
  });

  it('React betiği bozmadan satır içi yazar (dangerouslySetInnerHTML kullanılmaz)', () => {
    const html = renderToStaticMarkup(<script nonce="abc">{appearanceScript}</script>);
    expect(html).toContain('nonce="abc"');
    // Tırnaklar ve && gibi karakterler kaçışlanmadan, betik olduğu gibi yazılır.
    expect(html).toContain("root.setAttribute('data-theme', value)");
    expect(html).toContain('a.highContrast === true');
    // Betik kapatma etiketi içermez (içine HTML sızdırılamaz).
    expect(appearanceScript).not.toMatch(/<\/script/i);
  });

  it('hiçbir dış adres ve sunucu isteği yok', () => {
    expect(appearanceScript).not.toMatch(/fetch\(|XMLHttpRequest|https?:/);
  });
});
