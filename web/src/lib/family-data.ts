import { z } from 'zod';

import '@/lib/zod-config';

/**
 * Veli paneli ve gönüllü "Öğrencilerim" ekranının yanıt ayrıştırıcıları. Yanıt güvenilir sayılmaz: şemaya uymayan
 * satır atlanır, dizi değilse boş döner (ekran çökmez).
 */
export type ChildCard = { id: string; name: string; grade: number; username: string; qaEnabled: boolean; videoEnabled: boolean };
export type MyStudent = { matchId: string; nickname: string; grade: number };

function rows<T>(raw: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((row) => {
    const parsed = schema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

const profileRow = z.object({ id: z.string().min(1), display_name: z.string() });
const studentRow = z.object({ profile_id: z.string().min(1), grade: z.number(), username: z.string() });
const featureRow = z.object({ student_id: z.string().min(1), qa_enabled: z.boolean(), video_enabled: z.boolean() });

/** Çocuk kartları. Özellik satırı yoksa varsayılan (açık) kabul edilir: veritabanı da böyle davranır. */
export function buildChildCards(input: { profiles: unknown; students: unknown; features: unknown }): ChildCard[] {
  const students = new Map(rows(input.students, studentRow).map((s) => [s.profile_id, s]));
  const features = new Map(rows(input.features, featureRow).map((f) => [f.student_id, f]));
  return rows(input.profiles, profileRow).flatMap((profile) => {
    const student = students.get(profile.id);
    if (!student) return [];
    const feature = features.get(profile.id);
    return [
      {
        id: profile.id,
        name: profile.display_name,
        grade: student.grade,
        username: student.username,
        qaEnabled: feature?.qa_enabled ?? true,
        videoEnabled: feature?.video_enabled ?? true,
      },
    ];
  });
}

const myStudentRow = z.object({ match_id: z.string().min(1), nickname: z.string(), grade: z.number() });
export const parseMyStudents = (raw: unknown): MyStudent[] =>
  rows(raw, myStudentRow).map((row) => ({ matchId: row.match_id, nickname: row.nickname, grade: row.grade }));
