import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Rıza kaydı yardımcıları. `doc_sha256` değerini veritabanı `legal_documents` tablosundan kendisi doldurur;
 * istemci yalnızca tür, sürüm ve seçimi gönderir (supabase/migrations: consents).
 */

export type ConsentType = 'aydinlatma_veli' | 'kullanim_kosullari';

/** Bir metin türünün en güncel yayımlanmış sürümü; yayımlanmış metin yoksa null. */
async function latestVersion(supabase: SupabaseClient, docType: string): Promise<string | null> {
  const { data } = await supabase
    .from('legal_documents')
    .select('version')
    .eq('doc_type', docType)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.version ?? null;
}

/**
 * Verilen onayları, en güncel metin sürümüyle `consents` tablosuna yazar (kanal: web). Herhangi bir tür için
 * yayımlanmış metin yoksa hiçbir şey yazılmadan false döner (kanıtsız onay kaydedilmez).
 */
export async function recordConsents(supabase: SupabaseClient, userId: string, types: ConsentType[]): Promise<boolean> {
  const rows: Array<{ user_id: string; type: ConsentType; doc_version: string; granted: boolean; channel: 'web' }> = [];
  for (const type of types) {
    const version = await latestVersion(supabase, type);
    if (!version) return false;
    rows.push({ user_id: userId, type, doc_version: version, granted: true, channel: 'web' });
  }
  const { error } = await supabase.from('consents').insert(rows);
  return !error;
}
