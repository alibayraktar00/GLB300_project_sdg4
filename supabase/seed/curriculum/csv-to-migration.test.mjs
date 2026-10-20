// CSV aracı testleri. Çalıştırma (proje kökünden, ek paket gerekmez):
//   node --test supabase/seed/curriculum/csv-to-migration.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { csvOku, ayracBul, utf8Coz, CsvHatasi } from './csv.mjs';

const BURASI = path.dirname(fileURLToPath(import.meta.url));
const ARAC = path.join(BURASI, 'csv-to-migration.mjs');
const DOSYALAR = ['academic_years', 'academic_weeks', 'curriculum_versions', 'grade_programs', 'units', 'topics', 'weekly_topics', 'resources'];

/** Örnek CSV'lerin geçici bir kopyasını oluşturur; override: { dosyaAdi: metin | Buffer } */
function gecici(override = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mufredat-'));
  for (const d of DOSYALAR) fs.copyFileSync(path.join(BURASI, d + '.csv'), path.join(dir, d + '.csv'));
  for (const [ad, icerik] of Object.entries(override)) fs.writeFileSync(path.join(dir, ad + '.csv'), icerik);
  return dir;
}
function calistir(dir, ...ek) {
  const cikti = path.join(dir, 'cikti.sql');
  const r = spawnSync(process.execPath, [ARAC, '--klasor', dir, '--ornek-izin', '--cikti', cikti, ...ek], { encoding: 'utf8' });
  return { kod: r.status, out: r.stdout + r.stderr, sql: fs.existsSync(cikti) ? fs.readFileSync(cikti, 'utf8') : null };
}

// ---------------------------------------------------------------- ayrıştırıcı (birim)
test('ayraç: tırnak içindeki ayraçlar sayılmaz', () => {
  assert.equal(ayracBul('"a,b,c,d";e;f\n1;2;3'), ';');
  assert.equal(ayracBul('a,"b;c;d;e",f\n'), ',');
  assert.equal(ayracBul('tek_sutun\n'), ',');
});

test('ayraç yalnızca başlık satırına bakar', () => {
  assert.equal(ayracBul('a,b,c\nx;y;z;w;v\n'), ',');
});

test('tırnaklı alan: ayraç, satır sonu ve "" serbest; satır numaraları fiziksel', () => {
  const { kayitlar } = csvOku('a,b\n"x, y","satir1\nsatir2 ""tirnakli"""\nc,d\n');
  assert.deepEqual(kayitlar.map((k) => k.alanlar), [['a', 'b'], ['x, y', 'satir1\nsatir2 "tirnakli"'], ['c', 'd']]);
  assert.deepEqual(kayitlar.map((k) => k.satir), [1, 2, 4]);
});

test('alanın ortasındaki tırnak düz karakterdir (sonraki satırları yutmaz)', () => {
  const { kayitlar } = csvOku('a,b\n5" tahta,iki\nüç,dört\n');
  assert.equal(kayitlar.length, 3);
  assert.deepEqual(kayitlar[1].alanlar, ['5" tahta', 'iki']);
});

test('kapanmamış tırnak: açıldığı satır numarasıyla hata', () => {
  assert.throws(() => csvOku('a,b\nx,"kapanmayan\ny,z\n'), (e) => e instanceof CsvHatasi && e.satir === 2 && /kapanmamış tırnak/.test(e.message));
});

test('tırnak kapandıktan sonra beklenmeyen karakter hata verir', () => {
  assert.throws(() => csvOku('a,b\n"x"y,z\n'), (e) => e instanceof CsvHatasi && e.satir === 2);
});

test('BOM, CRLF ve noktalı virgül', () => {
  const { ayrac, kayitlar } = csvOku('﻿a;b\r\n1;2\r\n');
  assert.equal(ayrac, ';');
  assert.deepEqual(kayitlar.map((k) => k.alanlar), [['a', 'b'], ['1', '2']]);
});

test('boş satırlar atlanır', () => {
  const { kayitlar } = csvOku('a,b\n\n,\n1,2\n');
  assert.equal(kayitlar.length, 2);
});

