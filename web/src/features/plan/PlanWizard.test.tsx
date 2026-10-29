import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlanWizard } from './PlanWizard';

const noop = async () => null;

function setup() {
  render(<PlanWizard action={noop} />);
}

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Devam' }));

describe('PlanWizard (plan oluşturma)', () => {
  it('1. adım: sınıf ve ders seçilmeden ilerlenmez, hatalar gösterilir', () => {
    setup();
    expect(screen.getByText('Adım 1 / 3')).toBeInTheDocument();
    next();
    expect(screen.getByText('Sınıf seçilmeli.')).toBeInTheDocument();
    expect(screen.getByText('En az bir ders seçilmeli.')).toBeInTheDocument();
    expect(screen.getByText('Adım 1 / 3')).toBeInTheDocument();
  });

  it('hiçbir sınıf ve ders önceden seçili değildir', () => {
    setup();
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked();
    for (const item of screen.getAllByRole('switch')) expect(item).not.toBeChecked();
  });

  it('tam akış: 3 adım, özet ve gönderim alanları; neden sorulmaz', () => {
    setup();
    fireEvent.click(screen.getByRole('radio', { name: '6. sınıf' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Matematik' }));
    next();

    expect(screen.getByText('Adım 2 / 3')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/hasta|sağlık|tedavi|teşhis/i);
    expect(screen.queryByLabelText(/neden/i)).toBeNull();
    fireEvent.change(screen.getByLabelText('Başlangıç tarihi'), { target: { value: '2026-10-05' } });
    fireEvent.change(screen.getByLabelText('Bitiş tarihi'), { target: { value: '2026-11-02' } });
    next();

    expect(screen.getByText('Adım 3 / 3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Günde 2 konu' }));
    next();

    expect(screen.getByText('6. sınıf · Matematik · 5 Eki 2026 - 2 Kas 2026 · günde 2 konu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Planı oluştur' })).toHaveAttribute('type', 'submit');
    const form = screen.getByRole('button', { name: 'Planı oluştur' }).closest('form') as HTMLFormElement;
    const data = new FormData(form);
    expect(data.get('grade')).toBe('6');
    expect(data.getAll('subjects')).toEqual(['MAT']);
    expect(data.get('start')).toBe('2026-10-05');
    expect(data.get('end')).toBe('2026-11-02');
    expect(data.get('dailyGoal')).toBe('2');
  });

  it('2. adım: bitiş başlangıçtan önceyse hata verir ve ilerlemez', () => {
    setup();
    fireEvent.click(screen.getByRole('radio', { name: '5. sınıf' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Fen Bilimleri' }));
    next();
    fireEvent.change(screen.getByLabelText('Başlangıç tarihi'), { target: { value: '2026-11-02' } });
    fireEvent.change(screen.getByLabelText('Bitiş tarihi'), { target: { value: '2026-10-05' } });
    next();
    expect(screen.getByText('Bitiş tarihi başlangıçtan önce olamaz.')).toBeInTheDocument();
    expect(screen.getByText('Adım 2 / 3')).toBeInTheDocument();
  });

  it('Geri düğmesi önceki adıma döner ve girilenler korunur', () => {
    setup();
    fireEvent.click(screen.getByRole('radio', { name: '7. sınıf' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Matematik' }));
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Geri' }));
    expect(screen.getByText('Adım 1 / 3')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '7. sınıf' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Matematik' })).toBeChecked();
  });
});
