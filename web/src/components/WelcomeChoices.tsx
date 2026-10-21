import { CardContent, CardLink } from '@/components/Card';
import { tr } from '@/strings/tr';

import styles from './WelcomeChoices.module.css';

/**
 * Açılış ekranının üç giriş seçeneği: Veliyim / Gönüllüyüm / Öğrenciyim. Her biri tamamı tıklanabilir tek bir
 * bağlantı kartıdır (tek dokunma alanı, tek ekran okuyucu öğesi: başlık + açıklama birlikte okunur).
 *
 * Veli ve gönüllü e-posta ile (/giris), öğrenci kullanıcı adıyla (/giris/ogrenci) girer. Veli kaydı ve
 * gönüllü başvurusu sayfaları sonraki adımda eklenecek.
 */
export function WelcomeChoices() {
  return (
    <ul className={styles.list}>
      <li>
        <CardLink href="/giris">
          <CardContent
            icon="family_restroom"
            title={tr.home.guardian.title}
            description={tr.home.guardian.subtitle}
            chevron
          />
        </CardLink>
      </li>
      <li>
        <CardLink href="/giris">
          <CardContent
            icon="volunteer_activism"
            title={tr.home.volunteer.title}
            description={tr.home.volunteer.subtitle}
            chevron
          />
        </CardLink>
      </li>
      <li>
        <CardLink href="/giris/ogrenci">
          <CardContent
            icon="backpack"
            title={tr.home.student.title}
            description={tr.home.student.subtitle}
            chevron
          />
        </CardLink>
      </li>
    </ul>
  );
}
