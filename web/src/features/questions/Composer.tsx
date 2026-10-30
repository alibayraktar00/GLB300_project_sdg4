'use client';

import { useActionState, useRef, useState } from 'react';

import { Banner } from '@/components/Banner';
import { Button } from '@/components/Button';
import { TextArea } from '@/components/TextArea';
import { PhotoError, prepareJpeg } from '@/lib/image';
import { MAX_PHOTOS } from '@/lib/questions';
import { MVP_SUBJECTS } from '@/lib/scope';
import { tr } from '@/strings/tr';

import styles from './Composer.module.css';
import type { ComposerAction } from './types';

type Photo = { key: number; status: 'yukleniyor' | 'tamam'; path?: string };
type Mode = 'ask' | 'followup' | 'answer';

const TEXT: Record<Mode, { label: string; help: string; submit: string }> = {
  ask: { label: tr.questions.bodyLabel, help: tr.questions.bodyHelp, submit: tr.questions.submit },
  followup: { label: tr.questions.followUpTitle, help: tr.questions.followUpHelp, submit: tr.questions.followUpSubmit },
  answer: { label: tr.questions.answerTitle, help: tr.questions.answerHelp, submit: tr.questions.answerSubmit },
};

type PhotoErrorKey = keyof typeof tr.questions.errors.photo;
const photoMessage = (code: string | undefined): string =>
  tr.questions.errors.photo[(code as PhotoErrorKey) ?? 'yuklenemedi'] ?? tr.questions.errors.photo.yuklenemedi;

/**
 * Soru, takip sorusu ya da cevap yazma formu. Fotoğraf seçilince tarayıcıda küçültülüp üst verisi silinir
 * (src/lib/image.ts) ve hemen `/api/soru-eki` rotasına yüklenir; form gönderilirken yalnızca yüklenen DOSYA
 * YOLLARI sunucu eylemine gider (RPC bunları yeniden doğrular). Form JavaScript olmadan da metinle çalışır.
 * Yeni soruda kimliği (UUID) ilk fotoğrafta üretilir; fotoğraf yoksa sunucu kendisi üretir.
 */
export function Composer({
  mode,
  action,
  questionId,
}: {
  mode: Mode;
  action: ComposerAction;
  /** Takip ve cevapta mevcut sorunun kimliği; yeni soruda verilmez. */
  questionId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [activeId, setActiveId] = useState<string | null>(questionId ?? null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const counter = useRef(0);
  const input = useRef<HTMLInputElement>(null);
  const text = TEXT[mode];
  const uploading = photos.some((photo) => photo.status === 'yukleniyor');

  async function upload(file: File, id: string, key: number) {
    try {
      const blob = await prepareJpeg(file);
      const body = new FormData();
      body.set('soruId', id);
      body.set('dosya', blob, 'foto.jpg');
      const response = await fetch('/api/soru-eki', { method: 'POST', body });
      const data = (await response.json().catch(() => ({}))) as { path?: string; error?: string };
      if (!response.ok || !data.path) throw new PhotoError('okunamadi', data.error);
      setPhotos((current) => current.map((photo) => (photo.key === key ? { key, status: 'tamam', path: data.path } : photo)));
    } catch (error) {
      setPhotos((current) => current.filter((photo) => photo.key !== key));
      setPhotoError(photoMessage(error instanceof PhotoError ? (error.serverCode ?? error.code) : undefined));
    }
  }

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = ''; // aynı dosya yeniden seçilebilsin
    if (files.length === 0) return;
    setPhotoError(null);
    const id = activeId ?? crypto.randomUUID();
    if (!activeId) setActiveId(id);
    const room = MAX_PHOTOS - photos.length;
    for (const file of files.slice(0, Math.max(0, room))) {
      const key = ++counter.current;
      setPhotos((current) => [...current, { key, status: 'yukleniyor' }]);
      void upload(file, id, key);
    }
  }

  const uploaded = photos.filter((photo): photo is Photo & { path: string } => photo.status === 'tamam' && Boolean(photo.path));

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state?.formError ? <Banner tone="error">{state.formError}</Banner> : null}
      {activeId ? <input type="hidden" name="questionId" value={activeId} /> : null}
      {mode === 'ask' ? <input type="hidden" name="subject" value={MVP_SUBJECTS[0]} /> : null}
      {uploaded.map((photo) => (
        <input key={photo.key} type="hidden" name="paths" value={photo.path} />
      ))}

      <TextArea label={text.label} help={text.help} name="body" required={false} error={state?.fieldErrors?.body} />

      <fieldset className={styles.photos}>
        <legend className={styles.legend}>{tr.questions.photoLabel}</legend>
        <p className={styles.help}>{tr.questions.photoHelp}</p>
        <ul className={styles.list}>
          {photos.map((photo, index) => (
            <li key={photo.key} className={styles.item}>
              <span role="status">
                {photo.status === 'tamam' ? tr.questions.photoUploaded(index + 1) : tr.questions.photoUploading}
              </span>
              {photo.status === 'tamam' ? (
                <Button
                  variant="text"
                  onClick={() => setPhotos((current) => current.filter((item) => item.key !== photo.key))}
                  aria-label={tr.questions.photoRemove(index + 1)}
                >
                  {tr.questions.photoRemove(index + 1)}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {photoError ? (
          <p className={styles.error} role="alert">
            {photoError}
          </p>
        ) : null}
        {photos.length < MAX_PHOTOS ? (
          <>
            <input ref={input} type="file" accept="image/*" hidden onChange={onPick} aria-label={tr.questions.photoAdd} />
            <Button variant="secondary" icon="wb_twilight" onClick={() => input.current?.click()}>
              {tr.questions.photoAdd}
            </Button>
          </>
        ) : null}
      </fieldset>

      <Button type="submit" expand loading={pending} disabled={uploading}>
        {text.submit}
      </Button>
    </form>
  );
}
