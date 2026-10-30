import type { SessionItem } from './types';

/** Planlı dersler (yakın tarihten uzağa) ve geçmiş/iptaller (yeniden eskiye). Şu anı dışarıdan alır; test edilebilir. */
export function splitSessions(items: readonly SessionItem[], now: number): { upcoming: SessionItem[]; past: SessionItem[] } {
  const upcoming: SessionItem[] = [];
  const past: SessionItem[] = [];
  for (const item of items) {
    const isUpcoming = item.status === 'planlandi' && new Date(item.startsAt).getTime() + item.durationMin * 60_000 >= now;
    (isUpcoming ? upcoming : past).push(item);
  }
  upcoming.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  past.sort((a, b) => b.startsAt.localeCompare(a.startsAt));
  return { upcoming, past };
}
