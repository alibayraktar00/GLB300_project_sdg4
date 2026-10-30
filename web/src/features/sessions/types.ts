export type SessionStatus = 'planlandi' | 'iptal' | 'tamamlandi' | 'gelinmedi';

export type SessionItem = {
  id: string;
  startsAt: string;
  durationMin: number;
  status: SessionStatus;
  /** Yalnızca Google Meet / Zoom (veritabanı CHECK'i). */
  meetingUrl: string | null;
  subject: string;
};

export type MatchOption = { id: string; subject: string };

export type ScheduleState = {
  fieldErrors?: Partial<Record<'date' | 'time' | 'url' | 'matchId' | 'duration', string>>;
  formError?: string;
} | null;
export type ScheduleAction = (previous: ScheduleState, formData: FormData) => Promise<ScheduleState>;
