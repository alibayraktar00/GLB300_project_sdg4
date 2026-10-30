export type TopicStatus = 'bekliyor' | 'tamamlandi' | 'atlandi';

export type ChildProgress = {
  id: string;
  name: string;
  plan: { start: string; end: string; topics: { title: string; status: TopicStatus }[] } | null;
  questions: { total: number; answered: number };
  sessions: { done: number; upcoming: number };
};
