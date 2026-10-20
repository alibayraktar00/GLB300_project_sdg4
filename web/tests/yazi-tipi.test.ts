import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { brotliDecompressSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

/**
 * Yazı tipi dosyalarının doğrulaması (docs/tasarim-sistemi.md 4.1, plan 11.4):
 *   - Atkinson Hyperlegible Next, WOFF2, kendi sunucumuzdan; 3 ağırlığın toplamı <= 120 KB;
 *   - Türkçe harflerin tamamı (ğ Ğ ı İ ş Ş ç Ç ö Ö ü Ü â î û) yazı tipinde var;
 *   - OFL lisans metni yanında duruyor; yalnızca Regular önceden yükleniyor.
 *
 * Aşağıdaki küçük WOFF2 okuyucusu yalnızca `cmap` tablosunu çıkarır (hangi karakterlerin glifi var?).
 */

const FONT_DIR = join(process.cwd(), 'assets', 'fonts');
const WEIGHTS = ['Regular', 'SemiBold', 'Bold'] as const;
const file = (weight: string) => join(FONT_DIR, `AtkinsonHyperlegibleNext-${weight}.woff2`);

const KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca', 'prep', 'CFF ',
  'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS',
  'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc',
  'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop',
  'trak', 'Zapf', 'Silf', 'Glat', 'Gloc', 'Feat', 'Sill',
];

function readBase128(buffer: Buffer, state: { offset: number }): number {
  let value = 0;
  for (let i = 0; i < 5; i += 1) {
    const byte = buffer[state.offset++] ?? 0;
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) return value;
  }
  throw new Error('Geçersiz UIntBase128');
}

/** WOFF2 dosyasındaki `cmap` tablosunu ham baytlar olarak döndürür. */
function extractCmap(buffer: Buffer): Buffer {
  if (buffer.toString('latin1', 0, 4) !== 'wOF2') throw new Error('WOFF2 değil');
  const numTables = buffer.readUInt16BE(12);
  const totalCompressedSize = buffer.readUInt32BE(20);

  const state = { offset: 48 };
  const tables: Array<{ tag: string; size: number }> = [];
  for (let i = 0; i < numTables; i += 1) {
    const flags = buffer[state.offset++] ?? 0;
    const tagIndex = flags & 0x3f;
    let tag: string;
    if (tagIndex === 0x3f) {
      tag = buffer.toString('latin1', state.offset, state.offset + 4);
      state.offset += 4;
    } else {
      tag = KNOWN_TAGS[tagIndex] ?? '????';
    }
    const version = (flags >> 6) & 3;
    const origLength = readBase128(buffer, state);
    // glyf ve loca için sürüm 0 "dönüştürülmüş"; diğer tablolarda sürüm 0 "dönüştürülmemiş" demektir.
    const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : version !== 0;
    const size = transformed ? readBase128(buffer, state) : origLength;
    tables.push({ tag, size });
  }

  const data = brotliDecompressSync(buffer.subarray(state.offset, state.offset + totalCompressedSize));
  let position = 0;
  for (const table of tables) {
    if (table.tag === 'cmap') return data.subarray(position, position + table.size);
    position += table.size;
  }
  throw new Error('cmap tablosu bulunamadı');
}

