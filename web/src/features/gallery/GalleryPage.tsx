import Link from 'next/link';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/AppShell';
import { Banner } from '@/components/Banner';
import { Button, ButtonLink } from '@/components/Button';
import { Card, CardButton, CardContent, CardLink } from '@/components/Card';
import { Icon, NavIcon, type NavIconName, type UiIconName } from '@/components/Icon';
import { navIconPaths, uiIconPaths } from '@/components/icons/icon-paths';
import { ProgressBar } from '@/components/ProgressBar';
import { PublicPage } from '@/components/PublicPage';
import { RadioCard, RadioCardGroup } from '@/components/RadioCard';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState, ErrorState, LoadingState, SkeletonList } from '@/components/StateViews';
import { Switch } from '@/components/Switch';
import { TextField } from '@/components/TextField';
import { APP_ROLES, ROLE_LABELS, roleDestinations, type AppRole } from '@/lib/role-navigation';
import { tr } from '@/strings/tr';

import { GALLERY_PAIRS, THEME_VARIANTS, VARIANT_ATTRIBUTE, pairRatio } from './color-pairs';
import styles from './Gallery.module.css';
import {
  DismissibleBannerDemo,
  ErrorStateDemo,
  GalleryControls,
  MotionDemo,
  NoticeDemo,
} from './GalleryClient';

const copy = tr.gallery;
const sample = copy.sample;

const THEME_NAMES = {
  light: copy.themeNames.light,
  dark: copy.themeNames.dark,
  hcLight: copy.themeNames.hcLight,
  hcDark: copy.themeNames.hcDark,
} as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <SectionHeader id={id} title={title} />
      {children}
    </section>
  );
}

const TYPE_STYLES: ReadonlyArray<{ name: string; size: string; className: string }> = [
  { name: 'headlineLg', size: '32', className: styles.sizeHeadlineLg ?? '' },
  { name: 'headlineMd', size: '28', className: styles.sizeHeadlineMd ?? '' },
  { name: 'headlineSm', size: '24', className: styles.sizeHeadlineSm ?? '' },
  { name: 'titleLg', size: '22', className: styles.sizeTitleLg ?? '' },
  { name: 'titleMd', size: '18', className: styles.sizeTitleMd ?? '' },
  { name: 'titleSm', size: '16', className: styles.sizeTitleSm ?? '' },
  { name: 'bodyLg', size: '18', className: styles.sizeBodyLg ?? '' },
  { name: 'bodyMd', size: '16', className: styles.sizeBodyMd ?? '' },
  { name: 'bodySm', size: '14', className: styles.sizeBodySm ?? '' },
  { name: 'labelLg', size: '16', className: styles.sizeLabelLg ?? '' },
  { name: 'labelMd', size: '14', className: styles.sizeLabelMd ?? '' },
];

function pairClass(index: number): string {
  return (styles as Record<string, string>)[`pair${index}`] ?? '';
}

/**
 * Bileşen galerisi (yalnızca geliştirme; `src/app/galeri/page.tsx` üretimde 404 döner). Ekip tasarım sistemini
 * cihazda görsün: 4 tema yan yana (renkler ve gerçek kontrast oranları), yazı ölçeği, bütün bileşenler ve durumları,
 * rol iskeleti örnekleri (telefon ve geniş düzen). Üstteki ayarlarla tema, yazı boyutu (%100-%200) ve hareket denenir.
 */
