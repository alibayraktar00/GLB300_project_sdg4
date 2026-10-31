'use server';

import { redirect } from 'next/navigation';

import { messageForSlotError, removeSchema, slotFieldErrors, slotSchema, type SlotField } from '@/lib/availability';
import { requireRole } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';
import { tr } from '@/strings/tr';

export type SlotState = { fieldErrors?: Partial<Record<SlotField, string>>; formError?: string } | null;

/** Gönüllü müsait bir saat aralığı ekler. Sahiplik ve saat penceresi RLS ile veritabanı kısıtında da zorlanır. */
export async function addSlot(_previous: SlotState, formData: FormData): Promise<SlotState> {
  const user = await requireRole('gonullu');
  const parsed = slotSchema.safeParse({
    weekday: String(formData.get('weekday') ?? ''),
    start: String(formData.get('start') ?? ''),
    end: String(formData.get('end') ?? ''),
  });
  if (!parsed.success) return { fieldErrors: slotFieldErrors(parsed.error) };

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('availability_slots').insert({
      user_id: user.id,
      weekday: parsed.data.weekday,
      start_time: parsed.data.start,
      end_time: parsed.data.end,
    });
    if (error) return { formError: messageForSlotError(error.code, error.message) };
  } catch {
    return { formError: tr.availability.errors.unavailable };
  }
  redirect('/gonullu/takvim');
}

/** Gönüllü kendi müsait aralığını kaldırır (RLS yalnızca kendi satırına izin verir). */
export async function removeSlotAction(formData: FormData): Promise<void> {
  await requireRole('gonullu');
  const parsed = removeSchema.safeParse({ slotId: String(formData.get('slotId') ?? '') });
  if (parsed.success) {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.from('availability_slots').delete().eq('id', parsed.data.slotId);
    } catch {
      // Sayfa yeniden yüklenir; aralık hâlâ listedeyse kaldırılamamıştır.
    }
  }
  redirect('/gonullu/takvim');
}
