import { describe, expect, it } from 'vitest';

import { splitSessions } from './split';
import type { SessionItem } from './types';

const make = (id: string, startsAt: string, status: SessionItem['status']): SessionItem => ({
  id,
  startsAt,
  durationMin: 30,
  status,
  meetingUrl: null,
  subject: 'Matematik',
});

describe('splitSessions', () => {
  it('planlı ve bitmemiş dersler yaklaşanlara, diğerleri geçmişe gider; sıralanır', () => {
    const now = Date.parse('2026-11-05T12:00:00Z');
    const { upcoming, past } = splitSessions(
      [
        make('b', '2026-11-07T10:00:00Z', 'planlandi'),
        make('a', '2026-11-06T10:00:00Z', 'planlandi'),
        make('x', '2026-11-08T10:00:00Z', 'iptal'),
        make('old', '2026-11-01T10:00:00Z', 'planlandi'),
      ],
      now,
    );
    expect(upcoming.map((s) => s.id)).toEqual(['a', 'b']);
    expect(past.map((s) => s.id)).toEqual(['x', 'old']);
  });

  it('başlamış ama bitmemiş ders hâlâ yaklaşandır', () => {
    const now = Date.parse('2026-11-05T10:10:00Z');
    expect(splitSessions([make('a', '2026-11-05T10:00:00Z', 'planlandi')], now).upcoming).toHaveLength(1);
  });
});
