/** "Bugün" ekranının veri biçimi. Gerçek veri `get_today_tasks` RPC'sinden gelecek; şimdilik örnek veri kullanılır. */
export type TodayTask = {
  id: string;
  title: string;
  subject: string;
  grade: number;
  /** "5 dakika" modundaki yaklaşık süre. */
  shortMinutes: number;
  /** "Tam ders" modundaki yaklaşık süre. */
  fullMinutes: number;
};

export type TodayData = {
  nickname: string;
  /** Sıradaki görev ilk sıradadır; diğerleri "Sonraki görevler"dir. Boşsa plan yok demektir. */
  tasks: TodayTask[];
  completed: number;
  total: number;
  upcomingLesson?: { when: string; volunteer: string };
  newAnswers: number;
};

export type TodayMode = 'short' | 'full';
