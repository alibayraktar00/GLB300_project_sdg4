/** Sınıf adlarını birleştirir; yanlış (false, null, undefined) değerleri atar. Küçük, bağımlılıksız `clsx`. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
