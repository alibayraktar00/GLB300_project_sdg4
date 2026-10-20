import { cx } from '@/lib/cx';

import { navIconPaths, uiIconPaths } from './icons/icon-paths';
import styles from './Icon.module.css';

export type UiIconName = keyof typeof uiIconPaths;
export type NavIconName = keyof typeof navIconPaths;
type IconSize = 'sm' | 'md' | 'lg' | 'state';

type IconProps = {
  name: UiIconName;
  size?: IconSize;
  className?: string;
  /** Verilirse ikon anlam taşır ve ekran okuyucuya bu metinle okunur. Verilmezse süstür (gizli). */
  label?: string;
};

/**
 * Satır içi SVG ikon (Material Symbols, Apache 2.0). İkon fontu ve CDN yoktur.
 * Varsayılan olarak SÜSTÜR (`aria-hidden`): anlam her zaman yanındaki metindedir. Yalnızca ikonla anlatılan
 * bilgi yoktur; yalnızca ikonlu düğmelerin `aria-label`'ı vardır.
 */
export function Icon({ name, size = 'md', className, label }: IconProps) {
  return <SvgIcon d={uiIconPaths[name].outline} size={size} className={className} label={label} />;
}

type NavIconProps = {
  name: NavIconName;
  /** Seçili hedef DOLU simgeyle gösterilir: durum yalnızca renkle değil biçimle de belli olur. */
  filled?: boolean;
  className?: string;
};

/** Gezinme ikonu (çizgili ve dolu sürüm). Yalnızca sunucuda çizilen AppShell kullanır; tarayıcıya gitmez. */
export function NavIcon({ name, filled = false, className }: NavIconProps) {
  const paths = navIconPaths[name];
  return <SvgIcon d={filled ? paths.fill : paths.outline} size="md" className={className} />;
}

function SvgIcon({ d, size, className, label }: { d: string; size: IconSize; className?: string; label?: string }) {
  const sizeClass = size === 'sm' ? styles.sm : size === 'lg' ? styles.lg : size === 'state' ? styles.state : undefined;
  return (
    <svg
      className={cx(styles.icon, sizeClass, className)}
      viewBox="0 -960 960 960"
      width="24"
      height="24"
      focusable="false"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <path d={d} />
    </svg>
  );
}
