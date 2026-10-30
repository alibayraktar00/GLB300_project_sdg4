import { describe, expect, it } from 'vitest';

import { MFA_CODE_PATTERN } from './mfa';

describe('MFA_CODE_PATTERN', () => {
  it('yalnızca 6 haneli sayıyı kabul eder', () => {
    expect(MFA_CODE_PATTERN.test('123456')).toBe(true);
    for (const bad of ['12345', '1234567', 'abcdef', '12 3456', '', '１２３４５６'.slice(0, 6)]) {
      expect(MFA_CODE_PATTERN.test(bad)).toBe(false);
    }
  });
});
