// Material Symbols SVG yollarını (Apache 2.0) indirip `src/components/icons/icon-paths.ts` dosyasını üretir.
//
// Bu betik YALNIZCA ikon listesi değiştiğinde elle çalıştırılır (`npm run icons`); derlemede ve testte
// çalışmaz, ağa bağlanmaz. Çıktı repoya girer. Böylece ikonlar kendi sunucumuzdan sunulur:
// ikon fontu ve CDN yoktur (plan 3.9, 7.4).
//
// Kaynak: https://github.com/google/material-design-icons (symbols/web/<ad>/materialsymbolsoutlined/)
// Sürüm: weight 400, grade 0, optical size 24; viewBox "0 -960 960 960".

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'components', 'icons');
const BASE = 'https://raw.githubusercontent.com/google/material-design-icons/master';

/** Gezinmede seçili durum için DOLU sürümü de gereken ikonlar. */
const NAV_ICONS = [
  'wb_sunny',
  'event_note',
  'forum',
  'videocam',
  'dashboard',
  'manage_accounts',
  'groups',
  'calendar_month',
  'assignment_ind',
  'handshake',
  'shield',
  'group',
  'fact_check',
];

/** Yalnızca çizgili sürümü gereken ikonlar. */
const UI_ICONS = [
  'notifications',
  'settings',
  'family_restroom',
  'volunteer_activism',
  'backpack',
  'chevron_right',
  'info',
  'check_circle',
  'warning',
  'error',
  'close',
  'refresh',
  'cloud_off',
  'wb_twilight',
  'hourglass_empty',
  'play_arrow',
  'check',
  'arrow_back',
  'open_in_new',
  'radio_button_checked',
  'radio_button_unchecked',
  'logout',
  'palette',
];

async function fetchPath(name, filled) {
  const file = filled ? `${name}_fill1_24px.svg` : `${name}_24px.svg`;
  const url = `${BASE}/symbols/web/${name}/materialsymbolsoutlined/${file}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} indirilemedi (${response.status})`);
  const svg = await response.text();
  const match = /<path d="([^"]+)"/.exec(svg);
  if (!match) throw new Error(`${file} içinde yol bulunamadı`);
  return match[1];
}

function render(constName, entries) {
  const lines = [];
  for (const [name, paths] of entries) {
    lines.push(`  ${name}: {`);
    for (const [key, d] of Object.entries(paths)) lines.push(`    ${key}: '${d}',`);
    lines.push('  },');
  }
  return [
    `export const ${constName} = {`,
    ...lines,
    '} as const satisfies Record<string, { outline: string; fill?: string }>;',
  ].join('\n');
}

const navEntries = [];
for (const name of NAV_ICONS) {
  navEntries.push([name, { outline: await fetchPath(name, false), fill: await fetchPath(name, true) }]);
}
const uiEntries = [];
for (const name of UI_ICONS) {
  uiEntries.push([name, { outline: await fetchPath(name, false) }]);
}

const header = [
  '/*',
  ' * OTOMATİK ÜRETİLİR: `npm run icons` (scripts/fetch-icons.mjs). Elle düzenleme.',
  ' *',
  ' * Material Symbols (Outlined, weight 400, grade 0, 24 px), Apache License 2.0.',
  ' * Kaynak: https://github.com/google/material-design-icons. Lisans metni: ./LICENSE.txt',
  ' * viewBox: "0 -960 960 960".',
  ' *',
  ' * İki ayrı nesne bilerek ayrıldı: `navIconPaths` (gezinme, DOLU sürümlü) yalnızca sunucuda çizilen',
  ' * AppShell tarafından kullanılır, tarayıcıya gitmez. `uiIconPaths` küçüktür ve istemci adalarında da kullanılır.',
  ' */',
  '',
].join('\n');

writeFileSync(
  join(OUT_DIR, 'icon-paths.ts'),
  `${header}\n${render('uiIconPaths', uiEntries)}\n\n${render('navIconPaths', navEntries)}\n`,
);

const license = await fetch(`${BASE}/LICENSE`);
if (!license.ok) throw new Error('Apache 2.0 lisans metni indirilemedi');
writeFileSync(
  join(OUT_DIR, 'LICENSE.txt'),
  `Material Symbols (Google), Apache License 2.0.\nKaynak: https://github.com/google/material-design-icons\n\n${await license.text()}`,
);

console.log(`[icons] ${uiEntries.length + navEntries.length} ikon yazıldı.`);
