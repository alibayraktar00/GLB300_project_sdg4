import { describe, expect, it } from 'vitest';

import { navIconPaths } from '@/components/icons/icon-paths';

import { APP_ROLES, roleActions, roleDestinations } from './role-navigation';

describe('rol bazlı ana gezinme (docs/ekran-akislari.md 1.2)', () => {
  it('rol başına hedefler ve etiketler', () => {
    expect(roleDestinations('ogrenci').map((d) => d.label)).toEqual(['Bugün', 'Plan', 'Sorular', 'Dersler']);
    expect(roleDestinations('veli').map((d) => d.label)).toEqual(['Panel', 'Sorular', 'Dersler', 'Hesap']);
    expect(roleDestinations('gonullu').map((d) => d.label)).toEqual(['Pano', 'Öğrenciler', 'Dersler', 'Takvim']);
    expect(roleDestinations('yonetici').map((d) => d.label)).toEqual([
      'Başvurular',
      'Eşleştirme',
      'Şikayetler',
      'Kullanıcılar',
      'Denetim',
    ]);
  });

  it('öğrenci 4 hedef (az seçenek, sakin arayüz); Kütüphane ayrı hedef değil', () => {
    expect(roleDestinations('ogrenci')).toHaveLength(4);
    expect(roleDestinations('ogrenci').some((d) => /kütüphane/i.test(d.label))).toBe(false);
  });

  it('etiketler kısa (en çok 10 harf): alt gezinme etiketleri dar telefonda sığmalı', () => {
    for (const role of APP_ROLES) {
      for (const destination of roleDestinations(role)) {
        expect(destination.label.length, destination.label).toBeLessThanOrEqual(12);
      }
    }
  });

  it('adresler rol önekiyle başlar, tekrarsızdır; ikonlar paket içinde dolu sürümüyle vardır', () => {
    for (const role of APP_ROLES) {
      const destinations = roleDestinations(role);
      const paths = destinations.map((d) => d.path);
      expect(new Set(paths).size).toBe(paths.length);
      for (const destination of destinations) {
        expect(destination.path.startsWith(`/${role}/`)).toBe(true);
        expect(navIconPaths[destination.icon].fill, destination.icon).toBeTruthy();
      }
    }
  });

  it('Bildirimler ve Ayarlar hedef değil, üst çubuk eylemidir', () => {
    expect(roleActions('veli')).toEqual({ notifications: '/veli/bildirimler', settings: '/veli/ayarlar' });
    for (const role of APP_ROLES) {
      expect(roleDestinations(role).some((d) => /bildirim|ayar/i.test(d.label))).toBe(false);
    }
  });
});
