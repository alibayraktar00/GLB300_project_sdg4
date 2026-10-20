import { describe, expect, it } from 'vitest';

import { createReportLimiter, summarizeCspReports } from './csp-report';

describe('summarizeCspReports', () => {
  it('eski biçimi (report-uri) özetler; sorgu ve yol ayrıntısını atar', () => {
    const result = summarizeCspReports({
      'csp-report': {
        'document-uri': 'https://uygulama.example/ogrenci/sorular/123?devam=/gizli',
        'violated-directive': 'script-src',
        'effective-directive': 'script-src-elem',
        'blocked-uri': 'https://kotu.example/a/b.js?token=SIR',
        disposition: 'report',
        'script-sample': 'KISISEL VERI',
        referrer: 'https://baska.example/',
      },
    });
    expect(result).toEqual([
      { directive: 'script-src-elem', blocked: 'https://kotu.example', page: '/ogrenci', disposition: 'report' },
    ]);
    expect(JSON.stringify(result)).not.toContain('SIR');
    expect(JSON.stringify(result)).not.toContain('KISISEL');
  });

  it('yeni biçimi (Reporting API) özetler', () => {
    const result = summarizeCspReports([
      {
        type: 'csp-violation',
        url: 'https://uygulama.example/',
        body: {
          documentURL: 'https://uygulama.example/',
          effectiveDirective: 'img-src',
          blockedURL: 'inline',
          disposition: 'report',
        },
      },
      { type: 'deprecation', body: {} },
    ]);
    expect(result).toEqual([{ directive: 'img-src', blocked: 'inline', page: '/', disposition: 'report' }]);
  });

  it('tanınmayan veya bozuk gövdede boş liste verir', () => {
    expect(summarizeCspReports(null)).toEqual([]);
    expect(summarizeCspReports('metin')).toEqual([]);
    expect(summarizeCspReports({ baska: 1 })).toEqual([]);
  });

  it('çok uzun alanları kırpar ve en çok 10 özet verir', () => {
    const uzun = 'a'.repeat(1000);
    const [ilk] = summarizeCspReports({ 'csp-report': { 'effective-directive': uzun } });
    expect(ilk?.directive.length).toBeLessThanOrEqual(120);

    const cok = Array.from({ length: 50 }, () => ({ type: 'csp-violation', body: { effectiveDirective: 'x' } }));
    expect(summarizeCspReports(cok)).toHaveLength(10);
  });
});

describe('createReportLimiter', () => {
  it('pencere içinde sınırı aşanı reddeder, pencere dolunca sıfırlar', () => {
    let simdi = 0;
    const allow = createReportLimiter(2, 1000, () => simdi);
    expect([allow(), allow(), allow()]).toEqual([true, true, false]);
    simdi = 1000;
    expect(allow()).toBe(true);
  });
});
