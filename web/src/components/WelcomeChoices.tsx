'use client';

import { CardButton, CardContent } from '@/components/Card';
import { useNotice } from '@/components/Notice';
import { tr } from '@/strings/tr';

import styles from './WelcomeChoices.module.css';

/**
 * Açılış ekranının üç giriş seçeneği: Veliyim / Gönüllüyüm / Öğrenciyim. Her biri tamamı tıklanabilir tek bir
 * düğme kartıdır (tek dokunma alanı, tek ekran okuyucu öğesi: başlık + açıklama birlikte okunur).
 *
 * Giriş akışı Faz A'da yazılacak; şimdilik her seçenek kalıcı bir "yakında" bildirimi gösterir.
 * TODO(Faz A): seçenekleri `/giris`, `/kayit/veli`, `/basvuru` ve `/giris/ogrenci` adreslerine bağlayan
 * `CardLink`'lere çevir (bağlantılar JavaScript'siz de çalışır).
 */
export function WelcomeChoices() {
  const notice = useNotice();
  const comingSoon = () => notice.show(tr.home.comingSoon);

  return (
    <ul className={styles.list}>
      <li>
        <CardButton onClick={comingSoon}>
          <CardContent
            icon="family_restroom"
            title={tr.home.guardian.title}
            description={tr.home.guardian.subtitle}
            chevron
          />
        </CardButton>
      </li>
      <li>
        <CardButton onClick={comingSoon}>
          <CardContent
            icon="volunteer_activism"
            title={tr.home.volunteer.title}
            description={tr.home.volunteer.subtitle}
            chevron
          />
        </CardButton>
      </li>
      <li>
        <CardButton onClick={comingSoon}>
          <CardContent
            icon="backpack"
            title={tr.home.student.title}
            description={tr.home.student.subtitle}
            chevron
          />
        </CardButton>
      </li>
    </ul>
  );
}
