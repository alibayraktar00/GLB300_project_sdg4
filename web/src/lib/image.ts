/**
 * Tarayıcıda fotoğraf hazırlama (yalnızca istemci). Telefon fotoğrafları büyüktür (4-12 MB) ve çekim yerini
 * (GPS), cihaz modelini ve zamanı taşıyan EXIF içerir. Fotoğraf bir tuvale çizilip yeniden JPEG olarak kodlanınca:
 *   - boyutu küçülür (zayıf internet ve 2 MB sınırı için),
 *   - tüm üst veri silinir (çocuğun gizliliği),
 *   - yön bilgisi (EXIF döndürme) görüntüye uygulanmış olur.
 * Sunucu yine de her dosyayı denetler (src/lib/jpeg.ts); bu yalnızca doğru yolu kolaylaştırır.
 */

/** En uzun kenar bu değeri aşmasın: soru fotoğrafının okunması için yeterli, ağ için hafif. */
export const MAX_EDGE = 1600;
/** Hedef boyut: sunucu sınırının (2 MB) altında pay bırakır. */
export const TARGET_BYTES = 1_500_000;

/** En-boy oranını koruyarak `max` kenara sığdırır; küçük görüntüyü büyütmez. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 };
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export class PhotoError extends Error {
  /**
   * @param code İstemci tarafı neden
   * @param serverCode Sunucunun döndürdüğü neden kodu (varsa); arayüz onu tercih eder
   */
  constructor(
    readonly code: 'okunamadi' | 'buyuk',
    readonly serverCode?: string,
  ) {
    super(code);
    this.name = 'PhotoError';
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/** Seçilen görüntü dosyasını küçültüp üst verisiz JPEG'e çevirir. */
export async function prepareJpeg(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    // 'from-image': EXIF yönünü uygular, yani dik çekilmiş fotoğraf yan görünmez.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new PhotoError('okunamadi');
  }
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_EDGE);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new PhotoError('okunamadi');
    context.fillStyle = '#ffffff'; // saydam PNG'ler siyah olmasın
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);

    for (const quality of [0.82, 0.7, 0.55, 0.4]) {
      const blob = await toBlob(canvas, quality);
      if (!blob) throw new PhotoError('okunamadi');
      if (blob.size <= TARGET_BYTES) return blob;
    }
    throw new PhotoError('buyuk');
  } finally {
    bitmap.close();
  }
}
