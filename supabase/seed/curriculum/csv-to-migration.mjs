#!/usr/bin/env node
// =====================================================================
// Müfredat CSV'lerini kontrol eder ve bir Supabase MIGRATION dosyasına çevirir.
//
// Neden migration? Plan: "İçerik yönetim ekranları MVP'de yok; içerik CSV + migration ile
// yüklenir." Migration git'te görülebilir, gözden geçirilebilir ve her ortamda (dev, prod)
// aynı şekilde uygulanır. Üretilen SQL YENİDEN ÇALIŞTIRILABİLİR (idempotent): aynı CSV'yi
// iki kez uygulamak veriyi çoğaltmaz, değişen satırları günceller.
//
// Kullanım (proje kökünden, Node 20+; ek paket GEREKMEZ):
//   node supabase/seed/curriculum/csv-to-migration.mjs --kontrol        yalnızca doğrula
//   node supabase/seed/curriculum/csv-to-migration.mjs                  doğrula + migration dosyası üret
//   node supabase/seed/curriculum/csv-to-migration.mjs --ad mufredat_5_sinif   migration adını değiştir
//   node supabase/seed/curriculum/csv-to-migration.mjs --cikti baska.sql       başka bir dosyaya yaz
//   node supabase/seed/curriculum/csv-to-migration.mjs --ornek-izin     "ornek=TRUE" satırlara izin ver
//                                       (YALNIZCA yerel deneme için; üretilen dosyayı COMMIT ETME)
//   node ... --klasor <yol>             CSV'ler başka bir klasördeyse
// =====================================================================
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { csvOku, utf8Coz, CsvHatasi } from './csv.mjs';

const BURASI = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const bayrak = (a) => args.includes(a);
const deger = (a) => { const i = args.indexOf(a); return i >= 0 ? args[i + 1] : null; };

const KLASOR = deger('--klasor') ? path.resolve(deger('--klasor')) : BURASI;
const ORNEK_IZIN = bayrak('--ornek-izin');
const SADECE_KONTROL = bayrak('--kontrol');

// Şemada tanımlı sabitler (yeni ders/tür eklenirse hem migration hem burası güncellenir)
const DERSLER = new Set(['MAT', 'FEN']);
const KAYNAK_TURLERI = new Set(['baglanti', 'ozet', 'pdf']);
const KAYNAK_MODLARI = new Set(['kisa', 'tam', 'ikisi']);
const KOD_DESENI = /^[A-Za-z0-9_.-]{2,60}$/;

// ---------------------------------------------------------------------
// Hata ve uyarı toplayıcı
// ---------------------------------------------------------------------
const hatalar = [];
const uyarilar = [];
const hata = (dosya, satirNo, mesaj) => hatalar.push(`${dosya}${satirNo ? ` satır ${satirNo}` : ''}: ${mesaj}`);
const uyari = (mesaj) => uyarilar.push(mesaj);

const KAYNAK_ADLARI = {
  academic_years: ['ornek', 'id', 'starts_on', 'ends_on'],
  academic_weeks: ['ornek', 'academic_year_id', 'week_no', 'starts_on', 'ends_on', 'is_break', 'note'],
  curriculum_versions: ['ornek', 'code', 'name', 'subject_code', 'grade', 'source_url'],
  grade_programs: ['ornek', 'academic_year_id', 'grade', 'subject_code', 'curriculum_version_code'],
  units: ['ornek', 'curriculum_version_code', 'seq', 'title'],
  topics: ['ornek', 'code', 'curriculum_version_code', 'unit_seq', 'seq', 'title', 'outcome_code', 'est_minutes', 'summary_md', 'mini_review_md'],
  weekly_topics: ['ornek', 'academic_year_id', 'grade', 'subject_code', 'week_no', 'seq', 'topic_code'],
  resources: ['ornek', 'topic_code', 'kind', 'title', 'url', 'provider', 'mode', 'est_minutes', 'requires_login', 'offline_ok', 'is_active'],
};

const ozetler = {}; // dosya -> sha256 (üretilen migration başlığına yazılır)

