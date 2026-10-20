import { describe, expect, it } from 'vitest';

import { isGalleryEnabled } from './gallery';

describe('galeri yalnızca geliştirmede açılır', () => {
  it('next dev (NODE_ENV=development): açık', () => {
    expect(isGalleryEnabled({ NODE_ENV: 'development' })).toBe(true);
  });

  it('test ortamı: açık', () => {
    expect(isGalleryEnabled({ NODE_ENV: 'test' })).toBe(true);
  });

  it('üretim derlemesi: GALLERY verilmezse KAPALI', () => {
    expect(isGalleryEnabled({ NODE_ENV: 'production' })).toBe(false);
    expect(isGalleryEnabled({ NODE_ENV: 'production', GALLERY: 'off' })).toBe(false);
    expect(isGalleryEnabled({ NODE_ENV: 'production', GALLERY: '1' })).toBe(false);
  });

  it('üretim derlemesi: yalnızca GALLERY=on ile açılır (yerel ve CI erişilebilirlik testleri)', () => {
    expect(isGalleryEnabled({ NODE_ENV: 'production', GALLERY: 'on' })).toBe(true);
  });

  it('Vercel üretim ortamında HİÇBİR koşulda açılmaz', () => {
    expect(isGalleryEnabled({ NODE_ENV: 'production', GALLERY: 'on', VERCEL_ENV: 'production' })).toBe(false);
    expect(isGalleryEnabled({ NODE_ENV: 'development', VERCEL_ENV: 'production' })).toBe(false);
  });

  it('Vercel önizleme ortamında GALLERY=on olmadıkça kapalıdır', () => {
    expect(isGalleryEnabled({ NODE_ENV: 'production', VERCEL_ENV: 'preview' })).toBe(false);
  });
});
