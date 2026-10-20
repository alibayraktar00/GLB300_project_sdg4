import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

import { tr } from '@/strings/tr';

/**
 * Tasarım sisteminin kod düzeyinde korunan kuralları (Flutter `design_rules_test`'in karşılığı;
 * docs/tasarim-sistemi.md 11). Kural kırılırsa bu testler kırılır.
 */

type Entry = { path: string; text: string };

/** Metin nesnesindeki tüm dizeleri yoluyla birlikte düz listeye çevirir. */
function flatten(value: unknown, path: string[] = []): Entry[] {
  if (typeof value === 'string') return [{ path: path.join('.'), text: value }];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => flatten(child, [...path, key]));
  }
  return [];
}

/** Türkçe-doğru küçük harf (i/İ, ı/I): test dosyalarında da çıplak toLowerCase kullanılmaz. */
const lower = (text: string) => text.toLocaleLowerCase('tr-TR');

/**
 * Yasal metinlerin anahtarları `legal` ile başlar. Bunlar sağlık sözcüğü ve "kabul ediyorum" kurallarının bilinçli
 * istisnasıdır (KVKK gereği veli aydınlatması ve AR-1 açık rızası); yalnızca velinin ayrı ekranlarında gösterilir.
 */
const isLegal = (entry: Entry) => entry.path.split('.').some((part) => part.startsWith('legal') && part !== 'legalPlaceholder');

const entries = flatten(tr);

describe('mikro-metin kuralları (src/strings/tr.ts)', () => {
  it('hiçbir metinde ünlem işareti yok', () => {
    const offenders = entries.filter((entry) => entry.text.includes('!'));
    expect(offenders, offenders.map((entry) => entry.path).join(', ')).toEqual([]);
  });

  it('hastalık, engel, tedavi ve sağlık sözcüğü yok (yalnızca legal* anahtarları serbest)', () => {
    const forbidden = /hasta|engelli|sakat|tedavi|teşhis|ameliyat|rahatsızlık|sağlık|özel gereksinim/;
    const offenders = entries.filter((entry) => !isLegal(entry) && forbidden.test(lower(entry.text)));
    expect(offenders, offenders.map((entry) => `${entry.path}: ${entry.text}`).join('\n')).toEqual([]);
  });

  it('"kabul ediyorum" dili yok (aydınlatma düğmesi "Okudum, anladım" olur)', () => {
    const offenders = entries.filter((entry) => !isLegal(entry) && lower(entry.text).includes('kabul ediyorum'));
    expect(offenders).toEqual([]);
  });

  it('çerez bilgilendirme notunda "Kabul et" yok; tek düğme "Tamam"', () => {
    const notice = flatten(tr.cookieNotice);
    for (const entry of notice) expect(lower(entry.text), entry.path).not.toContain('kabul');
    expect(tr.cookieNotice.ok).toBe('Tamam');
  });

  it('tamamı büyük harf yazı yok', () => {
    const offenders = entries.filter((entry) => {
      const letters = entry.text.replace(/[^A-ZÇĞİÖŞÜa-zçğıöşü]/g, '');
      return letters.length > 3 && letters === letters.toLocaleUpperCase('tr-TR');
    });
    expect(offenders, offenders.map((entry) => entry.text).join(', ')).toEqual([]);
  });

  it('boş metin yok; baş ve son boşluk yok', () => {
    for (const entry of entries) {
      expect(entry.text.trim(), entry.path).not.toBe('');
      expect(entry.text, entry.path).toBe(entry.text.trim());
    }
  });

  it('baskı ve suçlama dili yok ("borç", "geride kaldın", "yetiştirmelisin")', () => {
    const forbidden = /\bborç|geride kald|yetiştirmelisin|hâlâ yapmadın|hala yapmadin/;
    const offenders = entries.filter((entry) => forbidden.test(lower(entry.text)));
    expect(offenders).toEqual([]);
  });
});

/** `src` altındaki dosyaları (testler hariç) gezer. */
function sourceFiles(dir: string, extensions: string[]): string[] {
  const result: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) result.push(...sourceFiles(full, extensions));
    else if (extensions.some((extension) => name.endsWith(extension)) && !/\.test\.tsx?$/.test(name)) result.push(full);
  }
  return result;
}

const SRC = join(process.cwd(), 'src');
const read = (file: string) => readFileSync(file, 'utf8');
const rel = (file: string) => relative(process.cwd(), file).replaceAll('\\', '/');

describe('kod kuralları', () => {
  it('bileşenlerde ve sayfalarda satır içi style özniteliği yok (CSP style-src-attr kapanabilsin)', () => {
    const offenders = sourceFiles(SRC, ['.tsx']).filter((file) => /\sstyle=\{\{|\sstyle="/.test(read(file)));
    expect(offenders.map(rel)).toEqual([]);
  });

  it('dış adres yok: CSS ve kodda http(s) kaynağı, @import url ya da dış yazı tipi çağrısı bulunmaz', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC, ['.css', '.tsx', '.ts'])) {
      // İkon dosyası ve lisans notu kaynak adresini yorum olarak taşır; bunlar bağlantı değildir.
      if (rel(file).endsWith('icon-paths.ts')) continue;
      const code = read(file)
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      if (/@import\s+url\(|url\(\s*['"]?https?:|<link[^>]+href=["']https?:|fonts\.(googleapis|gstatic)/.test(code)) {
        offenders.push(rel(file));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('renk değeri yalnızca tokens.css içinde yazılır (CSS dosyalarında ham renk yok)', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC, ['.css'])) {
      if (file.endsWith('tokens.css')) continue;
      const code = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
      if (/#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/.test(code)) offenders.push(rel(file));
    }
    expect(offenders).toEqual([]);
  });

  it('yazı boyutu px ile yazılmaz (rem kullanılır; yakınlaştırma ve yazı ayarı bozulmasın)', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC, ['.css'])) {
      if (file.endsWith('tokens.css')) continue;
      const code = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
      if (/font-size:[^;]*\d(px|pt)\b/.test(code)) offenders.push(rel(file));
    }
    expect(offenders).toEqual([]);
  });

  it('çıplak toUpperCase/toLowerCase yok (Türkçe i/İ ve ı/I bozulur)', () => {
    const offenders = sourceFiles(SRC, ['.ts', '.tsx'])
      .filter((file) => !file.endsWith('turkish.ts'))
      .filter((file) => /\.(toUpperCase|toLowerCase)\(/.test(read(file)));
    expect(offenders.map(rel)).toEqual([]);
  });

  it('galeri yalnızca src/app/galeri ve src/features/gallery tarafından içe aktarılır', () => {
    const offenders = sourceFiles(SRC, ['.ts', '.tsx'])
      .filter((file) => !rel(file).startsWith('src/features/gallery/') && !rel(file).startsWith('src/app/galeri/'))
      .filter((file) => read(file).includes('features/gallery'));
    expect(offenders.map(rel)).toEqual([]);
  });

  it('galeri sayfası üretimde kapalıdır: notFound çağrısı isGalleryEnabled kontrolüne bağlı', () => {
    const page = read(join(SRC, 'app', 'galeri', 'page.tsx'));
    expect(page).toMatch(/if \(!isGalleryEnabled\(process\.env\)\) notFound\(\);/);
  });

  it('ana sayfa galeri bağlantısını yalnızca galeri açıkken gösterir', () => {
    const home = read(join(SRC, 'app', 'page.tsx'));
    expect(home).toContain('isGalleryEnabled(process.env)');
    expect(home).toMatch(/showGalleryLink \? \(/);
  });
});