function tabloOku(ad) {
  const dosya = `${ad}.csv`;
  const yol = path.join(KLASOR, dosya);
  if (!fs.existsSync(yol)) { hata(dosya, null, 'dosya bulunamadı'); return []; }
  const bayt = fs.readFileSync(yol);
  ozetler[dosya] = crypto.createHash('sha256').update(bayt).digest('hex');
  let satirlar;
  try {
    satirlar = csvOku(utf8Coz(bayt)).kayitlar;
  } catch (e) {
    if (e instanceof CsvHatasi) { hata(dosya, e.satir, e.message); return []; }
    throw e;
  }
  if (satirlar.length === 0) { hata(dosya, null, 'dosya boş (başlık satırı bile yok)'); return []; }
  const baslik = satirlar[0].alanlar.map((h) => h.trim());
  const beklenen = KAYNAK_ADLARI[ad];
  const eksik = beklenen.filter((b) => !baslik.includes(b));
  const fazla = baslik.filter((b) => !beklenen.includes(b));
  if (eksik.length) hata(dosya, satirlar[0].satir, `eksik sütun(lar): ${eksik.join(', ')}`);
  if (fazla.length) hata(dosya, satirlar[0].satir, `tanınmayan sütun(lar): ${fazla.join(', ')}`);
  if (eksik.length || fazla.length) return [];
  if (satirlar.length === 1) uyari(`${dosya}: veri satırı yok (yalnızca başlık); bu tablo için SQL üretilmeyecek`);
  const kayitlar = [];
  let ornekSayisi = 0;
  for (const kayit of satirlar.slice(1)) {
    const s = kayit.alanlar;
    const satirNo = kayit.satir;
    if (s.length > baslik.length && s.slice(baslik.length).some((h) => h.trim() !== '')) {
      hata(dosya, satirNo, 'başlıktan fazla sütun var (bir alanda ayraç ya da tırnak hatası olabilir)');
      continue;
    }
    const k = { _satir: satirNo, _dosya: dosya };
    baslik.forEach((b, j) => { k[b] = (s[j] ?? '').replace(/\r/g, ''); });
    // "ornek" bayrağı
    const ornek = k.ornek.trim().toUpperCase();
    if (ornek !== '' && !['TRUE', 'FALSE', 'EVET', 'HAYIR', '1', '0'].includes(ornek)) {
      hata(dosya, satirNo, `ornek sütunu TRUE veya FALSE olmalı (bulunan: "${k.ornek}")`);
    }
    k._ornek = ['TRUE', 'EVET', '1'].includes(ornek);
    if (k._ornek) ornekSayisi++;
    // ornek bayrağı unutulmuş olabilir
    for (const alanAd of ['code', 'name', 'title', 'id']) {
      const v = (k[alanAd] ?? '').trim();
      if (!k._ornek && (/^ORNEK[-_]/.test(v) || /^ÖRNEK\b/.test(v))) {
        hata(dosya, satirNo, `"${v}" ÖRNEK içerik gibi görünüyor ama ornek=TRUE işaretli değil`);
      }
    }
    kayitlar.push(k);
  }
  if (ornekSayisi && !ORNEK_IZIN) {
    hata(dosya, null, `${ornekSayisi} ÖRNEK satır (ornek=TRUE) var. Gerçek içerikte örnek satırları silin. (Yalnızca yerel deneme için: --ornek-izin)`);
  }
  return kayitlar;
}

