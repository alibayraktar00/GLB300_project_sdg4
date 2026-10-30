import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlanView } from './PlanView';
import { SAMPLE_PLAN } from './sample';

describe('PlanView (Planım)', () => {
  it('tek h1, ilerleme çubuğu ve konu listesi gösterir', () => {
    render(<PlanView data={SAMPLE_PLAN} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Planım' })).toBeInTheDocument();
    const bar = screen.getByRole('progressbar', { name: 'Plan ilerlemesi' });
    expect(bar).toHaveAttribute('value', '33');
    expect(screen.getByText('2 / 6 konu')).toBeInTheDocument();
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(6);
  });

  it('her durum yalnızca renkle değil yazıyla da belirtilir', () => {
    render(<PlanView data={SAMPLE_PLAN} />);
    expect(screen.getAllByText(/· Tamamlandı/)).toHaveLength(2);
    expect(screen.getAllByText(/· Sırada/)).toHaveLength(1);
    expect(screen.getAllByText(/· Atlandı/)).toHaveLength(1);
    expect(screen.getAllByText(/· Bekliyor/)).toHaveLength(2);
  });

  it('satırlar konu detayına bağlanır; "Konulara göz at" ve "Yeni plan oluştur" bağlantıları vardır', () => {
    render(<PlanView data={SAMPLE_PLAN} />);
    expect(screen.getByRole('link', { name: /Üslü ifadeler/ })).toHaveAttribute(
      'href',
      '/ogrenci/plan/ornek-1',
    );
    expect(screen.getByRole('link', { name: /Konulara göz at/ })).toHaveAttribute('href', '/ogrenci/konular');
    expect(screen.getByRole('link', { name: 'Yeni plan oluştur' })).toHaveAttribute('href', '/ogrenci/plan/olustur');
  });

  it('baskı yaratan ifadeler yoktur', () => {
    render(<PlanView data={SAMPLE_PLAN} />);
    expect(document.body.textContent).not.toMatch(/gecik|borç|seri|puan|rozet|geride/i);
  });

  it('plan yoksa boş durum ve "Plan oluştur" bağlantısı gösterir', () => {
    render(<PlanView data={{ items: [] }} />);
    expect(screen.getByText('Henüz bir planın yok')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plan oluştur' })).toHaveAttribute('href', '/ogrenci/plan/olustur');
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
