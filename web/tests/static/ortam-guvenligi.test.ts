// @vitest-environment node
//
// Gizli anahtarın tarayıcı paketine girmesini engelleyen denetimlerin (scripts/check-env.mjs ve
// scripts/check-client-bundle.mjs) gerçekten ihlal yakaladığını gösterir.

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, describe, expect, it } from 'vitest';

const WEB_DIR = fileURLToPath(new URL('../..', import.meta.url));
const SRC_DIR = join(WEB_DIR, 'src');

/** Mevcut ortamdan NEXT_PUBLIC_ ve SUPABASE değişkenlerini çıkarıp ek değişkenleri ekler. */
function cleanEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const name of Object.keys(env)) {
    if (name.startsWith('NEXT_PUBLIC_') || name.startsWith('SUPABASE_') || name === 'CHECK_BUNDLE_DIR') delete env[name];
  }
  return { ...env, ...extra };
}

function run(script: string, extraEnv: Record<string, string>) {
  return spawnSync(process.execPath, [join(WEB_DIR, 'scripts', script)], {
    cwd: WEB_DIR,
    env: cleanEnv(extraEnv),
    encoding: 'utf8',
  });
}

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

describe('scripts/check-env.mjs', { timeout: 30_000 }, () => {
  it('temiz ortamda geçer', () => {
    expect(run('check-env.mjs', {}).status).toBe(0);
  });

  it('gizli olmayan NEXT_PUBLIC_ değişkenine izin verir', () => {
    expect(run('check-env.mjs', { NEXT_PUBLIC_UYGULAMA_ADI: 'Egitim Koprusu' }).status).toBe(0);
  });

  it('NEXT_PUBLIC_ ile anahtar/gizli değer tanımını reddeder', () => {
    for (const name of [
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      'NEXT_PUBLIC_SUPABASE_SECRET_KEY',
      'NEXT_PUBLIC_API_TOKEN',
      'NEXT_PUBLIC_SERVICE_ROLE',
    ]) {
      const result = run('check-env.mjs', { [name]: 'deger' });
      expect(result.status, name).toBe(1);
      expect(result.stderr).toContain(name);
    }
  });

  it('SUPABASE_PUBLISHABLE_KEY alanındaki gizli ya da JWT biçimli anahtarı reddeder', () => {
    expect(run('check-env.mjs', { SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abcdefghijklmnop' }).status).toBe(1);
    expect(run('check-env.mjs', { SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiJ9.x.y' }).status).toBe(1);
    expect(run('check-env.mjs', { SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_ornek' }).status).toBe(0);
  });
});

describe('scripts/check-client-bundle.mjs', { timeout: 30_000 }, () => {
  const temp = mkdtempSync(join(tmpdir(), 'bundle-denetimi-'));
  afterAll(() => rmSync(temp, { recursive: true, force: true }));

  function bundleWith(name: string, content: string) {
    const dir = join(temp, name);
    mkdirSync(join(dir, 'chunks'), { recursive: true });
    writeFileSync(join(dir, 'chunks', 'a.js'), content);
    return dir;
  }

  it('temiz pakette geçer', () => {
    const dir = bundleWith('temiz', 'console.log("merhaba")');
    expect(run('check-client-bundle.mjs', { CHECK_BUNDLE_DIR: dir }).status).toBe(0);
  });

  it('pakette yasak ifade bulursa başarısız olur', () => {
    for (const word of ['sb_secret_abc', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net', 'GoTrueClient']) {
      const dir = bundleWith(`yasak-${word.replace(/\W/g, '')}`, `fetch("https://${word}/x")`);
      const result = run('check-client-bundle.mjs', { CHECK_BUNDLE_DIR: dir });
      expect(result.status, word).toBe(1);
    }
  });

  it('ortamdaki gizli değişkenin DEĞERİ pakete girmişse başarısız olur', () => {
    const deger = 'cok-gizli-bir-deger-12345';
    const dir = bundleWith('deger', `var x="${deger}"`);
    const result = run('check-client-bundle.mjs', { CHECK_BUNDLE_DIR: dir, ORNEK_SECRET: deger });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('ORNEK_SECRET');
    expect(result.stderr).not.toContain(deger); // değerin kendisi çıktıya yazılmaz
  });

  it('.next/static yoksa başarısız olur', () => {
    expect(run('check-client-bundle.mjs', { CHECK_BUNDLE_DIR: join(temp, 'yok') }).status).toBe(1);
  });
});

describe('proje yapısı kuralları', () => {
  it('src/server altındaki her dosya `import "server-only"` ile başlar', () => {
    const files = [...walk(join(SRC_DIR, 'server'))].filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      expect(readFileSync(file, 'utf8'), file).toMatch(/^import ['"]server-only['"];/m);
    }
  });

  it('src içinde NEXT_PUBLIC_ değişkeni okunmaz (açıklama satırlarında anılabilir)', () => {
    const okuma = /process\.env(\.|\[\s*['"`])NEXT_PUBLIC_/;
    for (const file of walk(SRC_DIR)) {
      if (!/\.(tsx?|mjs)$/.test(file) || /\.test\.tsx?$/.test(file)) continue;
      expect(readFileSync(file, 'utf8'), file).not.toMatch(okuma);
    }
  });

  it('.env.example içinde NEXT_PUBLIC_ değişkeni ve gerçek anahtar yoktur', () => {
    const text = readFileSync(join(WEB_DIR, '.env.example'), 'utf8');
    const lines = text.split(/\r?\n/).filter((line) => !line.trim().startsWith('#'));
    expect(lines.join('\n')).not.toContain('NEXT_PUBLIC_');
    expect(text).not.toMatch(/sb_secret_[A-Za-z0-9_-]{8,}/);
  });
});
