import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';
import { tr } from '@/strings/tr';

import { Button } from './Button';
import { Icon, type UiIconName } from './Icon';
import { Spinner } from './Spinner';
import styles from './StateViews.module.css';

type StateViewProps = {
  icon: UiIconName;
  title: string;
  message: string;
  /** Genellikle bir `Button` ya da `ButtonLink`. */
  action?: ReactNode;
  /** Başlık düzeyi (varsayılan 2: sayfanın `<h1>`'i ayrıca vardır). Tam sayfa durumlarda 1 verilir. */
  headingLevel?: 1 | 2;
  /** Görünüm sonradan belirirse (ör. liste hataya düşünce) ekran okuyucu içeriği duyurur. */
  announce?: boolean;
  muted?: boolean;
};

/** Ortak durum görünümü: simge + başlık + açıklama + isteğe bağlı tek eylem. */
export function StateView({ icon, title, message, action, headingLevel = 2, announce, muted }: StateViewProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className={styles.state} role={announce ? 'status' : undefined}>
      <Icon name={icon} size="state" className={cx(styles.icon, muted && styles.muted)} />
      <Heading className={styles.title}>{title}</Heading>
      <p className={styles.message}>{message}</p>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}

/** Boş durum: listede henüz öğe yok. Sakin ve yönlendiricidir; hata gibi görünmez. */
export function EmptyState({
  title = tr.states.emptyTitle,
  message,
  actionLabel,
  onAction,
  icon = 'wb_twilight',
}: {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: UiIconName;
}) {
  return (
    <StateView
      icon={icon}
      title={title}
      message={message}
      action={actionLabel ? <Button onClick={onAction}>{actionLabel}</Button> : undefined}
    />
  );
}

/** Hata durumu: yükleme başarısız. Suçlamaz, panik yaratmaz, tek bir çıkış yolu verir. */
export function ErrorState({
  title = tr.states.errorTitle,
  message = tr.states.errorMessage,
  retryLabel = tr.common.retry,
  onRetry,
  action,
  headingLevel,
}: {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  /** Tekrar dene yerine özel eylem (ör. ana sayfaya bağlantı). */
  action?: ReactNode;
  headingLevel?: 1 | 2;
}) {
  return (
    <StateView
      icon="cloud_off"
      title={title}
      message={message}
      muted
      announce
      headingLevel={headingLevel}
      action={
        action ??
        (onRetry ? (
          <Button icon="refresh" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : undefined)
      }
    />
  );
}

/**
 * Yükleniyor durumu: gösterge + görünür "Yükleniyor" yazısı; ekran okuyucu bunu duyurur. "Animasyonları azalt"
 * açıkken dönen gösterge yerine durağan kum saati gösterilir.
 */
export function LoadingState({ message = tr.states.loading }: { message?: string }) {
  return (
    <div className={styles.loading} role="status">
      <Spinner />
      <span>{message}</span>
    </div>
  );
}

/**
 * Liste yüklenirken kartların yerini tutan durağan taslaklar. Bilerek parıltı ya da nabız animasyonu YOK:
 * yorgun ve duyarlı kullanıcılar için sakin; "animasyonları azalt" kuralıyla çelişmez.
 */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.skeleton} role="status" aria-busy="true">
      <span className="sr-only">{tr.states.loading}</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={styles.skeletonCard} aria-hidden="true">
          <div className={cx(styles.bar, styles.barTitle)} />
          <div className={cx(styles.bar, styles.barFull)} />
          <div className={cx(styles.bar, styles.barMost)} />
        </div>
      ))}
    </div>
  );
}
