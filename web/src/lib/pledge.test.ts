import { describe, expect, it } from 'vitest';

import { missingPledgeItems, PLEDGE_COUNT, pledgeFieldName } from './pledge';

describe('missingPledgeItems', () => {
  it('11 madde vardır ve hepsi işaretliyse eksik yoktur', () => {
    expect(PLEDGE_COUNT).toBe(11);
    const all = new Map(Array.from({ length: PLEDGE_COUNT }, (_, i) => [pledgeFieldName(i), 'on']));
    expect(missingPledgeItems((name) => all.get(name))).toEqual([]);
  });

  it('işaretlenmeyen ya da "on" dışı değerler eksik sayılır', () => {
    const values = new Map<string, unknown>(Array.from({ length: PLEDGE_COUNT }, (_, i) => [pledgeFieldName(i), 'on']));
    values.delete('m3');
    values.set('m5', 'true');
    expect(missingPledgeItems((name) => values.get(name))).toEqual([3, 5]);
  });

  it('hiçbiri gönderilmediyse hepsi eksiktir', () => {
    expect(missingPledgeItems(() => null)).toHaveLength(PLEDGE_COUNT);
  });
});