// ---------------------------------------------------------------------
// Alan doğrulayıcıları
// ---------------------------------------------------------------------
function metin(k, alan, { zorunlu = true, en = 1000, desen = null } = {}) {
  const v = (k[alan] ?? '').trim();
  if (v === '') { if (zorunlu) hata(k._dosya, k._satir, `${alan} boş olamaz`); return null; }
  if (v.length > en) hata(k._dosya, k._satir, `${alan} çok uzun (${v.length} > ${en})`);
  if (desen && !desen.test(v)) hata(k._dosya, k._satir, `${alan} biçimi geçersiz: "${v}"`);
  if (v.includes('\u0000')) hata(k._dosya, k._satir, `${alan} geçersiz karakter içeriyor`);
  return v;
}
function serbestMetin(k, alan, en) { // Markdown: baştaki/sondaki boşluk korunmaz, satır sonu serbest
  const v = (k[alan] ?? '').replace(/\r\n/g, '\n').trim();
  if (v === '') return null;
  if (v.length > en) hata(k._dosya, k._satir, `${alan} çok uzun (${v.length} > ${en})`);
  if (v.includes('\u0000')) hata(k._dosya, k._satir, `${alan} geçersiz karakter içeriyor`);
  return v;
}
function tamsayi(k, alan, min, max, zorunlu = true) {
  const v = (k[alan] ?? '').trim();
  if (v === '') { if (zorunlu) hata(k._dosya, k._satir, `${alan} boş olamaz`); return null; }
  if (!/^-?\d+$/.test(v)) { hata(k._dosya, k._satir, `${alan} tam sayı olmalı: "${v}"`); return null; }
  const n = parseInt(v, 10);
  if (n < min || n > max) hata(k._dosya, k._satir, `${alan} ${min}-${max} aralığında olmalı: ${n}`);
  return n;
}
function tarih(k, alan) {
  const v = (k[alan] ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { hata(k._dosya, k._satir, `${alan} YYYY-AA-GG biçiminde olmalı: "${v}"`); return null; }
  const d = new Date(v + 'T00:00:00Z');
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) { hata(k._dosya, k._satir, `${alan} geçerli bir tarih değil: "${v}"`); return null; }
  return v;
}
function mantiksal(k, alan, varsayilan) {
  const v = (k[alan] ?? '').trim().toUpperCase();
  if (v === '') return varsayilan;
  if (['TRUE', 'EVET', '1'].includes(v)) return true;
  if (['FALSE', 'HAYIR', '0'].includes(v)) return false;
  hata(k._dosya, k._satir, `${alan} TRUE veya FALSE olmalı: "${k[alan]}"`);
  return varsayilan;
}
function https(k, alan, zorunlu) {
  const v = metin(k, alan, { zorunlu, en: 2000 });
  if (v !== null && !/^https:\/\/\S+$/.test(v)) hata(k._dosya, k._satir, `${alan} https:// ile başlamalı ve boşluk içermemeli: "${v}"`);
  return v;
}
function ders(k, alan) {
  const v = metin(k, alan);
  if (v !== null && !DERSLER.has(v)) hata(k._dosya, k._satir, `${alan} bilinmeyen ders kodu: "${v}" (geçerli: ${[...DERSLER].join(', ')})`);
  return v;
}
function benzersiz(kumeAdi, kume, anahtar, k) {
  if (kume.has(anahtar)) hata(k._dosya, k._satir, `${kumeAdi}: tekrarlanan anahtar "${anahtar}" (ilk geçtiği satır ${kume.get(anahtar)})`);
  else kume.set(anahtar, k._satir);
}