export function GalleryPage({ role }: { role: AppRole }) {
  const firstPath = roleDestinations(role)[0]?.path;
  const navIconNames = Object.keys(navIconPaths) as NavIconName[];
  const uiIconNames = Object.keys(uiIconPaths) as UiIconName[];

  return (
    <PublicPage>
      <div className={styles.page}>
        <div className={styles.stack}>
          <h1 className={styles.title}>{copy.title}</h1>
          <p className={styles.intro}>{copy.intro}</p>
          <GalleryControls />
        </div>

        <Section id="g-renkler" title={copy.sections.colors}>
          <div className={styles.themes}>
            {THEME_VARIANTS.map((variant) => (
              <div key={variant} className={styles.themeBox} data-theme={VARIANT_ATTRIBUTE[variant]}>
                <h3 className={styles.themeName}>{THEME_NAMES[variant]}</h3>
                <ul className={styles.swatches}>
                  {GALLERY_PAIRS.map(([foreground, background], index) => (
                    <li key={`${foreground}-${background}`} className={`${styles.swatch} ${pairClass(index)}`}>
                      <span>{`${foreground} / ${background}`}</span>
                      <span className={styles.ratio}>{`${pairRatio(variant, foreground, background).toFixed(1)}:1`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section id="g-yazi" title={copy.sections.type}>
          <div className={styles.typeList}>
            {TYPE_STYLES.map(({ name, size, className }) => (
              <p key={name} className={className}>{`${name} ${size} px`}</p>
            ))}
            <p className={styles.sizeHeadlineSm}>{sample.pangram}</p>
            <p className={styles.sizeBodyLg}>{sample.pangram}</p>
          </div>
        </Section>

        <Section id="g-dugmeler" title={copy.sections.buttons}>
          <div className={styles.stack}>
            <Button icon="play_arrow" expand>
              {sample.primaryAction}
            </Button>
            <Button variant="secondary" expand>
              {sample.secondaryAction}
            </Button>
            <Button disabled expand>
              {sample.disabledAction}
            </Button>
            <p className={styles.help}>{sample.disabledReason}</p>
            <Button loading expand>
              {sample.loadingAction}
            </Button>
            <Button variant="secondary" loading expand>
              {sample.loadingAction}
            </Button>
            <div className={styles.row}>
              <Button variant="text">{sample.textAction}</Button>
              <ButtonLink href="/galeri" variant="secondary" icon="refresh">
                {tr.common.retry}
              </ButtonLink>
            </div>
          </div>
        </Section>

        <Section id="g-kartlar" title={copy.sections.cards}>
          <div className={styles.stack}>
            <SectionHeader title={sample.headerTitle} subtitle={sample.cardSubtitle} />
            <Card tone="primary">
              <CardContent icon="wb_twilight" title={sample.cardTitle} description={sample.cardSubtitle} />
            </Card>
            <Card>
              <CardContent title={sample.staticCard} />
            </Card>
            <CardLink href="/galeri">
              <CardContent
                icon="info"
                title={sample.cardTitle}
                description={sample.linkCardDescription}
                chevron
              />
            </CardLink>
            <CardButton>
              <CardContent icon="check_circle" title={sample.cardTitle} description={sample.cardSubtitle} chevron />
            </CardButton>
            <CardButton tone="warm">
              <CardContent icon="warning" title={sample.cardTitle} description={sample.cardSubtitle} chevron />
            </CardButton>
            <CardButton tone="success">
              <CardContent icon="check_circle" title={sample.cardTitle} description={sample.cardSubtitle} chevron />
            </CardButton>
          </div>
        </Section>

        <Section id="g-secimler" title={copy.sections.choices}>
          <div className={styles.stack}>
            <RadioCardGroup legend={sample.choiceLegend}>
              <RadioCard
                name="galeri-mod"
                value="kisa"
                title={sample.choiceShortTitle}
                description={sample.choiceShortBody}
                defaultChecked
              />
              <RadioCard
                name="galeri-mod"
                value="tam"
                title={sample.choiceFullTitle}
                description={sample.choiceFullBody}
              />
            </RadioCardGroup>
          </div>
        </Section>

        <Section id="g-bantlar" title={copy.sections.banners}>
          <div className={styles.stack}>
            <Banner tone="info">{sample.bannerInfo}</Banner>
            <DismissibleBannerDemo />
            <Banner tone="warning">{sample.bannerWarning}</Banner>
            <Banner
              tone="error"
              action={
                <ButtonLink href="/galeri" variant="text">
                  {tr.common.retry}
                </ButtonLink>
              }
            >
              {sample.bannerError}
            </Banner>
          </div>
        </Section>

        <Section id="g-ilerleme" title={copy.sections.progress}>
          <div className={styles.stack}>
            <ProgressBar value={0.3} label={sample.progressLabel} caption={sample.progressCaption} />
            <ProgressBar value={1} label={sample.progressLabel} />
          </div>
        </Section>

        <Section id="g-durumlar" title={copy.sections.states}>
          <div className={styles.stack}>
            <div className={styles.frame}>
              <EmptyState title={sample.emptyTitle} message={sample.emptyMessage} actionLabel={sample.emptyAction} />
            </div>
            <div className={styles.frame}>
              <ErrorStateDemo />
            </div>
            <div className={styles.frame}>
              <ErrorState
                title={tr.error.title}
                message={tr.error.body}
                action={
                  <ButtonLink href="/" variant="secondary">
                    {tr.error.home}
                  </ButtonLink>
                }
              />
            </div>
            <div className={styles.frame}>
              <LoadingState />
            </div>
            <SkeletonList count={2} />
          </div>
        </Section>

        <Section id="g-form" title={copy.sections.form}>
          <div className={styles.stack}>
            <TextField
              label={sample.fieldLabel}
              placeholder={sample.fieldHint}
              help={sample.fieldHelp}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
            <TextField
              label={sample.fieldLabel}
              defaultValue="ela.k"
              error={sample.fieldError}
              autoComplete="off"
              spellCheck={false}
            />
            <TextField label={sample.fieldLabel} disabled defaultValue="ela.k" autoComplete="off" />
            <Switch label={sample.switchLabel} help={sample.switchHelp} defaultChecked />
            <Switch label={sample.switchLabel} />
          </div>
        </Section>

        <Section id="g-bildirim" title={copy.sections.notices}>
          <div className={styles.stack}>
            <NoticeDemo />
          </div>
        </Section>

        <Section id="g-iskelet" title={copy.sections.shell}>
          <div className={styles.shellRoles} role="group" aria-label={sample.shellRole}>
            {APP_ROLES.map((item) => (
              <Link
                key={item}
                href={`/galeri?rol=${item}`}
                className={styles.chipFace}
                aria-current={item === role ? 'true' : undefined}
              >
                {ROLE_LABELS[item]}
              </Link>
            ))}
          </div>

          <p className={styles.shellLabel}>{sample.shellCompact}</p>
          <div className={styles.shellNarrow}>
            {/* Kaydırılabilir bölge klavyeyle odaklanabilmeli (WCAG 2.1.1, axe: scrollable-region-focusable). */}
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
            <div className={styles.shellFrame} role="region" aria-label={sample.shellCompact} tabIndex={0}>
              <AppShell appRole={role} currentPath={firstPath} embedded={{ navLabel: `${tr.shell.navLabel} (${sample.shellCompact})` }}>
                <h3 className={styles.shellHeading}>{sample.shellPageTitle}</h3>
                <p className={styles.shellBody}>{sample.shellBody}</p>
              </AppShell>
            </div>
          </div>

          <p className={styles.shellLabel}>{sample.shellWide}</p>
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
          <div className={styles.shellScroll} role="region" aria-label={sample.shellWide} tabIndex={0}>
            <div className={`${styles.shellWide} ${styles.shellFrame}`}>
              <AppShell appRole={role} currentPath={firstPath} embedded={{ navLabel: `${tr.shell.navLabel} (${sample.shellWide})` }}>
                <h3 className={styles.shellHeading}>{sample.shellPageTitle}</h3>
                <p className={styles.shellBody}>{sample.shellBody}</p>
              </AppShell>
            </div>
          </div>
        </Section>

        <Section id="g-hareket" title={copy.sections.motion}>
          <MotionDemo />
        </Section>

        <Section id="g-ikonlar" title={copy.sections.icons}>
          <ul className={styles.icons}>
            {navIconNames.map((name) => (
              <li key={`nav-${name}`} className={styles.iconCell}>
                <span className={styles.iconPair}>
                  <NavIcon name={name} />
                  <NavIcon name={name} filled />
                </span>
                <span>{name}</span>
              </li>
            ))}
            {uiIconNames.map((name) => (
              <li key={`ui-${name}`} className={styles.iconCell}>
                <Icon name={name} />
                <span>{name}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </PublicPage>
  );
}
