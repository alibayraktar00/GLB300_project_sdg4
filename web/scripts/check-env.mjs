// Derleme öncesi güvenlik denetimi (`npm run build` bunu otomatik çalıştırır: package.json "prebuild").
//
// Amaç (plan 3.10 ve 9.1, madde 6): gizli anahtar tarayıcı paketine ASLA girmesin.
// Next.js, adı NEXT_PUBLIC_ ile başlayan her değişkeni derleme sırasında tarayıcı JavaScript'ine yazar.
// Bu yüzden:
//   1. NEXT_PUBLIC_ ile başlayan ve adında KEY/SECRET/TOKEN/PASSWORD gibi sözcük geçen değişken YASAK.
//      (Tarayıcıda Supabase istemcisi yok; VAPID açık anahtarı gibi değerler de sunucudan prop olarak verilir.)
//   2. `sb_secret_...` ile başlayan değer hiçbir .env dosyasında bulunamaz (.env.example dahil).
//   3. SUPABASE_PUBLISHABLE_KEY alanında gizli ya da eski JWT biçimli anahtar olamaz.
//
// Kullanım: node scripts/check-env.mjs   (çıkış kodu 1 = ihlal var)

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

const SECRET_LIKE_NAME = /(KEY|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|CREDENTIAL|JWT|SERVICE_ROLE)/i;
const REAL_SECRET_VALUE = /sb_secret_[A-Za-z0-9_-]{8,}/;

/** `.env`, `.env.local`, `.env.example` gibi dosyaları okuyup { dosya, ad, değer } listesi verir. */
function readEnvFiles() {
  const entries = [];
  for (const file of readdirSync(WEB_DIR)) {
    if (!/^\.env(\..+)?$/.test(file)) continue;
    const text = readFileSync(join(WEB_DIR, file), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (match) entries.push({ source: file, name: match[1], value: match[2].replace(/^["']|["']$/g, '').trim() });
    }
    // Yorum satırı ya da başka biçimde yazılmış gerçek bir gizli anahtar da yakalanır.
    if (REAL_SECRET_VALUE.test(text)) entries.push({ source: file, name: '(dosya içeriği)', value: 'sb_secret_...' });
  }
  return entries;
}

const entries = [
  ...Object.entries(process.env).map(([name, value]) => ({ source: 'ortam değişkeni', name, value: value ?? '' })),
  ...readEnvFiles(),
];

const problems = [];

for (const { source, name, value } of entries) {
  if (name.startsWith('NEXT_PUBLIC_') && SECRET_LIKE_NAME.test(name)) {
    problems.push(
      `${source}: "${name}" tarayıcı paketine yazılır. NEXT_PUBLIC_ ile anahtar/gizli değer tanımlama. ` +
        'Değeri SUPABASE_... gibi öneksiz bir adla sunucuda oku, gerekirse bileşene prop olarak ver.',
    );
  }
  if (name.startsWith('NEXT_PUBLIC_') && /^sb_secret_/.test(value)) {
    problems.push(`${source}: "${name}" bir gizli Supabase anahtarı içeriyor.`);
  }
  if (name === '(dosya içeriği)') {
    problems.push(`${source}: gerçek bir sb_secret_ anahtarı yazılmış. Dosyadan sil ve anahtarı Supabase panelinden yenile.`);
  }
  if (name === 'SUPABASE_PUBLISHABLE_KEY' && value) {
    if (value.startsWith('sb_secret_')) {
      problems.push(`${source}: SUPABASE_PUBLISHABLE_KEY alanında gizli anahtar var.`);
    } else if (value.startsWith('eyJ')) {
      problems.push(`${source}: SUPABASE_PUBLISHABLE_KEY eski JWT biçiminde (anon/service_role); kullanılmaz.`);
    }
  }
}

if (problems.length > 0) {
  console.error('\n[check-env] Güvenlik denetimi BAŞARISIZ:\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('');
  process.exit(1);
}

console.log('[check-env] Tamam: NEXT_PUBLIC_ ile anahtar yok, .env dosyalarında gizli anahtar yok.');
