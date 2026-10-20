// @vitest-environment node
//
// Bu test, ESLint yasaklarının GERÇEKTEN çalıştığını kanıtlar: yasaklı kodu bellekte ESLint'e verir ve
// hata beklenir. Bir kural yanlışlıkla gevşetilirse ya da yapılandırma bozulursa bu test kırılır.

import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

const WEB_DIR = fileURLToPath(new URL('../..', import.meta.url));
let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({ cwd: WEB_DIR });
});

/** Kodu verilen (sanal) dosya yolunda denetler ve hata düzeyindeki iletileri döndürür. */
async function errorsFor(code: string, relativePath: string) {
  const [result] = await eslint.lintText(code, { filePath: join(WEB_DIR, relativePath) });
  return (result?.messages ?? []).filter((message) => message.severity === 2);
}

function ruleIds(messages: Array<{ ruleId: string | null }>) {
  return messages.map((message) => message.ruleId);
}

describe('ESLint proje yasakları', { timeout: 60_000 }, () => {
  it('temiz bir bileşende hata çıkmaz (denetimin kendisi sağlam mı?)', async () => {
    const errors = await errorsFor(
      `export function Ornek() { return <button type="button">Tamam</button>; }\n`,
      'src/components/Ornek.tsx',
    );
    expect(errors).toEqual([]);
  });

  describe('Supabase', () => {
    const browserImport = `import { createBrowserClient } from '@supabase/ssr';\nexport const kullan = createBrowserClient;\n`;

    it('createBrowserClient her yerde yasak (bileşende)', async () => {
      const errors = await errorsFor(browserImport, 'src/components/Ornek.tsx');
      expect(errors.map((e) => e.message).join(' ')).toContain('createBrowserClient');
    });

    it('createBrowserClient sunucu klasöründe de yasak', async () => {
      const errors = await errorsFor(browserImport, 'src/server/ornek.ts');
      expect(errors.map((e) => e.message).join(' ')).toContain('createBrowserClient');
    });

    it('@supabase/ssr bileşenlerde yasak, src/server içinde serbest', async () => {
      const code = `import { createServerClient } from '@supabase/ssr';\nexport const kullan = createServerClient;\n`;
      expect(ruleIds(await errorsFor(code, 'src/components/Ornek.tsx'))).toContain('no-restricted-imports');
      expect(ruleIds(await errorsFor(code, 'src/server/ornek.ts'))).not.toContain('no-restricted-imports');
    });

    it('@supabase/supabase-js bileşenlerde yasak', async () => {
      const code = `import { createClient } from '@supabase/supabase-js';\nexport const kullan = createClient;\n`;
      expect(ruleIds(await errorsFor(code, 'src/features/ornek/Ornek.tsx'))).toContain('no-restricted-imports');
    });
  });

  describe('dangerouslySetInnerHTML', () => {
    it('JSX özniteliği olarak yasak', async () => {
      const errors = await errorsFor(
        `export function Ornek({ html }: { html: string }) { return <div dangerouslySetInnerHTML={{ __html: html }} />; }\n`,
        'src/components/Ornek.tsx',
      );
      expect(ruleIds(errors)).toContain('no-restricted-syntax');
    });

    it('React.createElement ile nesne özelliği olarak da yasak', async () => {
      const errors = await errorsFor(
        `export const props = { dangerouslySetInnerHTML: { __html: 'x' } };\n`,
        'src/components/ornek.ts',
      );
      expect(ruleIds(errors)).toContain('no-restricted-syntax');
    });
  });

  describe('Türkçe büyük/küçük harf', () => {
    it('çıplak toUpperCase yasak', async () => {
      const errors = await errorsFor(`export const a = 'iğne'.toUpperCase();\n`, 'src/lib/ornek.ts');
      expect(ruleIds(errors)).toContain('no-restricted-syntax');
    });

    it('çıplak toLowerCase yasak', async () => {
      const errors = await errorsFor(`export const a = 'IŞIK'.toLowerCase();\n`, 'src/lib/ornek.ts');
      expect(ruleIds(errors)).toContain('no-restricted-syntax');
    });

    it('dil vermeden toLocaleUpperCase yasak, tr-TR ile serbest', async () => {
      const bad = await errorsFor(`export const a = 'iğne'.toLocaleUpperCase();\n`, 'src/lib/ornek.ts');
      expect(ruleIds(bad)).toContain('no-restricted-syntax');
      const ok = await errorsFor(`export const a = 'iğne'.toLocaleUpperCase('tr-TR');\n`, 'src/lib/ornek.ts');
      expect(ok).toEqual([]);
    });

    it('turkish.ts yardımcıları (upperTr, lowerTr, lowerAscii) hatasız', async () => {
      const errors = await errorsFor(
        `import { upperTr, lowerTr, lowerAscii } from '@/lib/turkish';\nexport const a = [upperTr('i'), lowerTr('I'), lowerAscii('A')];\n`,
        'src/lib/ornek.ts',
      );
      expect(errors).toEqual([]);
    });
  });

  describe('gizli anahtar okuma', () => {
    it('src içinde process.env ile SECRET / SERVICE_ROLE okumak yasak', async () => {
      for (const code of [
        `export const a = process.env.SUPABASE_SECRET_KEY;\n`,
        `export const a = process.env.SUPABASE_SERVICE_ROLE_KEY;\n`,
        `export const a = process.env['VAPID_PRIVATE_KEY'];\n`,
      ]) {
        expect(ruleIds(await errorsFor(code, 'src/server/ornek.ts')), code).toContain('no-restricted-syntax');
      }
    });

    it('gizli olmayan değişkenler serbest', async () => {
      const errors = await errorsFor(`export const a = process.env.SUPABASE_URL;\n`, 'src/server/ornek.ts');
      expect(errors).toEqual([]);
    });
  });

  describe('erişilebilirlik (jsx-a11y strict)', () => {
    it('alt metni olmayan görsel hata verir', async () => {
      const errors = await errorsFor(`export function Ornek() { return <img src="/a.png" />; }\n`, 'src/components/Ornek.tsx');
      expect(ruleIds(errors)).toContain('jsx-a11y/alt-text');
    });

    it('klavyeyle erişilemeyen tıklanabilir div hata verir', async () => {
      const errors = await errorsFor(
        `export function Ornek() { return <div onClick={() => undefined}>Tıkla</div>; }\n`,
        'src/components/Ornek.tsx',
      );
      expect(ruleIds(errors)).toContain('jsx-a11y/click-events-have-key-events');
    });

    it('autoFocus (strict kural) hata verir', async () => {
      const errors = await errorsFor(
        `export function Ornek() { return <input aria-label="Ad" autoFocus />; }\n`,
        'src/components/Ornek.tsx',
      );
      expect(ruleIds(errors)).toContain('jsx-a11y/no-autofocus');
    });
  });
});
