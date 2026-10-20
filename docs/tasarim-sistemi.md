# Eğitim Köprüsü: Tasarım Sistemi (web)

> **Durum:** v2 · 18 Ekim 2026 · `tasarimci` ajanı · Plan iş listesi 3. madde (`docs/plan.md` 7.4 ve 11.2).
> v1 (16 Ekim 2026) Flutter içindi; palet, 4 tema, yazı tipi, token değerleri, ikon sözlüğü, hareket ve metin kuralları **aynen korundu**, yalnızca uygulanış biçimi webe taşındı (plan 7.4).
> Kod: `web/src/styles/` (token'lar), `web/src/components/` (bileşenler), `web/assets/fonts/` (yazı tipi).
> Cihazda görmek için: geliştirme ortamında `/galeri` (bkz. 12). Ekran akışları: `docs/ekran-akislari.md`.

## 1. Ton ve ilkeler

**Ton:** sakin, sıcak, umut veren. Çocuksu değil (rozet, konfeti, parlak oyuncak renkleri yok); klinik de değil (hastane mavisi/turkuazı, "hasta/hasta yakını" dili yok). Gün doğumu ve köprü imgesi: gece mavisi, sıcak kayısı, adaçayı yeşili.

| # | İlke | Somut kural |
|---|---|---|
| 1 | **Az seçenek, tek ana eylem** | Bir sayfada en fazla bir birincil `Button`. Alt gezinme en çok 4-5 hedef. |
| 2 | **Yorgun ve kısıtlı motor beceri için tasarla** | Dokunma alanı >= 48 px, ana eylem >= 56 px, kartın tamamı tek tıklanabilir öğe, hiçbir işlem yalnızca jestle yapılmaz. |
| 3 | **Baskı yok** | "Borç", "geride kaldın", seri, puan, rozet, sayaç yok. Kaçırılan gün birikmez. İlerleme çubuğu yalnızca ne kadarının bittiğini söyler. |
| 4 | **Bilgi yalnızca renkle verilmez** | Her renk ayrımı simge, yazı veya biçimle de verilir (seçili = dolu simge + kalın kenarlık + "işaretli" okuması). |
| 5 | **Zaman aşımı yok** | Bildirim kendiliğinden kaybolmaz, oturum içi işlem süreyle kesilmez, otomatik ilerleyen sayfa yok. |
| 6 | **Nötr dil** | Arayüzde hastalık, engel, tedavi, devamsızlık nedeni **asla** geçmez; "derslere ara verdiğin tarihler" gibi konuşulur (KVKK, plan 9.3). Tek bilinçli istisna: velinin ayrı yasal ekranları (bkz. 11, kural 5). |
| 7 | **Her durum tasarlanır** | Yükleniyor, boş, hata, başarı, çevrimdışı. Hata mesajı suçlamaz. |
| 8 | **Önce sakin, sonra bilgi** | Sayfa başlığı, tek cümlelik açıklama, tek eylem. Yoğun bilgi (tablo, uzun metin) yalnızca web panelinde. |
| 9 | **Gerçek HTML** | Anlamsal öğeler (`h1`-`h3`, `nav`, `main`, `button`, `a`, `fieldset`, `progress`); ekran okuyucu, tarayıcı yakınlaştırması, yazı büyütme ve Windows yüksek kontrast modu doğal çalışır. |
| 10 | **Cihazda saklama kullanıcı isteğiyle** | Görünüm tercihi yalnızca kullanıcı bir ayarı değiştirince yazılır; her ayarın yanında "Bu ayar yalnızca bu cihazda saklanır." yazar (hukuk, `cerez-politikasi.md` 1). |

**Hitap:** öğrenci ekranlarında "sen"; veli, gönüllü ve yönetici ekranlarında "siz". Ortak bileşenlerin varsayılan metinleri edilgen ve nötrdür ("Biraz sonra tekrar denenebilir"), böylece hangi role gösterilirse gösterilsin doğru olur.

## 2. Renk

Marka dili **köprü ve gün doğumu**: gece mavisi (ana eylem, bağlantı, odak), sıcak kayısı (vurgu, "bugün", dikkat), adaçayı (ilerleme, tamamlandı). Yüzeyler saf beyaz değil, sıcak kâğıt tonudur (parlama azalır).

**Tek kaynak:** `web/src/styles/palette.json`. Bir rolün dört tema değeri tek satırda yan yana durur. `npm run tokens` bu dosyadan `web/src/styles/tokens.css` içindeki renk bölümünü üretir (dört tema ve üç tetikleyici nedeniyle aynı değerler birkaç CSS bloğunda tekrar eder; elle yazmak hata getirir). Bileşenlerde ham renk yazılmaz (Stylelint ve `tests/tasarim-kurallari.test.ts` denetler); yalnızca `var(--color-...)` kullanılır.

### 2.1 Dört tema varyantı

| Rol (CSS değişkeni `--color-...`) | Açık (normal) | Koyu (normal) | Açık yüksek kontrast | Koyu yüksek kontrast |
|---|---|---|---|---|
| `surface` (sayfa) | `#fbf8f3` | `#14161f` | `#ffffff` | `#000000` |
| `on-surface` (ana metin) | `#1f2230` | `#e6e3ec` | `#0b0c12` | `#ffffff` |
| `on-surface-variant` (yardımcı metin) | `#4a4d5c` | `#b5b8c8` | `#2a2c38` | `#e0e2ee` |
| `outline` (çizgi) | `#6e7081` | `#8e91a3` | `#2f3140` | `#d0d3e2` |
| `primary` | `#3b4ba0` | `#b9c2ff` | `#1f2a7a` | `#d3d9ff` |
| `on-primary` | `#ffffff` | `#101a5e` | `#ffffff` | `#000000` |
| `primary-container` | `#e1e4fa` | `#2a3680` | `#e6e8ff` | `#2a3680` |
| `secondary` (kayısı) | `#8f4f00` | `#ffb867` | `#6b3600` | `#ffd29a` |
| `secondary-container` | `#ffe3bd` | `#5a3400` | `#ffe8c8` | `#5a3400` |
| `tertiary` (adaçayı) | `#386447` | `#a5d3b3` | `#1f4a32` | `#c4eacf` |
| `success` | `#2f6b3f` | `#a5d3b3` | `#184d2b` | `#c4eacf` |
| `error` | `#b3261e` | `#ffb4ab` | `#8c0009` | `#ffcfc9` |

Yüzey kademeleri (`surface-lowest` ... `surface-highest`), `*-container` / `on-*-container` çiftleri, `inverse-*`, `success`/`warning` aileleri ve ton kenarlıkları (`border-subtle`, `border-primary`, `border-success`, `border-warning`, `border-error`) palet dosyasındadır. Ton kenarlıkları normal temalarda kartın zeminiyle aynı tondadır (süs), yüksek kontrastta tonun güçlü rengine döner.

Takma adlar (`tokens.css`): `--color-focus-ring` = `on-surface`, `--color-disabled-bg` = `surface-high`, `--color-disabled-on` = `on-surface-variant`.

**Marka renkleri** (`--brand-night`, `--brand-sun`, `--brand-paper`, `--brand-deck`) yalnızca logoda (`BrandMark`) kullanılır ve her temada aynıdır.

### 2.2 Kontrast oranları (WCAG, hesaplanmış)

Hedef: **metin >= 4.5:1 (AA)**; yüksek kontrastta **>= 7:1 (AAA)**; metin olmayan öğeler (kenarlık, odak halkası, simge) >= 3:1, yüksek kontrastta >= 4.5:1.

| Çift (yazı / zemin) | Açık | Koyu | YK açık | YK koyu |
|---|---|---|---|---|
| `on-surface` / `surface` | 14.9 | 14.2 | 19.5 | 21.0 |
| `on-surface-variant` / `surface` | 7.9 | 9.2 | 13.9 | 16.3 |
| `on-surface-variant` / `surface-highest` | 6.1 | 6.2 | 10.9 | 10.7 |
| `primary` / `surface` (bağlantı, metin düğmesi) | 7.3 | 10.5 | 12.6 | 15.1 |
| `on-primary` / `primary` (dolu düğme) | 7.8 | 9.2 | 12.6 | 15.1 |
| `on-primary-container` / `primary-container` | 11.2 | 8.4 | 14.1 | 10.8 |
| `secondary` / `surface` | 6.0 | 10.6 | 9.8 | 14.9 |
| `on-secondary` / `secondary` | 6.4 | 8.7 | 9.8 | 14.9 |
| `on-secondary-container` / `secondary-container` | 10.6 | 8.5 | 14.2 | 10.9 |
| `success` / `surface` | 6.0 | 10.8 | 9.8 | 16.0 |
| `on-success-container` / `success-container` | 10.6 | 8.0 | 13.8 | 9.8 |
| `error` / `surface` | 6.2 | 10.6 | 9.9 | 15.0 |
| `on-error` / `error` | 6.5 | 7.7 | 9.9 | 15.0 |
| `on-error-container` / `error-container` | 10.5 | 8.3 | 14.2 | 9.4 |
| `on-inverse-surface` / `inverse-surface` (bildirim çubuğu) | 11.4 | 10.8 | 18.2 | 21.0 |
| `inverse-primary` / `inverse-surface` (çubuk eylemi) | 7.5 | 6.1 | 13.1 | 12.6 |
| `outline` / `surface` (kenarlık, **metin değil**) | 4.6 | 5.8 | 12.9 | 14.1 |
| `outline` / `surface-highest` | 3.5 | 3.9 | 10.1 | 9.3 |

`web/tests/token-kontrast.test.ts` (Flutter `theme_contrast_test`'in karşılığı) her varyantta 6 yüzey x 7 metin rengi, 17 rol çifti, çizgi ve odak halkası oranlarını otomatik doğrular (270'ten fazla denetim) ve `tokens.css`'in palete uygunluğunu denetler. Galerideki "Renkler ve kontrast" bölümü dört temayı yan yana, **paletten hesaplanmış gerçek oranlarla** gösterir.

### 2.3 Rol bazlı kullanım

| Renk | Nerede | Nerede **değil** |
|---|---|---|
| `primary` | Ana düğme, bağlantı, seçili simgesi, odak vurgusu | Büyük zemin alanları |
| `primary-container` | "Bugünün görevi" kartı, seçili gezinme göstergesi, bilgi bandı | |
| `secondary-container` (kayısı) | Sıcak vurgu, uyarı bandı, seçili çip | Hata (hata kırmızıdır) |
| `success` / `tertiary` | İlerleme çubuğu, "tamamlandı" | |
| `error` | Yalnızca gerçek hata ve geri alınamaz eylem uyarısı | Sıradan "dikkat" |
| `outline` | Alan ve düğme kenarlığı (>= 3:1) | Metin |
| `border-subtle` | Kart kenarlığı ve ayırıcı (süs; yüksek kontrastta `outline`'a döner) | Bileşenin tek ayırt edici işareti |

### 2.4 Tema seçimi: tetikleyiciler

Tema `<html data-theme="...">` özniteliğiyle seçilir; aynı öznitelik herhangi bir öğeye yazılabilir (galeride dört önizleme kutusu böyle çalışır).

| `data-theme` | Anlamı |
|---|---|
| (yok) | **Sistem:** `prefers-color-scheme` ve `prefers-contrast: more` CSS medya sorguları (JavaScript gerekmez) |
| `light` / `dark` | Kullanıcı açık ya da koyu seçti (sistem yüksek kontrast isterse yüksek kontrast sürümü) |
| `hc` | Yüksek kontrast; açık/koyu sistem ayarına göre |
| `hc-light` / `hc-dark` | Yüksek kontrast, açık ya da koyu |

- **Uygulama içi seçim** (Ayarlar > Görünüm ve erişilebilirlik): Tema (Sistem/Açık/Koyu) + Yüksek kontrast anahtarı; ikisi `data-theme` değerine eşlenir (`src/lib/appearance.ts`). Cihaz ayarı yüksek kontrast istiyorsa uygulama içi seçim bunu **kaldıramaz**, yalnızca ekler (v1 davranışıyla aynı).
- **Yanıp sönmez:** `<head>` içindeki küçük **nonce'lu satır içi betik** (`src/lib/appearance-script.ts`), kullanıcı daha önce bir ayar değiştirdiyse tercihi ilk boyamadan önce `<html>`'e yazar. Hiçbir şey saklanmamışsa hiçbir şey yazmaz; tema o zaman yalnızca CSS'ten gelir. Betik ile TS eşlemesi 36 birleşimde birebir aynı sonucu verir (test).
- **Yalnızca kullanıcı değiştirince saklanır:** tercih `localStorage` anahtarı `ek-gorunum` altında JSON olarak yazılır, tüm değerler varsayılana dönünce anahtar silinir. Sunucuya gönderilmez (görünüm tercihi dolaylı sağlık ipucu olabilir). Hukuk dayanağı: `docs/hukuk/cerez-politikasi.md` 1 ("Kriter B", yalnızca kullanıcı isteğiyle yazılan tercih).
- **Windows yüksek kontrast (`forced-colors: active`):** renkleri işletim sistemi yönetir; CSS bu modla çatışmaz. Düğme ve kartlarda `border: ... solid transparent` bilerek vardır (sistem renginde görünür olur), odak halkası `outline` olduğundan görünür kalır, logo `forced-color-adjust: none` ile kendi renklerini korur.
- **Tarayıcı çubuğu rengi:** `<meta name="theme-color">` açık ve koyu yüzey rengiyle (palet dosyasından) verilir; `color-scheme: light dark`.

### 2.5 Yüksek kontrast

- Metin >= 7:1. Çizgiler kalınlaşır: kart, alan ve ayırıcı **2 px** (normalde 1 px), odak halkası **4 px** (normalde 3 px). Seçili gezinme göstergesine kenarlık eklenir; ilerleme çubuğu kenarlık alır; ton kartları ve bantlar kenarlıklarını ton renginde çizer; gölge yoktur.
- Renk farkı küçülse bile bileşenler ayırt edilebilir kalır, çünkü ayrım kenarlık ve biçimle de verilir.

## 3. Karanlık mod: gerekli mi, maliyeti düşük mü?

**Karar: Evet, ilk sürümde var** (v1 kararı aynen korundu). Dört varyant (açık/koyu x normal/yüksek kontrast) tek `palette.json` dosyasından üretilir. Varsayılan: cihazın ayarını izler; Ayarlar'dan açık/koyu/sistem seçilebilir.

**Gerekçe (neden gerekli):**
1. Kitle yorgun olabilir, akşam ve gece, loş odada ya da yatakta kullanabilir; telefon tarayıcısından girer. Parlak beyaz ekran göz ve baş ağrısı riskini artırır. Koyu tema bu kitle için bir kolaylık, süs değil.
2. Android ve iOS'ta pek çok cihaz koyu temada çalışır. Site koyu tema desteklemezse sistem koyuyken tek parlak sayfa olarak kalır.
3. Işığa duyarlılık yaşayanlar için ek bir seçenek ve yüksek kontrastın koyu sürümüyle birlikte "kendine uyan" kombinasyonu bulma imkânı.

**Maliyet (neden düşük):**
- Renkler anlamsal rollerle kullanıldığı için bileşenler koyu temaya ayrıca dokunulmadan uyar. Ek iş yalnızca paletin iki sütunudur.
- Doğrulama otomatik: kontrast testi ve erişilebilirlik testleri (axe) dört varyantın hepsinde döner. Yeni bileşen yazan kişi ek bir şey yapmaz.
- Görsel varlık (illüstrasyon, fotoğraf) kullanılmadığı için çift sürüm gerekmez. Marka işareti her temada aynıdır.

**Sınırlar ve dikkat:**
- Koyu zemin saf siyah değil, mavimsi koyu gridir (`#14161f`); saf siyah yalnızca koyu yüksek kontrastta.
- Soru fotoğrafları kendi rengiyle gösterilir; koyu temada parlak bir dikdörtgen olarak durur. Fotoğraf çevresine `border-subtle` kenarlık çizilir; hafif modda dokununca açılır.
- Bileşen eklerken `#fff`, `#000` ya da başka ham renk yazmayın (Stylelint hata verir).

## 4. Tipografi

### 4.1 Yazı tipi: Atkinson Hyperlegible Next

| Özellik | Değer |
|---|---|
| Aile | Atkinson Hyperlegible Next (Braille Institute; Linus Boman ve ekip) |
| Lisans | **SIL Open Font License 1.1** (OFL). Metin: `web/assets/fonts/OFL.txt` (yazı tipinin yanında). Herkese açık `/lisanslar` sayfasında da listelenir (Faz E). |
| Dosyalar | `web/assets/fonts/AtkinsonHyperlegibleNext-{Regular,SemiBold,Bold}.woff2`; 400, 600, 700 ağırlıkları. **Toplam yaklaşık 49 KB** (48.852 bayt: Regular 15,9 + SemiBold 16,5 + Bold 16,5 KB; hedef <= 120 KB). |
| Alt küme | Latin + Latin-1 Eki + **Latin Genişletilmiş-A (Türkçe `ğ Ğ ı İ ş Ş`)** + noktalama + matematik işaretleri (362 karakter). Hint bilgisi atıldı. |
| Yükleme | `next/font/local` (`src/app/fonts.ts`): kendi sunucumuzdan, `font-display: swap`, ölçüleri ayarlanmış yedek yazı tipi (CLS düşük). **Yalnızca Regular önceden yüklenir** (`Link` başlığı); SemiBold ve Bold kullanıldıkları anda iner. Harici yazı tipi, Google Fonts ve CDN **yoktur** (CSP `font-src 'self'`, test denetler). |
| Üretim yöntemi | Resmî depodan (`googlefonts/atkinson-hyperlegible-next`) statik TTF'ler, `fonttools` `pyftsubset` ile WOFF2'ye çevrildi ve alt kümelendi. Komut ve gerekçe: `web/assets/fonts/README.md`. |

**Neden bu font?**
- Düşük görmeye göre tasarlandı: karışabilen karakterler belirgin ayrılır (`I l 1`, `O 0`, `ı i`). **Matematik ve Fen içeriği rakam ve işaret yoğundur;** `1/l` ya da `0/O` karışması içerik hatasına dönüşür. Sıfır eğik çizgili çizilir.
- Geniş harf aralığı ve açık biçimler yorgun gözde okunurluğu artırır. Sıcak ama ciddi bir duruşu var: çocuksu yuvarlak harfler (Nunito türü) ya da klinik görünüm (Roboto türü) yok.
- Elenenler: **Lexend** (geniş harf aralığı küçük ekranda satırı uzatır), **Nunito** (rakam ayrımı zayıf, daha çocuksu), **OpenDyslexic** (Aşama 2'de "okuma kolaylığı yazı tipi" seçeneği olarak değerlendirilebilir).

**Türkçe karakter doğrulaması:** `web/tests/yazi-tipi.test.ts`, üç WOFF2 dosyasının `cmap` tablosunu okuyarak `ğ Ğ ı İ ş Ş ç Ç ö Ö ü Ü â Â î Î û Û`, harfler, rakamlar ve noktalamanın **hepsinin** yazı tipinde bulunduğunu doğrular; ek olarak okuyucunun eksik karakteri de bulduğunu gösteren bir kanarya testi vardır. Tarayıcıda da gerçek yazı tipinin yüklendiği Playwright ile denetlenir. **Bilinen eksikler:** `₺` (U+20BA; uygulama ücretsiz, kullanılmaz) ve alt simge rakamlar (`₂`, `H₂O`; Fen içeriğinde sistem yazı tipine düşer, içerik hazırlanırken bilinmeli).

**Türkçe büyük/küçük harf:** `toUpperCase()` `i`yi `I` yapar (`"iyi"` -> `"IYI"`, doğrusu `"İYİ"`). Bu yüzden çıplak `toUpperCase/toLowerCase` ESLint ile **yasaktır**; `src/lib/turkish.ts` içindeki `upperTr` / `lowerTr` kullanılır. Arayüzde zaten **TAMAMI BÜYÜK HARF yazı kullanılmaz**. Gönüllünün "Ad S." kısa adı `shortPublicName` ile üretilir (`src/lib/public-name.ts`).

### 4.2 Tür ölçeği

Boyutlar **rem**'dir ve tarayıcının yazı boyutu ayarıyla birlikte ölçeklenir (1 rem = 16 px varsayılan). **Hiçbir stil 14 px (0,875 rem) altına inmez.** Satır yüksekliği boyutun ~1,25-1,55 katıdır. Değişkenler: `--text-<stil>-size` ve `--text-<stil>-line`; sınıflar `src/styles/text.module.css` içinde (`composes` ile kullanılır).

| Stil | Boyut / satır | Ağırlık | Kullanım |
|---|---|---|---|
| `headline-lg` | 2 rem (32) / 2,5 rem | 700 | Açılış başlığı |
| `headline-md` | 1,75 rem (28) / 2,25 rem | 700 | Sayfa başlığı (`h1`) |
| `headline-sm` | 1,5 rem (24) / 2 rem | 700 | Durum görünümü başlığı |
| `title-lg` | 1,375 rem (22) / 1,75 rem | 600 | Bölüm başlığı (`h2`) |
| `title-md` | 1,125 rem (18) / 1,625 rem | 600 | Kart ve liste öğesi başlığı |
| `title-sm` | 1 rem (16) / 1,5 rem | 600 | Alan etiketi, küçük başlık |
| `body-lg` | 1,125 rem (18) / 1,75 rem | 400 | Konu özeti ve okuma metni |
| `body-md` | 1 rem (16) / 1,5 rem | 400 | Varsayılan gövde |
| `body-sm` | 0,875 rem (14) / 1,25 rem | 400 | Yardımcı metin (en küçük) |
| `label-lg` | 1 rem (16) / 1,5 rem | 600 | Düğme etiketi |
| `label-md` | 0,875 rem (14) / 1,25 rem | 600 | Gezinme etiketi |

**Yazı ölçekleme ve yakınlaştırma:**
- Tarayıcı yakınlaştırması ve yazı boyutu ayarı (**%200 ve %400**) desteklenir; **320 px genişlikte yatay kaydırma olmaz** (WCAG 1.4.4, 1.4.10). Test: kök yazı boyutu %200 ve %400 yapılıp 320, 390 ve 768 px'te taşma ve kırpılma denetlenir (Playwright).
- Uygulama içi "Yazı boyutu" üç kademe sunar (1, 1,15, 1,3): `html { font-size: calc(100% * var(--text-scale)) }`; tüm boyutlar rem olduğu için her şey birlikte büyür. Galeri ve testler için ek bir %200 kademesi (`data-text-scale="2"`) vardır; kullanıcıya sunulmaz.
- Kurallar: sabit yükseklikli kutuya metin koyma; metin satır atlayabilsin; yan yana düzenler dar alanda alt alta geçsin (`flex-wrap`, `minmax(0, 1fr)`); uzun sözcük taşmasın (`overflow-wrap: anywhere`: en küçük içerik genişliğini de küçültür, böylece esnek ve ızgara öğeleri kapsayıcıya sığacak kadar daralır).
- **Kırılma noktaları rem'dir** (`37,5 rem` ve `64 rem`): yazı büyüdükçe düzen daha erken telefon düzenine geçer, taşma olmaz.
- **İstisna:** alt gezinme etiketleri en çok `--nav-label-max` (18 px, yaklaşık %130) boyuna kadar büyür ve yükseklik sabittir (Material kararıyla aynı); bu yüzden etiketler kısa tutulur (en çok ~10 harf). Sayfanın `h1`'i tam ölçekte yazılır.

## 5. Token'lar: boşluk, köşe, boyut, gölge, kırılma noktası

Dosya: `web/src/styles/tokens.css` (elle yazılan bölüm). Bileşen CSS'inde sayı yazmak yerine bu adlar kullanılır.

| Token | Değerler |
|---|---|
| Boşluk `--space-*` | 2xs 0,125 · xs 0,25 · sm 0,5 · md 0,75 · lg 1 · xl 1,5 · 2xl 2 · 3xl 3 · 4xl 4 (rem; 4 px ızgara) |
| Köşe `--radius-*` | sm 0,5 · md 0,75 · lg 1 (düğme, kart) · xl 1,5 (diyalog, alt sayfa) · full (ilerleme çubuğu) |
| Dokunma alanı | `--tap-min` `max(48px, 3rem)` · `--tap-primary` `max(56px, 3.5rem)`: kullanıcı yazı boyutunu küçültse bile 48 / 56 px altına inmez |
| İkon | `--icon-sm` 1,25 · `--icon-md` 1,5 · `--icon-lg` 2 · `--icon-state` 4,5 (rem) |
| Genişlik | `--measure-form` 30 rem · `--measure-content` 45 rem · `--measure-wide` 70 rem |
| Gezinme | `--nav-height` `max(64px, 4rem)` · `--rail-width` 6 rem · `--sidebar-width` 16 rem |
| Çizgi | `--line` 1 px (yüksek kontrast 2) · `--line-control` 1,5 px (2,5) · `--focus-width` 3 px (4) |
| Gölge | `--shadow-overlay`: yalnızca üste açılan katmanlarda (bildirim çubuğu, ileride diyalog); yüksek kontrastta `none`. Yüzeyler ton farkı ve kenarlıkla ayrılır. |
| Hareket | `--duration-short` 150 ms · `--duration-medium` 250 ms · `--duration-long` 400 ms · `--ease` easeOutCubic (yaylanma yok) |

**Pencere sınıfları ve gezinme** (`AppShell`; karar iskeletin KENDİ genişliğine bakar: CSS container query, JavaScript ölçümü yok, hidrasyonda kayma olmaz):

| Sınıf | Genişlik | Gezinme | İçerik |
|---|---|---|---|
| telefon | < 37,5 rem (600 px) | Altta sabit gezinme (>= 64 px, güvenli alan boşluklu) + üstte başlık çubuğu | Tek sütun |
| orta | 37,5-64 rem | Dar yan şerit (etiket simgenin altında) | En çok 70 rem, ortalı |
| geniş | >= 64 rem (1024 px) | Etiketli yan menü (16 rem, etiket simgenin yanında) | En çok 70 rem; gönüllü ve yönetici panelinde liste + ayrıntı |

Alttaki sabit gezinme odaklanan öğeyi örtmesin diye `scroll-padding-bottom` verilir (WCAG 2.4.11). Yakınlaştırma serbesttir (`maximum-scale` / `user-scalable=no` yok).

## 6. İkon kullanımı

- **Kaynak:** Material Symbols (Outlined, ağırlık 400, **Apache 2.0**) **satır içi SVG** olarak. İkon fontu ve CDN **yok**. Yalnızca kullanılan ikonlar paketlenir (`src/components/icons/icon-paths.ts`, `npm run icons` ile üretilir; lisans `icons/LICENSE.txt`).
- İki bileşen: `Icon` (arayüz ikonları) ve `NavIcon` (gezinme; çizgili ve **dolu** sürüm). Gezinme ikon verisi yalnızca sunucuda çizilen `AppShell` tarafından kullanılır ve tarayıcıya gitmez (ayrı nesne).
- **Süs ikon ekran okuyucudan gizlenir** (`aria-hidden="true"`); anlam her zaman yanındaki metindedir. **Yalnızca ikonlu düğme/bağlantı** `aria-label` taşır (Bildirimler, Ayarlar, Mesajı kapat). Yalnızca ikonla anlatılan bilgi yoktur.
- **Boyut:** 1,5 rem (varsayılan), 2 rem (kart başı), 4,5 rem (durum görünümü); rem olduğu için yazı boyutuyla ölçeklenir.
- **Seçili durum biçimle verilir:** gezinmede seçiliyken **dolu**, değilken **çizgili** simge; seçilebilir kartta içi dolu/boş daire.
- **Anlam sözlüğü:** Bugün = güneş, Plan = takvim notu, Sorular = konuşma, Dersler = kamera, bilgi = `info`, başarı = `check_circle`, uyarı = `warning`, hata = `error`, boş durum = gün doğumu (`wb_twilight`), bağlantı hatası = `cloud_off`.
- **Marka işareti** (`BrandMark`): gün doğumunda köprü kemeri; her temada aynı renkler; süstür. PWA ikonları (192, 512, maskable, apple-touch-icon) bu işaretten üretilir (Faz B).
- İllüstrasyon ve fotoğraf yok; ilk sürümde aktarım boyutunu ve çevrimdışı yükü küçük tutar.

## 7. Bileşenler ve durumları

Hepsi `web/src/components/` altında (her biri `.tsx` + `.module.css`). **Önce yerel HTML:** düğme, bağlantı, radyo, onay kutusu, anahtar, metin alanı, ilerleme çubuğu tarayıcının kendi öğeleridir. React Aria Components yalnızca karmaşık desenlerde (diyalog, alt sayfa, tarih seçici, sekmeler) kullanılacak ve henüz eklenmedi.

| Bileşen | Dosya | Durumlar | Erişilebilirlik |
|---|---|---|---|
| **Button** (birincil / ikincil / metin) | `Button.tsx` | normal · üzerine gelme · basılı · odak (halka) · pasif (`disabled`, okunur) · yükleniyor · simgeli · tam genişlik | Yerel `<button>`; >= 56 px (metin düğmesi >= 48). Yüklenirken `aria-busy`, "etiket, Yükleniyor" okunur, tıklanamaz, `type` zorla `button` (form gönderilmez). |
| **ButtonLink** | `Button.tsx` | aynı | Sayfa değiştiren eylem `<a>` olur. Harici adreste `rel="noopener noreferrer"`. |
| **Card / CardLink / CardButton** | `Card.tsx` | durağan · bağlantı · düğme · odak · basılı · ton (nötr, birincil, sıcak, başarı) | Tıklanabilir kartın TAMAMI tek `<a>` ya da `<button>` (tek hedef, tek okuma; adı başlık + açıklama). İçine ayrıca düğme konmaz; düğme içinde yalnızca `span`. |
| **RadioCardGroup / RadioCard** | `RadioCard.tsx` | seçili · seçili değil · odak · pasif | `fieldset` + `legend` + yerel radyo; ok tuşlarıyla seçilir; seçili = dolu daire + kalın kenarlık + "işaretli". JavaScript'siz çalışır. |
| **SectionHeader** | `SectionHeader.tsx` | başlık · alt yazı · sağda eylem | Gerçek `h1`-`h3`; düzey seçilir, sıra atlanmaz. |
| **StateView** | `StateViews.tsx` | simge + başlık + açıklama + tek eylem | `h1`/`h2`; sonradan belirenler `role="status"`. |
| **EmptyState** | `StateViews.tsx` | boş (tek eylem isteğe bağlı) | Sakin dil, hata gibi duyurulmaz. |
| **ErrorState** | `StateViews.tsx` | hata + "Tekrar dene" | `role="status"` ile duyurulur; suçlamaz. |
| **LoadingState** | `StateViews.tsx` | yükleniyor | Görünür "Yükleniyor" yazısı + `role="status"`; "animasyonları azalt" açıkken dönen halka yerine durağan kum saati. |
| **SkeletonList** | `StateViews.tsx` | liste yüklenirken taslak | **Parıltı/nabız yok**, durağan. Tek bir "Yükleniyor" olarak okunur (`aria-busy`). |
| **Banner** | `Banner.tsx` | bilgi · başarı · uyarı · hata; eylemli; kapatılabilir | Ton = renk + simge + okunan ton etiketi ("Uyarı: ..."). `role="status"` (hata için `alert`). Kendiliğinden kaybolmaz. |
| **ProgressBar** | `ProgressBar.tsx` | değer + üstte yazı ("3 / 10 konu") | Yerel `<progress>`; "Plan ilerlemesi, %30 tamamlandı". Yüksek kontrastta kenarlık. |
| **NoticeProvider / NoticeRegion / useNotice** | `Notice.tsx` | kısa geri bildirim ("Kaydedildi.") | **Kendiliğinden kaybolmaz** (zamanlayıcı yok), "Tamam" ile kapanır; `role="status"` `aria-live="polite"` bölgesi sayfada önceden bulunur; yeni bildirim eskisinin yerini alır. Gezinmenin üstünde "yapışkan" durur. |
| **AppShell** | `AppShell.tsx` + `NavLink.tsx` | telefon / orta / geniş (bkz. 5) | Tek `<nav aria-label="Ana gezinme">`, seçili `aria-current="page"`, dolu simge + kalın etiket + gösterge. `<main id="icerik">`. Sayfanın `h1`'i sayfada. |
| **SkipLink** | `SkipLink.tsx` | odakta görünür | İlk odaklanabilir öğe; `main#icerik`'e atlar. |
| **SiteFooter** | `SiteFooter.tsx` | — | `/gizlilik` ve `/cerezler` bağlantıları; bağlantı alanı >= 48 px. |
| **CookieNotice** | `CookieNotice.tsx` | ilk ziyaret · kapatılmış | Çerez **bilgilendirme notu** (rıza bandı değil): "Tamam" tek düğme, "Kabul et / Reddet" yok; sayfayı engellemez (diyalog değil); kapatıldığı cihazda hatırlanır ve ilk boyamadan önce gizlenir (düzen kaymaz). |
| **PublicPage** | `PublicPage.tsx` | — | Oturumsuz sayfa çerçevesi: `main`, bildirim bölgesi, altbilgi. |
| **BrandMark** | `BrandMark.tsx` | küçük · orta · büyük | Süs, gizli; Windows yüksek kontrastta renklerini korur. |
| **TextField** | `TextField.tsx` | normal · odak · hata · pasif · yardım | `<label>` hep üstte; yardım ve hata `aria-describedby` ile; hata = kalın kenarlık + simge + yazı. Yapıştırma açık (WCAG 3.3.8). |
| **Switch** | `Switch.tsx` | açık · kapalı · odak · pasif | Yerel onay kutusu + `role="switch"`; düğme üzerinde onay/çarpı işareti (renk dışı ipucu); açıklama `aria-describedby`. |
| Icon, NavIcon | `Icon.tsx` | — | Bkz. 6. |

**Henüz yazılmayan bileşenler** (ilgili fazda eklenecek): diyalog ve alt sayfa ("Bildir", React Aria), tarih/saat seçici, görev/konu kartı, soru kartı, mesaj balonu, fotoğraf görüntüleyici (yakınlaştırma düğmeleriyle), ses kaydedici/oynatıcı, takvim ızgarası, gönüllü kartı. Hepsi `Card` + token'larla kurulur; yeni renk ya da boyut gerektirmez. Eklenen her bileşen galeriye girer ve axe testi dört temada otomatik koşar.

**Durum matrisi (her etkileşimli bileşen):** normal, üzerine gelme, basılı, **odak** (klavye erişimi: 3 px halka, yüksek kontrastta 4 px; renk `on-surface`, her yüzeyde >= 4.5:1; `outline` olduğundan Windows yüksek kontrastta da görünür), pasif (metin >= 4.5:1: pasif öğe de okunur; **neden pasif olduğu yakındaki bir metinle yazılır**), yükleniyor, seçili, hata.

## 8. Hareket kuralları

1. **Tek doğruluk kaynağı CSS süre değişkenleridir** (`--duration-short/medium/long`). `prefers-reduced-motion: reduce` (işletim sistemi/tarayıcı ayarı) **ve** uygulama içi "Animasyonları azalt / hafif mod" (`<html data-motion="reduce">`) bunları **0 ms** yapar; geçişler anında olur. Bileşenler süreyi yalnızca bu değişkenlerden alır.
2. **Yasak:** zıplama/yaylanma eğrileri, sonsuz süs animasyonu, parıltı (shimmer), konfeti/kutlama animasyonu, otomatik kayan öğeler, yanıp sönme (saniyede 3'ten fazla yanıp sönme hiçbir koşulda olmaz).
3. **Gerekli hareket** (yalnızca yükleniyor göstergesi): azaltma açıkken dönen halka gizlenir, durağan kum saati görünür.
4. Hafif mod (plan 4.3.6) animasyonları kapatır: aynı bayrağı kullanır.
5. Galeri: "Animasyonları azalt" anahtarı ve "Kutuyu kaydır" örneği bu kuralı cihazda gösterir; Playwright testi iki tetikleyicide de sürenin 0 ms olduğunu doğrular.

## 9. Erişilebilirlik özeti ve testler

Hedef **WCAG 2.2 AA** (plan 9.4).

| Gereksinim | Nasıl sağlanıyor | Test |
|---|---|---|
| Dokunma >= 48 px, ana eylem 56 px | `--tap-min`, `--tap-primary` (px alt sınırıyla) | Bileşen testleri, galeri |
| Yazı %200 / %400 ve 320 px yeniden akış | rem boyutlar, `flex-wrap`, `minmax(0, 1fr)`, `overflow-wrap: anywhere`, rem kırılma noktaları | Playwright: kök yazı %200/%400, 320-768 px, taşma ve kırpılma |
| Kontrast AA (>= 4.5:1), yüksek kontrast >= 7:1 | Palet + otomatik oran testi | `token-kontrast.test.ts` (Vitest), axe `color-contrast` (Playwright) |
| Ekran okuyucu | Anlamsal HTML, benzersiz `title`, tek `h1`, süs ikon gizli, kart tek öğe, canlı bölgeler | Bileşen testleri (Testing Library `getByRole`), axe |
| Klavye ve odak | Görünür halka, mantıklı sıra, "İçeriğe geç", alttaki gezinme odağı örtmez | Playwright: Tab ile her öğenin halkası >= 3 px ve ekranda |
| Windows yüksek kontrast | `forced-colors` ile çatışmayan CSS, saydam kenarlıklar | Playwright `forcedColors: 'active'` |
| Renkle tek başına bilgi yok | Simge + yazı + biçim | Galeri, bileşen testleri |
| Animasyonları azalt | Bölüm 8 | Playwright (iki tetikleyici) |
| Zaman aşımı yok | Bildirim ve bant kalıcı | Vitest (sahte zamanlayıcı) ve Playwright (6 sn sonra hâlâ görünür) |
| Cihazda saklama yalnızca isteyince | `ek-gorunum` yalnızca değişiklikte yazılır | Vitest (depo testleri) ve Playwright (ilk ziyarette `localStorage` boş, çerez yok) |

- **Vitest** (`npm test`): token kontrastı (dört tema), `tokens.css` senkronu, yazı tipi (boyut, Türkçe harfler, OFL, tek `preload`), tasarım kuralları (ünlem yok; `legal` öneki dışında sağlık sözcüğü yok; "kabul ediyorum" yok; tamamı büyük harf yok; satır içi `style` yok; dış adres yok; çıplak `toUpperCase` yok; galeri üretimde kapalı), satır içi tema betiği ile TS eşlemesi, tüm bileşenlerin durum testleri.
- **Playwright + axe** (`npm run test:e2e`): ana sayfa, hata/404, yasal sayfalar ve galeri **4 temada** WCAG 2.0/2.1/2.2 A ve AA; 320 px'te yatay kaydırma yok; %200 yazı; klavye odağı; sistem ayarı ve uygulama içi seçimin 11 birleşimi (sistem koyu, yüksek kontrast isteği vb.); tema yanıp sönmez; çerez notu; yazı tipi kendi kökenimizden.
- **Kanarya testleri** (`e2e/galeri.spec.ts`, `src/lib`, `tests/yazi-tipi.test.ts`): bilerek erişilemez yapılmış örneği (alt metinsiz görsel, düşük kontrast, adsız düğme, etiketsiz alan) axe'in yakaladığı, WOFF2 okuyucusunun eksik karakteri bulduğu gösterilir. Bu testler kırılırsa diğerlerinin yeşil olması bir şey kanıtlamaz.
- **Elle kontrol listesi** (`testci` + insan ekip, gerçek cihaz; plan 11.4): TalkBack + Chrome (düşük donanımlı Android), VoiceOver + Safari (iPhone), NVDA + Firefox (masaüstü), Windows yüksek kontrast, %200/%400 yakınlaştırma, "animasyonları azalt", koyu ve yüksek kontrast temalar, harici klavye, yatay mod.

## 10. Metinler ve hitap

Metinler `web/src/strings/tr.ts` içinde tutulur (Flutter `app_tr.arb` buraya taşındı); bileşenlere gömülmez. Anahtarlar bileşen/ekran adına göre gruplanır (`tr.home`, `tr.states`, `tr.nav`). Yasal metinlerin anahtarları `legal` önekini taşır (bkz. 11, kural 5). Galerinin metinleri `tr.gallery` altındadır.

## 11. Türkçe mikro-metin yazım kuralları

1. **Sade ve kısa.** Cümle başına tek fikir; 10-14 yaşın rahat okuyacağı sözcükler. Terim gerekiyorsa ilk geçtiği yerde açıklanır. Düğme etiketi 1-3 sözcük, fiille biter: "Göreve başla", "Soru sor", "Tekrar dene".
2. **Hitap:** öğrenciye **sen** ("Bugün ne kadar vaktin var?"), veli/gönüllü/yönetici **siz** ("Çocuğunuzun hesabını oluşturun"). Bir ekranda ikisi karışmaz. Ortak bileşenler edilgen/nötr yazar.
3. **Sıcak ama abartısız.** "Harika!", "Süpersin!", ünlem yığını, emoji yok. Ünlem işareti kullanılmaz (test denetler). Övgü gerçekçidir: "Bugünlük bu kadar yeter."
4. **Baskı ve suçlama yok.** Yasak: "borç", "geride kaldın", "hâlâ yapmadın", "tekrar denemelisin", "yanlış girdin". Doğrusu: "Plan senin hızında ilerler.", "Bu kullanıcı adı bulunamadı."
5. **Nötr dil, sağlık dili yok.** Hastalık, engel, tedavi, hastane, rahatsızlık, sağlık, "devamsızlık nedeni" geçmez. Doğrusu: "derslere ara verdiğin tarihler". Kullanıcıya ara verme nedeni sorulmaz. (Test: `tests/tasarim-kurallari.test.ts`.) **İstisna:** KVKK gereği, velinin ayrı yasal ekranlarında (aydınlatma metni, AR-1 açık rıza) "sağlık" sözcüğü hukuken zorunludur; bu metinlerin `strings` anahtarları `legal` önekini taşır ve yalnızca veliye gösterilir. Öğrenci ve gönüllü ekranlarında bu istisna **yoktur**.
6. **Hata mesajı üç parçalıdır:** ne oldu + (gerekiyorsa) neden + ne yapılabilir. Teknik sözcük, hata kodu, "Hata:" öneki yok. "Şu an yüklenemedi. Bağlantıda bir sorun olabilir. Biraz sonra tekrar denenebilir." Suçlayıcı değil: "Girdiğiniz şifre yanlış" değil, "Şifre eşleşmedi."
7. **Boş durum yol gösterir:** "Henüz sorun yok. İlk sorunu sorduğunda cevaplar burada görünür." + tek eylem.
8. **Geri alınamaz eylemler açıkça söylenir:** sonucu yazan onay sayfası, eylemi adıyla anan düğme ("Hesabı sil", "Rızamı geri al"); "Tamam/Evet" değil. Güvenli seçenek ("Vazgeç") birincil düğmedir.
9. **Düğme etiketi tek başına anlamlı olsun** (ekran okuyucu bağlantı listesinde tek başına okur): "Tümünü gör" yerine gerekirse "Sorularımın tümünü gör". Yalnızca ikonlu düğmenin `aria-label`'ı vardır.
10. **Yazım:**
    - Büyük harf: yalnızca cümle başı ve özel adlar. **TAMAMI BÜYÜK yazı yok.**
    - Sayı ve birim: "5 dakika", "3 / 10 konu", "%30" (yüzde işareti önde; `Intl` `tr-TR` böyle yazar), saat 24 saatlik "14.30", tarih "16 Ekim 2026" ya da "16.10.2026". Saat dilimi her zaman `Europe/Istanbul`.
    - Kesme: özel ada ve sayıya ekler kesmeyle ("Eğitim Köprüsü'nde"); sıra sayısı "5. sınıf".
    - Üç nokta: yalnızca "Yükleniyor…" gibi süregelen işte; tek karakter `…`.
    - Tırnak: "çift tırnak", düğme adlarını anarken ("Bildir" düğmesi).
    - Gönüllü öğrenciye ve veliye **"Ad S."** (ad + soyadın baş harfi) görünür; baş harf Türkçe kuralla büyütülür (`shortPublicName`).
11. **Rol sözcükleri tutarlıdır:** "gönüllü" (çocuk metninde "gönüllün" denebilir), "veli", "öğrenci", "yönetici". "Hasta", "danışan" denmez.
12. **Bildirim (push/e-posta) metinleri genel olur:** mesaj içeriği, rumuz, konu adı, ad ve sağlık izlenimi içermez (bkz. `docs/ekran-akislari.md`, "Bildirim metinleri").
13. **Erişilebilir yazım:** bağlantı/düğme metni "buraya tıkla" olmaz; emoji ve ASCII süs yok; kısaltma ilk geçtiğinde açılır.

| Yerine | Yazın |
|---|---|
| "Hata!" | "Şu an yüklenemedi" |
| "Geride kaldın" | "Kaldığın yerden devam edebilirsin" |
| "Bugün 3 görevin var, yetiştirmelisin" | "Bugün için seni 2 konu bekliyor" |
| "Hastalık nedeniyle ara verdiğin tarihler" | "Derslere ara verdiğin tarihler" |
| "Kabul ediyorum" (aydınlatma) | "Okudum, anladım" |
| "Tamam" (silme onayı) | "Hesabı sil" ve yanında "Vazgeç" |
| "Başarıyla kaydedildi!" | "Kaydedildi." |

## 12. Kullanım (geliştirici)

```tsx
// Renk, boşluk, boyut: yalnızca CSS değişkenleri (ham değer yazmak Stylelint hatası verir)
.kart { padding: var(--space-lg); border-radius: var(--radius-lg); background-color: var(--color-surface-low); }
// Tür ölçeği: CSS Modules'ta
.baslik { composes: titleMd from '../styles/text.module.css'; }

// Bileşenler
import { Button, ButtonLink } from '@/components/Button';
import { CardLink, CardContent } from '@/components/Card';
```

- **Renk değiştirmek:** `src/styles/palette.json` düzenlenir, sonra `npm run tokens` (üretilen bölüm `tokens.css` içindedir). `npm test` oran ve senkron testlerini koşar.
- **İkon eklemek:** `scripts/fetch-icons.mjs` içindeki listeye eklenir, `npm run icons` çalıştırılır (ağa bağlanır, çıktı repoya girer).
- **Yeni metin:** `src/strings/tr.ts` (ünlem yok; sağlık sözcüğü yok).
- **Bileşen galerisi:** yalnızca geliştirme. `npm run dev` ile ana sayfada "Bileşen galerisi (geliştirici)" bağlantısı çıkar, ya da `/galeri`. Tema (Sistem/Açık/Koyu), yüksek kontrast, yazı boyutu (%100, %115, %130, %200) ve animasyon azaltma denenir; bu denemeler **cihaza kaydedilmez**. Dört tema yan yana, tüm bileşenler ve durumları, rol iskeleti (telefon 360 px ve geniş 1024 px; dört rol), bildirim, hareket ve ikon listesi vardır. `?rol=veli` rol örneğini değiştirir.
- **Üretimde erişilemez:** `/galeri` üretim derlemesinde (`NODE_ENV=production`) `GALLERY=on` verilmedikçe **404** döner; Vercel üretim ortamında (`VERCEL_ENV=production`) `GALLERY=on` olsa bile hiçbir zaman açılmaz (`src/lib/gallery.ts`). Ana sayfadaki bağlantı da yalnızca açıkken görünür. Testler: `src/lib/gallery.test.ts`, `src/app/galeri/page.test.tsx`, `e2e/galeri.spec.ts` (üretim sunucusunda 404; ikinci sunucu `GALLERY=on` ile axe testleri).
- Yeni bileşen: `src/components/` altına yaz (önce yerel HTML), galeriye bir örnek ekle, durum testini yaz; axe testi galeride dört temada kendiliğinden koşar.

## 13. Açık konular

1. **Çerez bilgilendirme notu metni** `cerez-politikasi.md` 1'e uygun; avukat onayı bekliyor. İleride zorunlu olmayan bir teknoloji eklenirse gerçek bir rıza paneli ("Kabul et", "Reddet", "Tercihler" eşit ağırlıkta) gerekir.
2. **Görünüm ayarları ekranı** (Ayarlar > Görünüm ve erişilebilirlik) Faz B'de yazılır. Hazır parçalar: `src/lib/appearance.ts` (okuma/yazma/uygulama), `appearance-script.ts` (ilk boyama). Ekran, değişiklik anında `saveAppearance` çağırır ve her ayarın yanına "Bu ayar yalnızca bu cihazda saklanır." yazar.
3. **PWA ikonları ve `manifest.ts`** (BrandMark'tan 192/512/maskable/apple-touch-icon) Faz B'de.
4. **Gezinme etiketi üst sınırı** (`--nav-label-max`) Material kararıdır; WCAG 1.4.4 açısından gerçek cihazda TalkBack/VoiceOver ve %200 yazıyla elle denenmeli. Gerekirse düzen büyük yazıda alt gezinmeden yan menüye geçirilir.
5. **Renk tonları ve marka işareti** gerçek ekranda ve düşük donanımlı cihazda ekip tarafından gözle onaylanmalı. Kontrast sayıları hesaplanmıştır; "hoşa gidiyor mu" kararı insanındır.
6. **Okuma kolaylığı yazı tipi** (Aşama 2): Atkinson'a ek seçenek olarak değerlendirilebilir; mimari hazır (`--font-sans`).
7. **İçerik görselleri** (konu özetindeki şekiller): koyu temada okunurluğu içerik hazırlığında denetlenmeli; öneri: özet görsellerinde beyaz zeminli PNG.
8. **Performans bütçesi:** ilk yükleme JS hedefi (öğrenci rotaları <= 150 KB gzip, plan 11.4) **boş bir sayfa için bile aşılıyor**: React 19.3 + Next 16.4 çerçevesi tek başına yaklaşık 135-155 KB gzip. Bizim istemci kodumuz ana sayfada yaklaşık 4 KB ekliyor. Hedefin çerçeve temeline göre yeniden tanımlanması gerekir.
