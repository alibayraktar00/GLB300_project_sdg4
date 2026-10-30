import { describe, expect, it } from 'vitest';

import { attachmentPaths, parseQuestionList, parseThread } from './questions-data';

const q = { id: 'q1', status: 'atandi', created_at: '2026-11-02T10:00:00Z', subjects: { name: 'Matematik' } };

describe('parseQuestionList', () => {
  it('geçerli satırları çevirir; ders adı dizi olarak gelse de okunur', () => {
    const list = parseQuestionList([q, { ...q, id: 'q2', subjects: [{ name: 'Matematik' }] }]);
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({ id: 'q1', status: 'atandi', subject: 'Matematik', createdAt: '2026-11-02T10:00:00Z' });
    expect(list[1]?.subject).toBe('Matematik');
  });

  it('bilinmeyen durumlu ya da eksik satırı atlar, gerisini korur', () => {
    const list = parseQuestionList([q, { ...q, id: 'q3', status: 'bilinmeyen' }, { id: 'q4' }, null, 'x']);
    expect(list.map((item) => item.id)).toEqual(['q1']);
  });

  it.each([null, undefined, 'x', 42, {}])('dizi olmayan yanıt boş liste olur: %j', (raw) => {
    expect(parseQuestionList(raw)).toEqual([]);
  });

  it('ders ilişkisi yoksa ders adı boş kalır', () => {
    expect(parseQuestionList([{ ...q, subjects: null }])[0]?.subject).toBe('');
  });
});

const msg = (over: Record<string, unknown>) => ({
  id: 'm1',
  kind: 'soru',
  body: '3x + 5 = 20',
  created_at: '2026-11-02T10:00:00Z',
  hidden_at: null,
  sender_id: 'ogr',
  attachments: [],
  ...over,
});

describe('parseThread', () => {
  const signed = { 'a/b/c.jpg': 'https://x.supabase.co/signed/c?token=1' };

  it('mesajları zamana göre sıralar, kendi mesajını işaretler ve imzalı adresi bağlar', () => {
    const thread = parseThread(
      {
        question: q,
        messages: [
          msg({ id: 'm2', kind: 'cevap', sender_id: 'gon', created_at: '2026-11-02T11:00:00Z', body: 'x = 5' }),
          msg({ id: 'm1', attachments: [{ storage_path: 'a/b/c.jpg' }] }),
        ],
      },
      'ogr',
      signed,
    );
    expect(thread?.messages.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(thread?.messages[0]).toMatchObject({ mine: true, photos: ['https://x.supabase.co/signed/c?token=1'] });
    expect(thread?.messages[1]).toMatchObject({ mine: false, kind: 'cevap' });
  });

  it('gizlenmiş mesajın metni ve fotoğrafı hiç taşınmaz', () => {
    const thread = parseThread(
      { question: q, messages: [msg({ hidden_at: '2026-11-03T00:00:00Z', body: 'GIZLI', attachments: [{ storage_path: 'a/b/c.jpg' }] })] },
      'ogr',
      signed,
    );
    expect(thread?.messages[0]).toMatchObject({ hidden: true, body: '', photos: [] });
    expect(JSON.stringify(thread)).not.toContain('GIZLI');
  });

  it('imzalı adresi olmayan fotoğraf atlanır', () => {
    const thread = parseThread({ question: q, messages: [msg({ attachments: [{ storage_path: 'yok/yok/yok.jpg' }] })] }, 'ogr', {});
    expect(thread?.messages[0]?.photos).toEqual([]);
  });

  it('bozuk mesaj satırı atlanır; bozuk soru ya da mesaj listesi null döner', () => {
    expect(parseThread({ question: q, messages: [msg({}), { id: 'x' }] }, 'ogr', {})?.messages).toHaveLength(1);
    expect(parseThread({ question: { id: 'q' }, messages: [] }, 'ogr', {})).toBeNull();
    expect(parseThread({ question: q, messages: 'x' }, 'ogr', {})).toBeNull();
  });
});

describe('attachmentPaths', () => {
  it('yalnızca gizlenmemiş mesajların ek yollarını toplar', () => {
    const paths = attachmentPaths([
      msg({ attachments: [{ storage_path: 'a/b/1.jpg' }, { storage_path: 'a/b/2.jpg' }] }),
      msg({ id: 'm2', hidden_at: '2026-11-03T00:00:00Z', attachments: [{ storage_path: 'a/b/3.jpg' }] }),
    ]);
    expect(paths).toEqual(['a/b/1.jpg', 'a/b/2.jpg']);
  });

  it('dizi olmayan girdide boş döner', () => {
    expect(attachmentPaths(null)).toEqual([]);
  });
});