test('utf8Coz: bozuk bayt satır numarasıyla bildirilir', () => {
  const bayt = Buffer.concat([Buffer.from('baslik\nsatir iki\n'), Buffer.from([0xe7]), Buffer.from('ok\n')]);
  assert.throws(() => utf8Coz(bayt), (e) => e instanceof CsvHatasi && e.satir === 3 && /UTF-8/.test(e.message));
  assert.equal(utf8Coz(Buffer.from('şğüöçı İ')), 'şğüöçı İ');
});

// ---------------------------------------------------------------- araç (uçtan uca)
test('örnek dosyalar --ornek-izin ile geçer ve SQL üretir', () => {
  const r = calistir(gecici());
  assert.equal(r.kod, 0, r.out);
  assert.match(r.sql, /insert into public\.topics/);
  assert.match(r.sql, /set local standard_conforming_strings = on;/);
});

test('örnek satır varken --ornek-izin olmadan REDDEDİLİR', () => {
  const dir = gecici();
  const r = spawnSync(process.execPath, [ARAC, '--klasor', dir, '--kontrol'], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /ÖRNEK satır/);
});

test('UTF-8 olmayan dosya satır numarasıyla reddedilir', () => {
  const dir = gecici();
  const eski = fs.readFileSync(path.join(dir, 'resources.csv'));
  const satirlar = eski.toString('utf8').split('\n');
  satirlar[2] = 'TRUE,ORNEK-MAT6-K1,baglanti,';   // 3. satırı baştan yaz
  const bozuk = Buffer.concat([Buffer.from(satirlar.slice(0, 2).join('\n') + '\n' + satirlar[2], 'utf8'), Buffer.from([0xfe]), Buffer.from(',https://example.org/x,EBA,ikisi,15,TRUE,FALSE,TRUE\n')]);
  fs.writeFileSync(path.join(dir, 'resources.csv'), bozuk);
  const r = calistir(dir);
  assert.equal(r.kod, 1);
  assert.match(r.out, /resources\.csv satır 3: dosya geçerli UTF-8 değil/);
  assert.match(r.out, /CSV UTF-8/);
  assert.equal(r.sql, null);
});

test('yalnızca başlık içeren CSV için GEÇERSİZ SQL üretilmez', () => {
  const dir = gecici({ resources: 'ornek,topic_code,kind,title,url,provider,mode,est_minutes,requires_login,offline_ok,is_active\n' });
  const r = calistir(dir);
  assert.equal(r.kod, 0, r.out);
  assert.doesNotMatch(r.sql, /insert into public\.resources/);
  assert.doesNotMatch(r.sql, /values\s*\n\s*\)/);
  assert.match(r.out, /resources\.csv: veri satırı yok/);
  assert.match(r.sql, /insert into public\.topics/);
});

test('tamamen boş dosya hata verir', () => {
  const dir = gecici({ resources: '' });
  const r = calistir(dir);
  assert.equal(r.kod, 1);
  assert.match(r.out, /resources\.csv: dosya boş/);
});

test('hiçbir dosyada veri yoksa migration üretilmez', () => {
  const basliklar = {
    academic_years: 'ornek,id,starts_on,ends_on\n',
    academic_weeks: 'ornek,academic_year_id,week_no,starts_on,ends_on,is_break,note\n',
    curriculum_versions: 'ornek,code,name,subject_code,grade,source_url\n',
    grade_programs: 'ornek,academic_year_id,grade,subject_code,curriculum_version_code\n',
    units: 'ornek,curriculum_version_code,seq,title\n',
    topics: 'ornek,code,curriculum_version_code,unit_seq,seq,title,outcome_code,est_minutes,summary_md,mini_review_md\n',
    weekly_topics: 'ornek,academic_year_id,grade,subject_code,week_no,seq,topic_code\n',
    resources: 'ornek,topic_code,kind,title,url,provider,mode,est_minutes,requires_login,offline_ok,is_active\n',
  };
  const r = calistir(gecici(basliklar));
  assert.equal(r.kod, 1);
  assert.match(r.out, /hiçbir CSV dosyasında veri satırı yok/);
  assert.equal(r.sql, null);
});

