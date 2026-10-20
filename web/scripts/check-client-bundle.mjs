// Derleme sonrası denetim (`npm run build` bunu otomatik çalıştırır: package.json "postbuild").
//
// `.next/static` klasörü TARAYICIYA giden her şeydir (JavaScript, CSS). Burada şunlar aranır:
//   - gizli Supabase anahtarı izi (`sb_secret`, `service_role`) ve tarayıcı Supabase istemcisi (`GoTrueClient`),
//   - dış CDN, yazı tipi, analitik adresleri (çocuk gizliliği: üçüncü taraf betik yok, plan 3.3 ve 9.1),
//   - derleme sırasında ortamda bulunan gizli-gibi değişkenlerin DEĞERLERİ.
// Bulunursa çıkış kodu 1 olur ve derleme başarısız sayılır.
//
// Kullanım: node scripts/check-client-bundle.mjs   (önce `next build` çalışmış olmalı)

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
// CHECK_BUNDLE_DIR yalnızca testler içindir (denetimin gerçekten ihlal yakaladığını göstermek için).
const STATIC_DIR = process.env.CHECK_BUNDLE_DIR ?? join(WEB_DIR, '.next', 'static');

const FORBIDDEN = [
  'sb_secret',
  'service_role',
  'GoTrueClient',
  'gstatic',
  'googleapis',
  'fonts.google',
  'googletagmanager',
  'google-analytics',
  'jsdelivr',
  'unpkg.com',
  'cdnjs',
  'vitals.vercel',
  'vercel-insights',
];

const SECRET_LIKE_NAME = /(SECRET|PASSWORD|PASSWD|PRIVATE|CREDENTIAL|SERVICE_ROLE|TOKEN)/i;
const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.css', '.html', '.json', '.txt', '.map', '.svg']);

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

if (!existsSync(STATIC_DIR)) {
  console.error('[check-bundle] .next/static bulunamadı. Önce `npm run build` çalıştır.');
  process.exit(1);
}

// Ortamda bulunan gizli-gibi değişkenlerin değerleri (en az 12 karakter) pakette geçmemeli.
const secretValues = Object.entries(process.env)
  .filter(([name, value]) => SECRET_LIKE_NAME.test(name) && (value ?? '').length >= 12)
  .map(([name, value]) => ({ name, value }));

const violations = [];
let scanned = 0;

for (const file of walk(STATIC_DIR)) {
  if (!TEXT_EXTENSIONS.has(extname(file))) continue;
  scanned += 1;
  const text = readFileSync(file, 'utf8');
  const shortName = relative(WEB_DIR, file).replaceAll('\\', '/');

  for (const word of FORBIDDEN) {
    if (text.includes(word)) violations.push(`${shortName}: yasak ifade "${word}"`);
  }
  for (const { name, value } of secretValues) {
    if (text.includes(value)) violations.push(`${shortName}: ${name} değişkeninin DEĞERİ pakete girmiş`);
  }
}

if (violations.length > 0) {
  console.error('\n[check-bundle] İstemci paketi denetimi BAŞARISIZ:\n');
  for (const violation of violations) console.error(`  - ${violation}`);
  console.error('');
  process.exit(1);
}

console.log(`[check-bundle] Tamam: ${scanned} istemci dosyası tarandı, yasak ifade ya da gizli değer yok.`);
