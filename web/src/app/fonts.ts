import localFont from 'next/font/local';

/**
 * Yazı tipi: Atkinson Hyperlegible Next (SIL OFL 1.1), kendi sunucumuzdan (WOFF2, Latin + Türkçe alt kümesi).
 * Dosyalar, lisans ve üretim yöntemi: web/assets/fonts/. Harici yazı tipi, Google Fonts ve CDN yoktur.
 *
 * Yalnızca Regular önceden yüklenir (`preload`); SemiBold ve Bold ilk kullanıldıkları anda iner
 * (başlıklar ve düğmeler). Üç ağırlık toplam 49 KB'tır (hedef <= 120 KB, plan 11.4).
 * İki çağrı aynı yazı tipi ailesi adını paylaşır; tarayıcı ağırlığı doğru dosyayla eşleştirir.
 *
 * Not: next/font bağımsız değişkenleri derleme sırasında statik okur; bu yüzden değerler (aile adı dahil)
 * sabit değişkene konmaz, doğrudan yazılır.
 */
export const atkinson = localFont({
  src: '../../assets/fonts/AtkinsonHyperlegibleNext-Regular.woff2',
  weight: '400',
  style: 'normal',
  display: 'swap',
  preload: true,
  variable: '--font-atkinson',
  declarations: [{ prop: 'font-family', value: 'atkinson' }],
});

export const atkinsonHeavy = localFont({
  src: [
    { path: '../../assets/fonts/AtkinsonHyperlegibleNext-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: '../../assets/fonts/AtkinsonHyperlegibleNext-Bold.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
  variable: '--font-atkinson-agir',
  declarations: [{ prop: 'font-family', value: 'atkinson' }],
});
