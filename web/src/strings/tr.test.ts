import { describe, expect, it } from 'vitest';

import { tr } from './tr';

/** Metinlerdeki tüm dizeleri düz bir listeye çevirir. */
function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(allStrings);
  return [];
}

describe('Türkçe arayüz metinleri', () => {
  it('ünlem işareti içermez (tasarım kuralı)', () => {
    for (const text of allStrings(tr)) {
      expect(text, `"${text}" ünlem içeriyor`).not.toContain('!');
    }
  });

  it('boş metin yoktur', () => {
    for (const text of allStrings(tr)) expect(text.trim()).not.toBe('');
  });
});
