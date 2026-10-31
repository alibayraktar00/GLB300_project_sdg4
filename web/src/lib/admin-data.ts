import { z } from 'zod';

import '@/lib/zod-config';

import type { ApplicationItem, MatchProposal, MatchingData } from '@/features/admin/types';
import { shortPublicName } from '@/lib/public-name';

/**
 * Yönetici ve veli eşleşme ekranlarının yanıt ayrıştırıcıları. Yanıt güvenilir sayılmaz: şemaya uymayan satır
 * atlanır, dizi değilse boş döner (ekran çökmez).
 */

const one = <T extends z.ZodTypeAny>(schema: T) =>
  z.union([schema, z.array(schema).min(1).transform((items) => items[0] as z.infer<T>)]).nullable();

function parseRows<T>(raw: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(raw)) return [];
  const out: T[] = [];
  for (const row of raw) {
    const parsed = schema.safeParse(row);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

const applicationRow = z.object({
  profile_id: z.string().min(1),
  given_name: z.string(),
  family_name: z.string(),
  university: z.string(),
  department: z.string().nullable().optional(),
  class_year: z.number().nullable().optional(),
  status: z.enum(['basvuru', 'egitim', 'inceleme']),
});

export function parseApplications(raw: unknown): ApplicationItem[] {
  return parseRows(raw, applicationRow).map((row) => ({
    id: row.profile_id,
    name: shortPublicName(`${row.given_name} ${row.family_name}`),
    university: row.university,
    department: row.department ?? '',
    classYear: row.class_year ?? null,
    status: row.status,
  }));
}

const studentRow = z.object({ profile_id: z.string().min(1), grade: z.number(), username: z.string() });
const volunteerRow = z.object({
  profile_id: z.string().min(1),
  given_name: z.string(),
  family_name: z.string(),
  university: z.string(),
  volunteer_subjects: z.array(z.object({ subject_id: z.number(), grade: z.number() })).optional(),
});

/** Eşleşme formu için öğrenci ve gönüllü seçenekleri. Gönüllünün verdiği ders/sınıf seçeneğe eklenir (uygunluk hatasını önler). */
export function parseMatchingData(rawStudents: unknown, rawVolunteers: unknown): Pick<MatchingData, 'students' | 'volunteers'> {
  return {
    students: parseRows(rawStudents, studentRow).map((s) => ({ id: s.profile_id, grade: s.grade, username: s.username })),
    volunteers: parseRows(rawVolunteers, volunteerRow).map((v) => ({
      id: v.profile_id,
      name: shortPublicName(`${v.given_name} ${v.family_name}`),
      university: v.university,
      teaches: (v.volunteer_subjects ?? []).map((t) => ({ subjectId: t.subject_id, grade: t.grade })),
    })),
  };
}

const proposalRow = z.object({
  id: z.string().min(1),
  subject_id: z.number(),
  status: z.string(),
  subjects: one(z.object({ name: z.string() })).optional(),
});

/** Veli kararı bekleyen öneriler: yalnızca "onerildi" satırları. Gönüllünün adı veli görünümünden (kısa ad) gelir. */
export function parseProposals(rawMatches: unknown, rawVolunteers: unknown): MatchProposal[] {
  const names = new Map<string, { name: string; university: string }>();
  if (Array.isArray(rawVolunteers)) {
    for (const row of rawVolunteers) {
      const parsed = z
        .object({ match_id: z.string(), volunteer_name: z.string().nullable(), university: z.string().nullable() })
        .safeParse(row);
      if (parsed.success) names.set(parsed.data.match_id, { name: parsed.data.volunteer_name ?? '', university: parsed.data.university ?? '' });
    }
  }
  return parseRows(rawMatches, proposalRow)
    .filter((row) => row.status === 'onerildi')
    .map((row) => {
      const subjects = row.subjects;
      const subject = subjects && 'name' in subjects ? subjects.name : '';
      const info = names.get(row.id);
      return { id: row.id, subject, volunteerName: info?.name ?? '', university: info?.university ?? '' };
    });
}
