// =====================================================================
// Müfredat CSV okuyucusu (ek paket gerektirmez). csv-to-migration.mjs ve testleri kullanır.
//
// Kurallar (RFC 4180'e yakın, hataya karşı katı):
//  * Dosya geçerli UTF-8 olmalı; değilse HANGİ SATIRDA bozulduğu söylenir (Excel'de "CSV UTF-8" kaydedin).
//  * UTF-8 BOM atlanır. Ayraç, başlık satırından otomatik bulunur: virgül veya noktalı virgül
//    (Türkçe Excel ";" kullanır). Tırnak İÇİNDEKİ ayraçlar sayılmaz.
//  * Tırnak yalnızca ALAN BAŞINDA açılır. Alanın ortasındaki " olduğu gibi (düz karakter) kalır
//    (örn. 5" tahta). Tırnaklı alanda "" bir tırnak demektir; satır sonu ve ayraç serbesttir.
//  * Kapanmamış tırnak, açıldığı SATIR NUMARASIYLA hata verir (sessizce sonraki satırları yutmaz).
//  * Tırnak kapandıktan sonra ayraç ya da satır sonundan başka karakter gelirse hata verilir.
//  * Tamamen boş satırlar atlanır. Her kayıt, dosyadaki başladığı fiziksel SATIR numarasını taşır.
// =====================================================================

export class CsvHatasi extends Error {
  constructor(mesaj, satir) {
    super(mesaj);
    this.name = 'CsvHatasi';
    this.satir = satir ?? null;
  }
}

/** Baytları katı UTF-8 olarak çözer; bozuksa ilk bozuk satırı bildirir. */
export function utf8Coz(bayt) {
  const dec = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
  try {
    return dec.decode(bayt);
  } catch {
    let satir = 1;
    let bas = 0;
    for (let i = 0; i <= bayt.length; i++) {
      if (i === bayt.length || bayt[i] === 0x0a) {
        try { dec.decode(bayt.subarray(bas, i)); } catch {
          throw new CsvHatasi('dosya geçerli UTF-8 değil (Türkçe karakterler bozuk). Excel\'de "CSV UTF-8 (virgülle ayrılmış)" olarak kaydedin', satir);
        }
        satir++;
        bas = i + 1;
      }
    }
    throw new CsvHatasi('dosya geçerli UTF-8 değil. Excel\'de "CSV UTF-8 (virgülle ayrılmış)" olarak kaydedin', null);
  }
}

/** Başlık (ilk) kaydındaki, TIRNAK DIŞINDA kalan virgül ve noktalı virgülleri sayıp ayracı seçer. */
export function ayracBul(metin) {
  let virgul = 0;
  let noktaliVirgul = 0;
  let tirnakta = false;
  let alanBasi = true;
  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnakta) {
      if (c === '"') {
        if (metin[i + 1] === '"') i++; else tirnakta = false;
      }
      continue;
    }
    if (c === '\n' || c === '\r') break;       // yalnızca ilk kayıt
    if (c === '"' && alanBasi) { tirnakta = true; alanBasi = false; continue; }
    if (c === ',') { virgul++; alanBasi = true; continue; }
    if (c === ';') { noktaliVirgul++; alanBasi = true; continue; }
    alanBasi = false;
  }
  return noktaliVirgul > virgul ? ';' : ',';
}

/** Metni kayıtlara ayırır: [{ satir, alanlar: [...] }]. Kapanmamış tırnakta CsvHatasi fırlatır. */
export function csvOku(metin) {
  if (metin.charCodeAt(0) === 0xfeff) metin = metin.slice(1);
  const ayrac = ayracBul(metin);
  const kayitlar = [];
  let alanlar = [];
  let alan = '';
  let tirnakta = false;
  let tirnakSatiri = 0;
  let alanBasi = true;
  let tirnakKapandi = false;      // tırnaklı alan bitti; sıradaki karakter ayraç / satır sonu olmalı
  let satir = 1;                  // şu anki fiziksel satır
  let kayitSatiri = 1;            // kaydın başladığı satır

  const kayitiBitir = () => {
    alanlar.push(alan);
    if (alanlar.some((a) => a.trim() !== '')) kayitlar.push({ satir: kayitSatiri, alanlar });
    alanlar = [];
    alan = '';
    alanBasi = true;
    tirnakKapandi = false;
  };

  for (let i = 0; i < metin.length; i++) {
    const c = metin[i];
    if (tirnakta) {
      if (c === '"') {
        if (metin[i + 1] === '"') { alan += '"'; i++; } else { tirnakta = false; tirnakKapandi = true; }
      } else {
        if (c === '\n') satir++;
        alan += c;
      }
      continue;
    }
    if (c === '\r' || c === '\n') {
      if (c === '\r' && metin[i + 1] === '\n') i++;
      kayitiBitir();
      satir++;
      kayitSatiri = satir;
      continue;
    }
    if (tirnakKapandi) {
      if (c === ayrac) { alanlar.push(alan); alan = ''; alanBasi = true; tirnakKapandi = false; continue; }
      throw new CsvHatasi('tırnaklı alan kapandıktan sonra ayraç ya da satır sonu gelmeli (beklenmeyen karakter: "' + c + '")', satir);
    }
    if (c === ayrac) { alanlar.push(alan); alan = ''; alanBasi = true; continue; }
    if (c === '"' && alanBasi) { tirnakta = true; tirnakSatiri = satir; alanBasi = false; continue; }
    alan += c;                       // alanın ortasındaki tırnak düz karakterdir
    alanBasi = false;
  }
  if (tirnakta) throw new CsvHatasi('kapanmamış tırnak (" açıldı ama kapatılmadı); sonraki satırlar bu alana karışmış olurdu', tirnakSatiri);
  if (alan !== '' || alanlar.length) kayitiBitir();
  return { ayrac, kayitlar };
}
