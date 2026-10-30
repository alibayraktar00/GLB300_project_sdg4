/**
 * Yüklenen soru fotoğrafının sunucu tarafı denetimi. İstemcinin söylediğine (dosya adı, Content-Type) güvenilmez;
 * baytların kendisine bakılır:
 *   - gerçek bir JPEG olmalı (FF D8 FF ile başlar),
 *   - en çok 2 MB,
 *   - EXIF / XMP gibi üst veri (APP1) taşımamalı: telefon fotoğrafları çekim yerini (GPS), cihaz modelini ve
 *     zamanı içerebilir. İstemci fotoğrafı yeniden kodlayarak bunları siler; bu denetim, istemci atlatılsa bile
 *     konumlu bir fotoğrafın çocuğun hesabına yüklenmesini engeller (veri minimizasyonu, çocuk gizliliği).
 */

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export type JpegCheck = { ok: true } | { ok: false; reason: 'bicim' | 'boyut' | 'ustveri' };

export function inspectJpeg(bytes: Uint8Array): JpegCheck {
  if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) return { ok: false, reason: 'boyut' };
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    return { ok: false, reason: 'bicim' };
  }

  // Görüntü verisinden (SOS) önceki işaretçi dizisini gez; APP1 (0xE1) = EXIF/XMP varsa reddet.
  let position = 2;
  while (position + 4 <= bytes.length) {
    if (bytes[position] !== 0xff) return { ok: false, reason: 'bicim' };
    const marker = bytes[position + 1] as number;
    if (marker === 0xff) {
      position += 1; // dolgu baytı
      continue;
    }
    if (marker === 0xda) return { ok: true }; // SOS: görüntü verisi başlıyor
    if (marker === 0xd9) return { ok: false, reason: 'bicim' }; // görüntü verisi olmadan bitti
    if (marker >= 0xd0 && marker <= 0xd8) {
      position += 2; // uzunluğu olmayan işaretçiler (RST, SOI)
      continue;
    }
    const length = ((bytes[position + 2] as number) << 8) | (bytes[position + 3] as number);
    if (length < 2) return { ok: false, reason: 'bicim' };
    if (marker === 0xe1) return { ok: false, reason: 'ustveri' };
    position += 2 + length;
  }
  return { ok: false, reason: 'bicim' };
}
