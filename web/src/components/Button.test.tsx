import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button, ButtonLink } from './Button';

describe('Button', () => {
  it('varsayılan tür "button"dır (form göndermez)', () => {
    render(<Button>Gönder</Button>);
    expect(screen.getByRole('button', { name: 'Gönder' })).toHaveAttribute('type', 'button');
  });

  it('tıklanınca onClick çağrılır', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Başla</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Başla' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('pasif düğme tıklanmaz ve devre dışı olarak bildirilir', () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Henüz hazır değil
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Henüz hazır değil' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('yükleniyor: tıklanmaz, form göndermez, aria-busy işaretlenir ve "Yükleniyor" okunur', () => {
    const onClick = vi.fn();
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit" loading onClick={onClick}>
          Kaydet
        </Button>
      </form>,
    );
    const button = screen.getByRole('button', { name: 'Kaydet, Yükleniyor' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('type', 'button');
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submit türü form içinde gönderir', () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Gönder</Button>
      </form>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Gönder' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('simge süstür (ekran okuyucudan gizli), etiket tek başına anlamlı', () => {
    const { container } = render(<Button icon="play_arrow">Göreve başla</Button>);
    expect(screen.getByRole('button', { name: 'Göreve başla' })).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('ButtonLink', () => {
  it('bağlantı olarak (<a>) çizilir ve adresi taşır', () => {
    render(<ButtonLink href="/ogrenci/bugun">Bugüne git</ButtonLink>);
    expect(screen.getByRole('link', { name: 'Bugüne git' })).toHaveAttribute('href', '/ogrenci/bugun');
  });

  it('harici adreste noopener noreferrer eklenir (yönlendiren bilgisi gitmez)', () => {
    render(
      <ButtonLink href="https://eba.gov.tr" external>
        EBA
      </ButtonLink>,
    );
    expect(screen.getByRole('link', { name: 'EBA' })).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
