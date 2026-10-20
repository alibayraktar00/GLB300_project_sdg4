import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { COOKIE_NOTICE_STORAGE_KEY } from '@/lib/appearance';
import { APP_ROLES, roleDestinations } from '@/lib/role-navigation';

import { AppShell } from './AppShell';
import { CookieNotice } from './CookieNotice';
import { NoticeProvider, NoticeRegion, useNotice } from './Notice';
import { SiteFooter } from './SiteFooter';
import { SkipLink } from './SkipLink';
import { WelcomeChoices } from './WelcomeChoices';

afterEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-cerez');
});

describe('AppShell', () => {
  it('tek <nav aria-label="Ana gezinme"> vardır ve içinde rolün hedefleri bulunur', () => {
    render(
      <AppShell appRole="ogrenci" currentPath="/ogrenci/bugun">
        <h1>Bugün</h1>
      </AppShell>,
    );
    const navs = screen.getAllByRole('navigation');
    expect(navs).toHaveLength(1);
    expect(navs[0]).toHaveAccessibleName('Ana gezinme');
    const links = within(navs[0]!).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Bugün', 'Plan', 'Sorular', 'Dersler']);
  });

  it('seçili hedef aria-current="page" ile işaretlenir, diğerleri işaretlenmez', () => {
    render(
      <AppShell appRole="veli" currentPath="/veli/sorular">
        <h1>Sorular</h1>
      </AppShell>,
    );
    const nav = screen.getByRole('navigation');
    const current = within(nav).getAllByRole('link', { current: 'page' });
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent('Sorular');
    expect(current[0]).toHaveAttribute('href', '/veli/sorular');
  });

  it('gezinme bağlantıları gerçek <a> ve adresleri rol önekiyle başlar', () => {
    for (const role of APP_ROLES) {
      const { unmount } = render(
        <AppShell appRole={role} currentPath="">
          <h1>Sayfa</h1>
        </AppShell>,
      );
      const nav = screen.getByRole('navigation');
      const hrefs = within(nav)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'));
      expect(hrefs).toEqual(roleDestinations(role).map((destination) => destination.path));
      unmount();
    }
  });

  it('ana alan <main id="icerik"> ("içeriğe geç" hedefi) ve sayfanın kendi <h1>\'ini taşır; kabuk başlık dayatmaz', () => {
    render(
      <AppShell appRole="gonullu" currentPath="/gonullu/pano">
        <h1>Pano</h1>
      </AppShell>,
    );
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'icerik');
    expect(within(main).getByRole('heading', { level: 1, name: 'Pano' })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('Bildirimler ve Ayarlar üst çubukta etiketli bağlantılardır (hedef değil, eylem)', () => {
    render(
      <AppShell appRole="ogrenci" currentPath="/ogrenci/bugun">
        <h1>Bugün</h1>
      </AppShell>,
    );
    expect(screen.getByRole('link', { name: 'Bildirimler' })).toHaveAttribute('href', '/ogrenci/bildirimler');
    expect(screen.getByRole('link', { name: 'Ayarlar' })).toHaveAttribute('href', '/ogrenci/ayarlar');
    const nav = screen.getByRole('navigation');
    expect(within(nav).queryByRole('link', { name: 'Ayarlar' })).toBeNull();
  });

  it('simgeler süstür; seçili hedef dolu simge kullanır', () => {
    const { container } = render(
      <AppShell appRole="ogrenci" currentPath="/ogrenci/plan">
        <h1>Plan</h1>
      </AppShell>,
    );
    for (const svg of container.querySelectorAll('svg')) expect(svg).toHaveAttribute('aria-hidden', 'true');

    const nav = screen.getByRole('navigation');
    const planIcon = within(nav).getByRole('link', { name: 'Plan' }).querySelector('path')?.getAttribute('d');
    const todayIcon = within(nav).getByRole('link', { name: 'Bugün' }).querySelector('path')?.getAttribute('d');
    expect(planIcon).toBeTruthy();
    expect(planIcon).not.toBe(todayIcon);
  });

  it('gömülü (galeri) sürümde sayfada ikinci <main> çıkmaz ve gezinme adı benzersizdir', () => {
    render(
      <div>
        <AppShell appRole="ogrenci" currentPath="/ogrenci/bugun" embedded={{ navLabel: 'Ana gezinme (telefon)' }}>
          <p>İçerik</p>
        </AppShell>
      </div>,
    );
    expect(screen.queryByRole('main')).toBeNull();
    expect(screen.getByRole('navigation', { name: 'Ana gezinme (telefon)' })).toBeInTheDocument();
  });
});

describe('SiteFooter ve SkipLink', () => {
  it('altbilgide /gizlilik ve /cerezler bağlantıları vardır', () => {
    render(<SiteFooter />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gizlilik' })).toHaveAttribute('href', '/gizlilik');
    expect(screen.getByRole('link', { name: 'Çerezler' })).toHaveAttribute('href', '/cerezler');
  });

  it('"İçeriğe geç" bağlantısı main#icerik hedefine gider', () => {
    render(<SkipLink />);
    expect(screen.getByRole('link', { name: 'İçeriğe geç' })).toHaveAttribute('href', '#icerik');
  });
});

describe('CookieNotice (bilgilendirme notu, rıza bandı değil)', () => {
  it('ilk ziyarette görünür: yalnızca "Tamam" düğmesi, "Kabul et / Reddet" yok', () => {
    render(<CookieNotice />);
    const note = screen.getByRole('region', { name: 'Çerez bilgilendirmesi' });
    expect(note).toHaveTextContent('Reklam veya analitik yoktur.');
    expect(within(note).getAllByRole('button')).toHaveLength(1);
    expect(within(note).getByRole('button', { name: 'Tamam' })).toBeInTheDocument();
    expect(note.textContent?.toLocaleLowerCase('tr-TR')).not.toMatch(/kabul|reddet/);
  });

  it('Çerez Politikası bağlantısı /cerezler adresine gider', () => {
    render(<CookieNotice />);
    expect(screen.getByRole('link', { name: 'Çerez Politikası' })).toHaveAttribute('href', '/cerezler');
  });

  it('sayfayı engellemez: diyalog ya da modal değildir, içerik etkileşimli kalır', () => {
    render(<CookieNotice />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(document.querySelector('[aria-modal]')).toBeNull();
  });

  it('"Tamam": not kapanır ve yalnızca "kapattığınız" bilgisi cihaza yazılır', () => {
    render(<CookieNotice />);
    fireEvent.click(screen.getByRole('button', { name: 'Tamam' }));
    expect(screen.queryByRole('region', { name: 'Çerez bilgilendirmesi' })).toBeNull();
    expect(window.localStorage.getItem(COOKIE_NOTICE_STORAGE_KEY)).toBe('1');
    expect(document.documentElement.getAttribute('data-cerez')).toBe('tamam');
    // Başka hiçbir anahtar yazılmaz.
    expect(window.localStorage.length).toBe(1);
  });

  it('kendiliğinden kapanmaz (zamanlayıcı yok) ve ilk gösterimde hiçbir şey yazmaz', () => {
    vi.useFakeTimers();
    render(<CookieNotice />);
    expect(window.localStorage.length).toBe(0);
    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000);
    });
    expect(screen.getByRole('region', { name: 'Çerez bilgilendirmesi' })).toBeInTheDocument();
    vi.useRealTimers();
  });
});

function NoticeButton({ message }: { message: string }) {
  const notice = useNotice();
  return (
    <button type="button" onClick={() => notice.show(message)}>
      Göster
    </button>
  );
}

describe('Notice (bildirim: kendiliğinden kaybolmaz, aria-live)', () => {
  function setup() {
    render(
      <NoticeProvider>
        <NoticeButton message="Kaydedildi." />
        <NoticeRegion />
      </NoticeProvider>,
    );
  }

  it('canlı bölge (role=status, aria-live=polite) bildirimden ÖNCE de sayfada bulunur', () => {
    setup();
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();
  });

  it('bildirim canlı bölgede görünür ve "Tamam" ile kapanır', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Göster' }));
    const region = screen.getByRole('status');
    expect(within(region).getByText('Kaydedildi.')).toBeInTheDocument();
    fireEvent.click(within(region).getByRole('button', { name: 'Tamam' }));
    expect(region).toBeEmptyDOMElement();
  });

  it('1 saat geçse de kendiliğinden KAYBOLMAZ (zaman aşımı yok)', () => {
    vi.useFakeTimers();
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Göster' }));
    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000);
    });
    expect(screen.getByText('Kaydedildi.')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('yeni bildirim öncekinin yerini alır (üst üste yığılmaz)', () => {
    render(
      <NoticeProvider>
        <NoticeButton message="Birinci" />
        <NoticeRegion />
      </NoticeProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Göster' }));
    fireEvent.click(screen.getByRole('button', { name: 'Göster' }));
    expect(screen.getAllByText('Birinci')).toHaveLength(1);
  });
});

describe('WelcomeChoices (açılış seçenekleri)', () => {
  function setup() {
    render(
      <NoticeProvider>
        <WelcomeChoices />
        <NoticeRegion />
      </NoticeProvider>,
    );
  }

  it('üç seçenek, her biri tamamı tıklanabilir tek düğme (başlık + açıklama birlikte)', () => {
    setup();
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('button', { name: /Veliyim Hesap açar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gönüllüyüm Üniversite/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Öğrenciyim Velimin verdiği kullanıcı adıyla giriş yaparım/ })).toBeInTheDocument();
  });

  it('seçeneğe dokunmak kalıcı "yakında" bildirimini gösterir', () => {
    vi.useFakeTimers();
    setup();
    fireEvent.click(screen.getByRole('button', { name: /Veliyim/ }));
    expect(within(screen.getByRole('status')).getByText('Giriş çok yakında açılacak.')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText('Giriş çok yakında açılacak.')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
