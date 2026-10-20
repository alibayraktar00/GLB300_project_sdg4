import type { NavIconName } from '@/components/Icon';
import { tr } from '@/strings/tr';

/** Kullanıcı rolleri (`profiles.role`, docs/plan.md 5.1). Adres önekleri bu adlarla aynıdır. */
export type AppRole = 'ogrenci' | 'veli' | 'gonullu' | 'yonetici';

export const APP_ROLES: readonly AppRole[] = ['ogrenci', 'veli', 'gonullu', 'yonetici'];

export type RoleDestination = {
  /** Rol önekiyle başlayan kök adres, ör. `/ogrenci/bugun`. */
  path: string;
  label: string;
  icon: NavIconName;
};

/**
 * Rol bazlı ana gezinme (docs/ekran-akislari.md 1.2). Telefonda alt çubuk, geniş ekranda yan menü olur.
 *
 * - Öğrenci 4 hedef: az seçenek sakin arayüz demektir. Kütüphane ayrı hedef değil; Plan'dan açılır.
 * - Bildirimler ve Ayarlar hedef değildir, üst çubuktaki eylemlerdir (`roleActions`).
 * - Yönetici 5 hedef (asıl ekranı masaüstüdür).
 */
export function roleDestinations(role: AppRole): RoleDestination[] {
  switch (role) {
    case 'ogrenci':
      return [
        { path: '/ogrenci/bugun', label: tr.nav.today, icon: 'wb_sunny' },
        { path: '/ogrenci/plan', label: tr.nav.plan, icon: 'event_note' },
        { path: '/ogrenci/sorular', label: tr.nav.questions, icon: 'forum' },
        { path: '/ogrenci/dersler', label: tr.nav.lessons, icon: 'videocam' },
      ];
    case 'veli':
      return [
        { path: '/veli/panel', label: tr.nav.guardianHome, icon: 'dashboard' },
        { path: '/veli/sorular', label: tr.nav.questions, icon: 'forum' },
        { path: '/veli/dersler', label: tr.nav.lessons, icon: 'videocam' },
        { path: '/veli/hesap', label: tr.nav.account, icon: 'manage_accounts' },
      ];
    case 'gonullu':
      return [
        { path: '/gonullu/pano', label: tr.nav.volunteerHome, icon: 'dashboard' },
        { path: '/gonullu/ogrenciler', label: tr.nav.students, icon: 'groups' },
        { path: '/gonullu/dersler', label: tr.nav.lessons, icon: 'videocam' },
        { path: '/gonullu/takvim', label: tr.nav.calendar, icon: 'calendar_month' },
      ];
    case 'yonetici':
      return [
        { path: '/yonetici/basvurular', label: tr.nav.applications, icon: 'assignment_ind' },
        { path: '/yonetici/eslestirme', label: tr.nav.matching, icon: 'handshake' },
        { path: '/yonetici/sikayetler', label: tr.nav.reports, icon: 'shield' },
        { path: '/yonetici/kullanicilar', label: tr.nav.users, icon: 'group' },
        { path: '/yonetici/denetim', label: tr.nav.audit, icon: 'fact_check' },
      ];
  }
}

/** Üst çubuk eylemleri: Bildirimler (O3) ve Ayarlar (O4). Hedef değil, eylemdir. */
export function roleActions(role: AppRole): { notifications: string; settings: string } {
  return { notifications: `/${role}/bildirimler`, settings: `/${role}/ayarlar` };
}

export const ROLE_LABELS: Record<AppRole, string> = {
  ogrenci: tr.roles.student,
  veli: tr.roles.guardian,
  gonullu: tr.roles.volunteer,
  yonetici: tr.roles.admin,
};
