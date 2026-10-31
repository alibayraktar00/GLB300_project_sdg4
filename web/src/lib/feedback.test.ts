import { describe, expect, it } from 'vitest';

import { feedbackSchema, parseFeedbackSummary } from './feedback';

const id = '11111111-1111-4111-8111-111111111111';

describe('feedbackSchema', () => {
  it('geçerli girdiyi çevirir', () => {
    const result = feedbackSchema.safeParse({ sessionId: id, rating: '4', wouldContinue: 'evet' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ sessionId: id, rating: 4, wouldContinue: true });
  });
  it.each([['0'], ['6'], ['2.5'], ['x'], ['']])('geçersiz puan reddedilir: %j', (rating) => {
    expect(feedbackSchema.safeParse({ sessionId: id, rating, wouldContinue: 'hayir' }).success).toBe(false);
  });
  it('evet/hayır dışı değer ve bozuk kimlik reddedilir', () => {
    expect(feedbackSchema.safeParse({ sessionId: id, rating: '3', wouldContinue: 'belki' }).success).toBe(false);
    expect(feedbackSchema.safeParse({ sessionId: 'x', rating: '3', wouldContinue: 'evet' }).success).toBe(false);
  });
});

describe('parseFeedbackSummary', () => {
  it('rol özetlerini çevirir', () => {
    const raw = {
      completed_sessions: 7,
      by_role: { ogrenci: { responses: 5, avg_rating: 4.4, satisfied_pct: 80, continue_pct: 100 } },
    };
    expect(parseFeedbackSummary(raw)).toEqual({
      completedSessions: 7,
      attendance: { attended: 0, missed: 0, pct: null },
      byRole: { ogrenci: { responses: 5, avgRating: 4.4, satisfiedPct: 80, continuePct: 100 } },
    });
  });
  it('beklenmeyen biçimde boş özet döner', () => {
    const empty = { completedSessions: 0, attendance: { attended: 0, missed: 0, pct: null }, byRole: {} };
    expect(parseFeedbackSummary(null)).toEqual(empty);
    expect(parseFeedbackSummary({ completed_sessions: 'x' })).toEqual(empty);
  });
});

describe('parseFeedbackSummary: katılım', () => {
  it('katılım oranını çevirir; oran yoksa null kalır', () => {
    const base = { completed_sessions: 4, by_role: {} };
    expect(parseFeedbackSummary({ ...base, attendance: { attended: 3, missed: 1, attendance_pct: 75 } }).attendance).toEqual({ attended: 3, missed: 1, pct: 75 });
    expect(parseFeedbackSummary({ ...base, attendance: { attended: 0, missed: 0, attendance_pct: null } }).attendance.pct).toBeNull();
  });
});
