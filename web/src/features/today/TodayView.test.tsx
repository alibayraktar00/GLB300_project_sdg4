import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MODE_STORAGE_KEY, TodayView } from './TodayView';
import { SAMPLE_TODAY } from './sample';

beforeEach(() => window.localStorage.clear());
afterEach(() => window.localStorage.clear());

describe('TodayView (öğrenci Bugün)', () => {
  it('tek h1 (selamlama) ve görevleri gösterir; tarih, borç, gecikme ve seri yoktur', () => {
    render(<TodayView data={SAMPLE_TODAY} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Merhaba, Ela' })).toBeInTheDocument();
    expect(screen.getByText('Bugün için seni 2 konu bekliyor.')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/gecik|borç|seri|puan|rozet|geride/i);
  });

  it('ilk açılışta "5 dakika" önerilir ama hiçbir şey cihaza yazılmaz', () => {
    render(<TodayView data={SAMPLE_TODAY} />);
    expect(screen.getByRole('radio', { name: /5 dakika/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Tam ders/ })).not.toBeChecked();
    expect(window.localStorage.getItem(MODE_STORAGE_KEY)).toBeNull();
    expect(screen.getByText('5 dakikalık tekrar')).toBeInTheDocument();
  });

  it('mod değişince görev kartı anında güncellenir ve seçim yalnızca o zaman saklanır', () => {
    render(<TodayView data={SAMPLE_TODAY} />);
    fireEvent.click(screen.getByRole('radio', { name: /Tam ders/ }));
    expect(screen.getByText('Yaklaşık 25 dakika')).toBeInTheDocument();
    expect(window.localStorage.getItem(MODE_STORAGE_KEY)).toBe('full');
  });

  it('kayıtlı mod varsa açılışta uygulanır', () => {
    window.localStorage.setItem(MODE_STORAGE_KEY, 'full');
    render(<TodayView data={SAMPLE_TODAY} />);
    expect(screen.getByRole('radio', { name: /Tam ders/ })).toBeChecked();
  });

  it('bozuk kayıt yok sayılır', () => {
    window.localStorage.setItem(MODE_STORAGE_KEY, 'bozuk');
    render(<TodayView data={SAMPLE_TODAY} />);
    expect(screen.getByRole('radio', { name: /5 dakika/ })).toBeChecked();
  });

  it('tek birincil eylem "Göreve başla"; diğer görevler satır bağlantısıdır', () => {
    render(<TodayView data={SAMPLE_TODAY} />);
    const start = screen.getAllByRole('link', { name: 'Göreve başla' });
    expect(start).toHaveLength(1);
    expect(start[0]).toHaveAttribute('href', '/ogrenci/plan/ornek-1');
    const later = screen.getByRole('heading', { name: 'Sonraki görevler' }).closest('section');
    expect(later).not.toBeNull();
    expect(within(later as HTMLElement).getByRole('link', { name: /Kareköklü ifadeler/ })).toBeInTheDocument();
  });

  it('ilerleme çubuğu adlı ve sayısal değerlidir', () => {
    render(<TodayView data={SAMPLE_TODAY} />);
    const bar = screen.getByRole('progressbar', { name: 'Plan ilerlemesi' });
    expect(bar).toHaveAttribute('value', '30');
    expect(screen.getByText('3 / 10 konu')).toBeInTheDocument();
  });

  it('yaklaşan ders ve yeni cevaplar yalnızca varsa görünür', () => {
    const { rerender } = render(<TodayView data={SAMPLE_TODAY} />);
    expect(screen.getByRole('heading', { name: 'Yaklaşan ders' })).toBeInTheDocument();
    expect(screen.getByText('1 sorunun yeni bir cevabı var')).toBeInTheDocument();
    rerender(<TodayView data={{ ...SAMPLE_TODAY, upcomingLesson: undefined, newAnswers: 0 }} />);
    expect(screen.queryByRole('heading', { name: 'Yaklaşan ders' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Yeni cevaplar' })).toBeNull();
  });

  it('plan yoksa boş durum ve "Plan oluştur" görünür; mod seçimi gizlenir', () => {
    render(<TodayView data={{ ...SAMPLE_TODAY, tasks: [], completed: 0, total: 0 }} />);
    expect(screen.getByText('Henüz bir planın yok')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Plan oluştur' })).toHaveAttribute('href', '/ogrenci/plan');
    expect(screen.queryByRole('radio')).toBeNull();
  });
});
