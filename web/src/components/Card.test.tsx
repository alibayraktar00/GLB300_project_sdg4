import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Card, CardButton, CardContent, CardLink } from './Card';
import { RadioCard, RadioCardGroup } from './RadioCard';

describe('Card', () => {
  it('CardLink: kartın TAMAMI tek bağlantıdır; adı başlık + açıklamadır', () => {
    render(
      <CardLink href="/veli/panel">
        <CardContent icon="info" title="Veliyim" description="Hesap açar, çocuğumun hesabını oluştururum." chevron />
      </CardLink>,
    );
    const link = screen.getByRole('link', { name: 'Veliyim Hesap açar, çocuğumun hesabını oluştururum.' });
    expect(link).toHaveAttribute('href', '/veli/panel');
    // Tek etkileşimli öğe: kartın içinde ikinci bir bağlantı ya da düğme yok.
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('CardButton: tamamı tek düğme; tıklanınca eylem çalışır', () => {
    const onClick = vi.fn();
    render(
      <CardButton onClick={onClick}>
        <CardContent title="Öğrenciyim" description="Velimin verdiği kullanıcı adıyla giriş yaparım." />
      </CardButton>,
    );
    const button = screen.getByRole('button', { name: /Öğrenciyim/ });
    expect(button).toHaveAttribute('type', 'button');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('düğme kartının içinde blok öğe yok (geçerli HTML: düğme içinde yalnızca span)', () => {
    const { container } = render(
      <CardButton>
        <CardContent icon="check_circle" title="Başlık" description="Açıklama" chevron />
      </CardButton>,
    );
    const button = container.querySelector('button');
    expect(button?.querySelector('div, p, h1, h2, h3')).toBeNull();
  });

  it('durağan kart etkileşimli değildir', () => {
    render(
      <Card>
        <CardContent title="Bilgi" />
      </Card>,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Bilgi')).toBeInTheDocument();
  });

  it('süs simgeler ekran okuyucudan gizlidir', () => {
    const { container } = render(
      <CardLink href="/x">
        <CardContent icon="info" title="Başlık" chevron />
      </CardLink>,
    );
    const icons = container.querySelectorAll('svg');
    expect(icons.length).toBe(2);
    for (const icon of icons) expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('RadioCard ("5 dakika / Tam ders")', () => {
  function renderGroup(onChange = vi.fn()) {
    render(
      <RadioCardGroup legend="Bugün ne kadar vaktin var?">
        <RadioCard name="mod" value="kisa" title="5 dakika" description="Kısa bir tekrar" defaultChecked onChange={onChange} />
        <RadioCard name="mod" value="tam" title="Tam ders" description="Konuyu baştan sona çalış" onChange={onChange} />
      </RadioCardGroup>,
    );
    return onChange;
  }

  it('grup başlığı olan bir fieldset ve gerçek radyo düğmeleridir', () => {
    renderGroup();
    expect(screen.getByRole('group', { name: 'Bugün ne kadar vaktin var?' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
    expect(screen.getByRole('radio', { name: /5 dakika/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Tam ders/ })).not.toBeChecked();
  });

  it('seçim değişir, tek seçenek işaretli kalır ve onChange çağrılır', () => {
    const onChange = renderGroup();
    fireEvent.click(screen.getByRole('radio', { name: /Tam ders/ }));
    expect(screen.getByRole('radio', { name: /Tam ders/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /5 dakika/ })).not.toBeChecked();
    expect(onChange).toHaveBeenCalled();
  });

  it('başlık ve açıklama radyonun erişilebilir adına girer', () => {
    renderGroup();
    expect(screen.getByRole('radio', { name: '5 dakika Kısa bir tekrar' })).toBeInTheDocument();
  });

  it('seçili ve seçili olmayan simge ikisi de süstür', () => {
    const { container } = render(
      <RadioCardGroup legend="Soru">
        <RadioCard name="x" value="a" title="A" />
      </RadioCardGroup>,
    );
    for (const icon of container.querySelectorAll('svg')) expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});
