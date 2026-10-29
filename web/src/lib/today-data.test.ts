import { describe, expect, it } from 'vitest';

import { DEFAULT_FULL_MINUTES, parseTodayTasks, SHORT_MINUTES } from './today-data';

const rpc = {
  plan_id: 'p1',
  daily_goal: 2,
  total: 10,
  completed: 3,
  tasks: [
    { item_id: 'i1', topic_id: 't1', title: 'Kesirler', subject_code: 'MAT', subject_name: 'Matematik', grade: 5, est_minutes: 20 },
    { item_id: 'i2', topic_id: 't2', title: 'Hücre', subject_code: 'FEN', subject_name: 'Fen Bilimleri', grade: 5, est_minutes: null },
  ],
};

describe('parseTodayTasks', () => {
  it('RPC yanıtını ekran verisine çevirir; kısa süre sabit, tam süre konudan', () => {
    const data = parseTodayTasks(rpc, 'Ela');
    expect(data).toMatchObject({ nickname: 'Ela', completed: 3, total: 10, newAnswers: 0 });
    expect(data.tasks).toHaveLength(2);
    expect(data.tasks[0]).toMatchObject({ id: 'i1', title: 'Kesirler', subject: 'Matematik', grade: 5, shortMinutes: SHORT_MINUTES, fullMinutes: 20 });
  });

  it('tahmini süre yoksa varsayılan tam ders süresi kullanılır', () => {
    expect(parseTodayTasks(rpc, 'Ela').tasks[1]?.fullMinutes).toBe(DEFAULT_FULL_MINUTES);
  });

  it.each([null, undefined, 'x', 42, {}, { total: 1 }, { total: -1, completed: 0, tasks: [] }, { total: 1, completed: 0, tasks: [{ item_id: 'i' }] }])(
    'bozuk ya da boş yanıt plan yok sayılır ve çökmez: %j',
    (raw) => {
      const data = parseTodayTasks(raw, 'Ela');
      expect(data.tasks).toEqual([]);
      expect(data.nickname).toBe('Ela');
    },
  );

  it('plan var ama bekleyen görev yoksa görev listesi boştur (tamamlanmış plan)', () => {
    const data = parseTodayTasks({ ...rpc, tasks: [] }, 'Ela');
    expect(data.tasks).toEqual([]);
    expect(data.total).toBe(10);
  });
});
