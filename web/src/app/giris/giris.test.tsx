import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { NoticeProvider } from '@/components/Notice';
import { tr } from '@/strings/tr';

import StudentLoginPage from './ogrenci/page';
import LoginPage from './page';

// Sunucu eylemleri Supabase'e bağlanır; sayfa testinde yalnızca forma bağlanmaları yeterli.
vi.mock('./actions', () => ({
  loginWithEmail: vi.fn(async () => null),
  loginStudent: vi.fn(async () => null),
}));

type Page = (props: { searchParams: Promise<{ devam?: string | string[] }> }) => Promise<ReactElement>;

async function renderPage(page: Page, devam?: string) {
  const element = await page({ searchParams: Promise.resolve(devam ? { devam } : {}) });
  return render(<NoticeProvider>{element}</NoticeProvider>);
}

describe('Giriş sayfası (/giris)', () => {
  it('"Öğrenciyim" bağlantısı öğrenci girişine gider', async () => {
    await renderPage(LoginPage);
    expect(screen.getByRole('link', { name: 'Öğrenciyim' })).toHaveAttribute('href', '/giris/ogrenci');
  });
});

describe('Öğrenci girişi (/giris/ogrenci)', () => {
  it('tek ana başlık ve açıklama gösterir', async () => {
    await renderPage(StudentLoginPage);
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(tr.auth.studentTitle);
    expect(screen.getByText(tr.auth.studentIntro)).toBeInTheDocument();
  });

  it('kullanıcı adı ve şifre sorar, e-posta sormaz', async () => {
    await renderPage(StudentLoginPage);
    expect(screen.getByLabelText(tr.auth.username)).toHaveAttribute('name', 'username');
    expect(screen.getByLabelText(tr.auth.password)).toHaveAttribute('type', 'password');
    expect(screen.queryByLabelText(tr.auth.email)).not.toBeInTheDocument();
  });

  it('veli/gönüllü girişine geri bağlantı verir', async () => {
    await renderPage(StudentLoginPage);
    expect(screen.getByRole('link', { name: tr.auth.adultLink })).toHaveAttribute('href', '/giris');
  });

  it('güvenli "devam" adresini gizli alana koyar, dış adresi atar', async () => {
    const { container, unmount } = await renderPage(StudentLoginPage, '/ogrenci/bugun');
    expect(container.querySelector('input[name="devam"]')).toHaveValue('/ogrenci/bugun');
    unmount();

    const dis = await renderPage(StudentLoginPage, 'https://kotu.example');
    expect(dis.container.querySelector('input[name="devam"]')).toBeNull();
  });
});
