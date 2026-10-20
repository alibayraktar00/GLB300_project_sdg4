'use client';

import { useEffect, useState } from 'react';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { ErrorState } from '@/components/StateViews';
import { Switch } from '@/components/Switch';
import { useNotice } from '@/components/Notice';
import {
  appearanceToAttributes,
  DEFAULT_APPEARANCE,
  readAppearance,
  type Appearance,
  type ThemeChoice,
} from '@/lib/appearance';
import { tr } from '@/strings/tr';

import styles from './Gallery.module.css';

const copy = tr.gallery;

type GalleryTextScale = 1 | 1.15 | 1.3 | 2;
const TEXT_SCALE_OPTIONS: ReadonlyArray<{ value: GalleryTextScale; label: string }> = [
  { value: 1, label: '%100' },
  { value: 1.15, label: '%115' },
  { value: 1.3, label: '%130' },
  { value: 2, label: '%200' },
];

const ATTRIBUTES = ['data-theme', 'data-text-scale', 'data-motion'] as const;

type PreviewState = {
  theme: ThemeChoice;
  highContrast: boolean;
  textScale: GalleryTextScale;
  reduceMotion: boolean;
};

const INITIAL_STATE: PreviewState = { theme: 'system', highContrast: false, textScale: 1, reduceMotion: false };

/** Önizleme ayarını `<html>` özniteliklerine yazar (gerçek davranışın aynısı; depoya yazılmaz). */
function applyPreview({ theme, highContrast, textScale, reduceMotion }: PreviewState): void {
  const root = document.documentElement;
  const appearance: Appearance = {
    ...DEFAULT_APPEARANCE,
    theme,
    highContrast,
    textScale: textScale === 2 ? 1 : textScale,
    reduceMotion,
  };
  const attributes: Record<string, string | undefined> = { ...appearanceToAttributes(appearance) };
  if (textScale === 2) attributes['data-text-scale'] = '2';
  for (const name of ATTRIBUTES) {
    const value = attributes[name];
    if (value === undefined) root.removeAttribute(name);
    else root.setAttribute(name, value);
  }
}

/**
 * Önizleme ayarları: tema, yüksek kontrast, yazı boyutu ve animasyon azaltma. Ayarlar `<html>` üzerine yazılır
 * (gerçek davranış), ama CİHAZA KAYDEDİLMEZ (localStorage'a yazılmaz); sayfadan çıkınca kullanıcının gerçek
 * tercihi (varsa) geri yüklenir. %200 seçeneği yalnızca galeri ve testler içindir.
 */
export function GalleryControls() {
  const [state, setState] = useState<PreviewState>(INITIAL_STATE);

  // Ayarlar yalnızca kullanıcı bir seçeneği DEĞİŞTİRİNCE uygulanır. Açılışta hiçbir şeye dokunulmaz: böylece
  // kullanıcının (ya da testin) önceden seçtiği tema sayfa açılırken bozulmaz.
  const update = (patch: Partial<PreviewState>) => {
    const next = { ...state, ...patch };
    setState(next);
    applyPreview(next);
  };

  const { theme, highContrast, textScale, reduceMotion } = state;

  useEffect(() => {
    return () => {
      // Çıkışta kullanıcının gerçek (kaydedilmiş) tercihi geri yüklenir.
      const root = document.documentElement;
      const stored = appearanceToAttributes(readAppearance(window.localStorage));
      for (const name of ATTRIBUTES) {
        const value = stored[name];
        if (value === undefined) root.removeAttribute(name);
        else root.setAttribute(name, value);
      }
    };
  }, []);

  return (
    <div className={styles.controls} role="group" aria-label={copy.controls.label}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{copy.controls.theme}</legend>
        <div className={styles.chips}>
          {(
            [
              ['system', copy.controls.themeSystem],
              ['light', copy.controls.themeLight],
              ['dark', copy.controls.themeDark],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={styles.chip}>
              <input
                type="radio"
                name="galeri-tema"
                value={value}
                checked={theme === value}
                onChange={() => update({ theme: value })}
                className={styles.chipInput}
              />
              <span className={styles.chipFace}>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>{copy.controls.textSize}</legend>
        <div className={styles.chips}>
          {TEXT_SCALE_OPTIONS.map(({ value, label }) => (
            <label key={value} className={styles.chip}>
              <input
                type="radio"
                name="galeri-yazi"
                value={String(value)}
                checked={textScale === value}
                onChange={() => update({ textScale: value })}
                className={styles.chipInput}
              />
              <span className={styles.chipFace}>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Switch
        label={copy.controls.highContrast}
        checked={highContrast}
        onChange={(event) => update({ highContrast: event.target.checked })}
      />
      <Switch
        label={copy.controls.reduceMotion}
        checked={reduceMotion}
        onChange={(event) => update({ reduceMotion: event.target.checked })}
      />
    </div>
  );
}

/** Bildirim çubuğu örneği: kendiliğinden kaybolmaz, "Tamam" ile kapanır. */
export function NoticeDemo() {
  const notice = useNotice();
  return (
    <Button variant="secondary" onClick={() => notice.show(copy.sample.noticeMessage)}>
      {copy.sample.showNotice}
    </Button>
  );
}

/** Kapatılabilir bilgi bandı örneği. */
export function DismissibleBannerDemo() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <Banner tone="success" onDismiss={() => setOpen(false)}>
      {copy.sample.bannerSuccess}
    </Banner>
  );
}

/** Hata durumu örneği: "Tekrar dene" düğmesi tıklanabilir. */
export function ErrorStateDemo() {
  const [tries, setTries] = useState(0);
  return <ErrorState key={tries} onRetry={() => setTries((n) => n + 1)} />;
}

/** Hareket örneği: kutu kayar; "animasyonları azalt" açıkken süre 0 ms olduğundan anında yer değiştirir. */
export function MotionDemo() {
  const [atEnd, setAtEnd] = useState(false);
  return (
    <div className={styles.motion}>
      <p className={styles.help}>{copy.sample.motionHint}</p>
      <div className={styles.track}>
        <span className={atEnd ? `${styles.box} ${styles.boxEnd}` : styles.box} aria-hidden="true" />
      </div>
      <Button variant="secondary" onClick={() => setAtEnd((value) => !value)}>
        {copy.sample.motionToggle}
      </Button>
    </div>
  );
}