// ---------------------------------------------------------------------
// 1) Oku ve alan alan doğrula
// ---------------------------------------------------------------------
const yillar = tabloOku('academic_years').map((k) => ({
  k, id: metin(k, 'id', { desen: /^\d{4}-\d{4}$/ }), starts_on: tarih(k, 'starts_on'), ends_on: tarih(k, 'ends_on'),
}));
const haftalar = tabloOku('academic_weeks').map((k) => ({
  k, yil: metin(k, 'academic_year_id', { desen: /^\d{4}-\d{4}$/ }), no: tamsayi(k, 'week_no', 1, 53),
  starts_on: tarih(k, 'starts_on'), ends_on: tarih(k, 'ends_on'), is_break: mantiksal(k, 'is_break', false),
  note: metin(k, 'note', { zorunlu: false, en: 200 }),
}));
const surumler = tabloOku('curriculum_versions').map((k) => ({
  k, code: metin(k, 'code', { desen: KOD_DESENI }), name: metin(k, 'name', { en: 120 }), ders: ders(k, 'subject_code'),
  grade: tamsayi(k, 'grade', 5, 8), source_url: https(k, 'source_url', false),
}));
const programlar = tabloOku('grade_programs').map((k) => ({
  k, yil: metin(k, 'academic_year_id', { desen: /^\d{4}-\d{4}$/ }), grade: tamsayi(k, 'grade', 5, 8), ders: ders(k, 'subject_code'),
  surum: metin(k, 'curriculum_version_code', { desen: KOD_DESENI }),
}));
const uniteler = tabloOku('units').map((k) => ({
  k, surum: metin(k, 'curriculum_version_code', { desen: KOD_DESENI }), seq: tamsayi(k, 'seq', 1, 999), title: metin(k, 'title', { en: 200 }),
}));
const konular = tabloOku('topics').map((k) => ({
  k, code: metin(k, 'code', { desen: KOD_DESENI }), surum: metin(k, 'curriculum_version_code', { desen: KOD_DESENI }),
  unit_seq: tamsayi(k, 'unit_seq', 1, 999), seq: tamsayi(k, 'seq', 1, 999), title: metin(k, 'title', { en: 200 }),
  outcome_code: metin(k, 'outcome_code', { zorunlu: false, en: 40 }), est_minutes: tamsayi(k, 'est_minutes', 1, 240, false),
  summary_md: serbestMetin(k, 'summary_md', 20000), mini_review_md: serbestMetin(k, 'mini_review_md', 5000),
}));
const haftalikKonular = tabloOku('weekly_topics').map((k) => ({
  k, yil: metin(k, 'academic_year_id', { desen: /^\d{4}-\d{4}$/ }), grade: tamsayi(k, 'grade', 5, 8), ders: ders(k, 'subject_code'),
  hafta: tamsayi(k, 'week_no', 1, 53), seq: tamsayi(k, 'seq', 1, 99), konu: metin(k, 'topic_code', { desen: KOD_DESENI }),
}));
const kaynaklar = tabloOku('resources').map((k) => {
  const tur = metin(k, 'kind');
  if (tur !== null && !KAYNAK_TURLERI.has(tur)) hata(k._dosya, k._satir, `kind geçersiz: "${tur}" (geçerli: ${[...KAYNAK_TURLERI].join(', ')})`);
  const mod = metin(k, 'mode', { zorunlu: false }) ?? 'ikisi';
  if (!KAYNAK_MODLARI.has(mod)) hata(k._dosya, k._satir, `mode geçersiz: "${mod}" (geçerli: ${[...KAYNAK_MODLARI].join(', ')})`);
  const url = https(k, 'url', tur === 'baglanti');
  if (tur === 'pdf' && url === null) hata(k._dosya, k._satir, 'kind=pdf için url gerekli (MVP\'de dosya barındırma yok)');
  return {
    k, konu: metin(k, 'topic_code', { desen: KOD_DESENI }), kind: tur, title: metin(k, 'title', { en: 200 }), url,
    provider: metin(k, 'provider', { zorunlu: false, en: 80 }), mode: mod, est_minutes: tamsayi(k, 'est_minutes', 1, 240, false),
    requires_login: mantiksal(k, 'requires_login', false), offline_ok: mantiksal(k, 'offline_ok', false), is_active: mantiksal(k, 'is_active', true),
  };
});

// ---------------------------------------------------------------------
// 2) Dosyalar arası tutarlılık
// ---------------------------------------------------------------------
const yilMap = new Map(); yillar.forEach((y) => { benzersiz('academic_years', yilMap, y.id, y.k); if (y.starts_on && y.ends_on && y.ends_on <= y.starts_on) hata(y.k._dosya, y.k._satir, 'ends_on, starts_on tarihinden sonra olmalı'); });
const haftaMap = new Map();
haftalar.forEach((h) => {
  benzersiz('academic_weeks', haftaMap, `${h.yil}#${h.no}`, h.k);
  if (h.yil && !yilMap.has(h.yil)) hata(h.k._dosya, h.k._satir, `academic_year_id "${h.yil}" academic_years.csv içinde yok`);
  if (h.starts_on && h.ends_on && h.ends_on < h.starts_on) hata(h.k._dosya, h.k._satir, 'ends_on, starts_on tarihinden önce olamaz');
});
// Aynı yılda haftalar çakışmamalı
const yilaGoreHaftalar = new Map();
haftalar.forEach((h) => { if (h.yil && h.starts_on && h.ends_on) (yilaGoreHaftalar.get(h.yil) ?? yilaGoreHaftalar.set(h.yil, []).get(h.yil)).push(h); });
for (const [yil, liste] of yilaGoreHaftalar) {
  liste.sort((a, b) => (a.starts_on < b.starts_on ? -1 : 1));
  for (let i = 1; i < liste.length; i++) {
    if (liste[i].starts_on <= liste[i - 1].ends_on) hata(liste[i].k._dosya, liste[i].k._satir, `${yil} yılında ${liste[i - 1].no}. ve ${liste[i].no}. haftalar çakışıyor`);
  }
}

