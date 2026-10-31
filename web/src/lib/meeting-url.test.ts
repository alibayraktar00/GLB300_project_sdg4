import { describe, expect, it } from 'vitest';

import { safeMeetingUrl } from './meeting-url';

describe('safeMeetingUrl', () => {
  it.each(['https://meet.google.com/abc-defg-hij', 'https://zoom.us/j/123456789', 'https://us02web.zoom.us/j/123?pwd=abc'])(
    'izinli adres geçer: %s',
    (url) => {
      expect(safeMeetingUrl(url)).not.toBeNull();
    },
  );

  it.each([
    'javascript:alert(1)',
    'data:text/html,x',
    'http://meet.google.com/abc-defg-hij',
    'https://meet.google.com.evil.com/abc',
    'https://zoom.us.evil.com/j/1',
    'https://user@meet.google.com/abc-defg-hij',
    'https://meet.google.com:8443/abc-defg-hij',
    'https://evil.example.com/',
    'not a url',
    '',
    null,
    undefined,
  ])('izinsiz adres null olur: %s', (url) => {
    expect(safeMeetingUrl(url as string | null | undefined)).toBeNull();
  });
});
