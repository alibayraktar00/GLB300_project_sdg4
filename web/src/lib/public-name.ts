import { upperTr } from '@/lib/turkish';

/**
 * Bir gönüllünün öğrenciye ve veliye görünen kısa adı: "Ad S." (docs/ekran-akislari.md 7.1).
 *
 * Son sözcük soyadı kabul edilir, öncekiler ad(lar)dır. Tek sözcük varsa olduğu gibi döner. Soyadının
 * baş harfi Türkçe kuralla büyütülür: "ışık" -> "I.", "iplik" -> "İ.".
 * Sunucuda üretilirse de aynı kural uygulanmalıdır: Postgres `upper()` varsayılan harmanlamada "i"yi "I" yapar.
 */
export function shortPublicName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const [first] = parts;
  if (parts.length === 1) return first ?? '';

  const surname = parts[parts.length - 1] ?? '';
  const given = parts.slice(0, -1).join(' ');
  const initial = upperTr([...surname][0] ?? '');
  return `${given} ${initial}.`;
}
