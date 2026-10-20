// @vitest-environment node
//
// Stylelint kurallarının çalıştığını gösterir: ham renk ve px yazı boyutu, tokens.css dışında yasaktır.

import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import stylelint from 'stylelint';
import { describe, expect, it } from 'vitest';

const WEB_DIR = fileURLToPath(new URL('../..', import.meta.url));

async function warningsFor(code: string, relativePath: string): Promise<string[]> {
  const result = await stylelint.lint({
    code,
    codeFilename: join(WEB_DIR, relativePath),
    cwd: WEB_DIR,
  });
  return (result.results[0]?.warnings ?? []).map((warning) => warning.rule);
}

describe('Stylelint proje yasakları', { timeout: 30_000 }, () => {
  const cssModule = 'src/app/ornek.module.css';

  it('token kullanan temiz CSS hatasız geçer', async () => {
    const css = `.kart { color: var(--color-on-surface); background-color: var(--color-surface); font-size: 1.125rem; border-color: transparent; }\n`;
    expect(await warningsFor(css, cssModule)).toEqual([]);
  });

  it('ham hex rengi yasak', async () => {
    expect(await warningsFor(`.a { color: #fff; }\n`, cssModule)).toContain('color-no-hex');
  });

  it('adlandırılmış rengi (red) yasak', async () => {
    const rules = await warningsFor(`.a { background-color: red; }\n`, cssModule);
    expect(rules).toContain('color-named');
  });

  it('rgb()/hsl() gibi ham renk işlevleri yasak', async () => {
    expect(await warningsFor(`.a { border: 1px solid rgb(0 0 0); }\n`, cssModule)).toContain('function-disallowed-list');
  });

  it('renk özelliğine var() olmayan değer yazmak yasak', async () => {
    expect(await warningsFor(`.a { color: CanvasText; }\n`, cssModule)).toContain('scale-unlimited/declaration-strict-value');
  });

  it('px ile yazı boyutu yasak, rem serbest', async () => {
    expect(await warningsFor(`.a { font-size: 14px; }\n`, cssModule)).toContain('declaration-property-value-disallowed-list');
    expect(await warningsFor(`.a { font: 14px/1.5 sans-serif; }\n`, cssModule)).toContain('declaration-property-value-disallowed-list');
    expect(await warningsFor(`.a { font-size: 0.875rem; }\n`, cssModule)).toEqual([]);
  });

  it('tokens.css içinde ham renk serbesttir', async () => {
    const css = `:root { --color-surface: #fbf8f3; --brand-color: rgb(1 2 3); }\n`;
    expect(await warningsFor(css, 'src/styles/tokens.css')).toEqual([]);
  });

  it('sözdizimi hatalarını yakalar (bilinmeyen özellik)', async () => {
    expect(await warningsFor(`.a { colour: var(--color-primary); }\n`, cssModule)).toContain('property-no-unknown');
  });
});
