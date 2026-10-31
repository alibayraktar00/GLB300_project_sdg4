import { tr } from '@/strings/tr';

/** Taahhütnamedeki madde sayısı; her madde ayrı bir onay kutusudur (`m0`, `m1`, ...) ve hiçbiri önceden işaretli değildir. */
export const PLEDGE_COUNT = tr.legalPledge.items.length;

export const pledgeFieldName = (index: number): string => `m${index}`;

/** Eksik bırakılan madde indisleri. Boş dizi: hepsi işaretli. */
export function missingPledgeItems(read: (name: string) => unknown): number[] {
  const missing: number[] = [];
  for (let index = 0; index < PLEDGE_COUNT; index += 1) {
    if (read(pledgeFieldName(index)) !== 'on') missing.push(index);
  }
  return missing;
}