const surumMap = new Map();
surumler.forEach((s) => benzersiz('curriculum_versions', surumMap, s.code, s.k));
const programMap = new Map();
programlar.forEach((p) => {
  benzersiz('grade_programs', programMap, `${p.yil}#${p.grade}#${p.ders}`, p.k);
  if (p.yil && !yilMap.has(p.yil)) hata(p.k._dosya, p.k._satir, `academic_year_id "${p.yil}" academic_years.csv içinde yok`);
  const s = surumMap.has(p.surum) ? surumler.find((x) => x.code === p.surum) : null;
  if (p.surum && !s) hata(p.k._dosya, p.k._satir, `curriculum_version_code "${p.surum}" curriculum_versions.csv içinde yok`);
  else if (s && (s.grade !== p.grade || s.ders !== p.ders)) hata(p.k._dosya, p.k._satir, `"${p.surum}" sürümü ${s.ders} ${s.grade}. sınıf; satır ${p.ders} ${p.grade}. sınıf diyor`);
});
const uniteMap = new Map();
uniteler.forEach((u) => {
  benzersiz('units', uniteMap, `${u.surum}#${u.seq}`, u.k);
  if (u.surum && !surumMap.has(u.surum)) hata(u.k._dosya, u.k._satir, `curriculum_version_code "${u.surum}" curriculum_versions.csv içinde yok`);
});
const konuMap = new Map(); const konuSeqMap = new Map();
konular.forEach((t) => {
  benzersiz('topics.code', konuMap, t.code, t.k);
  benzersiz('topics (sürüm, ünite, sıra)', konuSeqMap, `${t.surum}#${t.unit_seq}#${t.seq}`, t.k);
  if (t.surum && !surumMap.has(t.surum)) hata(t.k._dosya, t.k._satir, `curriculum_version_code "${t.surum}" curriculum_versions.csv içinde yok`);
  else if (t.surum && !uniteMap.has(`${t.surum}#${t.unit_seq}`)) hata(t.k._dosya, t.k._satir, `"${t.surum}" sürümünde ${t.unit_seq}. ünite units.csv içinde yok`);
});
const konuBilgi = new Map(konular.map((t) => [t.code, t]));
const hwMap = new Map(); const hwKonuMap = new Map();
haftalikKonular.forEach((w) => {
  benzersiz('weekly_topics (yıl, sınıf, ders, hafta, sıra)', hwMap, `${w.yil}#${w.grade}#${w.ders}#${w.hafta}#${w.seq}`, w.k);
  benzersiz('weekly_topics (aynı hafta, aynı konu)', hwKonuMap, `${w.yil}#${w.grade}#${w.ders}#${w.hafta}#${w.konu}`, w.k);
  const hf = haftalar.find((h) => h.yil === w.yil && h.no === w.hafta);
  if (!hf) hata(w.k._dosya, w.k._satir, `${w.yil} yılının ${w.hafta}. haftası academic_weeks.csv içinde yok`);
  else if (hf.is_break) hata(w.k._dosya, w.k._satir, `${w.hafta}. hafta tatil olarak işaretli; konu atanamaz`);
  const t = konuBilgi.get(w.konu);
  if (w.konu && !t) hata(w.k._dosya, w.k._satir, `topic_code "${w.konu}" topics.csv içinde yok`);
  else if (t) {
    const s = surumler.find((x) => x.code === t.surum);
    if (s && (s.grade !== w.grade || s.ders !== w.ders)) hata(w.k._dosya, w.k._satir, `"${w.konu}" konusu ${s.ders} ${s.grade}. sınıfa ait; satır ${w.ders} ${w.grade}. sınıf diyor`);
  }
  // Veritabanı da zorlar (weekly_topics tetikleyicisi): konu, o yıl için grade_programs'ın gösterdiği sürümden gelmeli.
  const prog = programlar.find((p) => p.yil === w.yil && p.grade === w.grade && p.ders === w.ders);
  if (!prog) hata(w.k._dosya, w.k._satir, `${w.yil} ${w.ders} ${w.grade}. sınıf için grade_programs.csv'de program satırı yok; haftalık konu eklenemez`);
  else if (t && prog.surum !== t.surum) hata(w.k._dosya, w.k._satir, `"${w.konu}" konusu "${t.surum}" sürümünden; ${w.yil} ${w.ders} ${w.grade}. sınıf programı "${prog.surum}" sürümünü gösteriyor`);
});
const kaynakMap = new Map();
kaynaklar.forEach((r) => {
  benzersiz('resources (konu, başlık)', kaynakMap, `${r.konu}#${r.title}`, r.k);
  if (r.konu && !konuBilgi.has(r.konu)) hata(r.k._dosya, r.k._satir, `topic_code "${r.konu}" topics.csv içinde yok`);
});
// Bilgilendirme uyarıları
const kaynakli = new Set(kaynaklar.map((r) => r.konu));
konular.filter((t) => !kaynakli.has(t.code)).forEach((t) => uyari(`topics satır ${t.k._satir}: "${t.code}" konusunun hiç kaynağı yok`));
const dolu = new Set(haftalikKonular.map((w) => `${w.yil}#${w.grade}#${w.ders}#${w.hafta}`));
for (const p of programlar) for (const h of haftalar.filter((x) => x.yil === p.yil && !x.is_break)) {
  if (!dolu.has(`${p.yil}#${p.grade}#${p.ders}#${h.no}`)) uyari(`${p.yil} ${p.ders} ${p.grade}. sınıf, ${h.no}. hafta için konu yok ("konu bilgisi yok" olarak görünecek)`);
}

