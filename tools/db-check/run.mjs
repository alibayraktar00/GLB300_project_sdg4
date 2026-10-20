// Doğrulama çalıştırıcısı: PGlite (gömülü Postgres) + gerçek pgTAP.
// Kullanım:
//   node run.mjs                      -> mock + migration'lar + tüm testler
//   node run.mjs --seed               -> ayrıca seed.sql'i de uygular (testlerden önce)
//   node run.mjs --only 020           -> yalnızca adı "020" ile başlayan test dosyaları
//   node run.mjs --no-tests           -> yalnızca migration (+seed) uygula
import { PGlite } from '@electric-sql/pglite';
import { pgtap } from '@electric-sql/pglite-pgtap';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../supabase');
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };

const read = (p) => fs.readFileSync(p, 'utf8');
const db = new PGlite({ extensions: { pgtap, pgcrypto } });
await db.waitReady;

const MUT = process.env.MUT ? JSON.parse(process.env.MUT) : null;
let mutApplied = false;
async function applyFile(label, file) {
  try {
    let text = read(file);
    if (MUT && label.includes(MUT.file)) {
      if (!text.includes(MUT.find)) throw new Error('MUTASYON UYGULANAMADI: ' + MUT.find.slice(0, 60));
      text = text.replace(MUT.find, () => MUT.repl);
      mutApplied = true;
    }
    await db.exec(text);
    console.log(`  [ok]   ${label}`);
    return true;
  } catch (e) {
    console.log(`  [HATA] ${label}\n         ${e.message}${e.position ? ' (konum ' + e.position + ')' : ''}`);
    if (e.detail) console.log('         detay: ' + e.detail);
    if (e.hint) console.log('         ipucu: ' + e.hint);
    return false;
  }
}

console.log('== Supabase taklidi');
if (!(await applyFile('mock/00_supabase_mock.sql', path.join(HERE, 'mock/00_supabase_mock.sql')))) process.exit(2);
await db.exec(`set search_path to public, extensions;`);

console.log('== Migration\'lar');
const migDir = path.join(REPO, 'migrations');
const migs = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
for (const m of migs) {
  if (!(await applyFile(m, path.join(migDir, m)))) process.exit(3);
}

if (flag('--seed')) {
  console.log('== Seed');
  if (!(await applyFile('seed/seed.sql', path.join(REPO, 'seed/seed.sql')))) process.exit(4);
}

if (opt('--sql')) {
  console.log('== Özel SQL: ' + opt('--sql'));
  const res = await db.exec(read(opt('--sql')));
  for (const r of res) if (r.rows?.length) console.table(r.rows);
}

if (flag('--no-tests')) { await db.close(); process.exit(0); }

console.log('== pgTAP testleri');
const testDir = path.join(REPO, 'tests/database');
let files = fs.existsSync(testDir) ? fs.readdirSync(testDir).filter((f) => f.endsWith('.sql')).sort() : [];
if (opt('--only')) files = files.filter((f) => f.startsWith('000') || f.startsWith(opt('--only')));

let totalOk = 0, totalFail = 0, fileErrors = 0;
for (const f of files) {
  await db.exec('rollback').catch(() => {}); await db.exec('reset role').catch(() => {});
  // pg_prove her dosyayı ayrı oturumda çalıştırır; burada tek oturum var, pgTAP durumunu sıfırla.
  await db.exec('drop table if exists pg_temp.__tcache__, pg_temp.__tresults__; drop sequence if exists pg_temp.__tcache___id_seq, pg_temp.__tresults___numb_seq;').catch(() => {});
  await db.exec(`set search_path to public, extensions;`);
  let results;
  try {
    results = await db.exec(read(path.join(testDir, f)));
  } catch (e) {
    fileErrors++;
    console.log(`\n--- ${f}: ÇALIŞMA HATASI\n    ${e.message}${e.detail ? '\n    detay: ' + e.detail : ''}${e.hint ? '\n    ipucu: ' + e.hint : ''}`);
    await db.exec('rollback').catch(() => {}); await db.exec('reset role').catch(() => {});
    continue;
  }
  const lines = [];
  for (const r of results) for (const row of r.rows ?? []) {
    for (const v of Object.values(row)) if (typeof v === 'string') for (const l of v.split('\n')) lines.push(l);
  }
  const tap = lines.filter((l) => /^(ok |not ok |1\.\.|# )/.test(l));
  const ok = tap.filter((l) => l.startsWith('ok ')).length;
  const bad = tap.filter((l) => l.startsWith('not ok ')).length;
  const planLine = tap.find((l) => l.startsWith('1..'));
  const planned = planLine ? parseInt(planLine.slice(3), 10) : null;
  const mismatch = planned !== null && planned !== ok + bad ? 1 : 0;
  totalOk += ok; totalFail += bad + mismatch;
  if (mismatch) console.log(`    !! PLAN UYUŞMAZLIĞI: planlanan ${planned}, çalışan ${ok + bad}`);
  console.log(`\n--- ${f}: ${ok} geçti, ${bad} kaldı  (plan ${planLine ?? '?'})`);
  if (bad || flag('--verbose')) for (const l of tap) if (flag('--verbose') || !l.startsWith('ok ')) console.log('    ' + l);
}
console.log(`\n== ÖZET: ${totalOk} geçti, ${totalFail} kaldı, ${fileErrors} dosya hatası`);
await db.close();
process.exit(totalFail || fileErrors ? 1 : 0);
