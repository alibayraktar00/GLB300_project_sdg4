import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NoticeProvider } from '@/components/Notice';
import { GalleryPage } from '@/features/gallery/GalleryPage';

import GalleryRoute from './page';

afterEach(() => vi.unstubAllEnvs());

/** `notFound()` Next'in 404 özel hatasını fırlatır (digest "NEXT_HTTP_ERROR_FALLBACK;404"). */
const is404 = (error: unknown) => String((error as { digest?: string }).digest).includes('404');

describe('/galeri üretimde erişilemez (404), geliştirmede açılır', () => {
  it('üretim derlemesinde (GALLERY yok) notFound fırlatır', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('GALLERY', '');
    await expect(GalleryRoute({ searchParams: Promise.resolve({}) })).rejects.toSatisfy(is404);
  });

  it('GALLERY=on bile olsa Vercel üretim ortamında notFound fırlatır', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('GALLERY', 'on');
    vi.stubEnv('VERCEL_ENV', 'production');
    await expect(GalleryRoute({ searchParams: Promise.resolve({}) })).rejects.toSatisfy(is404);
  });

  it('geliştirmede ve GALLERY=on ile galeri sayfasını döndürür', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    await expect(GalleryRoute({ searchParams: Promise.resolve({}) })).resolves.toBeTruthy();

    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('GALLERY', 'on');
    await expect(GalleryRoute({ searchParams: Promise.resolve({ rol: 'yonetici' }) })).resolves.toBeTruthy();
  });
});

describe('galeri içeriği', () => {
  function renderGallery(role: 'ogrenci' | 'yonetici' = 'ogrenci') {
    return render(
      <NoticeProvider>
        <GalleryPage role={role} />
      </NoticeProvider>,
    );
  }

  it('tek h1 ve tek main; tüm bölümler başlıklıdır', () => {
    renderGallery();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    for (const title of [
      'Renkler ve kontrast',
      'Yazı ölçeği',
      'Düğmeler',
      'Kartlar',
      'Seçilebilir kartlar',
      'Bilgi bantları',
      'İlerleme',
      'Durumlar',
      'Form öğeleri',
      'Bildirimler',
      'Gezinme iskeleti',
      'Hareket',
      'İkonlar',
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument();
    }
  });

  it('4 tema yan yana: her kutu kendi data-theme değerini taşır ve gerçek oranları yazar', () => {
    const { container } = renderGallery();
    const themes = [...container.querySelectorAll('[data-theme]')].map((element) => element.getAttribute('data-theme'));
    expect(themes).toEqual(['light', 'dark', 'hc-light', 'hc-dark']);
    const hcDark = container.querySelector('[data-theme="hc-dark"]') as HTMLElement;
    expect(within(hcDark).getByText('on-surface / surface').parentElement).toHaveTextContent('21.0:1');
  });

  it('rol iskeleti örnekleri: iki gezinme (telefon ve geniş) benzersiz adlarla; sayfada ikinci main yok', () => {
    renderGallery('yonetici');
    expect(screen.getByRole('navigation', { name: /Ana gezinme \(Telefon/ })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /Ana gezinme \(Geniş/ })).toBeInTheDocument();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    const nav = screen.getByRole('navigation', { name: /Ana gezinme \(Telefon/ });
    expect(within(nav).getAllByRole('link')).toHaveLength(5);
  });

  it('önizleme ayarları: tema, yazı boyutu (%200 dahil), yüksek kontrast ve animasyon', () => {
    renderGallery();
    expect(screen.getByRole('radio', { name: 'Sistem' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '%200' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Yüksek kontrast' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Animasyonları azalt' })).toBeInTheDocument();
  });
});
