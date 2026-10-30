import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PlanWizard } from './PlanWizard';

const noop = async () => null;

function setup() {
  render(<PlanWizard action={noop} />);
}

const next = () => fireEvent.click(screen.getByRole('button', { name: 'Devam' }));

/**
 * Prototip kapsamı: yalnızca 8. sınıf Matematik (src/lib/scope.ts). Tek seçenek olduğu için ikisi de önceden
 * seçili gelir; çocuktan gereksiz seçim istenmez.
 */
describe('PlanWizard (plan oluşturma)', () => {
  it('kapsam: yalnızca 8. sınıf ve Matematik sunulur, ikisi de önceden seçilidir', () => {
    setup();
    expect(screen.getByText('Adım 1 / 3')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(1);
    expect(screen.getByRole('radio', { name: '8. sınıf' })).toBeChecked();
    expect(screen.getAllByRole('switch')).toHaveLength(1);
    expect(screen.getByRole('switch', { name: 'Matematik' })).toBeChecked();
    expect(screen.queryByRole('switch', { name: 'Fen Bilimleri' })).toBeNull();
    expect(screen.queryByRole('radio', { name: '6. sınıf' })).toBeNull();
  });

  it('ders işareti kaldırılırsa devam edilemez ve hata gösterilir', () => {
    setup();
    fireEvent.click(screen.getByRole('switch', { name: 'Matematik' }));
    next();
    expect(screen.getByText('En az bir ders seçilmeli.')).toBeInTheDocument();
    expect(screen.getByText('Adım 1 / 3')).toBeInTheDocument();
  });

  it('tam akış: 3 adım, özet ve gönderim alanları; neden sorulmaz', () => {
    setup();
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

    expect(screen.getByText('8. sınıf · Matematik · 5 Eki 2026 - 2 Kas 2026 · günde 2 konu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Planı oluştur' })).toHaveAttribute('type', 'submit');
    const form = screen.getByRole('button', { name: 'Planı oluştur' }).closest('form') as HTMLFormElement;
    const data = new FormData(form);
    expect(data.get('grade')).toBe('8');
    expect(data.getAll('subjects')).toEqual(['MAT']);
    expect(data.get('start')).toBe('2026-10-05');
    expect(data.get('end')).toBe('2026-11-02');
    expect(data.get('dailyGoal')).toBe('2');
  });

  it('2. adım: bitiş başlangıçtan önceyse hata verir ve ilerlemez', () => {
    setup();
    next();
    fireEvent.change(screen.getByLabelText('Başlangıç tarihi'), { target: { value: '2026-11-02' } });
    fireEvent.change(screen.getByLabelText('Bitiş tarihi'), { target: { value: '2026-10-05' } });
    next();
    expect(screen.getByText('Bitiş tarihi başlangıçtan önce olamaz.')).toBeInTheDocument();
    expect(screen.getByText('Adım 2 / 3')).toBeInTheDocument();
  });

  it('Geri düğmesi önceki adıma döner ve girilenler korunur', () => {
    setup();
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Geri' }));
    expect(screen.getByText('Adım 1 / 3')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '8. sınıf' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Matematik' })).toBeChecked();
  });
});
