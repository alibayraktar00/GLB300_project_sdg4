import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Banner } from './Banner';
import { BrandMark } from './BrandMark';
import { Icon } from './Icon';
import { ProgressBar } from './ProgressBar';
import { SectionHeader } from './SectionHeader';
import { EmptyState, ErrorState, LoadingState, SkeletonList, StateView } from './StateViews';
import { Switch } from './Switch';
import { TextField } from './TextField';

describe('Banner (bilgi bandı)', () => {
  it('ton etiketi ekran okuyucuya yazıdan önce okunur; renk tek başına anlam taşımaz', () => {
    render(<Banner tone="warning">Konu sırası yaklaşıktır.</Banner>);
    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('Uyarı: Konu sırası yaklaşıktır.');
  });

  it('hata bandı role="alert", diğerleri role="status" (canlı bölge)', () => {
    const { rerender } = render(<Banner tone="info">Bilgi</Banner>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<Banner tone="error">Gönderilemedi.</Banner>);
    expect(screen.getByRole('alert')).toHaveTextContent('Hata: Gönderilemedi.');
  });

  it('kapatma düğmesi yalnızca onDismiss verilince çıkar ve etiketlidir', () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<Banner tone="success">Gönderildi.</Banner>);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(
      <Banner tone="success" onDismiss={onDismiss}>
        Gönderildi.
      </Banner>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mesajı kapat' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('kendiliğinden kaybolmaz (zamanlayıcı yok)', () => {
    vi.useFakeTimers();
    render(<Banner tone="info">Plan ve özetler internet olmadan da açılır.</Banner>);
    vi.advanceTimersByTime(10 * 60 * 1000);
    expect(screen.getByText('Plan ve özetler internet olmadan da açılır.')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('eylem ve başlık gösterilebilir', () => {
    render(
      <Banner tone="error" title="Gönderilemedi" action={<button type="button">Tekrar dene</button>}>
        Bağlantı gelince yeniden denenecek.
      </Banner>,
    );
    expect(screen.getByText('Gönderilemedi')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tekrar dene' })).toBeInTheDocument();
  });
});

describe('ProgressBar', () => {
  it('yerel <progress>: ad, değer ve "%30 tamamlandı" okunur', () => {
    render(<ProgressBar value={0.3} label="Plan ilerlemesi" caption="3 / 10 konu" />);
    const bar = screen.getByRole('progressbar', { name: 'Plan ilerlemesi' });
    expect(bar).toHaveAttribute('value', '30');
    expect(bar).toHaveAttribute('max', '100');
    expect(bar).toHaveAttribute('aria-valuetext', '%30 tamamlandı');
    expect(screen.getByText('3 / 10 konu')).toBeInTheDocument();
  });

  it('değer 0-1 aralığına sıkıştırılır', () => {
    render(<ProgressBar value={7} label="Taşan" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '100');
  });

  it('baskı yok: rozet, seri ya da gecikme metni içermez', () => {
    const { container } = render(<ProgressBar value={0.5} label="Plan ilerlemesi" caption="5 / 10 konu" />);
    expect(container.textContent?.toLocaleLowerCase('tr-TR')).not.toMatch(/geride|seri|rozet|borç/);
  });
});

describe('SectionHeader', () => {
  it('gerçek başlık öğesidir ve düzeyi seçilir', () => {
    const { rerender } = render(<SectionHeader title="Bugünün görevi" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Bugünün görevi' })).toBeInTheDocument();
    rerender(<SectionHeader title="Planım" level={1} subtitle="Matematik ve Fen" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Planım' })).toBeInTheDocument();
    expect(screen.getByText('Matematik ve Fen')).toBeInTheDocument();
  });

  it('sağdaki eylem gösterilir', () => {
    render(<SectionHeader title="Sorularım" action={<a href="/sorular">Tümünü gör</a>} />);
    expect(screen.getByRole('link', { name: 'Tümünü gör' })).toBeInTheDocument();
  });
});

describe('durum görünümleri', () => {
  it('EmptyState: başlık, açıklama ve tek eylem; hata gibi duyurulmaz', () => {
    render(<EmptyState title="Henüz sorun yok" message="İlk sorunu sorduğunda cevaplar burada görünür." actionLabel="Soru sor" />);
    expect(screen.getByRole('heading', { name: 'Henüz sorun yok' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Soru sor' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('EmptyState eylem verilmezse düğme göstermez', () => {
    render(<EmptyState message="Henüz öğe yok." />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Henüz bir şey yok' })).toBeInTheDocument();
  });

  it('ErrorState: suçlamaz, tek çıkış yolu verir ve duyurulur', () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Şu an yüklenemedi' })).toBeInTheDocument();
    expect(screen.getByText('Bağlantıda bir sorun olabilir. Biraz sonra tekrar denenebilir.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('LoadingState: görünür "Yükleniyor" yazısı canlı bölgede; gösterge süstür', () => {
    const { container } = render(<LoadingState />);
    expect(screen.getByRole('status')).toHaveTextContent('Yükleniyor');
    for (const svg of container.querySelectorAll('svg')) expect(svg.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  it('SkeletonList: tek "Yükleniyor" olarak okunur, taslak blokları gizlidir ve parıltı yoktur', () => {
    const { container } = render(<SkeletonList count={3} />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-busy', 'true');
    expect(region).toHaveTextContent('Yükleniyor');
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(3);
  });

  it('StateView başlık düzeyi seçilebilir (tam sayfa durumlarda h1)', () => {
    render(<StateView icon="wb_twilight" title="Sayfa bulunamadı" message="..." headingLevel={1} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sayfa bulunamadı' })).toBeInTheDocument();
  });
});

describe('TextField ve Switch', () => {
  it('TextField: etiket üstte ve alana bağlı; yardım ve hata aria-describedby ile bağlanır', () => {
    render(<TextField label="Kullanıcı adı" help="Küçük harflerle yaz." error="Bu kullanıcı adı bulunamadı." />);
    const input = screen.getByLabelText('Kullanıcı adı');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    expect(describedBy.split(' ')).toHaveLength(2);
    expect(document.getElementById(describedBy.split(' ')[0] ?? '')).toHaveTextContent('Küçük harflerle yaz.');
    expect(document.getElementById(describedBy.split(' ')[1] ?? '')).toHaveTextContent('Bu kullanıcı adı bulunamadı.');
  });

  it('TextField hatasız alan aria-invalid taşımaz; yapıştırma engellenmez', () => {
    render(<TextField label="Doğrulama kodu" autoComplete="one-time-code" inputMode="numeric" />);
    const input = screen.getByLabelText('Doğrulama kodu');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    expect(input).not.toHaveAttribute('onpaste');
  });

  it('Switch: role="switch", durum işaretli/değil, açıklama bağlı', () => {
    const onChange = vi.fn();
    render(<Switch label="Büyük yazı" help="Bu ayar yalnızca bu cihazda saklanır." onChange={onChange} />);
    const toggle = screen.getByRole('switch', { name: 'Büyük yazı' });
    expect(toggle).not.toBeChecked();
    expect(toggle).toHaveAccessibleDescription('Bu ayar yalnızca bu cihazda saklanır.');
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

describe('Icon ve BrandMark', () => {
  it('ikon varsayılan olarak süstür; label verilince img olur', () => {
    const { container, rerender } = render(<Icon name="info" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    rerender(<Icon name="info" label="Bilgi" />);
    expect(screen.getByRole('img', { name: 'Bilgi' })).toBeInTheDocument();
  });

  it('BrandMark süstür ve dış kaynak içermez', () => {
    const { container } = render(<BrandMark size="large" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(container.innerHTML).not.toMatch(/https?:|<image|href=/);
  });
});