test('kapanmamış tırnak satır numarasıyla bildirilir', () => {
  const dir = gecici();
  const topics = fs.readFileSync(path.join(dir, 'topics.csv'), 'utf8') + 'TRUE,ORNEK-MAT6-K9,ORNEK-MAT-6,2,9,"ÖRNEK kapanmayan başlık,ORNEK.2.9,20,x,y\n';
  fs.writeFileSync(path.join(dir, 'topics.csv'), topics);
  const satirSayisi = topics.split('\n').length - 1;   // son satır numarası
  const r = calistir(dir);
  assert.equal(r.kod, 1);
  assert.match(r.out, new RegExp('topics\\.csv satır ' + satirSayisi + ': kapanmamış tırnak'));
});

test('alan ortasındaki tırnak düz karakter: SQL doğru kaçışlanır', () => {
  const dir = gecici();
  let topics = fs.readFileSync(path.join(dir, 'topics.csv'), 'utf8');
  topics += 'TRUE,ORNEK-MAT6-K9,ORNEK-MAT-6,2,9,ÖRNEK 5" tahta; \'); drop table public.profiles; --,ORNEK.2.9,20,x,y\n';
  fs.writeFileSync(path.join(dir, 'topics.csv'), topics);
  const r = calistir(dir);
  assert.equal(r.kod, 0, r.out);
  assert.ok(r.sql.includes(`'ÖRNEK 5" tahta; ''); drop table public.profiles; --'`), 'tek tırnak ikilenmiş olmalı');
  assert.ok(r.sql.includes('set local standard_conforming_strings = on;'));
});

test('noktalı virgül ayraçlı + BOM dosya kabul edilir', () => {
  const dir = gecici();
  for (const d of DOSYALAR) {
    if (d === 'topics') continue;   // tırnaklı çok satırlı alan içerir; ayrı test
    const metin = fs.readFileSync(path.join(dir, d + '.csv'), 'utf8').replace(/,/g, ';');
    fs.writeFileSync(path.join(dir, d + '.csv'), '﻿' + metin);
  }
  const { kayitlar } = csvOku(fs.readFileSync(path.join(dir, 'topics.csv'), 'utf8'));
  const topics = kayitlar.map((k) => k.alanlar.map((a) => (/[;"\n]/.test(a) ? '"' + a.replace(/"/g, '""') + '"' : a)).join(';')).join('\n') + '\n';
  fs.writeFileSync(path.join(dir, 'topics.csv'), topics);
  const r = calistir(dir);
  assert.equal(r.kod, 0, r.out);
});

test('haftalık konu: konu, yılın program sürümünden gelmiyorsa HATA', () => {
  const dir = gecici();
  fs.appendFileSync(path.join(dir, 'curriculum_versions.csv'), 'TRUE,ORNEK-MAT-6B,ÖRNEK Matematik 6 (eski),MAT,6,https://example.org/eski\n');
  fs.appendFileSync(path.join(dir, 'units.csv'), 'TRUE,ORNEK-MAT-6B,1,ÖRNEK eski ünite\n');
  fs.appendFileSync(path.join(dir, 'topics.csv'), 'TRUE,ORNEK-MAT6B-K1,ORNEK-MAT-6B,1,1,ÖRNEK eski konu,ORNEK.B.1,20,x,y\n');
  fs.appendFileSync(path.join(dir, 'weekly_topics.csv'), 'TRUE,2026-2027,6,MAT,2,2,ORNEK-MAT6B-K1\n');
  const r = calistir(dir);
  assert.equal(r.kod, 1);
  assert.match(r.out, /programı "ORNEK-MAT-6" sürümünü gösteriyor/);
});

test('haftalık konu: yılın program satırı (grade_programs) yoksa HATA', () => {
  const dir = gecici({ grade_programs: 'ornek,academic_year_id,grade,subject_code,curriculum_version_code\nTRUE,2026-2027,6,MAT,ORNEK-MAT-6\n' });
  const r = calistir(dir);
  assert.equal(r.kod, 1);
  assert.match(r.out, /program satırı yok/);
});
