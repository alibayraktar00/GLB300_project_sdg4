import type { SubjectCode } from '@/lib/plan';

/**
 * PROTOTİP KAPSAMI (proje raporu, bölüm 5): bu dönemde yalnızca 8. sınıf Matematik. Veritabanı 5-8. sınıf ve
 * Matematik/Fen'i destekler; kapsam yalnızca arayüzde daraltılır ki genişletmek bir sabiti değiştirmek olsun.
 * Tek seçenek varsa arayüz onu önceden seçer (yorgun çocuktan gereksiz seçim istenmez).
 */
export const MVP_GRADES: readonly number[] = [8];
export const MVP_SUBJECTS: readonly SubjectCode[] = ['MAT'];
