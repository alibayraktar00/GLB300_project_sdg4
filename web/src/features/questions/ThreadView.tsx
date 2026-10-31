import { Banner } from '@/components/Banner';
import { ReportMessage } from '@/features/safety/ReportMessage';
import { tr } from '@/strings/tr';

import styles from './ThreadView.module.css';
import type { MessageKind, ThreadData } from './types';

/** Mesajın yazarı: bakan kendi mesajına "Sen"; "cevap" gönüllünündür, "soru" ve "takip" öğrencinindir. */
function authorLabel(kind: MessageKind, mine: boolean): string {
  if (mine) return tr.questions.sender.you;
  return kind === 'cevap' ? tr.questions.sender.volunteer : tr.questions.sender.student;
}

const formatter = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Istanbul' });
function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : formatter.format(date);
}

/**
 * Bir sorunun konuşması: soru, cevaplar, takip soruları ve fotoğraflar. Sunucu bileşenidir; fotoğraflar süreli
 * imzalı adreslerdir (sunucuda üretilir). Gizlenmiş mesajın metni hiç gelmez, yalnızca bir not gösterilir.
 * Etkileşim (cevap yazma, kapatma) sayfa tarafından bu bileşenin altına konur.
 */
export function ThreadView({ thread, reportReturnTo }: { thread: ThreadData; reportReturnTo?: string }) {
  return (
    <div className={styles.thread}>
      <p className={styles.status}>
        {thread.subject ? `${thread.subject} · ` : ''}
        {tr.questions.statuses[thread.status]}
      </p>
      {thread.messages.length === 0 ? <Banner tone="info">{tr.questions.noMessages}</Banner> : null}
      <ol className={styles.messages}>
        {thread.messages.map((message) => (
          <li key={message.id} className={message.mine ? styles.mine : styles.theirs}>
            <p className={styles.author}>
              <span>{authorLabel(message.kind, message.mine)}</span>
              <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
            </p>
            {message.hidden ? (
              <p className={styles.hidden}>{tr.questions.hiddenMessage}</p>
            ) : (
              <>
                {message.body ? <p className={styles.body}>{message.body}</p> : null}
                {message.photos.map((url, index) => (
                  // Süreli imzalı Storage adresi; boyutu bilinmediği için next/image kullanılmaz.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt={tr.questions.photoAlt(index + 1)} className={styles.photo} loading="lazy" />
                ))}
                {reportReturnTo && !message.mine ? <ReportMessage messageId={message.id} returnTo={reportReturnTo} /> : null}
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
