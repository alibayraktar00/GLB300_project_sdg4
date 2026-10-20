import { fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { tr } from '@/strings/tr';

import ErrorPage from './error';
import GlobalError from './global-error';

// next/font/local derleme zamanında çalışır; testte yerine yalnızca sınıf adı veren bir sahte kullanılır.
vi.mock('./fonts', () => ({
  atkinson: { variable: 'atkinson-test' },
  atkinsonHeavy: { variable: 'atkinson-heavy-test' },
}));

describe('hata sayfası (error.tsx)', () => {
  it('sakin dil: tek h1, açıklama, "Tekrar dene" ve ana sayfaya dönüş', () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error('gizli teknik ayrıntı')} reset={reset} />);

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: tr.error.title })).toBeInTheDocument();
    expect(screen.getByText(tr.error.body)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: tr.error.home })).toHaveAttribute('href', '/');

    fireEvent.click(screen.getByRole('button', { name: tr.error.retry }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('teknik ayrıntı ASLA gösterilmez (üretimde hata metni sızmaz)', () => {
    render(<ErrorPage error={Object.assign(new Error('SUPABASE_URL eksik'), { digest: 'abc123' })} reset={() => {}} />);
    expect(document.body.textContent).not.toContain('SUPABASE_URL');
    expect(document.body.textContent).not.toContain('abc123');
  });

  it('hata mesajı canlı bölgede duyurulur ve ana alan içindedir', () => {
    render(<ErrorPage error={new Error('x')} reset={() => {}} />);
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 1 }));
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(1);
  });
});

describe('genel hata sayfası (global-error.tsx)', () => {
  it('kendi <html lang="tr"> ve tek <h1> ile çizilir; teknik ayrıntı yok', () => {
    const html = renderToStaticMarkup(<GlobalError error={new Error('gizli ayrıntı')} reset={() => {}} />);
    expect(html).toContain('<html lang="tr"');
    expect(html).toContain(`>${tr.error.title}</h1>`);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain(tr.error.retry);
    expect(html).toContain(tr.error.home);
    expect(html).not.toContain('gizli ayrıntı');
  });
});
