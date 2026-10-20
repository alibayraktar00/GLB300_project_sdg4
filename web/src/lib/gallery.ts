/**
 * Bileşen galerisi (`/galeri`) yalnızca geliştirmede açılır (plan 7.4).
 *
 *   - `next dev`                       -> açık
 *   - üretim derlemesi (`next start`)  -> kapalı; yalnızca `GALLERY=on` ile açılır
 *     (yerel ve CI'da erişilebilirlik testleri için)
 *   - Vercel üretim ortamı (`VERCEL_ENV=production`) -> HER ZAMAN kapalı, `GALLERY=on` olsa bile
 *
 * Kapalıyken sayfa 404 döner (src/app/galeri/page.tsx). Bu kural test edilir.
 */
export function isGalleryEnabled(env: Record<string, string | undefined>): boolean {
  if (env.VERCEL_ENV === 'production') return false;
  if (env.NODE_ENV !== 'production') return true;
  return env.GALLERY === 'on';
}