// ---------------------------------------------------------------------
// 3) Sonucu bildir
// ---------------------------------------------------------------------
const sayilar = { academic_years: yillar.length, academic_weeks: haftalar.length, curriculum_versions: surumler.length, grade_programs: programlar.length,
                  units: uniteler.length, topics: konular.length, weekly_topics: haftalikKonular.length, resources: kaynaklar.length };
console.log('Okunan satır sayıları:', JSON.stringify(sayilar));
if (uyarilar.length) { console.log(`\n${uyarilar.length} UYARI:`); uyarilar.slice(0, 40).forEach((u) => console.log('  - ' + u)); if (uyarilar.length > 40) console.log(`  ... ve ${uyarilar.length - 40} uyarı daha`); }
if (hatalar.length) {
  console.log(`\n${hatalar.length} HATA (migration ÜRETİLMEDİ):`);
  hatalar.slice(0, 100).forEach((h) => console.log('  x ' + h));
  if (hatalar.length > 100) console.log(`  ... ve ${hatalar.length - 100} hata daha`);
  process.exit(1);
}
if (Object.values(sayilar).every((x) => x === 0)) { console.log('\nHATA: hiçbir CSV dosyasında veri satırı yok; migration üretilmedi.'); process.exit(1); }
console.log('\nKontrol başarılı.');
if (SADECE_KONTROL) process.exit(0);

// ---------------------------------------------------------------------
// 4) SQL üret
// ---------------------------------------------------------------------
const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const n = (v) => (v === null || v === undefined ? 'null' : String(v));
const b = (v) => (v ? 'true' : 'false');
const satirlarSql = (liste, f) => liste.map((x) => '  (' + f(x).join(', ') + ')').join(',\n');

