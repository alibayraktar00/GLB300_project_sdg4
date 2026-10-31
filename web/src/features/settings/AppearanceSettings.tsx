'use client';

import { useSyncExternalStore } from 'react';

import { Button } from '@/components/Button';
import { RadioCard, RadioCardGroup } from '@/components/RadioCard';
import { Switch } from '@/components/Switch';
import {
  APPEARANCE_STORAGE_KEY,
  applyAppearance,
  DEFAULT_APPEARANCE,
  readAppearance,
  saveAppearance,
  TEXT_SCALES,
  type Appearance,
  type TextScale,
  type ThemeChoice,
} from '@/lib/appearance';
import { tr } from '@/strings/tr';

import styles from './AppearanceSettings.module.css';

const THEMES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

/**
 * Cihazdaki tercih küçük bir dış depo gibi okunur (`useSyncExternalStore`): sunucu çıktısı varsayılandır, tarayıcıda
 * kayıtlı tercih görünür; başka sekmede değişirse `storage` olayıyla güncellenir. Aynı ham değer aynı nesneyle döner.
 */
const listeners = new Set<() => void>();
let cache: { raw: string | null; value: Appearance } | null = null;

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  window.addEventListener('storage', callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot(): Appearance {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (!cache || cache.raw !== raw) cache = { raw, value: readAppearance(window.localStorage) };
  return cache.value;
}

/**
 * Görünüm ve erişilebilirlik ayarları. Tercih YALNIZCA kullanıcı bir şeyi değiştirince cihaza (localStorage) yazılır;
 * sunucuya gitmez (görünüm tercihi dolaylı sağlık ipucu olabilir). Hepsi varsayılana dönerse kayıt silinir.
 */
export function AppearanceSettings() {
  const value = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_APPEARANCE);

  const update = (patch: Partial<Appearance>) => {
    const next = { ...value, ...patch };
    applyAppearance(document.documentElement, next);
    saveAppearance(window.localStorage, next);
    for (const listener of listeners) listener();
  };

  return (
    <div className={styles.root}>
      <p className={styles.note}>{tr.settings.storedNote}</p>

      <RadioCardGroup legend={tr.settings.theme}>
        {THEMES.map((theme) => (
          <RadioCard
            key={theme}
            name="theme"
            value={theme}
            title={tr.settings.themeOptions[theme]}
            checked={value.theme === theme}
            onChange={() => update({ theme })}
          />
        ))}
      </RadioCardGroup>

      <RadioCardGroup legend={tr.settings.textSize}>
        {TEXT_SCALES.map((scale: TextScale) => (
          <RadioCard
            key={scale}
            name="textScale"
            value={String(scale)}
            title={tr.settings.textSizes[String(scale) as keyof typeof tr.settings.textSizes]}
            checked={value.textScale === scale}
            onChange={() => update({ textScale: scale })}
          />
        ))}
      </RadioCardGroup>

      <Switch label={tr.settings.highContrast} checked={value.highContrast} onChange={(event) => update({ highContrast: event.target.checked })} />
      <Switch label={tr.settings.reduceMotion} checked={value.reduceMotion} onChange={(event) => update({ reduceMotion: event.target.checked })} />

      <div>
        <Button variant="secondary" onClick={() => update(DEFAULT_APPEARANCE)}>
          {tr.settings.reset}
        </Button>
      </div>
    </div>
  );
}
