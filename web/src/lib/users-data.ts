import { z } from 'zod';

import '@/lib/zod-config';
import { UUID_PATTERN } from '@/lib/questions';

/** Yönetici kullanıcı listesi ve durum değiştirme girdisi. Yanıt güvenilir sayılmaz: bozuk satır atlanır. */
export type UserRole = 'ogrenci' | 'veli' | 'gonullu' | 'yonetici';
export type UserItem = { id: string; name: string; role: UserRole; status: 'aktif' | 'beklemede' | 'askida'; createdAt: string };

const row = z.object({
  id: z.string().min(1),
  display_name: z.string(),
  role: z.enum(['ogrenci', 'veli', 'gonullu', 'yonetici']),
  status: z.enum(['aktif', 'beklemede', 'askida']),
  created_at: z.string(),
});

export const USER_ROLES: readonly UserRole[] = ['gonullu', 'veli', 'ogrenci', 'yonetici'];

export function parseUsers(raw: unknown): UserItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const parsed = row.safeParse(item);
    return parsed.success
      ? [{ id: parsed.data.id, name: parsed.data.display_name, role: parsed.data.role, status: parsed.data.status, createdAt: parsed.data.created_at }]
      : [];
  });
}

export const accountStatusSchema = z.object({ userId: z.string().regex(UUID_PATTERN), status: z.enum(['aktif', 'askida']) });
