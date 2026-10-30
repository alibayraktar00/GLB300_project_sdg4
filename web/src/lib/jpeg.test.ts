import { describe, expect, it } from 'vitest';

import { inspectJpeg, MAX_PHOTO_BYTES } from './jpeg';

/** Minimal geçerli JPEG iskeleti: SOI, (isteğe bağlı) APP segmentleri, SOS, birkaç veri baytı, EOI. */
function jpeg(segments: Array<{ marker: number; payload: number[] }> = []): Uint8Array {
  const out: number[] = [0xff, 0xd8];
  for (const { marker, payload } of segments) {
    const length = payload.length + 2;
    out.push(0xff, marker, (length >> 8) & 0xff, length & 0xff, ...payload);
  }
  out.push(0xff, 0xda, 0x00, 0x02, 0x12, 0x34, 0xff, 0xd9);
  return Uint8Array.from(out);
}

const exifPayload = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x4d, 0x4d]; // "Exif\0\0MM"

describe('inspectJpeg', () => {
  it('üst verisiz geçerli JPEG kabul edilir', () => {
    expect(inspectJpeg(jpeg())).toEqual({ ok: true });
  });

  it('APP0 (JFIF) ve DQT gibi zararsız segmentler kabul edilir', () => {
    expect(inspectJpeg(jpeg([{ marker: 0xe0, payload: [0x4a, 0x46, 0x49, 0x46, 0x00] }, { marker: 0xdb, payload: [0, 1, 2] }]))).toEqual({ ok: true });
  });

  it('EXIF (APP1) taşıyan fotoğraf reddedilir (konum/cihaz bilgisi)', () => {
    expect(inspectJpeg(jpeg([{ marker: 0xe1, payload: exifPayload }]))).toEqual({ ok: false, reason: 'ustveri' });
  });

  it('XMP de APP1 olduğundan reddedilir', () => {
    const xmp = Array.from(new TextEncoder().encode('http://ns.adobe.com/xap/1.0/\0'));
    expect(inspectJpeg(jpeg([{ marker: 0xe1, payload: xmp }]))).toEqual({ ok: false, reason: 'ustveri' });
  });

  it('EXIF, başka segmentlerin arkasına gizlenmiş olsa da bulunur', () => {
    const result = inspectJpeg(
      jpeg([{ marker: 0xe0, payload: [1, 2, 3] }, { marker: 0xdb, payload: [1] }, { marker: 0xe1, payload: exifPayload }]),
    );
    expect(result).toEqual({ ok: false, reason: 'ustveri' });
  });

  it.each([
    ['PNG', Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ['düz metin', new TextEncoder().encode('merhaba dunya')],
    ['HTML', new TextEncoder().encode('<html><script>alert(1)</script>')],
    ['GIF', new TextEncoder().encode('GIF89a....')],
    ['yalnızca SOI', Uint8Array.from([0xff, 0xd8])],
    ['SOS olmadan biten', Uint8Array.from([0xff, 0xd8, 0xff, 0xd9, 0, 0])],
  ])('JPEG olmayan ya da bozuk: %s', (_name, bytes) => {
    const result = inspectJpeg(bytes);
    expect(result.ok).toBe(false);
  });

  it('boş ve 2 MB üstü dosya "boyut" hatası verir', () => {
    expect(inspectJpeg(new Uint8Array(0))).toEqual({ ok: false, reason: 'boyut' });
    expect(inspectJpeg(new Uint8Array(MAX_PHOTO_BYTES + 1))).toEqual({ ok: false, reason: 'boyut' });
  });

  it('bozuk segment uzunluğu reddedilir', () => {
    expect(inspectJpeg(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00, 0xff, 0xda]))).toEqual({ ok: false, reason: 'bicim' });
  });
});
