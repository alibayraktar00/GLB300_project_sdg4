/** Soru-cevap ekranlarının veri biçimleri. Gerçek veri `questions` / `question_messages` tablolarından gelir (RLS). */
export type QuestionStatus = 'acik' | 'atandi' | 'havuzda' | 'cevaplandi' | 'kapandi';
export type MessageKind = 'soru' | 'cevap' | 'takip';
export type ViewerRole = 'ogrenci' | 'gonullu' | 'veli';

export type QuestionSummary = {
  id: string;
  status: QuestionStatus;
  subject: string;
  createdAt: string;
};

export type ThreadMessage = {
  id: string;
  kind: MessageKind;
  body: string;
  createdAt: string;
  /** Yönetici gizlediyse metin gösterilmez. */
  hidden: boolean;
  /** Mesajı bakan kişi yazdı mı? */
  mine: boolean;
  /** Süreli imzalı adresler (sunucuda üretilir); tarayıcıya yalnızca bunlar gider. */
  photos: string[];
};

export type ThreadData = {
  id: string;
  status: QuestionStatus;
  subject: string;
  messages: ThreadMessage[];
};

/** Composer'ın sunucu eylemi sonucu. */
export type ComposerState = { fieldErrors?: { body?: string; paths?: string }; formError?: string } | null;
export type ComposerAction = (previous: ComposerState, formData: FormData) => Promise<ComposerState>;