const sql = [];
const bolum = (liste, uret) => { if (liste.length > 0) sql.push(uret()); };   // boş tablo için GEÇERSİZ SQL üretme
sql.push(`-- =====================================================================
-- MÜFREDAT İÇERİĞİ — supabase/seed/curriculum/*.csv dosyalarından ÜRETİLDİ.
-- ELLE DÜZENLEMEYİN: CSV'yi değiştirip aracı yeniden çalıştırın
--   node supabase/seed/curriculum/csv-to-migration.mjs
-- Bu dosya yeniden çalıştırılabilir (idempotent): aynı veriyi tekrar uygulamak çoğaltmaz.
-- Kaynak CSV özetleri (sha256):`);
for (const [d, h] of Object.entries(ozetler)) sql.push(`--   ${d}: ${h}`);
if (ORNEK_IZIN) sql.push(`--
-- !!! UYARI: --ornek-izin ile üretildi; ÖRNEK satırlar içerebilir. ÜRETİME GÖNDERMEYİN. !!!`);
sql.push(`-- =====================================================================
-- Metin sabitleri standart kurallarla okunsun (ters eğik çizgi kaçış sayılmaz); CSV içeriği SQL olarak yorumlanamaz.
set local standard_conforming_strings = on;
`);

bolum(yillar, () => `-- 1) Öğretim yılları
insert into public.academic_years (id, starts_on, ends_on) values
${satirlarSql(yillar, (y) => [q(y.id), `${q(y.starts_on)}::date`, `${q(y.ends_on)}::date`])}
on conflict (id) do update set starts_on = excluded.starts_on, ends_on = excluded.ends_on;
`);
bolum(haftalar, () => `-- 2) Haftalar
insert into public.academic_weeks (academic_year_id, week_no, starts_on, ends_on, is_break, note) values
${satirlarSql(haftalar, (h) => [q(h.yil), n(h.no), `${q(h.starts_on)}::date`, `${q(h.ends_on)}::date`, b(h.is_break), q(h.note)])}
on conflict (academic_year_id, week_no) do update
  set starts_on = excluded.starts_on, ends_on = excluded.ends_on, is_break = excluded.is_break, note = excluded.note;
`);
bolum(surumler, () => `-- 3) Program sürümleri
insert into public.curriculum_versions (code, name, subject_id, grade, source_url)
select v.code, v.name, s.id, v.grade, v.source_url
from (values
${satirlarSql(surumler, (s) => [q(s.code), q(s.name), q(s.ders), `${n(s.grade)}::smallint`, q(s.source_url)])}
) as v(code, name, subject_code, grade, source_url)
join public.subjects s on s.code = v.subject_code
on conflict (code) do update
  set name = excluded.name, subject_id = excluded.subject_id, grade = excluded.grade, source_url = excluded.source_url;
`);
bolum(programlar, () => `-- 4) Hangi yıl, hangi sınıf+ders için hangi program geçerli
insert into public.grade_programs (academic_year_id, grade, subject_id, curriculum_version_id)
select v.year_id, v.grade, s.id, cv.id
from (values
${satirlarSql(programlar, (p) => [q(p.yil), `${n(p.grade)}::smallint`, q(p.ders), q(p.surum)])}
) as v(year_id, grade, subject_code, version_code)
join public.subjects s on s.code = v.subject_code
join public.curriculum_versions cv on cv.code = v.version_code
on conflict (academic_year_id, grade, subject_id) do update set curriculum_version_id = excluded.curriculum_version_id;
`);
bolum(uniteler, () => `-- 5) Üniteler (MERGE: (sürüm, sıra) ertelenebilir benzersizlik olduğundan ON CONFLICT kullanılmaz)
merge into public.units as u
using (
  select cv.id as cv_id, v.seq, v.title
  from (values
${satirlarSql(uniteler, (u) => [q(u.surum), `${n(u.seq)}::smallint`, q(u.title)]).replace(/^/gm, '  ')}
  ) as v(version_code, seq, title)
  join public.curriculum_versions cv on cv.code = v.version_code
) as s on (u.curriculum_version_id = s.cv_id and u.seq = s.seq)
when matched then update set title = s.title
when not matched then insert (curriculum_version_id, seq, title) values (s.cv_id, s.seq, s.title);
`);
bolum(konular, () => `-- 6) Konular (kararlı anahtar: code)
insert into public.topics (code, unit_id, seq, title, outcome_code, est_minutes, summary_md, mini_review_md)
select v.code, u.id, v.seq, v.title, v.outcome_code, v.est_minutes, v.summary_md, v.mini_review_md
from (values
${satirlarSql(konular, (t) => [q(t.code), q(t.surum), `${n(t.unit_seq)}::smallint`, `${n(t.seq)}::smallint`, q(t.title), q(t.outcome_code), `${n(t.est_minutes)}::smallint`, q(t.summary_md), q(t.mini_review_md)])}
) as v(code, version_code, unit_seq, seq, title, outcome_code, est_minutes, summary_md, mini_review_md)
join public.curriculum_versions cv on cv.code = v.version_code
join public.units u on u.curriculum_version_id = cv.id and u.seq = v.unit_seq
on conflict (code) do update
  set unit_id = excluded.unit_id, seq = excluded.seq, title = excluded.title, outcome_code = excluded.outcome_code,
      est_minutes = excluded.est_minutes, summary_md = excluded.summary_md, mini_review_md = excluded.mini_review_md;
`);
const uclular = [...new Set(haftalikKonular.map((w) => `${w.yil}|${w.grade}|${w.ders}`))].map((x) => x.split('|'));
bolum(haftalikKonular, () => `-- 7) Haftalık konu tablosu: CSV'de geçen (yıl, sınıf, ders) üçlüleri için tablo CSV'deki haline getirilir
delete from public.weekly_topics wt
using public.subjects s, (values
${uclular.map(([y, g, d]) => `  (${q(y)}, ${g}::smallint, ${q(d)})`).join(',\n')}
) as v(year_id, grade, subject_code)
where s.code = v.subject_code and wt.academic_year_id = v.year_id and wt.grade = v.grade and wt.subject_id = s.id;

insert into public.weekly_topics (academic_year_id, grade, subject_id, week_no, topic_id, seq)
select v.year_id, v.grade, s.id, v.week_no, t.id, v.seq
from (values
${satirlarSql(haftalikKonular, (w) => [q(w.yil), `${n(w.grade)}::smallint`, q(w.ders), `${n(w.hafta)}::smallint`, q(w.konu), `${n(w.seq)}::smallint`])}
) as v(year_id, grade, subject_code, week_no, topic_code, seq)
join public.subjects s on s.code = v.subject_code
join public.topics t on t.code = v.topic_code;
`);
bolum(kaynaklar, () => `-- 8) Kaynaklar (anahtar: konu + başlık). Kaldırmak için CSV'de is_active=FALSE yapın (satırı silmek kaynağı kaldırmaz).
insert into public.resources (topic_id, kind, title, url, provider, mode, est_minutes, requires_login, offline_ok, is_active, last_checked_at)
select t.id, v.kind, v.title, v.url, v.provider, v.mode, v.est_minutes, v.requires_login, v.offline_ok, v.is_active, now()
from (values
${satirlarSql(kaynaklar, (r) => [q(r.konu), q(r.kind), q(r.title), q(r.url), q(r.provider), q(r.mode), `${n(r.est_minutes)}::smallint`, b(r.requires_login), b(r.offline_ok), b(r.is_active)])}
) as v(topic_code, kind, title, url, provider, mode, est_minutes, requires_login, offline_ok, is_active)
join public.topics t on t.code = v.topic_code
on conflict (topic_id, title) do update
  set kind = excluded.kind, url = excluded.url, provider = excluded.provider, mode = excluded.mode,
      est_minutes = excluded.est_minutes, requires_login = excluded.requires_login,
      offline_ok = excluded.offline_ok, is_active = excluded.is_active, last_checked_at = excluded.last_checked_at;
`);

// ---------------------------------------------------------------------
// 5) Dosyayı yaz
// ---------------------------------------------------------------------
const simdi = new Date();
const zaman = simdi.toISOString().replace(/[-:T]/g, '').slice(0, 14);
const ad = (deger('--ad') ?? 'mufredat_icerik').replace(/[^a-z0-9_]/gi, '_');
const varsayilanYol = path.resolve(BURASI, '..', '..', 'migrations', `${zaman}_${ad}.sql`);
const cikti = deger('--cikti') ? path.resolve(deger('--cikti')) : varsayilanYol;
fs.writeFileSync(cikti, sql.join('\n'), 'utf8');
console.log(`\nYazıldı: ${path.relative(process.cwd(), cikti)}`);
if (!deger('--cikti')) console.log('Sonraki adım: dosyayı gözden geçirin, git\'e ekleyin, `supabase db reset` ile yerelde deneyin.');
