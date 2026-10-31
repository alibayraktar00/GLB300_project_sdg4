import { SectionHeader } from '@/components/SectionHeader';
import pageStyles from '@/features/questions/page.module.css';
import { tr } from '@/strings/tr';

import { AppearanceSettings } from './AppearanceSettings';

/** Dört rolün ortak Ayarlar sayfası (şimdilik Görünüm ve erişilebilirlik). Rol denetimini ilgili iskelet (layout) yapar. */
export function SettingsPage() {
  return (
    <div className={pageStyles.page}>
      <h1 className={pageStyles.title}>{tr.settings.title}</h1>
      <section className={pageStyles.section} aria-labelledby="gorunum">
        <SectionHeader id="gorunum" title={tr.settings.appearance} />
        <AppearanceSettings />
      </section>
    </div>
  );
}
