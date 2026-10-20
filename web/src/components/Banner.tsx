import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';
import { tr } from '@/strings/tr';

import styles from './Banner.module.css';
import { Icon, type UiIconName } from './Icon';

export type BannerTone = 'info' | 'success' | 'warning' | 'error';

const TONES: Record<BannerTone, { icon: UiIconName; label: string; className: string | undefined }> = {
  info: { icon: 'info', label: tr.banner.info, className: undefined },
  success: { icon: 'check_circle', label: tr.banner.success, className: styles.success },
  warning: { icon: 'warning', label: tr.banner.warning, className: styles.warning },
  error: { icon: 'error', label: tr.banner.error, className: styles.error },
};

type BannerProps = {
  tone: BannerTone;
  title?: string;
  children: ReactNode;
  /** Eylem (metin düğmesi ya da bağlantı). Bandın yazı rengini alır. */
  action?: ReactNode;
  /** Verilirse kapatma düğmesi çıkar. Bant hiçbir zaman kendiliğinden kapanmaz. */
  onDismiss?: () => void;
};

/**
 * Sayfa içi bilgi bandı (çevrimdışı uyarısı, "gönderildi", "konu sırası yaklaşıktır").
 * Ekran okuyucu: `role="status"` (hata için `alert`) ile içeriği duyurur; ton etiketi ("Uyarı: ...") yazıdan
 * önce okunur. Ton üç şekilde verilir: renk, ikon ve bu etiket.
 */
export function Banner({ tone, title, children, action, onDismiss }: BannerProps) {
  const { icon, label, className } = TONES[tone];
  return (
    <div className={cx(styles.banner, className)} role={tone === 'error' ? 'alert' : 'status'}>
      <Icon name={icon} className={styles.icon} />
      <div className={styles.body}>
        <span className="sr-only">{`${label}: `}</span>
        {title ? <p className={styles.title}>{title}</p> : null}
        <div>{children}</div>
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>
      {onDismiss ? (
        <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label={tr.banner.dismiss}>
          <Icon name="close" />
        </button>
      ) : null}
    </div>
  );
}