/** `cmap` içinden (Unicode, biçim 4 ya da 12) glifi olan kod noktalarını toplar. */
function coveredCodePoints(cmap: Buffer): Set<number> {
  const covered = new Set<number>();
  const numTables = cmap.readUInt16BE(2);
  for (let i = 0; i < numTables; i += 1) {
    const record = 4 + i * 8;
    const platform = cmap.readUInt16BE(record);
    const encoding = cmap.readUInt16BE(record + 2);
    const offset = cmap.readUInt32BE(record + 4);
    const isUnicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!isUnicode) continue;

    const format = cmap.readUInt16BE(offset);
    if (format === 4) {
      const segCount = cmap.readUInt16BE(offset + 6) / 2;
      const endBase = offset + 14;
      const startBase = endBase + segCount * 2 + 2;
      const deltaBase = startBase + segCount * 2;
      const rangeBase = deltaBase + segCount * 2;
      for (let s = 0; s < segCount; s += 1) {
        const end = cmap.readUInt16BE(endBase + s * 2);
        const start = cmap.readUInt16BE(startBase + s * 2);
        const delta = cmap.readInt16BE(deltaBase + s * 2);
        const rangeOffset = cmap.readUInt16BE(rangeBase + s * 2);
        for (let code = start; code <= end && code !== 0xffff; code += 1) {
          let glyph: number;
          if (rangeOffset === 0) glyph = (code + delta) & 0xffff;
          else {
            const at = rangeBase + s * 2 + rangeOffset + (code - start) * 2;
            const raw = cmap.readUInt16BE(at);
            glyph = raw === 0 ? 0 : (raw + delta) & 0xffff;
          }
          if (glyph !== 0) covered.add(code);
        }
      }
    } else if (format === 12) {
      const groups = cmap.readUInt32BE(offset + 12);
      for (let g = 0; g < groups; g += 1) {
        const base = offset + 16 + g * 12;
        const start = cmap.readUInt32BE(base);
        const end = cmap.readUInt32BE(base + 4);
        const startGlyph = cmap.readUInt32BE(base + 8);
        for (let code = start; code <= end; code += 1) if (startGlyph + (code - start) !== 0) covered.add(code);
      }
    }
  }
  return covered;
}

/** Türkçe metin için zorunlu karakterler. `₺` (U+20BA) yazı tipinde YOK; uygulama ücretsiz olduğundan kullanılmaz. */
const REQUIRED = 'ğĞıİşŞçÇöÖüÜâÂîÎûÛ' + 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ' + '0123456789' + '.,:;?-–—…‘’“”«»()/%+−×÷=<>';

describe('yazı tipi dosyaları', () => {
  it('üç ağırlık (400, 600, 700) WOFF2 olarak vardır ve toplamı <= 120 KB', () => {
    const sizes = WEIGHTS.map((weight) => statSync(file(weight)).size);
    const total = sizes.reduce((sum, size) => sum + size, 0);
    expect(total, `toplam ${total} bayt`).toBeLessThanOrEqual(120 * 1024);
    for (const size of sizes) expect(size).toBeGreaterThan(5_000);
  });

  it('klasörde başka yazı tipi dosyası yok (yalnızca üç WOFF2 + lisans + açıklama)', () => {
    const names = readdirSync(FONT_DIR).sort();
    expect(names).toEqual(
      [...WEIGHTS.map((weight) => `AtkinsonHyperlegibleNext-${weight}.woff2`), 'OFL.txt', 'README.md'].sort(),
    );
  });

  for (const weight of WEIGHTS) {
    it(`${weight}: Türkçe harflerin, rakamların ve noktalamanın tamamı var`, () => {
      const covered = coveredCodePoints(extractCmap(readFileSync(file(weight))));
      const missing = [...REQUIRED].filter((char) => !covered.has(char.codePointAt(0) ?? 0));
      expect(missing, `eksik karakterler: ${missing.join(' ')}`).toEqual([]);
    });
  }

  it('kanarya: okuyucu eksik karakteri de bulur (₺ yazı tipinde yoktur)', () => {
    // Bu test geçmezse yukarıdaki "eksik yok" sonuçlarına güvenilmez (okuyucu her şeyi "var" diyor olabilir).
    const covered = coveredCodePoints(extractCmap(readFileSync(file('Regular'))));
    expect(covered.has(0x20ba)).toBe(false);
    expect(covered.has(0x011f)).toBe(true); // ğ
    expect(covered.size).toBeGreaterThan(300);
  });

  it('OFL lisans metni yazı tipinin yanındadır', () => {
    const license = readFileSync(join(FONT_DIR, 'OFL.txt'), 'utf8');
    expect(license).toContain('SIL OPEN FONT LICENSE Version 1.1');
    expect(license).toContain('Atkinson Hyperlegible Next Project Authors');
  });

  it('yalnızca Regular önceden yüklenir (preload), diğer ağırlıklar kullanılınca iner', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'app', 'fonts.ts'), 'utf8');
    expect(source.match(/preload:\s*true/g)).toHaveLength(1);
    expect(source.match(/preload:\s*false/g)).toHaveLength(1);
    expect(source).toContain("display: 'swap'");
    expect(source).not.toMatch(/next\/font\/google/);
  });
});
