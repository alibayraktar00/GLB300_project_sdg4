import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { QuestionList } from './QuestionList';
import { SAMPLE_QUESTIONS, SAMPLE_THREAD } from './sample';
import { ThreadView } from './ThreadView';

describe('ThreadView', () => {
  it('mesajları sırayla, yazarıyla gösterir; gizlenen mesajın metni yoktur', () => {
    render(<ThreadView thread={SAMPLE_THREAD} />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Sen');
    expect(items[1]).toHaveTextContent('Gönüllü');
    expect(items[1]).toHaveTextContent('x = 5');
    expect(items[2]).toHaveTextContent('Bu mesaj gizlendi.');
  });

  it('durumu yazıyla verir', () => {
    render(<ThreadView thread={SAMPLE_THREAD} />);
    expect(screen.getByText(/Cevap geldi/)).toBeInTheDocument();
  });

  it('fotoğrafa alternatif metin verir', () => {
    const thread = {
      ...SAMPLE_THREAD,
      messages: [{ ...SAMPLE_THREAD.messages[0]!, photos: ['https://example.test/a.jpg'] }],
    };
    render(<ThreadView thread={thread} />);
    expect(screen.getByRole('img', { name: 'Sorunun 1. fotoğrafı' })).toBeInTheDocument();
  });

  it('mesaj yoksa bilgi notu gösterir', () => {
    render(<ThreadView thread={{ ...SAMPLE_THREAD, messages: [] }} />);
    expect(screen.getByText('Bu soruda henüz mesaj yok.')).toBeInTheDocument();
  });
});

describe('QuestionList', () => {
  it('her satır soru ayrıntısına giden tek bağlantıdır', () => {
    render(<QuestionList items={SAMPLE_QUESTIONS} hrefBase="/ogrenci/sorular" />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', `/ogrenci/sorular/${SAMPLE_QUESTIONS[0]!.id}`);
    expect(links[0]).toHaveTextContent('Cevap geldi');
  });
});
