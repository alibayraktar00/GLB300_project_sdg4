'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { tr } from '@/strings/tr';

import styles from './Notice.module.css';

type NoticeContextValue = {
  /** Kısa bir geri bildirim gösterir ("Kaydedildi."). Önceki çubuk varsa onun yerini alır. */
  show: (message: string) => void;
  dismiss: () => void;
};

type NoticeState = { id: number; message: string } | null;

const NoticeContext = createContext<NoticeContextValue | null>(null);
const NoticeStateContext = createContext<{ notice: NoticeState; dismiss: () => void }>({
  notice: null,
  dismiss: () => {},
});

/**
 * Bildirim durumunu tutar (kök düzende). Çubuğun kendisini `NoticeRegion` çizer; AppShell ve PublicPage
 * bunu uygun yere (gezinmenin üstüne) koyar.
 *
 * ZAMAN AŞIMI YOK (plan 9.4): bildirim kendiliğinden kaybolmaz; kullanıcı "Tamam" ile kapatır ya da yeni bir
 * bildirim onun yerini alır. Yavaş okuyan ve ekran okuyucu kullanan çocuk mesajı kaçırmaz.
 */
export function NoticeProvider({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<NoticeState>(null);

  const show = useCallback((message: string) => {
    setNotice((previous) => ({ id: (previous?.id ?? 0) + 1, message }));
  }, []);
  const dismiss = useCallback(() => setNotice(null), []);

  const actions = useMemo(() => ({ show, dismiss }), [show, dismiss]);
  const state = useMemo(() => ({ notice, dismiss }), [notice, dismiss]);

  return (
    <NoticeContext.Provider value={actions}>
      <NoticeStateContext.Provider value={state}>{children}</NoticeStateContext.Provider>
    </NoticeContext.Provider>
  );
}

export function useNotice(): NoticeContextValue {
  const value = useContext(NoticeContext);
  if (!value) throw new Error('useNotice, NoticeProvider içinde kullanılmalı.');
  return value;
}

/**
 * Bildirim bölgesi. `role="status"` (aria-live="polite") bölgesi sayfada her zaman bulunur; bildirim
 * eklenince ekran okuyucu okur. Boşken yer kaplamaz.
 */
export function NoticeRegion() {
  const { notice, dismiss } = useContext(NoticeStateContext);
  return (
    <div className={styles.region} role="status" aria-live="polite" aria-atomic="true" aria-label={tr.notice.regionLabel}>
      {notice ? (
        <div className={styles.notice} key={notice.id}>
          <p className={styles.message}>{notice.message}</p>
          <button type="button" className={styles.ok} onClick={dismiss}>
            {tr.common.ok}
          </button>
        </div>
      ) : null}
    </div>
  );
}
