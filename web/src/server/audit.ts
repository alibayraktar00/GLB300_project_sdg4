import 'server-only';

import { z } from 'zod';

import '@/lib/zod-config';

import { createSupabaseServerClient } from './supabase';

export type AuditItem = { id: string; action: string; entity: string; createdAt: string };

const row = z.object({ id: z.union([z.string(), z.number()]), action: z.string(), entity: z.string(), created_at: z.string() });

/** Son 100 denetim kaydı (yalnızca MFA'lı yönetici görür). `details` bilerek seçilmez. */
export async function loadAuditLog(): Promise<AuditItem[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from('audit_log').select('id, action, entity, created_at').order('created_at', { ascending: false }).limit(100);
    if (error || !Array.isArray(data)) return [];
    return data.flatMap((item) => {
      const parsed = row.safeParse(item);
      return parsed.success
        ? [{ id: String(parsed.data.id), action: parsed.data.action, entity: parsed.data.entity, createdAt: parsed.data.created_at }]
        : [];
    });
  } catch {
    return [];
  }
}
