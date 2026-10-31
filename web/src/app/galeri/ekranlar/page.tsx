import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/AppShell';
import { Card, CardContent } from '@/components/Card';
import { SectionHeader } from '@/components/SectionHeader';
import { PendingMatches } from '@/features/admin/PendingMatches';
import { SlotForm } from '@/features/availability/SlotForm';
import { MfaForm } from '@/features/mfa/MfaForm';
import { ProgressView } from '@/features/progress/ProgressView';
import pageStyles from '@/features/questions/page.module.css';
import { ThreadView } from '@/features/questions/ThreadView';
import { MyVolunteers } from '@/features/safety/MyVolunteers';
import { SessionList } from '@/features/sessions/SessionList';
import { isGalleryEnabled } from '@/lib/gallery';
import { tr } from '@/strings/tr';

import { PledgeForm } from '../../gonullu/taahhut/PledgeForm';

export const metadata: Metadata = { title: 'Ekranlar (önizleme)' };

const LONG = 'Çok-uzun-bir-kullanıcı-adı-örneği-ve-uzunKelimeBölünmeden-satırı-taşırabilirMi.çok.uzun.eposta.adresi@universite.edu.tr';

/**
 * Geliştirme önizlemesi: giriş gerektiren yeni ekranların bileşenleri, bilerek UZUN metinlerle (taşma taraması için).
 * Veriler örnektir; eylemler oturum olmadan çalışmaz. Yalnızca geliştirmede açılır.
 */
export default function ScreensPreviewPage() {
  if (!isGalleryEnabled(process.env)) notFound();
  return (
    <AppShell appRole="veli" currentPath="/veli/panel">
      <div className={pageStyles.page}>
        <h1 className={pageStyles.title}>Ekranlar</h1>

        <section className={pageStyles.section} aria-labelledby="e-gonullu">
          <SectionHeader id="e-gonullu" title="Gönüllü kartı ve engelle" />
          <MyVolunteers
            returnTo="/veli/dersler"
            items={[{ studentId: 's1', volunteerId: 'v1', name: 'Alexandra Maximilian K.', university: 'Orta Doğu Teknik Üniversitesi Kuzey Kıbrıs Kampüsü' }]}
          />
        </section>

        <section className={pageStyles.section} aria-labelledby="e-oneri">
          <SectionHeader id="e-oneri" title="Eşleşme önerisi" />
          <PendingMatches items={[{ id: 'm1', subject: 'Matematik', volunteerName: 'Alexandra Maximilian K.', university: 'Orta Doğu Teknik Üniversitesi Kuzey Kıbrıs Kampüsü' }]} />
        </section>

        <section className={pageStyles.section} aria-labelledby="e-ilerleme">
          <SectionHeader id="e-ilerleme" title="İlerleme özeti" />
          <ProgressView
            items={[
              {
                id: 'c1',
                name: 'Uzun Rumuz Örneği Çocuk',
                plan: {
                  start: '2026-10-01',
                  end: '2026-10-20',
                  topics: [
                    { title: 'Üslü ifadeler ve kareköklü ifadeler konusunda çok uzun bir konu başlığı örneği', status: 'tamamlandi' },
                    { title: 'Çarpanlar ve katlar', status: 'bekliyor' },
                  ],
                },
                questions: { total: 12, answered: 9 },
                sessions: { done: 4, upcoming: 2 },
              },
            ]}
          />
        </section>

        <section className={pageStyles.section} aria-labelledby="e-ders">
          <SectionHeader id="e-ders" title="Ders (geri bildirim ve işaretleme)" />
          <SessionList
            returnTo="/gonullu/dersler"
            answered={[]}
            markable
            items={[
              { id: '33333333-3333-4333-8333-333333333333', startsAt: '2026-10-20T14:30:00Z', durationMin: 30, status: 'planlandi', meetingUrl: 'https://meet.google.com/abc-defg-hij', subject: 'Matematik' },
              { id: '44444444-4444-4444-8444-444444444444', startsAt: '2026-10-21T14:30:00Z', durationMin: 40, status: 'tamamlandi', meetingUrl: null, subject: 'Matematik' },
            ]}
          />
        </section>

        <section className={pageStyles.section} aria-labelledby="e-konusma">
          <SectionHeader id="e-konusma" title="Konuşma ve bildir" />
          <ThreadView
            reportReturnTo="/ogrenci/sorular/11111111-1111-4111-8111-111111111111"
            thread={{
              id: '11111111-1111-4111-8111-111111111111',
              status: 'atandi',
              subject: 'Matematik',
              messages: [
                { id: 'a', kind: 'soru', body: LONG.repeat(2), createdAt: '2026-10-28T09:30:00Z', hidden: false, mine: true, photos: [] },
                { id: 'b', kind: 'cevap', body: `Adım adım:\n1) ${LONG}\n2) Sonuç x = 5.`, createdAt: '2026-10-28T11:05:00Z', hidden: false, mine: false, photos: [] },
              ],
            }}
          />
        </section>

        <section className={pageStyles.section} aria-labelledby="e-taahhut">
          <SectionHeader id="e-taahhut" title="Taahhütname" />
          <PledgeForm />
        </section>

        <section className={pageStyles.section} aria-labelledby="e-takvim">
          <SectionHeader id="e-takvim" title="Müsait saat formu" />
          <SlotForm />
        </section>

        <section className={pageStyles.section} aria-labelledby="e-mfa">
          <SectionHeader id="e-mfa" title="İki adımlı doğrulama" />
          <MfaForm verifiedFactorId="22222222-2222-4222-8222-222222222222" />
        </section>

        <section className={pageStyles.section} aria-labelledby="e-kart">
          <SectionHeader id="e-kart" title="Uzun metinli kart" />
          <Card>
            <CardContent title={LONG} description={`${tr.family.gradeLine(8, LONG)}`} />
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
