import type { Metadata } from 'next';

import { Button } from '@/components/Button';
import { SectionHeader } from '@/components/SectionHeader';
import { removeSlotAction } from '@/features/availability/actions';
import styles from '@/features/availability/Availability.module.css';
import { SlotForm } from '@/features/availability/SlotForm';
import pageStyles from '@/features/questions/page.module.css';
import { parseSlots } from '@/lib/availability';
import { requireRole } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';
import { tr } from '@/strings/tr';

export const metadata: Metadata = { title: tr.availability.title };
export const dynamic = 'force-dynamic';

/** Gönüllünün haftalık müsait saatleri: gün gün liste, ekleme ve kaldırma. */
export default async function AvailabilityPage() {
  const user = await requireRole('gonullu');
  const slots = await createSupabaseServerClient()
    .then((supabase) =>
      supabase.from('availability_slots').select('id, weekday, start_time, end_time').eq('user_id', user.id).order('weekday').limit(200),
    )
    .then(({ data, error }) => (error ? [] : parseSlots(data)))
    .catch(() => []);

  return (
    <div className={pageStyles.page}>
      <h1 className={pageStyles.title}>{tr.availability.title}</h1>
      <p className={pageStyles.intro}>{tr.availability.intro}</p>

      {slots.length === 0 ? (
        <p className={pageStyles.note}>{tr.availability.empty}</p>
      ) : (
        tr.availability.days.map((day, index) => {
          const own = slots.filter((slot) => slot.weekday === index + 1);
          if (own.length === 0) return null;
          return (
            <section key={day} className={styles.day} aria-labelledby={`gun-${index}`}>
              <h2 id={`gun-${index}`} className={styles.dayName}>
                {day}
              </h2>
              <ul className={styles.slots}>
                {own.map((slot) => (
                  <li key={slot.id} className={styles.slot}>
                    <span>
                      {slot.start} - {slot.end}
                    </span>
                    <form action={removeSlotAction}>
                      <input type="hidden" name="slotId" value={slot.id} />
                      <Button type="submit" variant="secondary" aria-label={tr.availability.removeAria(day, `${slot.start}-${slot.end}`)}>
                        {tr.availability.remove}
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      <section className={pageStyles.section} aria-labelledby="ekle">
        <SectionHeader id="ekle" title={tr.availability.addTitle} />
        <SlotForm />
      </section>
    </div>
  );
}
