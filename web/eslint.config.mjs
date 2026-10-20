// ESLint 9 "flat config". Next 16'da `next lint` komutu kaldırıldı; doğrudan `eslint .` çalıştırılır.
//
// Katmanlar:
//   1. eslint-config-next: React, React Hooks, Next.js kuralları (+ TypeScript kuralları)
//   2. eslint-plugin-jsx-a11y "strict": erişilebilirlik (Next'in içindeki hafif sürümün yerine geçer)
//   3. Projeye özel yasaklar (plan 3.7, 3.8, 9.1): aşağıdaki mesajlara bak

import { defineConfig, globalIgnores } from 'eslint/config';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const DANGEROUS_HTML_MESSAGE =
  'dangerouslySetInnerHTML yasak (XSS riski, plan 9.1). Markdown için sunucuda ham HTML kapalı işleyici kullan.';

const UPPER_LOWER_MESSAGE =
  'Çıplak toUpperCase/toLowerCase Türkçe i/İ ve ı/I harflerini bozar (plan 3.8). ' +
  "Türkçe metin için upperTr/lowerTr, e-posta ve MIME gibi ASCII değerler için lowerAscii kullan: '@/lib/turkish'.";

const LOCALE_CASE_MESSAGE =
  "toLocaleUpperCase/toLocaleLowerCase dil verilmeden sunucunun diline göre çalışır. 'tr-TR' ver ya da '@/lib/turkish' içindeki upperTr/lowerTr kullan.";

const SECRET_ENV_MESSAGE =
  'Web uygulaması gizli anahtar okumaz (plan 3.10: Vercel\'de hiçbir gizli anahtar yok). ' +
  'Gizli anahtarlar yalnızca Supabase Edge Function secrets içindedir.';

/** Her dosyada geçerli sözdizimi yasakları. */
const baseRestrictedSyntax = [
  { selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]', message: DANGEROUS_HTML_MESSAGE },
  { selector: 'Property[key.name="dangerouslySetInnerHTML"]', message: DANGEROUS_HTML_MESSAGE },
  { selector: 'CallExpression[callee.property.name=/^(toUpperCase|toLowerCase)$/]', message: UPPER_LOWER_MESSAGE },
  {
    selector: 'CallExpression[callee.property.name=/^toLocale(Upper|Lower)Case$/][arguments.length=0]',
    message: LOCALE_CASE_MESSAGE,
  },
];

/** Yalnızca `src/` içinde: gizli anahtar adlarını okumak yasak. */
const srcRestrictedSyntax = [
  ...baseRestrictedSyntax,
  {
    selector:
      'MemberExpression[object.object.name="process"][object.property.name="env"][property.name=/SECRET|SERVICE_ROLE|PRIVATE/]',
    message: SECRET_ENV_MESSAGE,
  },
  {
    selector:
      'MemberExpression[object.object.name="process"][object.property.name="env"][property.value=/SECRET|SERVICE_ROLE|PRIVATE/]',
    message: SECRET_ENV_MESSAGE,
  },
];

const BROWSER_CLIENT_MESSAGE =
  "createBrowserClient yasak: tarayıcıda Supabase istemcisi yoktur, oturum httpOnly çerezdedir (plan 3.7). Sunucuda '@/server/supabase' kullan.";

const createBrowserClientBan = {
  name: '@supabase/ssr',
  importNames: ['createBrowserClient'],
  message: BROWSER_CLIENT_MESSAGE,
};

/** Supabase paketleri yalnızca sunucu tarafında (src/server, src/proxy.ts) kullanılabilir. */
const supabaseOnlyOnServer = [
  {
    name: '@supabase/ssr',
    message: "@supabase/* yalnızca src/server ve src/proxy.ts içinde kullanılır. Bileşenlerden '@/server/...' fonksiyonlarını çağır.",
  },
  {
    name: '@supabase/supabase-js',
    message: "@supabase/* yalnızca src/server ve src/proxy.ts içinde kullanılır. Bileşenlerden '@/server/...' fonksiyonlarını çağır.",
  },
];

export default defineConfig([
  globalIgnores([
    '.next/**',
    'node_modules/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'blob-report/**',
    'next-env.d.ts',
  ]),

  ...nextCoreWebVitals,
  ...nextTypescript,

  // Erişilebilirlik: jsx-a11y "strict" kuralları, Next'in uyarı düzeyindeki kurallarının yerine hata olarak geçer.
  // Eklenti Next'in yapılandırmasıyla zaten kayıtlıdır; burada yalnızca kural listesi alınır
  // (eklentiyi ikinci kez kaydetmek "Cannot redefine plugin" hatası verir).
  {
    name: 'egitim-koprusu/erisilebilirlik',
    files: ['**/*.{js,jsx,mjs,ts,tsx,mts,cts}'],
    rules: jsxA11y.flatConfigs.strict.rules,
  },

  {
    name: 'egitim-koprusu/yasaklar',
    rules: {
      'react/no-danger': 'error',
      'no-restricted-syntax': ['error', ...baseRestrictedSyntax],
      'no-restricted-imports': ['error', { paths: [createBrowserClientBan, ...supabaseOnlyOnServer] }],
    },
  },
  {
    name: 'egitim-koprusu/src-yasaklari',
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...srcRestrictedSyntax],
    },
  },
  {
    name: 'egitim-koprusu/sunucu-katmani',
    files: ['src/server/**/*.{ts,tsx}', 'src/proxy.ts', 'src/**/*.test.{ts,tsx}', 'tests/**/*.ts'],
    rules: {
      // Sunucuda @supabase/ssr kullanılabilir; yalnızca createBrowserClient yasak kalır.
      'no-restricted-imports': ['error', { paths: [createBrowserClientBan] }],
    },
  },
]);
