// CSS Modules için Stylelint kuralları (plan 3.3 ve 3.4).
// Amaç: renkler ve yazı boyutları yalnızca tokens.css içinde tanımlanır; bileşenler `var(--...)` kullanır.

const RAW_COLOR_MESSAGE =
  'Ham renk yazma. tokens.css içindeki bir değişkeni kullan: var(--color-...). Yeni renk gerekiyorsa tasarimci tokens.css\'e ekler.';

/** @type {import('stylelint').Config} */
const config = {
  plugins: ['stylelint-declaration-strict-value'],
  rules: {
    // Sözdizimi ve yazım hataları
    'block-no-empty': true,
    'color-no-invalid-hex': true,
    'declaration-block-no-duplicate-properties': true,
    'font-family-no-duplicate-names': true,
    'function-calc-no-unspaced-operator': true,
    'function-no-unknown': true,
    'media-feature-name-no-unknown': true,
    'no-duplicate-selectors': true,
    'property-no-unknown': [true, { ignoreProperties: ['composes'] }],
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global', 'local'] }],
    'selector-pseudo-element-no-unknown': true,
    'selector-type-no-unknown': [true, { ignore: ['custom-elements'] }],
    'unit-no-unknown': true,

    // Ham renk yasağı (tokens.css hariç, aşağıdaki "overrides" bölümüne bak)
    'color-no-hex': [true, { message: RAW_COLOR_MESSAGE }],
    'color-named': ['never', { message: RAW_COLOR_MESSAGE }],
    'function-disallowed-list': [
      ['rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color'],
      { message: RAW_COLOR_MESSAGE },
    ],
    'scale-unlimited/declaration-strict-value': [
      ['/color$/', 'fill', 'stroke'],
      {
        ignoreValues: ['transparent', 'inherit', 'currentColor', 'unset', 'initial', 'none'],
        disableFix: true,
        message: 'Renk özellikleri var(--color-...) ile verilir (ham değer yasak).',
      },
    ],

    // px ile yazı boyutu yasak: yakınlaştırma ve tarayıcı yazı boyutu ayarı bozulur. rem/em kullan.
    'declaration-property-value-disallowed-list': {
      '/^font(-size)?$/': [
        '/[0-9](px|pt)(?![a-z])/',
      ],
    },
  },
  overrides: [
    {
      // Tasarım token'ları ham değerlerin yazılabildiği tek yerdir.
      files: ['**/tokens.css'],
      rules: {
        'color-no-hex': null,
        'color-named': null,
        'function-disallowed-list': null,
        'scale-unlimited/declaration-strict-value': null,
        'declaration-property-value-disallowed-list': null,
      },
    },
  ],
};

export default config;
