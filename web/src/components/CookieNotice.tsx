'use client';

import Link from 'next/link';
import { useState } from 'react';

import { COOKIE_NOTICE_STORAGE_KEY } from '@/lib/appearance';
import { tr } from '@/strings/tr';

import styles from './CookieNotice.module.css';

/**
 * Çerez bilgilendirme notu (`docs/hukuk/cerez-politikasi.md` §1, sonuç 3).
 *
 * Bu bir RIZA bandı DEĞİLDİR: site yalnızca zorunlu çerezleri ve cihaz belleğini kullanır, reklam ya da analitik yoktur;
 * bu yüzden "Kabul et / Reddet" sorulmaz (rıza izlenimi verir). Yalnızca bilgi verilir ve tek düğme "Tamam"dır.
 * Ayrıntı için Çerez Politikası bağlantısı vardır. İleride zorunlu olmayan bir teknoloji eklenirse, o teknoloji
 * çalışmadan önce gerçek bir rıza paneli ("Kabul et", "Reddet", "Tercihler" eşit ağırlıkta) eklenmelidir.
 *
 * "Tamam"a basıldığında yalnızca "notu kapattığınız" bilgisi cihaza yazılır (politikada listelidir).
 * Daha önce kapatılmışsa kök düzendeki satır içi betik `<html data-cerez="tamam">` yazar ve CSS notu gizler.
 */
export function CookieNotice() {
  const [closed, setClosed] = useState(false);

  if (closed) return null;

  const close = () => {
    try {
      window.localStorage.setItem(COOKIE_NOTICE_STORAGE_KEY, '1');
    } catch {
      // Depo yazılamıyorsa not bu oturum için yine de kapanır.
    }
    document.documentElement.setAttribute('data-cerez', 'tamam');
    setClosed(true);
  };

  return (
    <section className={styles.notice} aria-label={tr.cookieNotice.label}>
      <p className={styles.text}>
        {tr.cookieNotice.text} {tr.cookieNotice.detail}{' '}
        <Link href="/cerezler">{tr.cookieNotice.link}</Link>.
      </p>
      <button type="button" className={styles.ok} onClick={close}>
        {tr.cookieNotice.ok}
      </button>
    </section>
  );
}
