// `src/styles/palette.json` -> `src/styles/tokens.css` içindeki RENKLER bölümünü üretir.
//
//   npm run tokens           renkler bölümünü yeniden yazar
//   npm run tokens -- --check  güncel değilse hata verir (test ve CI bunu kullanır)
//
// Neden betik? Dört tema (açık, koyu, açık yüksek kontrast, koyu yüksek kontrast) ve üç tetikleyici
// (sistem ayarı, sistem kontrast ayarı, uygulama içi seçim) olduğu için aynı değerler birkaç CSS
// bloğunda tekrar eder. Elle yazmak hata getirir; tek kaynak palette.json'dur ve bir rolün dört
// değeri tek satırda yan yana okunur (kontrast incelemesi kolaylaşır).
//
// tokens.css'in geri kalanı (boşluk, yazı ölçeği, boyut, süre) elle yazılır; yalnızca
// BEGIN/END işaretleri arasındaki bölüm bu betiğe aittir.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PALETTE_FILE = join(ROOT, 'src', 'styles', 'palette.json');
const TOKENS_FILE = join(ROOT, 'src', 'styles', 'tokens.css');

const BEGIN = '/* === BEGIN renkler (scripts/generate-tokens.mjs üretir; src/styles/palette.json düzenlenir) === */';
const END = '/* === END renkler === */';

/** Tema blokları. Seçici listeleri `docs/tasarim-sistemi.md` 2.4 ve 7.4'teki tetikleyici kurallarını uygular. */
const BLOCKS = [
  {
    variant: 'light',
    comment: 'Açık (normal): varsayılan; açıkça seçilmişse de aynı.',
    selectors: [':root', "[data-theme='light']"],
  },
  {
    variant: 'dark',
    comment: 'Koyu (normal): kullanıcı açıkça seçti.',
    selectors: ["[data-theme='dark']"],
  },
  {
    variant: 'dark',
    comment: 'Koyu (normal): sistem koyu ve kullanıcı bir tema seçmemiş.',
    media: '(prefers-color-scheme: dark)',
    selectors: [':root:not([data-theme])'],
  },
  {
    variant: 'hcLight',
    comment: "Yüksek kontrast açık: açıkça ('hc-light') ya da sistem şemasıyla ('hc') seçildi.",
    selectors: ["[data-theme='hc-light']", "[data-theme='hc']"],
  },
  {
    variant: 'hcLight',
    comment: 'Yüksek kontrast açık: sistem yüksek kontrast istiyor (prefers-contrast: more).',
    media: '(prefers-contrast: more)',
    selectors: [':root:not([data-theme])', "[data-theme='light']"],
  },
  {
    variant: 'hcDark',
    comment: 'Yüksek kontrast koyu: açıkça seçildi.',
    selectors: ["[data-theme='hc-dark']"],
  },
  {
    variant: 'hcDark',
    comment: "Yüksek kontrast koyu: 'hc' seçili ve sistem koyu.",
    media: '(prefers-color-scheme: dark)',
    selectors: ["[data-theme='hc']"],
  },
  {
    variant: 'hcDark',
    comment: 'Yüksek kontrast koyu: koyu seçili ve sistem yüksek kontrast istiyor.',
    media: '(prefers-contrast: more)',
    selectors: ["[data-theme='dark']"],
  },
  {
    variant: 'hcDark',
    comment: 'Yüksek kontrast koyu: tema seçilmemiş, sistem hem koyu hem yüksek kontrast.',
    media: '(prefers-contrast: more) and (prefers-color-scheme: dark)',
    selectors: [':root:not([data-theme])'],
  },
];

export function buildColorSection(palette) {
  const declarations = (variant, indent) => {
    const lines = [];
    // `color-scheme` özel özellik değil gerçek CSS özelliğidir (form öğeleri, kaydırma çubukları).
    lines.push(`${indent}color-scheme: ${palette.olculer['color-scheme'][variant]};`);
    for (const [name, values] of Object.entries(palette.olculer)) {
      if (name === 'color-scheme') continue;
      lines.push(`${indent}--${name}: ${values[variant]};`);
    }
    for (const [name, values] of Object.entries(palette.renkler)) {
      lines.push(`${indent}--color-${name}: ${values[variant]};`);
    }
    return lines.join('\n');
  };

  const rules = BLOCKS.map((block) => {
    const selector = block.selectors.join(',\n');
    if (block.media) {
      const inner = block.selectors.join(',\n  ');
      return `/* ${block.comment} */\n@media ${block.media} {\n  ${inner} {\n${declarations(block.variant, '    ')}\n  }\n}`;
    }
    return `/* ${block.comment} */\n${selector} {\n${declarations(block.variant, '  ')}\n}`;
  });

  return `${BEGIN}\n\n${rules.join('\n\n')}\n\n${END}`;
}

export function applyToTokens(css, section) {
  const start = css.indexOf(BEGIN);
  const end = css.indexOf(END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error('tokens.css içinde BEGIN/END renkler işaretleri bulunamadı.');
  }
  return css.slice(0, start) + section + css.slice(end + END.length);
}

function main() {
  const palette = JSON.parse(readFileSync(PALETTE_FILE, 'utf8'));
  // Windows'ta çalışma kopyası CRLF olabilir (git eol=lf ile normalleştirir): karşılaştırma satır sonundan bağımsızdır.
  const current = readFileSync(TOKENS_FILE, 'utf8').replace(/\r\n/g, '\n');
  const next = applyToTokens(current, buildColorSection(palette));

  if (process.argv.includes('--check')) {
    if (next !== current) {
      console.error('[tokens] tokens.css güncel değil. `npm run tokens` çalıştırın.');
      process.exit(1);
    }
    console.log('[tokens] tokens.css güncel.');
    return;
  }

  writeFileSync(TOKENS_FILE, next);
  console.log('[tokens] tokens.css renkler bölümü yazıldı.');
}

// Başka dosyadan içe aktarılınca (test) çalışmaz; doğrudan `node scripts/generate-tokens.mjs` ile çalışır.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
