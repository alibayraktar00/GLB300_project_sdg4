export type ApplicationItem = {
  id: string;
  /** "Ad S." — tam soyad listede gösterilmez. */
  name: string;
  university: string;
  department: string;
  classYear: number | null;
  status: 'basvuru' | 'egitim' | 'inceleme';
  /** Taahhüt ve davranış kuralları onayı verilmiş mi? Değilse onay düğmesi kapalıdır (RPC de reddeder). */
  pledgeOk: boolean;
};

export type MatchingData = {
  students: { id: string; grade: number; username: string }[];
  volunteers: { id: string; name: string; university: string; teaches: { subjectId: number; grade: number }[] }[];
  /** Matematik gibi kapsamdaki derslerin veritabanı kimlikleri. */
  subjectId: number | null;
  proposals: MatchProposal[];
};

export type MatchProposal = { id: string; subject: string; volunteerName: string; university: string };
