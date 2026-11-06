import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { NoticeProvider } from '@/components/Notice';
import { tr } from '@/strings/tr';

import NotFound from './not-found';
import HomePage from './page';

function renderHome() {
  return render(
    <NoticeProvider>
      <HomePage />
    </NoticeProvider>,
  );
}

describe('Ana sayfa', () => {
  it('tek bir ana başlık gösterir', () => {
    renderHome();
    const basliklar = screen.getAllByRole('heading', { level: 1 });
    expect(basliklar).toHaveLength(1);
    expect(basliklar[0]).toHaveTextContent(tr.home.title);
  });

  it('kısa açıklama metnini gösterir', () => {
    renderHome();
    expect(screen.getByText(tr.home.description)).toBeInTheDocument();
  });

  it('ana alan (main) tek ve "içeriğe geç" hedefidir; altbilgi bağlantıları vardır', () => {
    renderHome();
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main')).toHaveAttribute('id', 'icerik');
    expect(screen.getByRole('link', { name: 'Gizlilik' })).toHaveAttribute('href', '/gizlilik');
    expect(screen.getByRole('link', { name: 'Çerezler' })).toHaveAttribute('href', '/cerezler');
  });

  it('giriş bağlantısı görünür', () => {
    renderHome();
    expect(screen.getByRole('link', { name: 'Giriş yap' })).toHaveAttribute('href', '/giris');
  });

  it('başlık sırası atlanmaz: h1 sonra h2', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 2, name: 'Başlayalım' })).toBeInTheDocument();
  });
});

describe('404 sayfası', () => {
  it('sakin dil: tek h1 ve ana sayfaya dönüş bağlantısı', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { level: 1, name: tr.notFound.title })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: tr.notFound.home })).toHaveAttribute('href', '/');
  });
});
