export type VolunteerCard = { studentId: string; volunteerId: string; name: string; university: string };

export type ReportItem = {
  id: string;
  targetType: 'mesaj' | 'soru' | 'ders' | 'kullanici';
  category: string;
  status: 'yeni' | 'inceleniyor' | 'kapandi';
  createdAt: string;
};

export type BlockItem = { id: string; blockedByRole: 'ogrenci' | 'veli'; reason: string; createdAt: string };
