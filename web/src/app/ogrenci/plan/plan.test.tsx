import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tr } from '@/strings/tr';

import StudentPlanPage from './page';

const requireRole = vi.fn();
const order = vi.fn();
const from = vi.fn();

vi.mock('@/server/session', () => ({ requireRole: (...args: unknown[]) => requireRole(...args) }));
vi.mock('@/server/supabase', () => ({ createSupabaseServerClient: async () => ({ from }) }));

const UNITS = [
  'Çarpanlar ve Katlar',
  'Üslü İfadeler',
  'Kareköklü İfadeler',
  'Veri Analizi',
  'Basit Olayların Olma Olasılığı',
  'Cebirsel İfadeler ve Özdeşlikler',
  'Doğrusal Denklemler',
  'Eşitsizlikler',
  'Üçgenler',
  'Eşlik ve Benzerlik',
  'Dönüşüm Geometrisi',
  'Geometrik Cisimler',
];

function respond(result: { data: unknown; error: unknown }) {
  order.mockResolvedValue(result);
  from.mockReturnValue({ select: () => ({ order }) });
}

async function renderPage() {
  render(await StudentPlanPage());
}

beforeEach(() => {
  requireRole.mockResolvedValue({ id: 'u1', role: 'ogrenci', status: 'aktif', display_name: 'Mavi Kuş' });
});

describe('Öğrenci planı (/ogrenci/plan)', () => {
  it('yalnızca öğrenci rolüne açıktır ve üniteleri sort_order sırasıyla ister', async () => {
    respond({ data: [], error: null });
    await renderPage();
    expect(requireRole).toHaveBeenCalledWith('ogrenci');
    expect(from).toHaveBeenCalledWith('topics');
    expect(order).toHaveBeenCalledWith('sort_order', { ascending: true });
  });

  it('başlık, açıklama ve 12 üniteyi numaralı liste olarak gösterir', async () => {
    respond({ data: UNITS.map((title, index) => ({ id: index + 1, title, sort_order: index + 1 })), error: null });
    await renderPage();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('8. Sınıf Matematik Üniteleri');
    expect(screen.getByText('Telafi planın bu ünitelerden oluşacak.')).toBeInTheDocument();
    const list = within(screen.getByRole('main')).getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(within(list).getAllByRole('listitem').map((item) => item.textContent)).toEqual(UNITS);
  });

  it('menüde Plan bağlantısı seçili görünür', async () => {
    respond({ data: [], error: null });
    await renderPage();
    expect(screen.getByRole('link', { current: 'page' })).toHaveTextContent(tr.nav.plan);
  });

  it('liste boşsa sakin bir boş durum gösterir', async () => {
    respond({ data: [], error: null });
    await renderPage();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(tr.studentPlan.emptyTitle);
    expect(screen.getByText(tr.studentPlan.emptyMessage)).toBeInTheDocument();
    expect(document.querySelector('ol')).toBeNull();
  });

  it('sorgu başarısızsa hata durumu gösterir', async () => {
    respond({ data: null, error: { message: 'bağlantı yok' } });
    await renderPage();
    expect(within(screen.getByRole('main')).getByRole('status')).toHaveTextContent(tr.states.errorTitle);
  });
});
