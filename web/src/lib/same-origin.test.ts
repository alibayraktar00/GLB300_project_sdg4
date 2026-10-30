import { describe, expect, it } from 'vitest';

import { isSameOrigin } from './same-origin';

const req = (origin: string | null, url = 'https://site.example/api/soru-eki') =>
  new Request(url, { method: 'POST', headers: origin === null ? {} : { origin } });

describe('isSameOrigin', () => {
  it('aynı köken kabul edilir', () => {
    expect(isSameOrigin(req('https://site.example'))).toBe(true);
  });

  it.each(['https://evil.example', 'http://site.example', 'https://site.example.evil.com', 'https://sub.site.example', 'null', 'not a url'])(
    'başka köken reddedilir: %s',
    (origin) => {
      expect(isSameOrigin(req(origin))).toBe(false);
    },
  );

  it('Origin başlığı yoksa reddedilir', () => {
    expect(isSameOrigin(req(null))).toBe(false);
  });

  it('port farkı başka köken sayılır', () => {
    expect(isSameOrigin(req('https://site.example:8443'))).toBe(false);
  });
});
