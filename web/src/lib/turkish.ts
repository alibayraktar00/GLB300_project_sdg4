/**
 * Türkçe büyük/küçük harf yardımcıları (plan 3.8).
 *
 * Neden gerekli? JavaScript'in `"i".toUpperCase()` çağrısı "I" döndürür; Türkçede doğrusu "İ"dir.
 * Aynı şekilde "I".toLowerCase() "i" olur, Türkçede "ı" olmalıdır. Bu yüzden çıplak
 * `toUpperCase()` ve `toLowerCase()` ESLint ile yasaktır; bunun yerine buradaki fonksiyonlar kullanılır.
 */

const TR = 'tr-TR';

/** Türkçe kurallarına göre büyük harf: "ışık" -> "IŞIK", "iğne" -> "İĞNE". */
export function upperTr(text: string): string {
  return text.toLocaleUpperCase(TR);
}

/** Türkçe kurallarına göre küçük harf: "IŞIK" -> "ışık", "İĞNE" -> "iğne". */
export function lowerTr(text: string): string {
  return text.toLocaleLowerCase(TR);
}

/**
 * Yalnızca A-Z harflerini küçültür, diğer karakterlere dokunmaz.
 * Türkçe olmayan, ASCII değerler içindir: e-posta adresi, MIME türü, dosya uzantısı gibi.
 * ("I" her zaman "i" olur; yerel ayardan etkilenmez.)
 */
export function lowerAscii(text: string): string {
  return text.replace(/[A-Z]/g, (harf) => String.fromCharCode(harf.charCodeAt(0) + 32));
}
