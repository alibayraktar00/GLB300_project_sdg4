import { tr } from '@/strings/tr';

import { Card, CardContent } from './Card';
import type { UiIconName } from './Icon';
import styles from './HomeSections.module.css';
import { SectionHeader } from './SectionHeader';

type Item = { icon: UiIconName; title: string; text: string };

function Cards({ items, ordered }: { items: readonly Item[]; ordered?: boolean }) {
  const List = ordered ? 'ol' : 'ul';
  return (
    <List className={styles.list}>
      {items.map((item) => (
        <li key={item.title}>
          <Card>
            <CardContent icon={item.icon} title={item.title} description={item.text} />
          </Card>
        </li>
      ))}
    </List>
  );
}

/**
 * Açılış sayfasının tanıtım bölümleri: nasıl çalışır ve güvenlik. Yalnızca bilgi verir; giriş seçenekleri
 * sayfanın üstündedir. Metinler `tr.home` içindedir (sağlık sözcüğü ve ünlem kuralları testle korunur).
 */
export function HomeSections() {
  return (
    <div className={styles.sections}>
      <section aria-labelledby="nasil-calisir" className={styles.section}>
        <SectionHeader id="nasil-calisir" title={tr.home.howTitle} />
        <Cards items={tr.home.steps} ordered />
      </section>
      <section aria-labelledby="guvenlik" className={styles.section}>
        <SectionHeader id="guvenlik" title={tr.home.safetyTitle} />
        <Cards items={tr.home.safety} />
      </section>
    </div>
  );
}
