# Eğitim Köprüsü — Mimari Plan ve İş Planı

> **Durum:** Taslak v2 · **Tarih:** 18 Ekim 2026 · **Hazırlayan:** mimar ajanı
> **Kapsam:** MVP: dört rol (öğrenci, veli, gönüllü, yönetici) için **tek web uygulaması**. Telefon tarayıcısı önceliklidir; uygulama PWA olarak ana ekrana eklenebilir. 5–8. sınıf Matematik ve Fen.
> **Önceki sürüm:** v1 (16 Ekim 2026; Flutter + Android). Değişiklik kararını kullanıcı 18 Ekim 2026'da verdi.

## 0. v1'den değişenler

| Konu | v1 | v2 |
|---|---|---|
| Platform | Android (öğrenci, veli, gönüllü) + Flutter web (gönüllü, yönetici) | **Tek web uygulaması**, dört rol. Öğrenciler çoğunlukla telefon tarayıcısından girer. PWA olarak ana ekrana eklenebilir. iOS ilk günden tarayıcıdan desteklenir. |
| Arayüz teknolojisi | Flutter 3.47 / Dart | **Next.js 16.4** (App Router) + React 19.3 + TypeScript 6.0 |
| Stil ve bileşenler | Material tema, Flutter widget'ları | CSS Modules + CSS değişkenleri (aynı token'lar, 4 tema). Önce yerel HTML, gerekince React Aria Components. |
| Oturum | `flutter_secure_storage` | `@supabase/ssr` ile **httpOnly çerez**. Tarayıcıda Supabase istemcisi yok. |
| Bildirim | Firebase Cloud Messaging | **Web Push (VAPID)**, `send-push` Edge Function ile. Firebase tamamen çıktı. |
| Çevrimdışı | drift (SQLite) | Service worker önbelleği (Serwist) |
| Kamera / ses / görüntülü ders | `image_picker`, `record`, Jitsi SDK | `<input capture>`, MediaRecorder, JaaS IFrame API |
| Barındırma | Firebase Hosting | **Vercel Hobby**, fonksiyonlar Frankfurt'ta (`fra1`) |
| Yeni | – | Nonce'lu CSP ve güvenlik başlıkları; çerez politikası; herkese açık yasal sayfalar; H1'de teknik doğrulama (spike) |
| Kaldırılan | – | APK, Google Play, Data safety, Android izin ve manifest işleri, iOS TestFlight, `mobil` ajanı |
| Korunan | Supabase şeması, RLS, 736 pgTAP testi, `tools/db-check`; Edge Function listesi; hukuk taslakları; tasarım sistemi değerleri ve ekran akışları | Aynen korunur. Yalnızca web'in gerektirdiği değişiklikler listelendi: 5.5 (şema), 9.5 (hukuk), 7.4 (tasarım sistemi). |
| `app/` (Flutter kodu) | Kod tabanı | Arşivlenir: git etiketi atılır, sonra silinir (bkz. 8.1) |

## 1. Özet

Eğitim Köprüsü ücretsiz bir platformdur. Sağlık sorunu, fiziksel engel veya uzun devamsızlık nedeniyle okula gidemeyen öğrencilere hizmet verir; öğrencilerin çoğu reşit değildir. Her öğrenciye **kişisel telafi planı** ve **aynı gönüllüyle sürekli birebir destek** sunar.

Platform içerik üretmez; EBA ve diğer ücretsiz kaynaklara yönlendirir. Farkı üç noktadadır: telafi planı, insan desteği ve bu kitleye göre tasarım (esneklik, erişilebilirlik, okula dönüş). MEB'in evde eğitim ve hastanede eğitim hizmetlerine rakip değildir, onları tamamlar.

Dört rolün tamamı tarayıcıdan çalışan tek bir web uygulamasını kullanır. Uygulama zayıf internette hızlı açılacak ve ekran okuyucularla gerçek HTML olarak erişilebilir olacak şekilde tasarlanır. GLB300 dersi kapsamında yapılıyor ve SDG 4.5'e katkı amaçlıyor.

## 2. Varsayımlar

| Konu | Varsayım |
|---|---|
| Teslim | Yaklaşık **15 Ocak 2027**. 19 Ekim 2026'dan itibaren 12 iş haftası + 1 hafta tampon. |
| Ekip | 3–5 öğrenci, yarı zamanlı. Biraz Flutter ve SQL deneyimi var; **JavaScript/React deneyimi yok** varsayılır. Kodu ağırlıklı olarak ajanlar yazar. Ekip inceler, içerik hazırlar ve gerçek cihazda dener. |
| Kullanıcı | Teslimde yalnızca **sahte veri** ve test kullanıcıları kullanılır. Olası pilotta en fazla 50 öğrenci ve 30 gönüllü. |
| Bütçe | 0 TL. Yalnızca ücretsiz ve kredi kartı istemeyen katmanlar. Özel alan adı isteğe bağlıdır. |
| Kapsam | 5–8. sınıf MAT + FEN, yalnızca Türkçe, 2026-2027 öğretim yılı konu tablosu |
| Platform | Web (PWA). Hedef tarayıcılar: Android Chrome ve Samsung Internet (son 2 yıl); iOS/iPadOS Safari 17+ (push için 16.4+ ve ana ekrana ekleme, hedef 18.4+ / 26); masaüstünde Chrome, Edge, Firefox ve Safari'nin son 2 sürümü. **Birincil hedef düşük donanımlı Android telefon.** |
| Teslim çıktısı | Yayındaki web uygulaması (Vercel adresi), kaynak kod, `docs/`, demo senaryosu |
| Geliştirme ortamı | Windows 11 ve Node 24. Docker, psql ve Supabase CLI kurulu değil (CLI `npx` ile kullanılır). Git kimliği tanımlı değil; henüz commit yok. |

## 3. Teknoloji seçimi

### 3.1 Backend: Supabase (değişmedi)

| Kriter | Supabase | Firebase |
|---|---|---|
| Web ekosistemi | Resmi `@supabase/ssr` ve Next.js rehberi **(+)** | Web SDK olgun; ancak SSR ve çerez oturumu için ek iş gerekir **(±)** |
| İlişkisel veri (veli↔çocuk, eşleştirme, telafi planı, müfredat) | Postgres: FK, JOIN, transaction ve SQL fonksiyonları **(++)** | Firestore NoSQL: denormalizasyon gerekir **(−)** |
| Rol bazlı erişim (reşit olmayanların verisi) | RLS + pgTAP; şu an 736 testle doğrulanmış durumda **(++)** | Security Rules; ilişki kontrolleri `get()/exists()` zincirleriyle yapılır **(±)** |
| Push bildirim | Yerleşik değil; Web Push + Edge Function **(±)** | FCM yerleşik; tetikleyici için Cloud Functions ve Blaze planı gerekir **(−)** |
| Dosya ve sunucu mantığı | Storage (1 GB) + Edge Functions (500 bin çağrı) ücretsiz **(+)** | Storage ve Functions için faturalandırma hesabı gerekir **(−)** |
| Ücretsiz katman | 500 MB veritabanı, 1 GB dosya, 5 GB çıkış trafiği, 50 bin MAU. **7 gün hareketsizlikte duraklatılır, otomatik yedek yoktur.** | Kredi kartı gerekir |

**Karar: Supabase** (Auth + Postgres/RLS + Storage + Edge Functions + pg_cron), bölge **Frankfurt (eu-central-1)**.

Gerekçe:
- Projenin çekirdeği ilişkisel veridir.
- Reşit olmayanların verisi için satır bazlı ve test edilebilir yetki gerekir.
- Kredi kartı gerekmez.
- Şema ve testler hazır.

Web'e geçişle birlikte Firebase tamamen çıkar.

### 3.2 Web uygulaması: Next.js

**Neden Next.js:**
- **HTML sunucuda üretilir.** İçerik JavaScript beklemeden görünür. Zayıf internette ve düşük donanımlı telefonda ilk açılış hızlıdır.
- **Gerçek HTML'dir.** Ekran okuyucular, tarayıcı yakınlaştırması, yazı büyütme ve Windows yüksek kontrast modu doğal çalışır. Flutter web'in tuval (canvas) çiziminde bunlar ek iş gerektiriyordu.
- **Destek ve örnek bol.** Supabase'in resmi `@supabase/ssr` rehberi Next.js içindir. Next.js en geniş topluluğa sahip React çatısıdır ve ajanların en iyi bildiği yığındır.
- **PWA için hazır yapı var.** `app/manifest.ts` dosya kuralı, resmi PWA rehberi (Web Push örneğiyle) ve Serwist entegrasyonu mevcut.

**Elenen alternatifler:**
- **Flutter web:** tuval çizimi, ağır ilk yükleme, varsayılan olarak kapalı erişilebilirlik ağacı.
- **Vite + React SPA:** sunucuda HTML yok, ilk açılış yavaş, oturum token'ı tarayıcıda kalır.
- **SvelteKit / Astro:** daha hafifler ama topluluk ve hazır örnek daha az. Ekip zaten sıfırdan öğreneceği için en yaygın yığını seçmek daha güvenli.

**Sürüm ve yapılandırma kuralları:**
- Next.js **16.4.x**'e sabitlenir (`package.json`'da tam sürüm; otomatik güncellemeler yalnızca güvenlik yaması). Next.js 17 çıkarsa teslimden önce geçilmez.
- Yalnızca App Router kullanılır; Pages Router kullanılmaz. Derleyici olarak Turbopack (varsayılan) kullanılır.
- `cacheComponents` ve PPR **açılmaz**, çünkü nonce'lu CSP ile uyumsuzlar (bkz. 9.1). Sonuç olarak her sayfa istek anında sunucuda üretilir; yeni başlayan ekip için de tek ve basit bir model olur.
- React Compiler isteğe bağlıdır. H1'de açılır, sorun çıkarsa kapatılır.

### 3.3 Paketler ve sürümler

Sürümler npm kayıt defterinden 18.10.2026'da doğrulandı. Hepsi tam sürümle sabitlenir.

| İhtiyaç | Paket (sürüm) | Not |
|---|---|---|
| Çatı | `next` 16.4.2, `react` / `react-dom` 19.3.1 | Next 16 Node ≥ 20.9 ister; ekipte Node 24 var |
| Dil | `typescript` **6.0.3** | Güncel sürüm 7.0.2 (yerel derleyici), ama `typescript-eslint` 8.71 yalnızca `<6.1` destekliyor. Next.js'te TS 7 desteği de kısmi. 6.0 kullanılır. |
| Supabase | `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.118.0 | Yalnızca sunucuda kullanılır (bkz. 3.7) |
| Erişilebilir bileşenler | `react-aria-components` 1.22.1, `@internationalized/date` 3.12.4 | Yalnızca karmaşık bileşenlerde (bkz. 3.5) |
| Doğrulama | `zod` 4.6.7 | Sunucu eylemlerinde zorunlu |
| PWA | `serwist` + `@serwist/turbopack` 9.5.13 | Next.js'in resmi PWA rehberinin önerdiği seçenek |
| Markdown | `react-markdown` 10.1.0 | Yalnızca sunucuda; ham HTML kapalı |
| Fotoğraf sıkıştırma | Yerel küçük yardımcı fonksiyon veya `compressorjs` 1.4.0 | EXIF temizliği test edilir (bkz. 4.3.3) |
| Web Push (Edge Function, Deno) | Web Crypto tabanlı bir kütüphane (ör. JSR `@negrel/webpush`) | `backend` spike'ta seçer. Node'a özgü `web-push` Deno'da sorun çıkarabilir. |
| Lint | `eslint` **9.39.5** + `eslint-config-next` 16.4.2 (içinde `jsx-a11y`, `react-hooks`) | ESLint 10.13 var, ama `eslint-plugin-jsx-a11y` 6.10.2 ve `eslint-plugin-react` ESLint 9'un üstünü desteklemiyor |
| CSS lint | `stylelint` 17.16.0 + `stylelint-declaration-strict-value` 1.12.1 | Ham renk ve token dışı değerler yasak |
| Birim testi | `vitest` 5.0.5, `@testing-library/react` 16.3.3, `jsdom` 30.1.3 | |
| Uçtan uca test | `@playwright/test` 1.64.1, `@axe-core/playwright` 4.14.0 | |
| Performans | `@lhci/cli` 0.15.1 | Lighthouse CI |

**Kullanılmayanlar:**
- **i18n kütüphanesi** (bkz. 3.8).
- **Küresel durum kütüphanesi** (Redux, Zustand).
- **İstemci veri kütüphanesi** (TanStack Query, SWR).
- **Analitik ve hata izleme SDK'ları.**
- **`next-themes`.** Tema betiği kendimizin; 10 satır.
- **Google Fonts ve harici CDN'ler.**

### 3.4 Stil: CSS Modules + CSS değişkenleri

| Kriter | CSS Modules + CSS değişkenleri | Tailwind 4.3 |
|---|---|---|
| Token'lar ve 4 tema | Token'lar `tokens.css` içinde değişken olur. Dört tema dört seçici bloğudur (`[data-theme=…]`); bileşenler temayı bilmez. **(+)** | `@theme` ile aynı değişkenler kullanılır; o da iyi **(+)** |
| Yüksek kontrast | `@media (prefers-contrast: more)`, `forced-colors: active` ve kalın kenarlık token'ları düz CSS'tir **(+)** | `contrast-more:` ve `forced-colors:` varyantları var **(+)** |
| Yeni başlayan ekip ve kod incelemesi | Düz CSS okunur, öğrenilen bilgi her yerde işe yarar, JSX sade kalır **(+)** | Uzun sınıf dizileri incelemede zor okunur; ayrı bir söz dizimi öğrenmek gerekir **(−)** |
| Tutarlılık zorlaması | Stylelint: `tokens.css` dışında ham renk ve px yazı boyutu yasak **(+)** | Varsayılan paleti kapatarak benzer zorlama yapılabilir **(+)** |
| Çalışma maliyeti ve CSP | Sıfır JavaScript; statik CSS dosyası; nonce sorunu yok **(+)** | Aynı **(+)** |

**Karar: CSS Modules + CSS değişkenleri.**

Gerekçe:
- Tasarım sistemi zaten anlamsal token'larla tanımlı. Değişkenlere 1:1 aktarılır; yeni bir kavram eklenmez.
- Kod incelemesini ekip yapacak. Düz CSS, yeni başlayan biri için en okunur seçenektir.

**Alternatif:** Tailwind 4.3. Ekip açıkça tercih ederse uygun bir seçimdir, ancak iki yaklaşım karıştırılmaz.

### 3.5 Bileşen temeli: önce yerel HTML, gerekince React Aria Components

**İlke:** Tarayıcının kendi öğeleri zaten erişilebilirdir ve JavaScript'siz çalışır. Bu yüzden şu bileşenler yerel HTML ile yapılır:
- düğme ve bağlantı (`<button>`, `<a>`),
- radyo kartları (`fieldset` / `legend` + `input type=radio`),
- onay kutusu ve anahtar (`role="switch"`),
- metin alanı, seçim kutusu.

Öğrenci sayfalarında JavaScript miktarı bu şekilde düşük kalır.

**React Aria Components (Adobe) yalnızca karmaşık desenlerde kullanılır:**
- tarih aralığı (plan sihirbazı), tarih ve saat (randevu, uygunluk) — `I18nProvider locale="tr-TR"` ile Türkçe ay adları ve klavye girişi,
- diyalog ve alt sayfa (odak tuzağı, Esc ile kapanma),
- sekmeler, menü,
- yönetici arama kutusu.

**Neden React Aria:**
- WAI-ARIA desenleri mobil ekran okuyucularda da (VoiceOver, TalkBack) denenmiş durumda.
- `usePress`, dokunma, fare ve klavyeyi tutarlı biçimde ele alır.
- Erişilebilir tarih seçicileri var; Radix'te tarih seçici yok.
- Stilsizdir. Durumlar (`[data-pressed]`, `[data-selected]`, `[data-focus-visible]`) bizim CSS'imizle biçimlenir.

**Alternatifler:**
- Radix Primitives: bakımda ve yaygın, ama tarih seçicisi yok.
- Base UI 1.9: yeni ve stabil.

Paket boyutu her bileşen için ayrı ölçülür. Bugün sayfasında React Aria kullanılmaz.

### 3.6 Render modeli, veri çekme ve formlar

**"Tek yol" kuralları** (yeni başlayan ekip ve ajanlar için):

1. **Okuma: Server Component.** Sayfa sunucuda `src/server/data/*` fonksiyonlarını çağırır. Bu fonksiyonlar kullanıcının oturumuyla çalıştığı için RLS geçerlidir.
2. **Yazma: Server Action.** Her eylem `defineAction(şema, işleyici)` sarmalayıcısıyla yazılır. Sarmalayıcı sırayla:
   - oturumu ve rolü doğrular,
   - Zod ile girdiyi doğrular,
   - RPC'yi çağırır,
   - hatayı Türkçe ve kullanıcı dostu bir mesaja çevirir,
   - ilgili sayfayı yeniler (`revalidatePath` veya `redirect`).
3. **İstemci bileşeni (`'use client'`) yalnızca iki durumda kullanılır:**
   - tarayıcı API'si gereken yerlerde (kamera dosyası, mikrofon, push, localStorage, iframe, service worker),
   - anlık etkileşim gereken küçük adalarda (mod seçimi, tarih seçici, sihirbaz adımı).
4. **Formlar:**
   - Yapı: `<form action={eylem}>` + `useActionState`.
   - İstemci tarafı doğrulama yalnızca HTML kısıtlarıyla yapılır: `required`, `minLength`, `inputMode`, `autocomplete="one-time-code"` vb.
   - Asıl doğrulama sunucuda Zod ile yapılır.
   - Formlar JavaScript yüklenmeden de çalışır (zayıf ağda önemli).
   - React Hook Form kullanılmaz; bir kavram eksik olur.
5. **Tazelik:**
   - Sayfa öne gelince (`visibilitychange`) ve uygulama açıkken push gelince (service worker'dan mesaj) `router.refresh()` çağrılır.
   - Realtime MVP'de yok.
6. **Zaman:**
   - Veritabanında `timestamptz` (UTC) kullanılır.
   - Gösterimde her zaman `Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul' })` kullanılır. Vercel sunucusu UTC'de çalışır; saat dilimi açıkça verilmezse sunucu ve tarayıcı çıktısı uyuşmaz.
7. **Tipler:** Veritabanı tipleri `supabase gen types typescript` ile üretilir (`src/server/database.types.ts`).

### 3.7 Oturum: `@supabase/ssr` ve httpOnly çerez değerlendirmesi

**v1'deki sorun:** `supabase_flutter` oturumu varsayılan olarak SharedPreferences'ta düz metin tutuyordu. v1'de çözüm secure storage'dı.

**Web'deki durum:**

| Tehdit | v1 (Flutter, secure storage) | Web, `@supabase/ssr` varsayılanı (JS'in okuyabildiği çerez) | **v2 kararı (httpOnly, tarayıcıda Supabase istemcisi yok)** |
|---|---|---|---|
| Cihazdaki dosyadan okunma | Şifreli anahtar deposu | Tarayıcı profilinde tutulur. Windows ve macOS'ta tarayıcı çerez deposunu işletim sistemi anahtarıyla şifreler; Android ve iOS'ta uygulama korumalı alanındadır. | Aynı |
| Sayfaya enjekte edilen betikle (XSS) token çalınması | – | **Mümkün** (`document.cookie`) | **Engellenir** |
| XSS ile, oturum açıkken kullanıcı adına işlem yapılması | – | Mümkün | **Hâlâ mümkün.** Asıl önlem nonce'lu CSP ve React'in kaçışlaması. |
| CSRF | – | SameSite=Lax | SameSite=Lax + Server Actions'ın köken kontrolü + Route Handler'larda `Origin` kontrolü |
| Ortak cihaz (veli ve çocuk aynı telefonu kullanır) | Uygulama oturumu | Tarayıcı oturumu | Aynı. Önlemler: görünür "Çıkış yap", çıkışta önbellek temizliği, hassas veli işlemlerinde yeniden doğrulama, `Cache-Control: no-store`. |

**Sonuç:**
- httpOnly çerez, sorunun "JavaScript'ten okunma" kısmını tamamen çözer.
- Diskte saklama korumasını tarayıcıya ve işletim sistemine devreder; bu, v1'deki secure storage'a yakın bir düzeydir.
- XSS'e karşı asıl savunma CSP'dir; httpOnly ikinci katmandır.

**Karar ve kurallar:**
- `createServerClient` publishable key ile kullanılır. `setAll` çağrısında çerez seçenekleri zorlanır: `httpOnly: true, secure: true, sameSite: 'lax', path: '/'`.
- `createBrowserClient` **kullanılmaz** (ESLint `no-restricted-imports` ile yasaklanır). Tarayıcı Supabase'e yalnızca sunucunun ürettiği kısa ömürlü imzalı URL'lerle gider; bunlar fotoğraf ve ses okumak içindir.
- `proxy.ts` (Next 16'da `middleware.ts`'in yeni adı) her istekte oturumu yeniler. Sayfa ve eylem korumasında `getSession()` değil `getClaims()` kullanılır; bu fonksiyon JWT imzasını doğrular.
- Supabase JWT ömrü 1 saat, refresh token rotasyonu açık (`config.toml`'da zaten böyle).

**Bedeller:**
1. **IP hız sınırları:** Auth isteklerini sunucu yaptığı için Supabase'in IP bazlı hız sınırları Vercel'in IP'sine uygulanır. Demoda trafik çok düşük olduğundan kabul edilir. Pilot öncesinde `guvenlik` iki seçenekten birine karar verir:
   - `Sb-Forwarded-For` başlığı. Yalnızca secret key ile çalışır; ayrı ve iptal edilebilir bir secret key ve yalnızca giriş için kullanılan bir sunucu modülü gerekir.
   - Vercel WAF kuralı veya veritabanında sayaç.
2. **Realtime kullanılmaz.** MVP'de gerek yok.
3. **Dosya yüklemeleri Next.js üzerinden geçer.** Dosyalar ≤ 3 MB; Vercel'in 4,5 MB gövde sınırının altında.

**Spike'ta doğrulanacaklar:** httpOnly çerezle OTP doğrulama, MFA (aal2) ve oturum yenileme.

### 3.8 Dil: i18n kütüphanesi gerekmiyor

Arayüz yalnızca Türkçe olduğu için next-intl ve benzeri kütüphaneler eklenmez.

- `<html lang="tr">` kullanılır. Bu, ekran okuyucunun Türkçe sesle okumasını ve CSS'in Türkçe büyük harf kuralını sağlar.
- Metinler koda gömülmez. `src/strings/*.ts` içinde tip güvenli nesneler olarak tutulur ve v1'deki `app_tr.arb`'den aktarılır. `legal` öneki korunur.
- Tasarım kuralı testleri bu dosyaları tarar:
  - ünlem işareti kullanılmaz,
  - öğrenci ve gönüllü metinlerinde sağlık sözcükleri geçmez.
- Çoğul ifadeler için küçük bir `Intl.PluralRules('tr')` yardımcısı yeterlidir.
- Tarih, sayı ve yüzde için `Intl` kullanılır; `tr-TR` yüzdeyi "%30" biçiminde yazar.
- Türkçe büyük/küçük harf için `toLocaleUpperCase('tr-TR')` kullanılır. Çıplak `toUpperCase()` ve `toLowerCase()` ESLint ile yasaklanır.
- İleride ikinci bir dil gerekirse metinler zaten tek yerde olduğu için geçiş kolaydır.

### 3.9 Barındırma

| Kriter | **Vercel Hobby** | Cloudflare Workers (OpenNext) | Netlify Free | Diğer (ör. Render Free) |
|---|---|---|---|---|
| Next.js uyumu | Birinci sınıf | `@opennextjs/cloudflare` adaptörüyle iyi; bazı farklar var | `@netlify/plugin-nextjs` ile iyi | `next start` ile tam uyum |
| Ücretsiz katman (aylık) | 1M fonksiyon çağrısı, **4 CPU-saat aktif CPU**, 360 GB-saat bellek, 100 GB hızlı aktarım, 10 GB köken aktarımı, 1M CDN isteği. Aşımda 30 gün bekleme. Çalışma zamanı logları 1 saat tutulur. | Günde 100 bin istek; **istek başına 10 ms CPU**. SSR için yetersiz kalabilir; pratikte Paid gerekir (5 USD/ay). | 300 kredi; kredi tabanlı model (yayın, aktarım ve istekler kredi harcar). "Bireysel" plan. | Hareketsizlikte uykuya geçer; uyanması 30–60 sn sürer |
| Ders projesine uygunluk | **Uygun:** Hobby yalnızca kişisel ve ticari olmayan kullanım içindir | Ticari kullanım serbest | Kısıt açıkça yazılmamış | Serbest |
| Ekip çalışması | Hobby'de özel depoda iş birliği yok: yalnızca hesap sahibinin commit'leri yayına çıkar (topluluk forumundaki raporlar) | Serbest | Tek kişilik | Değişir |
| Bölge | Tek fonksiyon bölgesi seçilebilir: **`fra1` (Frankfurt)**. Supabase'le aynı şehir. | Uç ağda çalışır; her veritabanı isteği Frankfurt'a gider | Varsayılan ABD; seçim doğrulanmalı | Frankfurt seçilebilir |
| KVKK | Vercel Inc. (ABD) yeni bir veri işleyen olur. AB-ABD DPF sertifikası KVKK için geçerli değil; standart sözleşme ve Kurum'a bildirim gerekir. | Cloudflare Inc. (ABD); aynı durum | Netlify (ABD); aynı durum | Sağlayıcıya göre |

**Karar:** Demo için **Vercel Hobby**, fonksiyon bölgesi **`fra1`**.

Gerekçe:
- En az yapılandırmayla Next.js'in tüm özellikleri çalışır.
- Supabase'le aynı şehirde olduğu için her sunucu isteği kısa yoldan gider.
- Kredi kartı gerekmez.
- Ders projesi Hobby'nin "kişisel, ticari olmayan kullanım" koşuluna uyar.

**Koşullar ve önlemler:**
- **Hesap sahibi:** Hesap ekipten bir kişide olur. Özel depoda yalnızca bu kişinin commit'leri yayına çıkar. `devops` H1'de şu seçeneklerden hangisinin çalıştığını doğrular:
  - (a) `main`'e birleştirmeyi hesap sahibi "merge commit" ile yapar,
  - (b) yayın GitHub Actions + Vercel CLI ile, sahibin belirteciyle yapılır,
  - (c) depo herkese açık yapılır.
  Önizleme yayınları zorunlu değildir; testler GitHub Actions'ta koşar.
- **Supabase entegrasyonu yok:** Vercel–Supabase pazar yeri entegrasyonu **kurulmaz**, çünkü secret anahtarları Vercel ortamına kopyalar. Ortam değişkenleri elle girilir.
- **Ek betik yok:** Vercel Web Analytics, Speed Insights ve önizleme araç çubuğu kapalı tutulur (üçüncü taraf betik ve ek veri toplama olmaz). Önizleme yayınları Vercel Authentication ile korunur.
- **Sınır hesabı:** Nonce'lu CSP her sayfayı dinamik yapar; her sayfa görüntüleme bir fonksiyon çağrısıdır.
  - Demo trafiği sınırların çok altında kalır.
  - Pilot ölçeğinde (yaklaşık 80 kullanıcı, kişi başı günde 100 görüntüleme) aktif CPU 4 saate yaklaşabilir. Faz B'den itibaren ölçülür.
- **B planı:** Cloudflare Workers Paid (5 USD/ay) + OpenNext.
- **Pilot:** Kurum adına kullanım "ticari olmayan kişisel kullanım" sayılmayabilir. Bu durumda Vercel Pro (20 USD/kişi/ay) veya Cloudflare gerekir. Karar pilot öncesinde verilir.
- **KVKK:** Türkiye'de barındırmak yurt dışı aktarımı ortadan kaldırmaz, çünkü veritabanı Frankfurt'ta. Vercel yalnızca bir veri işleyen daha ekler. Loglara kişisel veri yazılmaz.
- **Dış CDN yok:** Vercel'in CDN'i bizim barındırmamızdır. Yazı tipleri, ikonlar ve Jitsi `external_api.js` kendi alan adımızdan sunulur. Google Fonts, jsDelivr, unpkg vb. kullanılmaz; bunu test denetler.

### 3.10 Hesaplar, ortamlar ve anahtarlar

| Bileşen | Seçim | Not |
|---|---|---|
| Backend | Supabase Free, 2 proje (`dev`, `prod`) | `dev`: geliştirme ve E2E testleri (yalnızca sahte veri). `prod`: demo. Haftalık bir "canlı tutma" işi 7 günlük duraklatmayı önler. |
| Web | Vercel Hobby (`fra1`) | Önizleme ortamı `dev` Supabase'e, üretim `prod` Supabase'e bağlanır |
| Push | Web Push (VAPID anahtar çifti) | Ücretsiz; hesap gerekmez. Anahtarlar H1'de bir kez üretilir. |
| Görüntülü ders | JaaS (8x8) Developer planı | **25 MAU ücretsiz** |
| E-posta | Resend veya Brevo (özel SMTP) | OTP için şart; Supabase'in yerleşik servisi saatte 2 e-posta gönderir |
| Kod ve CI | GitHub + GitHub Actions | lint, tip denetimi, Vitest, build, Playwright, `tools/db-check` (pgTAP), Lighthouse |
| Vercel'deki değişkenler | Yalnızca gizli olmayan değerler, `NEXT_PUBLIC_` öneki **olmadan** (sunucuda çalışma anında okunur, istemci paketine girmez): `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`; ileride `VAPID_PUBLIC_KEY`, `JAAS_APP_ID` (istemciye sunucudan prop olarak verilir). `NEXT_PUBLIC_` önekli değişken derlemede reddedilir (`web/scripts/check-env.mjs`). | Vercel'de **hiçbir gizli anahtar yok** |
| Gizli anahtarlar | `sb_secret_…`, VAPID özel anahtarı, JaaS özel anahtarı ve SMTP bilgileri yalnızca **Supabase Edge Function secrets**'ta. GitHub Actions'ta yalnızca `dev` projesinin secret anahtarı bulunur (E2E öncesi test kullanıcılarını kurmak için). | Eski `anon`/`service_role` anahtarları kullanılmaz |

### 3.11 Geliştirme ortamı

- Proje `C:\dev\egitim-koprusu` altında; v1'deki OneDrive sorunu kapandı.
- Node 24 ve npm kullanılır; ek paket yöneticisi yok. `npm run dev` → `http://localhost:3000`. `supabase/config.toml`'daki `site_url` buna zaten uygun. Push ve kamera denemesi için `next dev --experimental-https` kullanılır.
- **Docker yok:**
  - Veritabanı testleri `tools/db-check` ile çalışır (PGlite + pgTAP, `npm test`).
  - Edge Function'lar Deno birim testleriyle denenir ve Docker'sız paketleme seçeneğiyle yayınlanır (`supabase functions deploy --use-api`; doğrulanmalı).
  - E2E testleri `dev` projesine karşı koşar.
  - Docker Desktop kurulabilirse yerel Supabase önerilir.
- **Git:** Önce `user.name` / `user.email` tanımlanır, `core.longpaths true` açılır, ilk commit atılır (bkz. 8.1).
- **Editör:** VS Code + ESLint ve Stylelint eklentileri.

## 4. Mimari

```
┌──────────────────────────────────────────────────────────────────────┐
│ TARAYICI (telefon / masaüstü) · PWA olarak ana ekrana eklenebilir    │
│  öğrenci · veli · gönüllü · yönetici (MFA)                           │
│  Sunucuda üretilmiş HTML + az JS · Service worker (çevrimdışı, push) │
│  Fotoğraf: <input capture> · Ses: MediaRecorder · Ders: JaaS iframe  │
└──────┬──────────────────────────────┬───────────────────┬────────────┘
       │ HTTPS + httpOnly             │ iframe            │ imzalı URL ile
       │ oturum çerezi                │ (kısa ömürlü JWT) │ foto/ses okuma
       ▼                              ▼                   │
┌──────────────────────────────┐   8x8.vc (JaaS)          │
│ NEXT.JS 16 · Vercel (fra1)   │                          │
│  proxy.ts: nonce + CSP,      │                          │
│   güvenlik başlıkları,       │                          │
│   oturum yenileme            │                          │
│  Server Components (okuma)   │                          │
│  Server Actions (yazma → RPC)│                          │
│  /api/attachments (yükleme)  │                          │
│  Yalnızca publishable key    │                          │
└──────┬───────────────────────┘                          │
       │ HTTPS: publishable key + kullanıcı JWT'si (RLS)  │
       ▼                                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ SUPABASE (Frankfurt)                                                 │
│  Auth (e-posta OTP, şifre, TOTP MFA)                                 │
│  Postgres: tablolar + RLS + RPC + tetikleyiciler + pg_cron           │
│  Storage: soru-ekleri (özel) · gonullu-belgeleri (özel)              │
│  Edge Functions: create-child-account · reset-child-password ·       │
│    delete-account · send-push · jitsi-token · cleanup                │
└───────┬───────────────────────────────┬────────────────────┬─────────┘
        │ Web Push (VAPID, şifreli yük) │ JWT (RS256) üretimi│ SMTP
        ▼                               ▼                    ▼
 Tarayıcı push servisleri         JaaS / 8x8.vc        Resend / Brevo
 (Google, Apple, Mozilla, Microsoft)
        │
        ▼
 Telefon/masaüstü bildirimi → service worker → ilgili sayfa

Dış içerik: EBA, OGM Materyal ve diğer ücretsiz kaynaklar (yalnızca bağlantı, kopyalama yok)
```

### 4.1 Temel akışlar (web)

1. **Veli öncelikli kayıt** (öğrenci kendi kendine kayıt olamaz). Adımlar `/kayit/veli` altında:
   - Aydınlatma metni ("Okudum, anladım"). E-posta alınmadan önce gösterilir.
   - Kullanım koşulları.
   - Hesap: Server Action `signUp`, `role: 'veli'`.
   - E-postaya 6 haneli OTP gelir. Alan `autocomplete="one-time-code"`, yapıştırma açık. `verifyOtp` sonrası httpOnly oturum çerezi yazılır.
   - Bu noktada bekleyen onaylar `consents` tablosuna yazılır (`channel = 'web'`).
   - "Çocuk ekle":
     - rumuz ve sınıf girilir,
     - **ayrı ekranda** AR-1 açık rızası alınır,
     - kullanıcı adı ve şifre belirlenir.
   - Server Action, veli JWT'siyle `create-child-account`'u çağırır. Fonksiyon sentetik e-postalı bir öğrenci hesabı açar.
   - Çocuk `/giris/ogrenci`'den kullanıcı adı ve şifreyle girer. Sunucu, kullanıcı adını sentetik e-postaya çevirir.
2. **Gönüllü başvurusu** (`/basvuru/1` … `/basvuru/10`). Her adımın ayrı bir adresi var; yarım kalan başvuru sürdürülür ve tarayıcının geri tuşu doğal çalışır.
   - `.edu.tr` e-posta + OTP,
   - profil, ders, sınıf ve uygunluk bilgileri,
   - belge yükleme: PDF olduğu gibi; görüntüler tarayıcıda JPEG'e çevrilir; `/api/attachments` ile yüklenir,
   - eğitim modülleri ve quiz (puanlama sunucuda),
   - taahhütname,
   - yönetici onayı. Belge karardan sonra en geç 30 gün içinde silinir.
3. **Soru-cevap:**
   - Öğrenci "Kamerayla çek" veya "Galeriden seç" der.
   - Fotoğraf tarayıcıda küçültülür ve yeniden kodlanır; bu sırada EXIF ve konum bilgisi silinir.
   - İstemci `question_id` üretir. Dosya `/api/attachments` ile yüklenir; yükleme ilerlemesi gösterilir ve iptal edilebilir.
   - `ask_question` çalışır ve soru eşleşmiş gönüllüye ya da havuza gider.
   - `notifications` tablosuna kayıt düşer. Database Webhook `send-push`'u çağırır ve Web Push gönderilir.
   - Gönüllü metin, foto veya ses + yazılı özetle cevap verir. Mesaj filtre tetikleyicisinden geçer.
   - Öğrenciye push gider; veli cevabı uygulama içinde görür.
   - 24 saat içinde cevaplanmayan soru pg_cron ile havuza aktarılır.
4. **Canlı ders:**
   - Yönetici gönüllü önerir, veli onaylar.
   - Öğrenci veya veli boş bir saati seçer. `book_session` çakışmayı ve saat kuralını (08:00–21:00) kontrol eder.
   - pg_cron hatırlatmaları gönderir.
   - "Derse katıl" (dersten 10 dk önce açılır):
     - kendi hazırlık ekranımız gösterilir,
     - Server Action `jitsi-token` ile JWT alınır,
     - JaaS iframe'i açılır,
     - katılma ve ayrılma olayları `log_session_event` ile kaydedilir.
   - Veli derse istediği an katılabilir.
5. **Telafi planı:**
   - Sihirbaz (`/ogrenci/plan/yeni`) 3 adımdır; tarih aralığı React Aria `DateRangePicker` ile seçilir.
   - `create_recovery_plan` planı oluşturur.
   - "Bugün" ekranı tarihe bağlı değildir; sıradaki N konuyu gösterir.
   - Bugün, plan ve açılan konu özetleri service worker tarafından önbelleğe alınır.
6. **Yönetici MFA (TOTP) akışı:**
   1. `/giris` sayfasında e-posta + şifre girilir (Server Action `signInWithPassword`). Oturum `aal1` olur.
   2. Sunucu `getClaims()` ile `aal` bilgisini, `profiles` tablosundan rolü okur. Rol `yonetici` ise `mfa.listFactors()` çağrılır:
      - **Doğrulanmış TOTP yoksa** `/yonetici/mfa/kurulum` açılır. Akış:
        - `mfa.enroll({ factorType: 'totp' })` çağrılır.
        - QR kodu (`<img alt>`, SVG veri adresi) ve gizli anahtar metni gösterilir. Anahtar 4'lü gruplar hâlinde, kopyala düğmesiyle ve ekran okuyucunun karakter karakter okuyabileceği biçimde verilir.
        - Kullanıcı 6 haneli kodu girer.
        - `mfa.challenge` + `mfa.verify` çağrılır ve oturum `aal2` olur.
      - **Faktör varsa** `/yonetici/mfa` sayfasında kod girilir (`inputmode="numeric"`, `autocomplete="one-time-code"`). Doğrulamadan sonra oturum `aal2` olur.
   3. `/yonetici/*` düzeni (layout) `aal2` değilse kullanıcıyı `/yonetici/mfa`ya yönlendirir. **Asıl koruma veritabanındadır:** `is_admin()` aal2 ister. Sayfa koruması yalnızca kullanıcı deneyimi içindir.
   4. Yedek: ikinci bir TOTP cihazı kaydı önerilir. Tüm cihazlar kaybolursa geliştirici faktörü SQL ile siler; işlem denetim kaydına yazılır.
   5. Yönetici sayfaları `no-store` ile sunulur ve service worker tarafından hiç önbelleğe alınmaz. Hata metni: "Kod eşleşmedi."
7. **Bildirim izni:**
   - İzin yalnızca kullanıcı düğmeye bastığında istenir: Ayarlar'da veya ilk sorudan sonra çıkan "Cevap gelince haber verelim mi?" bandında.
   - iOS'ta uygulama ana ekrana eklenmemişse izin düğmesi yerine kurulum yönergesi gösterilir. Ayrıntı 4.3.2'de.
8. **Herkese açık hesap silme** (`/hesap-silme`):
   - Sayfa önce açıklamayı gösterir: ne silinir, 30 gün süresi, hangi güvenlik kayıtları kalır.
   - Oturum yoksa: e-posta girilir, OTP gönderilir (`signInWithOtp`, `shouldCreateUser: false`). Mesaj her durumda "Bu adres kayıtlıysa kod gönderildi" olur; böylece hangi e-postanın kayıtlı olduğu sızmaz.
   - Doğrulamadan sonra sonuç listesi gösterilir. Düğmeler: "Vazgeç" (birincil) ve "Hesabı sil".
   - `delete-account` çalışır, oturum kapatılır ve önbellek temizlenir.
   - Çocuk hesabı veli hesabıyla silinir. Öğrencinin e-postası olmadığı için bu sayfada ona "velinden iste" bilgisi gösterilir.
9. **Çıkış ve ortak cihaz:**
   - "Çıkış yap" her rolün Ayarlar sayfasında ve üst çubukta görünür.
   - Çıkış sırasında: push aboneliği sunucudan silinir, service worker önbellekleri istemcide silinir, yanıt `Clear-Site-Data: "cache"` başlığını taşır.
   - Hassas veli işlemlerinde şifre veya OTP yeniden istenir: çocuğun şifresini sıfırlama, rızayı geri alma, hesap silme.

### 4.2 Tasarım ilkeleri

- **İş kuralları sunucudadır** (RLS + Postgres fonksiyonları): yetki, filtre, plan üretimi, randevu çakışması, puanlama. Next.js sunucu katmanı yalnızca ince bir aracıdır; iş kuralı yazmaz. İstemcideki doğrulama yalnızca kullanıcı deneyimi içindir.
- **Ayrı bir API sunucusu yoktur:** PostgREST + RPC + 6 Edge Function ve bunların önünde Next.js sunucu katmanı.
- **Tarayıcı Supabase'e doğrudan gitmez.** Tek istisna, sunucunun ürettiği kısa ömürlü imzalı dosya URL'leridir.
- **Üçüncü taraf betik yoktur.** Tek dış köken, ders sayfasındaki `8x8.vc` iframe'idir.

### 4.3 Web'e özgü konular

#### 4.3.1 PWA: kurulabilirlik, service worker, çevrimdışı okuma

- **Manifest** (`app/manifest.ts`):
  - `name: "Eğitim Köprüsü"`, `short_name: "Köprü"`, `lang: "tr"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`,
  - açık tema yüzey rengi,
  - 192 px, 512 px ve maskable ikonlar (BrandMark'tan üretilir), `apple-touch-icon`.
- **Kurulum isteğe bağlıdır.** Uygulama tarayıcıda da eksiksiz çalışır. Kurulum yalnızca kısayol, tam ekran ve iOS'ta push için gereklidir.
- **Kurulum yönergesi:**
  - Android'de (Chrome / Samsung Internet) `beforeinstallprompt` yakalanırsa Ayarlar'da "Telefona ekle" düğmesi gösterilir; yakalanmazsa menü yönergesi gösterilir.
  - iOS'ta yazılı adımlar verilir: Paylaş → Ana Ekrana Ekle. iOS 26'da "Web uygulaması olarak aç" seçeneği varsayılan olarak açıktır.
  - Kendiliğinden açılan pencere yoktur. Bant kullanıcı kapatana kadar durur (zaman aşımı yok ilkesi).
- **Service worker** (Serwist, `@serwist/turbopack`):
  - **Önceden önbelleğe alınanlar:** uygulama kabuğu (JS, CSS, yazı tipi, ikon) ve `/cevrimdisi` sayfası.
  - **Çalışma anında önbelleğe alınanlar** (yalnızca öğrenci rotaları): `/ogrenci/bugun`, `/ogrenci/plan`, `/ogrenci/konu/*`, `/ogrenci/kutuphane/*/konu/*`.
    - Strateji ağ öncelikli: 3 sn içinde yanıt gelmezse önbellek kullanılır.
    - RSC istekleri dahildir.
    - En çok yaklaşık 30 sayfa, en çok 14 gün tutulur.
    - Bugün açıldığında, günlük hedef kadar sıradaki konu sayfası arka planda önbelleğe alınır.
  - **Hiç önbelleğe alınmayanlar:** veli, gönüllü ve yönetici sayfaları; sorular, mesajlar, fotoğraflar ve ses; Server Action ve `/api/*` istekleri.
  - **Çevrimdışı gezinme:** Önbellekte varsa o sayfa açılır, yoksa `/cevrimdisi` ("İnternet yok. Kayıtlı planın ve özetlerin açık."). `/` adresi çevrimdışıyken önbellekteki Bugün'e düşer. İstemci yönlendirmesi başarısız olursa tam sayfa yüklemeye düşülür; Faz B'de Playwright ile doğrulanır.
  - **Yazma işlemleri kuyruğa alınmaz (MVP).** Çevrimdışıyken düğmeler pasiftir ve nedeni yazılıdır (`navigator.onLine` + `online`/`offline` olayları).
  - **Güncelleme:** Yeni service worker bekletilir. Ekranda "Yeni sürüm hazır. Yenile" bandı çıkar; sayfa kendiliğinden yenilenmez.
  - **Çıkışta temizlik:** önbellekler silinir (bkz. 4.1/9). Önbellekler kullanıcıya bağlı değildir; bu yüzden "yalnızca öğrenci rotaları" ve "çıkışta temizlik" kuralları zorunludur.
  - `sw.js` `Cache-Control: no-cache` ile sunulur. Acil durum için service worker'ı kaldıran bir "kapatma" sürümü hazır tutulur.

#### 4.3.2 Web Push

- **Abonelik:**
  - Kullanıcı düğmeye basar, `Notification.requestPermission()` çalışır.
  - Ardından `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })` çağrılır.
  - Server Action → `register_push_subscription(endpoint, p256dh, auth)`. Aynı tarayıcıda hesap değişince abonelik yeni kullanıcıya geçer.
  - Abonelik her açılışta tazelenir (`updated_at`).
- **Gönderim** (`send-push` Edge Function):
  - `notifications` INSERT → Database Webhook → kullanıcının abonelikleri servis rolüyle okunur.
  - Yük RFC 8291'e göre şifrelenir; Web Crypto tabanlı bir Deno kütüphanesi kullanılır.
  - VAPID JWT'de `sub: mailto:<ekip e-postası>` bulunur.
  - Başlıklar:
    - `TTL`: 15 dakikalık ders hatırlatması için 900 sn, diğerleri için 24 saat,
    - `Urgency`: ders hatırlatmasında `high`,
    - `Topic`: aynı türden eski bildirimi değiştirmek için.
  - 404/410 yanıtında abonelik silinir. Diğer hatalarda yeniden deneme yapılmaz; asıl kayıt uygulama içi bildirim listesidir.
- **Yük ve metin:**
  - Yük: `{ title: "Eğitim Köprüsü", body: <genel metin>, url: <göreli yol> }`.
  - Yük uçtan uca şifrelidir ama kilit ekranında görünür. Bu yüzden metinler `ekran-akislari.md` §8'deki genel metinlerdir; rumuz, konu ve içerik geçmez.
  - Web'de Android'deki "özel bildirim görünürlüğü" ayarı olmadığı için bu kural daha da önemlidir.
- **Tıklama:**
  - `notificationclick` olayında yalnızca aynı kökenli bir göreli yol açılır; açık yönlendirmeye izin verilmez.
  - Oturum yoksa önce giriş sayfası, sonra hedef sayfa açılır.
- **SSRF koruması:** `send-push` yalnızca izinli push servislerine istek atar: `https://` + `fcm.googleapis.com`, `*.push.apple.com`, `updates.push.services.mozilla.com`, `*.notify.windows.com`. Aynı kural veritabanında CHECK kısıtı olarak da bulunur (5.5).
- **iOS:**
  - Push yalnızca ana ekrana eklenmiş web uygulamasında çalışır (iOS/iPadOS 16.4+); izin kullanıcı hareketiyle istenir.
  - Service worker'ımız olduğu için iOS 18.4'teki Declarative Web Push gerekmez.
- **Yedek:** Push hiç çalışmasa da hizmet eksiksiz kalır:
  - uygulama içi bildirim listesi (O3),
  - gezinmede okunmamış sayısı,
  - Bugün ekranındaki "Yeni cevaplar" kartı.
- **Anahtarlar:** VAPID özel anahtarı yalnızca Supabase secrets'ta tutulur. Anahtar değişirse tüm abonelikler geçersiz olur.

#### 4.3.3 Kamerayla soru fotoğrafı

- İki düğme:
  - "Kamerayla çek": `<input type="file" accept="image/*" capture="environment">`,
  - "Galeriden seç": `capture` yok.
- Telefonun kendi kamera uygulaması açılır. Sayfada `getUserMedia` ve kamera izni gerekmez; bu düşük donanımda daha güvenilirdir. Masaüstünde dosya seçici açılır.
- **Tarayıcıda işleme** (yüklemeden önce):
  - Yönlendirme düzeltilir: `createImageBitmap(dosya, { imageOrientation: 'from-image' })`.
  - Uzun kenar en çok 1280 px olur (hafif modda 1024 px).
  - JPEG kalitesi yaklaşık 0,7'dir. Hedef ≤ 300 KB, sınır 2 MB.
  - Canvas'tan yeniden kodlama EXIF ve GPS dahil tüm üst verileri atar.
  - Büyük fotoğraflarda bellek taşmasına karşı küçültme kademeli yapılır.
  - iPhone'un HEIC biçimi Safari'de çözülür. Başka bir tarayıcı çözemezse şu mesaj gösterilir: "Bu fotoğraf açılamadı. Kamerayla tekrar çekebilirsin."
- **Kırpma:** düğmelerle (jestsiz) yapılan basit kırpma; varsayılan "Tümünü seç".
- **Yükleme:** `POST /api/attachments` XHR ile yapılır; ilerleme yüzdesi görünür ve iptal edilebilir.
  - Route Handler şunları doğrular: oturum, `Origin`, yol (`{student_id}/{question_id}/{uuid}.jpg`), MIME türü ve boyut.
  - Dosyayı kullanıcının JWT'siyle Storage'a yükler. Storage RLS ve kota politikaları test edildikleri biçimde aynen çalışır.
- **Test:** GPS içeren EXIF'li bir örnek fotoğraf yüklenir. Storage'daki dosyada üst veri kalmadığı E2E testte doğrulanır.

#### 4.3.4 Ses kaydı (MediaRecorder)

- İzin yalnızca "Kaydet"e basınca istenir; öncesinde açıklama gösterilir.
- **Biçim seçimi** (`MediaRecorder.isTypeSupported` ile sırayla denenir):
  1. `audio/mp4;codecs=mp4a.40.2` — Safari, AAC,
  2. `audio/mp4` — Chrome 126+, Opus/MP4,
  3. `audio/webm;codecs=opus` — Chrome, Edge, Firefox.
- `audioBitsPerSecond: 32000` kullanılır; 120 saniyelik kayıt yaklaşık 0,5 MB tutar.
- **Yükleme:**
  - MIME **parametresiz** gönderilir: `audio/mp4` → `.m4a`, `audio/webm` → `.webm`. Mevcut bucket ve `attachments` kuralları bu ikisini zaten kabul ediyor.
  - Kayıt 120 sn'de kendiliğinden durur.
  - Süre istemcide ölçülür ve `duration_sec` alanına yazılır. Chrome'un WebM dosyalarında süre bilgisi eksik olduğu için oynatıcı süreyi veritabanından gösterir.
- **Oynatma:**
  - `<audio preload="none">` ile kendi erişilebilir oynat/duraklat düğmemiz ve süre yazısı kullanılır.
  - Hafif modda ses yalnızca "Sesi indir" ile iner.
  - Ses çalınamazsa: "Bu ses bu cihazda açılamadı. Yazılı özeti aşağıda." Yazılı özet zorunlu olduğu için bilgi kaybı olmaz.
- **Risk:** Chrome'da kaydedilen Opus eski iOS sürümlerinde çalmayabilir. Spike'ta iki yönlü denenir: Chrome'dan iPhone'a ve iPhone'dan Android'e.

#### 4.3.5 Görüntülü ders (JaaS IFrame API)

- Sayfa (`/{rol}/ders/[id]`) önce kendi hazırlık ekranımızı gösterir:
  - mikrofon anahtarı,
  - **kamera öğrencide ve velide kapalı başlar** ("Kameranı açmak zorunda değilsin."),
  - "Dersler kaydedilmez." bilgisi,
  - "Yalnızca sesle katıl" seçeneği.
- "Derse katıl" → Server Action → `jitsi-token` Edge Function. Fonksiyon katılımcıyı ve zaman penceresini kontrol eder, `{ jwt, roomName: "<AppID>/<oda-uuid>", displayName }` döndürür.
- `new JitsiMeetExternalAPI('8x8.vc', { roomName, jwt, parentNode, configOverwrite, interfaceConfigOverwrite })` çağrılır.
  - `external_api.js` sabit bir sürüm olarak depoya alınır ve kendi paketimizle sunulur; dış betik yoktur.
  - Görüşmenin kendisi `https://8x8.vc` iframe'inde çalışır (CSP `frame-src https://8x8.vc`).
- **Yapılandırma önerisi** (seçenek adları JaaS belgesinden spike'ta doğrulanır):
  - `prejoinConfig.enabled: false` (kendi hazırlık ekranımız var),
  - `startWithVideoMuted: true` (öğrenci ve veli),
  - `disableDeepLinking: true` (mobil tarayıcıda "uygulamayı indir" sayfası çıkmasın),
  - araç çubuğunda yalnızca mikrofon, kamera ve ayrıl düğmeleri; gönüllüde ek olarak ekran paylaşımı,
  - sohbet, davet, kayıt, canlı yayın ve arka plan düğmeleri yok,
  - hafif modda `startAudioOnly: true` ve düşük çözünürlük.
- **Zorlama katmanları.** İstemci ayarlarını kullanıcı değiştirebileceği için bunlar tek başına yeterli sayılmaz:
  1. **JWT:**
     - `moderator` yalnızca gönüllüde açıktır.
     - `features` alanında `recording`, `livestreaming`, `transcription`, `outbound-call`, `inbound-call`, `sip-outbound-call`, `sip-inbound-call`, `file-upload` ve `send-groupchat` = false. `send-groupchat` için gelişmiş markalama gerekebilir; doğrulanmalı.
     - Ömür: ders başlangıcından 10 dk önce → ders bitişinden 15 dk sonra.
  2. **Sayfa `Permissions-Policy` başlığı:** Öğrenci ve veli ders sayfalarında `display-capture=()`. Böylece tarayıcı ekran paylaşımına hiç izin vermez; JWT'de ekran paylaşımını kapatan bir özellik yoktur. Rol, adres önekinden belli olduğu için (`/ogrenci/…`, `/gonullu/…`) bu kural `proxy.ts`'te kolayca uygulanır.
  3. Oda adı UUID'dir; lobi açıktır. Katılma ve ayrılma olayları (`videoConferenceJoined` / `videoConferenceLeft`) `log_session_event` ile kaydedilir.
- **Telefonda:** dikey düzen kullanılır. Büyük "Dersten çık" ve "Bildir" düğmeleri iframe'in dışında, bizim arayüzümüzdedir.
- iOS ana ekran uygulamasında kamera ve mikrofon davranışı spike'ta denenir. Sorun olursa ders o cihazda Safari sekmesinde açılır.

#### 4.3.6 Hafif mod

- Ayarlar'dan açılır. Tarayıcının veri tasarrufu ayarı (`navigator.connection.saveData`) açıksa ilk girişte önerilir; kendiliğinden açılmaz. Tercih cihazda (localStorage) tutulur.
- **Etkileri:**
  - fotoğraflar dokununca yüklenir ("Fotoğrafı göster, yaklaşık 250 KB"),
  - ses hiçbir zaman önden inmez,
  - animasyonlar kapalıdır,
  - yüklemeden önce fotoğraf 1024 px'e küçültülür,
  - Jitsi yalnızca ses ve düşük çözünürlükle başlar,
  - bağlantı ön yüklemesi (`<Link prefetch>`) kapalıdır,
  - önce önbellekteki içerik gösterilir.
- Sunucu bu tercihi bilmez. Bu yüzden sunucu HTML'i görselleri varsayılan olarak "dokununca yükle" yer tutucusuyla üretir; hafif mod kapalıysa istemci görselleri kendisi yükler. Zayıf ağda doğru varsayılan budur.

## 5. Veri modeli

Doğruluk kaynağı `supabase/migrations/` ve `docs/veri-modeli.md`'dir. Bu bölüm özettir.

### 5.1 Tablolar (37 tablo, hepsinde RLS açık, varsayılan davranış ret)

| Grup | Tablolar |
|---|---|
| Kimlik ve roller | `profiles`, `students`, `guardian_students`, `student_features` |
| Rıza ve hukuk | `legal_documents` (anon yalnızca okur), `consent_types`, `consents` |
| Gönüllü | `volunteers`, `volunteer_documents`, `volunteer_subjects`, `training_questions`, `training_answer_keys`, `training_attempts` |
| Müfredat | `subjects`, `academic_years`, `academic_weeks`, `curriculum_versions`, `grade_programs`, `units`, `topics`, `weekly_topics`, `resources` |
| Telafi planı | `recovery_plans`, `plan_items` |
| Soru-cevap | `questions`, `question_messages` (değiştirilemez), `attachments`, `moderation_flags` |
| Eşleşme ve ders | `matches`, `sessions`, `session_events`, `availability_slots`, `volunteer_blocks` |
| Sistem | `reports`, `notifications`, `device_tokens` (→ Web Push aboneliğine dönüşecek, bkz. 5.5), `audit_log` |

Görünümler (sınırlı alan açar): `matched_students`, `matched_student_plan_items`, `matched_volunteers_for_student`, `matched_volunteers_for_guardian`.

### 5.2 İlişkiler (özet)

```
auth.users 1─1 profiles ─┬─ 1─1 students ──(guardian_students N─N, en çok 2 veli)── profiles[veli]
                         │        ├─ 1─1 student_features
                         │        ├─ 1─N recovery_plans 1─N plan_items N─1 topics
                         │        ├─ 1─N questions 1─N question_messages 1─N attachments
                         │        └─ 1─N volunteer_blocks N─1 volunteers
                         ├─ 1─1 volunteers ─┬─ volunteer_subjects · volunteer_documents · training_attempts
                         │                  └─ matches (ders başına 1 açık eşleşme) 1─N sessions 1─N session_events
                         └─ consents N─1 consent_types ; consents N─1 legal_documents
                            availability_slots · notifications · push abonelikleri · reports · audit_log
Müfredat: academic_years 1─N academic_weeks ; grade_programs → curriculum_versions 1─N units 1─N topics 1─N resources
          weekly_topics (yıl · sınıf · ders · hafta) N─1 topics
```

### 5.3 Erişim kuralları (özet)

Tam matris `docs/veri-modeli.md` §5'tedir.

- **Yardımcı fonksiyonlar** `private` şemasındadır: `is_admin()` (rol `yonetici` + oturum `aal2` + hesap aktif), `is_guardian_of()`, `is_matched_volunteer()`, `can_access_question()`. Hepsi `SECURITY DEFINER`, `STABLE`, `set search_path = ''`.
- **Gönüllü** çocuğun yalnızca rumuzunu, sınıfını ve plan konu listesini görür. Devamsızlık tarihlerini, kullanıcı adını ve tercihleri görmez.
- **Mesajlar** değiştirilemez; yalnızca yönetici gizleyebilir.
- **Askıdaki hesap** yalnızca kendi profilini görebilir.
- **İstemci kalıcı silme yapamaz.** İstisnalar: kendi uygunluk saatleri, kendi push abonelikleri ve başvuru aşamasındaki ders seçimleri. Hesap silme yalnızca `delete-account` ile yapılır.

### 5.4 Storage

| Bucket | Yol | Sınır | Erişim |
|---|---|---|---|
| `soru-ekleri` (özel) | `{student_id}/{question_id}/{uuid}.jpg│m4a│aac│webm` | Bucket sınırı 3 MB. Fotoğraf yalnızca JPEG ve ≤ 2 MB (istemci yaklaşık 300 KB'a sıkıştırır). Ses ≤ 120 sn. MIME: `image/jpeg`, `audio/mp4`, `audio/x-m4a`, `audio/aac`, `audio/webm`. Kota: yükleyen başına 24 saatte 30 nesne. | Soruyu görebilen herkes; imzalı URL ≤ 10 dk. İstemci dosya değiştiremez, silemez. |
| `gonullu-belgeleri` (özel) | `{volunteer_id}/{uuid}.pdf│jpg` | ≤ 5 MB; `application/pdf`, `image/jpeg`; en çok 5 belge | Gönüllü yalnızca yükler, yönetici (aal2) okur. Karardan sonra en geç 30 gün içinde silinir. |

### 5.5 Web'e geçiş nedeniyle gereken şema değişiklikleri

`veritabani` bu değişiklikleri mevcut güvenlik düzeltmeleri bittikten sonra yeni bir migration'la yapar; şimdi şemaya dokunulmaz.

| # | Değişiklik | Gerekçe | Etkilenen testler |
|---|---|---|---|
| Ş1 | **Web Push aboneliği.** Önerilen: yeni `push_subscriptions` tablosu açılır, `device_tokens` kaldırılır. Alanlar: `id`, `user_id` (FK, cascade), `endpoint` (unique, `https://` ile başlar, ≤ 2048 karakter, izinli push servisi alan adı CHECK'i), `p256dh` ve `auth` (base64url), `created_at`, `updated_at` (SK-17: 60 gün). Kullanıcı aracısı bilgisi saklanmaz. RLS: kendi satırını okur ve siler. Ekleme ve güncelleme `register_push_subscription(endpoint, p256dh, auth)` RPC'si ile yapılır (aynı endpoint çağıran kullanıcıya geçer). Önceki taslaktaki `register_device_token` bunun yerine geçer. **Alternatif:** `device_tokens`'a `p256dh` ve `auth` eklenir ve `token` alanı endpoint olarak kullanılır. | FCM jetonu yerine tarayıcı aboneliği gelir. Endpoint kısıtı `send-push`'u SSRF'e karşı korur. | `001_sema_korumalari`, `040_rls_eslesme_ders` (bildirim bölümü), yeni: endpoint CHECK testleri ve abonelik devri |
| Ş2 | **Ses MIME türleri: büyük olasılıkla değişiklik gerekmez.** Safari `audio/mp4` (`.m4a`), Chrome ve Firefox `audio/webm` (`.webm`) üretir; ikisi de izinli. İstemci MIME'ı parametresiz gönderir (`;codecs=` olmadan). Firefox'un `audio/ogg` üretmesi gerekirse dört yer birlikte değişir: bucket listesi, `attachments` CHECK'i, yol regex'i, storage yol fonksiyonu. Bu yalnızca spike gösterirse yapılır. Fotoğraf yalnızca JPEG olarak kalır; istemci dönüştürür. | Safari ve Chrome'un farklı kayıt biçimleri | Gerekirse `060_storage` |
| Ş3 | **`students.prefs` kullanılmaz.** Görünüm tercihleri tarayıcıda (localStorage) tutulur; sunucuya gitmez. Bu, hukukun dolaylı sağlık verisi önerisiyle de uyumludur. Sütunun kaldırılması Aşama 2'ye ertelenir. | Veri minimizasyonu | Kaldırılırsa `020_rls_kimlik` |
| Ş4 | **(Koşullu) Giriş hız sınırı.** Supabase Auth IP sınırları Vercel'in IP'sine uygulandığı için `private.auth_attempts` tablosu + RPC (kullanıcı adı veya e-posta özeti başına sayaç) eklenebilir. `guvenlik` pilot öncesinde bu seçenekle Vercel WAF ve `Sb-Forwarded-For` arasında karar verir. | Sunucu tarafında yapılan girişler | Yeni |
| – | **Değişiklik gerekmeyenler:** `consents.channel` (`'web'` değeri zaten izinli; `app_version` = web derleme sürümü, yani git kısa SHA'sı); çerez politikası için `legal_documents`'a yeni bir `doc_type` eklenir (veri INSERT'i, şema değişikliği değil; rıza türü de değil); `session_events`, `notifications`, Storage yolları. | | |
| – | **Web'den bağımsız açık nokta:** Bildirim tercihleri (O4'teki tür bazında aç/kapa) için şemada henüz yer yok. `veritabani` Faz C'de değerlendirir. | | |

`supabase/config.toml` ve hosted proje ayarları (`site_url`, `additional_redirect_urls`) Vercel adresine göre güncellenir. Bu `devops` ile birlikte yapılır; şema değişikliği değildir.

## 6. API taslağı

Ayrıntılı sözleşmeyi `backend` ajanı `docs/api.md` dosyasında tutar. Next.js sunucu katmanı da bu dosyada belgelenir ve `tasarimci` arayüzü buna göre yazar.

### 6.1 Doğrudan tablo erişimi (PostgREST + RLS, yalnızca Next.js sunucusundan)

- **Okuma:** profil, müfredat ve kaynaklar, plan ve plan maddeleri, sorular ve mesajlar, eşleşmeler, dersler, bildirimler, yasal metinler (anon).
- **Ekleme ve güncelleme:** `availability_slots`, `reports` (ekleme), `notifications.read_at`, `consents` (ekleme; geri çekme alanı), `student_features` (veli).

### 6.2 RPC (Postgres fonksiyonları: iş kuralları ve transaction)

| Fonksiyon | Çağıran | Görev |
|---|---|---|
| `create_recovery_plan(grade, subject_codes[], absence_start, absence_end, daily_goal)` | öğrenci, veli | Hafta kesişimi → `weekly_topics` → tekrarsız konular → `plan_items`. Tatil haftaları atlanır; seed'i olmayan hafta için "konu bilgisi yok" döner. |
| `get_today_tasks(plan_id)` | öğrenci, veli | Sıradaki `daily_goal` kadar madde. Kısa ve tam mod kaynakları tek çağrıda döner; bu sayede mod değişince istemci beklemeden geçiş yapar. |
| `complete_plan_item(item_id, mode)` | öğrenci | |
| `ask_question(question_id, subject_id, topic_id?, body, attachment_paths[])` | öğrenci | `question_id` istemcide üretilir, çünkü dosya sorudan önce yüklenir. Günlük üst sınır var. `qa_enabled` ve engelleme kontrolü yapılır. |
| `post_message(question_id, body, attachment_paths[])` | taraflar | Filtre tetikleyicisi çalışır; sesli ek için `voice_enabled` kontrol edilir |
| `claim_question(question_id)` / `close_question(question_id)` | onaylı gönüllü / öğrenci | |
| `submit_training(answers jsonb)` | gönüllü | Puanlama sunucuda, eşik %80 |
| `review_volunteer(volunteer_id, decision, reason?)` | yönetici (aal2) | |
| `suggest_volunteers(student_id, subject_id)` | yönetici | |
| `propose_match` / `decide_match(match_id, approve)` / `end_match` | yönetici / veli / yönetici | `end_match` açık sorulardaki atamayı boşaltır |
| `block_volunteer(match_id, reason_code?)` | öğrenci, veli | Eşleşme biter, gönüllü bir daha atanmaz, yönetici bilgilendirilir |
| `list_open_slots(match_id, from, to)` | öğrenci, veli | |
| `book_session(match_id, starts_at, duration_min)` / `cancel_session(id, reason)` | öğrenci, veli / taraflar | Çakışma kontrolü, 08:00–21:00 kuralı |
| `log_session_event(session_id, event)` | taraflar | |
| `handle_report(report_id, action, note)` / `set_user_status(user_id, status)` | yönetici (aal2) | |
| **`register_push_subscription(endpoint, p256dh, auth)`** (yeni) | herkes | Önceki taslaktaki `register_device_token`'ın yerini alır |
| `touch_last_seen()` | sistem (girişte) | `profiles.last_seen_at` |

Hata önekleri `OZELLIK_KAPALI:` ve `ENGELLI:` (SQLSTATE 42501). Bunları `src/server/errors.ts` nötr bir dille Türkçe mesaja çevirir.

### 6.3 Edge Functions (Deno, secret key ile çalışır)

| Fonksiyon | Tetikleyen | Görev | v2'de değişen |
|---|---|---|---|
| `create-child-account` | veli (Server Action, veli JWT'si) | Geçerli AR-1 yoksa reddeder. Öğrenci auth kullanıcısını, `students` ve `guardian_students` kayıtlarını oluşturur. Hız sınırı uygular. | – |
| `reset-child-password` | veli | | Arayüzde önce yeniden doğrulama |
| `delete-account` | kullanıcı; veli çocuğu için; herkese açık silme sayfası (OTP oturumu) | Dosyaları ve kişisel alanları siler, güvenlik kayıtlarını anonim tutar, auth kullanıcısını siler | Push abonelikleri de silinir |
| `send-push` | Database Webhook (`notifications` INSERT) | **Web Push** (VAPID, RFC 8291). Genel metin, 404/410 temizliği, izinli alan adları. | FCM HTTP v1 yerine Web Push |
| `jitsi-token` | ders katılımcısı | Katılımcıyı ve zaman penceresini kontrol eder; JaaS JWT'si üretir (RS256, kısa ömürlü, özellikler 4.3.5'teki gibi) | `features` listesi genişledi |
| `cleanup` | pg_cron (günlük) | İncelenmiş gönüllü belgeleri, süresi dolan dosyalar, yetim yüklemeler; **60 gün kullanılmayan push abonelikleri** | Push temizliği eklendi |

**Tetikleyiciler ve zamanlanmış işler:** Değişmedi.
- `handle_new_user`: rol kuralları, `.edu.tr` kontrolü.
- `mask_contact_info`: tüm serbest metinlerde.
- Bildirim ve denetim tetikleyicileri.
- pg_cron:
  - 15 dakikada bir: ders hatırlatmaları,
  - saatte bir: cevaplanmayan soruyu havuza aktarma,
  - günde bir: `cleanup` ve "gelinmedi" işaretleme,
  - 2 yılı dolan `audit_log` satırlarını `postgres` sahibi bir işle silme.

### 6.4 Next.js sunucu katmanı (yeni)

| Katman | Dosya | Görev | Kural |
|---|---|---|---|
| Proxy | `src/proxy.ts` | Her istekte nonce + CSP ve güvenlik başlıkları; rota bazlı `Permissions-Policy`; Supabase oturum yenileme; oturumsuz kullanıcıyı korumalı rotadan `/giris`e yönlendirme | Yetki kararı vermez. Herkese açık yollar: `/`, `/giris*`, `/kayit/*`, `/basvuru/1–3`, `/dogrula`, `/gizlilik`, `/cerezler`, `/kullanim-kosullari`, `/aydinlatma/*`, `/hesap-silme`, `/lisanslar`, `/cevrimdisi` |
| Supabase istemcisi | `src/server/supabase.ts` | `createServerClient` (publishable key, httpOnly çerez) | `import 'server-only'` |
| Oturum | `src/server/session.ts` | `requireUser()`, `requireRole(rol)`, `requireAdmin()` (aal2): `getClaims()` + istek başına önbelleklenen profil | Her rol düzeninde (layout) ve her eylemde çağrılır |
| Okuma | `src/server/data/*.ts` | Özellik başına okuma fonksiyonları (`getTodayTasks`, `getPlan`, `getTopic`, `listQuestions`, `getQuestion` + imzalı ek URL'leri, `listNotifications`…) | Yalnızca gereken sütunlar seçilir; tipler üretilmiş tiplerden gelir |
| Yazma | `src/server/actions/*.ts` | `'use server'` eylemleri, hepsi `defineAction` ile. Başlıcaları: `signIn`, `signInStudent`, `signUp`, `verifyOtp`, `signOut`, `mfaEnroll`, `mfaVerify`, `recordConsent`, `withdrawConsent`, `createChild`, `resetChildPassword`, `setStudentFeatures`, `createPlan`, `completeItem`, `askQuestion`, `postMessage`, `claimQuestion`, `closeQuestion`, `submitTraining`, `reviewVolunteer`, `proposeMatch`, `decideMatch`, `endMatch`, `blockVolunteer`, `saveAvailability`, `bookSession`, `cancelSession`, `getJitsiToken`, `logSessionEvent`, `saveSessionNote`, `subscribePush`, `unsubscribePush`, `markNotificationsRead`, `submitReport`, `handleReport`, `setUserStatus`, `requestDeletion` (öğrenci), `deleteAccount` | **Server Action herkese açık bir uç noktadır;** yetki her eylemin içinde kontrol edilir. Girdi Zod ile doğrulanır. Ham hata istemciye gönderilmez. |
| Route Handler | `src/app/api/attachments/route.ts`, `src/app/api/csp-report/route.ts` | Dosya yükleme (ilerleme göstergeli), CSP ihlal raporu | `Origin` kontrolü, boyut sınırı, kişisel veri loglanmaz |
| Yönlendirme | `?devam=` parametresi | Girişten sonra hedef sayfaya dönüş | Yalnızca `/` ile başlayan göreli yol kabul edilir (açık yönlendirme yok) |

## 7. Ekran listesi (web uyarlaması)

Ekranların içeriği, durumları ve metinleri `docs/ekran-akislari.md`'deki gibidir; kodlar (O1, Ö1…) aynıdır. Bu bölüm yalnızca web uyarlamasıdır.

### 7.1 Gezinme ve duyarlı düzen

| Genişlik | Gezinme | İçerik |
|---|---|---|
| < 600 px (telefon dikey; öğrencinin ana senaryosu) | **Altta sabit gezinme**: 4 hedef, etiketler hep görünür, yükseklik ≥ 64 px, `env(safe-area-inset-bottom)` boşluğu. Üst çubukta başlık + Bildirimler + Ayarlar. | Tek sütun; listeden ayrıntıya tam sayfa geçiş |
| 600–1023 px (yatay telefon, tablet, dar pencere) | Dar yan şerit (etiket simgenin altında) | En çok 1120 px, ortalanmış |
| ≥ 1024 px (masaüstü) | **Geniş yan menü** (256 px, etiket simgenin yanında) | Gönüllü ve yönetici ekranlarında liste + ayrıntı iki panel. Formlar en çok 480 px, okuma metni en çok 720 px. |

Kurallar:
- **Tek gezinme öğesi:** Tek bir `<nav aria-label="Ana gezinme">` vardır ve CSS ile yer değiştirir. JavaScript ile genişlik ölçülmez, bu yüzden hidrasyon sırasında kayma olmaz. Seçili hedef `aria-current="page"` ile işaretlenir.
- **Hedefler:**

  | Rol | Hedefler |
  |---|---|
  | Öğrenci | Bugün · Plan · Sorular · Dersler |
  | Veli | Panel · Sorular · Dersler · Hesap |
  | Gönüllü | Pano · Öğrenciler · Dersler · Takvim |
  | Yönetici | 5 hedef. Telefonda da alt gezinme kullanılır ama yalnızca temel destek verilir; asıl hedef masaüstüdür. |

- **Tam ekran sayfalar:** Ders ekranı, soru detayı, konu detayı, sihirbazlar ve onay sayfaları kök gezinmeyi gizler. Bu sayfalarda belirgin bir "Geri" bağlantısı bulunur ve tarayıcının geri tuşu da çalışır.
- **Erişilebilir gezinme:**
  - Her sayfada "İçeriğe geç" bağlantısı, tek `<h1>` ve benzersiz bir `<title>` bulunur. Next.js rota duyurucusu başlığı okur.
  - Altta sabit gezinme, odaklanan öğeyi örtmemelidir (WCAG 2.4.11). Bunun için `scroll-padding-bottom` kullanılır.
  - Ekran klavyesi için `interactive-widget=resizes-content` kullanılır.
- **Yakınlaştırma serbest:** `maximum-scale` ve `user-scalable=no` kullanılmaz.

### 7.2 Sunucu / istemci kuralı

**S** = Server Component. **S+İ** = sunucu bileşeni + küçük istemci adası. **İ** = istemci ağırlıklı. Varsayılan S'dir; istemci yalnızca 3.6'daki iki durumda kullanılır.

### 7.3 Ekranlar

**Ortak**

| Kod | Ekran | Adres | Çalışma | Çevrimdışı |
|---|---|---|---|---|
| O1 | Açılış ve rol seçimi | `/` | S (oturum varsa rolün ana sayfasına yönlendirir) | Kabuk ✓ |
| O1 | Giriş (veli, gönüllü, yönetici) / öğrenci girişi | `/giris`, `/giris/ogrenci` | S + form | – |
| O2 | OTP doğrulama | `/dogrula` | S + form | – |
| O3 | Bildirimler | `/{rol}/bildirimler` | S | – |
| O4 | Ayarlar | `/{rol}/ayarlar` | S+İ (görünüm → localStorage; bildirim izni; "Telefona ekle"; çıkış) | Görünüm ayarları ✓ |
| O4d | Lisanslar | `/lisanslar` | S (derleme sırasında üretilen paket listesi + OFL metni) | – |
| O5 | Bildir / Gönüllüyü engelle | Her ekranda açılan diyalog | İ (React Aria Modal) + Server Action | – |
| O6 | Hesap silme (herkese açık) | `/hesap-silme` | S + form (OTP) | – |
| O7 | Durum (askıda / beklemede) | `/durum` | S | – |
| Yeni | Yasal sayfalar (herkese açık) | `/gizlilik`, `/cerezler`, `/kullanim-kosullari`, `/aydinlatma/veli`, `/aydinlatma/gonullu` | S (`legal_documents`, anon okuma) | – |
| Yeni | Çevrimdışı | `/cevrimdisi` | S, önceden önbelleğe alınır | ✓ |

**Öğrenci**

| Kod | Ekran | Adres | Çalışma | Çevrimdışı |
|---|---|---|---|---|
| Ö0 | İlk giriş bilgilendirmesi | `/ogrenci/hos-geldin` | S + form | – |
| Ö1 | **Bugün** | `/ogrenci/bugun` | S+İ. Mod seçimi yerel radyo kartlarıyla yapılır; iki modun içeriği sunucudan birlikte gelir, geçiş anında olur; son seçim localStorage'da saklanır. | ✓ |
| Ö2 | Plan sihirbazı | `/ogrenci/plan/yeni` | İ (3 adım, React Aria `DateRangePicker`) + Server Action | – |
| Ö3 | Planım | `/ogrenci/plan` | S | ✓ |
| Ö4 | Konu / görev detayı | `/ogrenci/konu/[id]` | S (Markdown sunucuda işlenir) + "Tamamladım" formu | ✓ özet okunur; bağlantılar pasif, nedeni yazılı |
| Ö5 | Soru sor | `/ogrenci/sorular/yeni` | İ (kamera/galeri, sıkıştırma, kırpma, ilerlemeli yükleme) | – (fotoğraf seçilebilir ama gönderilemez) |
| Ö6 | Sorularım | `/ogrenci/sorular` | S | – |
| Ö7 | Soru detayı | `/ogrenci/sorular/[id]` | S+İ (takip formu, ses oynatıcı, fotoğraf yakınlaştırma düğmeleri) | – |
| Ö8 | Kütüphane + kaynak detayı | `/ogrenci/kutuphane/…` | S | ✓ yalnızca daha önce açılan konu özetleri |
| Ö9 | Gönüllüm ve derslerim | `/ogrenci/dersler` | S+İ (randevu seçici) | – |
| Ö10 | Ders ekranı | `/ogrenci/ders/[id]` | İ (hazırlık ekranı + JaaS iframe) | – |
| Ö11 | Güvende kal | `/ogrenci/guvende-kal?devam=…` | S + "Anladım" formu | – |
| Ö12 | Hesabımı silmek istiyorum | `/ogrenci/ayarlar/hesap` | S + form | – |

**Veli**

| Kod | Ekran | Adres | Çalışma |
|---|---|---|---|
| V1 | Kayıt (aydınlatma, koşullar, hesap, OTP) | `/kayit/veli/[adım]` | S + adım formları |
| V2 | Çocuk ekle (rumuz/sınıf, **ayrı AR-1 ekranı**, kullanıcı adı/şifre, hazır) | `/veli/cocuk/ekle/[adım]` | S + formlar; "Kopyala" düğmesi İ |
| V3 | Çocuk paneli | `/veli/panel` | S |
| V4 | Çocuğun soru-cevapları | `/veli/sorular`, `/veli/sorular/[id]` | S (+ ses oynatıcı İ) |
| V5 | Eşleşme önerisini onaylama | `/veli/eslesme/[id]` | S + form |
| V6 | Dersler + derse katıl | `/veli/dersler`, `/veli/ders/[id]` | S+İ / İ |
| V7 | Çocuk hesabı yönetimi (şifre, uygunluk, özellik anahtarları, gönüllü, silme) | `/veli/cocuk/[id]` | S+İ (uygunluk ızgarası İ; anahtarlar formla) |
| V8 | Rızalarım + rıza geri alma | `/veli/rizalarim`, `/veli/rizalarim/[id]/geri-al` | S + yeniden doğrulamalı form |
| V9 | Çocuğun silme isteği | `/veli/istekler/[id]` | S + form |

**Gönüllü**

| Kod | Ekran | Adres | Çalışma |
|---|---|---|---|
| G1 | Başvuru sihirbazı (10 adım) | `/basvuru/[adım]` | S + formlar; belge yükleme İ |
| G2 | Eğitim + quiz | `/gonullu/egitim` | S + form (zaman sınırı yok) |
| G3 | Başvuru durumu | `/gonullu/durum` | S |
| G4 | Pano (bana atananlar, havuz) | `/gonullu/pano?sekme=…` | S (sekme URL'de tutulur; masaüstünde iki sütun) |
| G5 | Soru cevaplama | `/gonullu/sorular/[id]` | S+İ (ses kaydı, foto ekleme, taslak localStorage'da) |
| G6 | Öğrencilerim | `/gonullu/ogrenciler` | S |
| G7 | Uygunluk takvimi | `/gonullu/takvim` | İ (düğmeli ızgara, jest gerekmez) |
| G8 | Derslerim + ders ekranı + ders sonrası not | `/gonullu/dersler`, `/gonullu/ders/[id]` | S / İ |

**Yönetici** (yalnızca `aal2`; hiçbir sayfası önbelleğe alınmaz)

| Kod | Ekran | Adres | Çalışma |
|---|---|---|---|
| Y0 | MFA kurulumu / doğrulama | `/yonetici/mfa/kurulum`, `/yonetici/mfa` | S + form (QR görseli) |
| Y1 | Gönüllü başvuruları | `/yonetici/basvurular?secili=…` | S. Liste + ayrıntı; belge, imzalı URL ile yeni sekmede açılır |
| Y2 | Eşleştirme | `/yonetici/eslestirme` | S + formlar |
| Y3 | Şikâyet ve moderasyon kuyruğu | `/yonetici/sikayetler?sekme=…` | S + formlar |
| Y4 | Kullanıcılar | `/yonetici/kullanicilar?q=…` | S (GET arama formu) |
| Y5 | Denetim kaydı | `/yonetici/denetim?sayfa=…` | S (sayfalama; sonsuz kaydırma yok) |

Toplam yaklaşık 40 ekran (35 + web'e özgü yasal ve çevrimdışı sayfalar). İçerik yönetimi ekranları MVP'de yok; içerik CSV + migration ile yüklenir. Bileşen galerisi `/galeri` yalnızca geliştirme ortamındadır (bkz. 7.4).

### 7.4 Tasarım sistemi ve bileşenlerin web karşılıkları

Değişmeyenler:
- renk paleti ve 4 tema (açık, koyu, açık yüksek kontrast, koyu yüksek kontrast),
- kontrast hedefleri,
- Atkinson Hyperlegible Next yazı tipi,
- tür ölçeği, boşluk, köşe ve boyut token'ları,
- ikon anlam sözlüğü,
- hareket kuralları,
- mikro-metin kuralları,
- ekranlar.

Değişen yalnızca bunların uygulanış biçimidir:

| Flutter (v1) | Web (v2) |
|---|---|
| `app_palette.dart`, `ColorScheme`, `AppStyle` | `src/styles/tokens.css`. `:root` açık temadır; ek olarak `[data-theme="dark"]`, `[data-theme="hc-light"]`, `[data-theme="hc-dark"]` blokları. Aynı rol adları kullanılır (`--color-primary`, `--color-on-surface`…). Bileşenlerde ham renk yazılmaz (Stylelint denetler). |
| Sistem teması, `highContrastTheme` | "Sistem" seçiliyken `prefers-color-scheme` ve `prefers-contrast: more` uygulanır. Uygulama içi seçim `<html data-theme>` ile yapılır. `<head>`'deki nonce'lu küçük bir betik tercihi ilk boyamadan önce uygular (tema yanıp sönmez). Windows yüksek kontrast modu (`forced-colors: active`) sistem renklerine bırakılır, onunla çatışılmaz. |
| `AppTokens` (dp) | CSS değişkenleri. 1 dp ≈ 1 CSS px. Yazı boyutları rem cinsindendir ve tarayıcının yazı ayarına uyar. Kırılma noktaları (600 / 1024 px) media query'de sabittir. |
| `textScaler` + uygulama içi 1.0 / 1.15 / 1.3 | `html { font-size: calc(100% * var(--text-scale)) }`. Tarayıcı yakınlaştırmasında %200'de taşma olmaz; 320 px genişlikte yeniden akış sağlanır (WCAG 1.4.4, 1.4.10). |
| `MediaQuery.disableAnimations`, `AppMotion` | `prefers-reduced-motion: reduce` ve `[data-motion="reduce"]`. Süre değişkenleri bu durumda 0 ms olur. |
| `Semantics`, `ExcludeSemantics`, `liveRegion`, `header` | Anlamsal HTML (`h1`–`h3`, `nav`, `main`, `button`, `a`). Süs ikonlarında `aria-hidden="true"`. Canlı bölgelerde `role="status"` / `aria-live="polite"`. |
| `AppShell` (`NavigationBar`, `NavigationRail`, `LayoutBuilder`) | Tek `<nav>`, CSS ile yerleşim (7.1) |
| `PrimaryButton`, `SecondaryButton` | `<button>` / `<a>` + `Button.module.css`. En az 56 px yükseklik. Yüklenirken `aria-busy` + görünür yazı. Pasif durumda da okunur kontrast. |
| `AppCard` (tek düğüm) | Kartın tamamı tek `<a>` veya `<button>`. Seçilebilir kart = yerel radyo + `<label>`. |
| `Switch`, `Checkbox`, `ChoiceChip` | Yerel `<input type="checkbox">` (anahtarda `role="switch"`) + renkten bağımsız onay/çarpı işareti |
| `TextField` | `<label>` (hep üstte) + `<input>` + açıklama + hata (`aria-describedby`, `aria-invalid`). `autocomplete` ve `inputmode` belirtilir. Şifre ve OTP alanlarında yapıştırma açıktır (WCAG 3.3.8). |
| Diyalog, alt sayfa | React Aria `Modal` + `Dialog`. Telefonda alttan açılan görünüm. |
| Tarih ve saat seçici (henüz yazılmamıştı) | React Aria `DateRangePicker`, `DatePicker`, `TimeField` (`tr-TR`) |
| `showAppSnackBar` (kendiliğinden kaybolmaz) | `role="status"` bant; "Tamam" ile kapanır; zamanlayıcı yok |
| Material Icons yazı tipi | Material Symbols SVG'leri (Apache 2.0), yalnızca kullanılan ikonlar yerel bileşen olarak. İkon fontu yok. |
| Pakete gömülü TTF | `next/font/local`. TTF'ler WOFF2'ye çevrilir ve Latin + Latin Genişletilmiş (Türkçe) olarak alt kümelenir. 400, 600 ve 700 ağırlıkları; `display: swap`; ölçüleri ayarlanmış yedek font (CLS düşük). `google_fonts` ve harici indirme yok. |
| `app_tr.arb` | `src/strings/*.ts` (`legal` öneki korunur) |
| `turkishUpperCase` | `toLocaleUpperCase('tr-TR')` |
| `LicensePage` + `font_licenses.dart` | `/lisanslar` sayfası (derleme betiği + OFL metni) |
| Galeri `/galeri` (yalnızca dev) | `/galeri` yalnızca `GALLERY=on` ile derlenen ortamlarda (yerel ve CI) açılır; üretimde 404 döner (test denetler). Tüm bileşenler 4 tema ve 3 yazı ölçeğinde gösterilir. |
| `go_router` rol `redirect` | `proxy.ts` (kaba yönlendirme) + her rol düzeninde (layout) sunucu tarafı rol kontrolü |
| Riverpod | Sunucu bileşenleri + URL durumu + yerel `useState` |
| `flutter_markdown_plus` | Sunucuda `react-markdown`; ham HTML kapalı. Koyu temada içerik görselleri beyaz zeminli PNG olur. |

**`tasarimci`'nin H1–H2'de güncelleyeceği yerler** (değerler aynı, yalnızca uygulama biçimi değişir):
- `docs/tasarim-sistemi.md`: §2 dosya yolları, §4.1 yükleme, §5 birimler, §6 ikonlar, §7 bileşen dosyaları, §8 hareketin kaynağı, §9 testler, §10 metin dosyaları, §12 kullanım.
- `docs/ekran-akislari.md`:
  - §1.1: platform sütunu "web".
  - Ö10: "öğrenci derse yalnızca Android'den girer" ifadesi kalkar.
  - O4d: Flutter `LicensePage` yerine web sayfası.
  - O5 ve O6: "Play zorunluluğu" gerekçeleri kendi politikamız olarak yeniden yazılır.
  - §8: Android `publicVersion` notu yerine web'deki kilit ekranı kuralı.

## 8. Klasör yapısı

```
egitim-koprusu/                          # C:\dev\egitim-koprusu
├── web/                                 # Next.js 16 (App Router, TypeScript)
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx               # <html lang="tr">, tema betiği (nonce), yazı tipi
│   │   │   ├── manifest.ts              # PWA manifest
│   │   │   ├── sw.ts                    # Serwist service worker kaynağı (önbellek + push olayları)
│   │   │   ├── serwist/[path]/route.ts  # sw.js'i sunar
│   │   │   ├── (public)/                # /, /giris, /giris/ogrenci, /dogrula, /kayit/veli, /basvuru,
│   │   │   │                            # /gizlilik, /cerezler, /kullanim-kosullari, /aydinlatma/*,
│   │   │   │                            # /hesap-silme, /lisanslar, /cevrimdisi
│   │   │   ├── ogrenci/                 # layout.tsx: requireRole('ogrenci') + AppShell
│   │   │   ├── veli/  ├── gonullu/  ├── yonetici/   # aynı kalıp; yönetici layout'u aal2 ister
│   │   │   ├── durum/
│   │   │   ├── galeri/                  # yalnızca GALLERY=on
│   │   │   └── api/attachments/ · api/csp-report/
│   │   ├── proxy.ts                     # nonce + CSP, güvenlik başlıkları, oturum yenileme
│   │   ├── components/                  # Button, Card, RadioCard, Banner, StateViews, ProgressBar,
│   │   │                                # SectionHeader, TextField, Switch, Dialog, AppShell… (+ .module.css)
│   │   ├── features/                    # özellik bazlı istemci adaları: ask-question/, voice-recorder/,
│   │   │                                # lesson-room/ (JaaS), push-permission/, plan-wizard/, availability/
│   │   ├── server/                      # 'server-only': supabase.ts, session.ts, errors.ts,
│   │   │                                # database.types.ts, data/*.ts, actions/*.ts
│   │   ├── client/                      # tarayıcı yardımcıları: image-compress.ts, recorder.ts, push.ts,
│   │   │                                # appearance.ts (localStorage), online.ts
│   │   ├── validation/                  # Zod şemaları
│   │   ├── strings/                     # Türkçe arayüz metinleri (tr.ts, legal.ts…)
│   │   ├── styles/                      # tokens.css (4 tema), reset.css, global.css
│   │   ├── vendor/jitsi/external_api.js # sabit sürüm, kaynağı ve lisansı not edilir
│   │   └── lib/                         # date.ts (Europe/Istanbul), turkish.ts, safe-redirect.ts
│   ├── assets/fonts/                    # Atkinson Hyperlegible Next WOFF2 + OFL.txt
│   ├── public/icons/                    # 192, 512, maskable, apple-touch-icon
│   ├── e2e/                             # Playwright senaryoları + axe + güvenlik başlığı testleri
│   ├── next.config.ts · tsconfig.json · eslint.config.mjs · stylelint.config.mjs
│   ├── vitest.config.ts · playwright.config.ts · lighthouserc.json
│   └── .env.example                     # yalnızca SUPABASE_URL ve SUPABASE_PUBLISHABLE_KEY (NEXT_PUBLIC_ yok)
├── supabase/                            # korunur
│   ├── config.toml · migrations/ · seed/ · tests/database/ (pgTAP) · rollback/
│   └── functions/                       # _shared/ (admin istemcisi, JWT, web push yardımcıları)
│       ├── create-child-account/ · reset-child-password/ · delete-account/
│       └── send-push/ · jitsi-token/ · cleanup/
├── tools/db-check/                      # korunur: Docker'sız pgTAP (PGlite)
├── docs/                                # plan.md (v2), api.md, veri-modeli.md, tasarim-sistemi.md,
│                                        # ekran-akislari.md, web-gelistirme.md (ekip rehberi), hukuk/ (+ arsiv/)
├── .github/workflows/                   # ci.yml (web + db-check), e2e-gece.yml, lighthouse.yml
├── .gitignore                           # + web/node_modules, web/.next, web/test-results, playwright-report
└── README.md
```

Kod içindeki adlar (klasörler, fonksiyonlar, tablolar) İngilizcedir; bu, v1 ve veritabanı geleneğiyle aynıdır. Kullanıcının gördüğü adresler ve metinler Türkçedir.

Yapı özellik bazlıdır. "domain/use-case" katmanı yoktur; bu ölçekte gereksizdir.

### 8.1 `app/` (Flutter) klasörü: arşivle, sonra sil

**Öneri: arşivlemek ve silmek.** Klasör olarak tutulmamasının nedenleri:
- ajanlar ve arama için gürültü olur (iki tasarım sistemi, iki oturum kodu),
- CI'da ölü kod kalır,
- güvenlik incelemesinde yanlış alarm üretir.

Klasör 2,4 GB yer kaplıyor; çoğu derleme çıktısı.

Adımlar (**kullanıcı onayıyla**):
1. **Yeniden kullanılacakları `web/`'e taşı:**
   - `assets/fonts/*.ttf` + `OFL.txt` (WOFF2'ye çevrilecek),
   - `l10n/app_tr.arb` metinleri → `src/strings/`,
   - `theme_contrast_test`, `design_rules_test` ve `turkish_text_test` içindeki kural ve vakaların TypeScript karşılıkları,
   - galeri kapsamı (hangi bileşenin hangi durumları gösterdiği).

   Palet ve token değerleri zaten `docs/tasarim-sistemi.md`'de.
2. **Git kimliğini tanımla** (`user.name`, `user.email`). İlk commit'i at: `app/.gitignore` derleme klasörlerini dışarıda bırakır; `android/.gradle` ve `android/.kotlin` de kontrol edilir. Bu commit'e **`arsiv/flutter-v1`** etiketini koy.
3. **Klasörü sil:** ikinci commit "Flutter iskeleti arşivlendi; web/ geliştirmesi başlıyor". Kod etikette korunur, gerekirse geri alınabilir.

## 9. Güvenlik, çocuk koruma, KVKK ve erişilebilirlik

### 9.1 Güvenlik

1. **RLS** tüm tablolarda açıktır, varsayılan davranış rettir. Her politikanın pgTAP rol matrisi testi vardır (736 test korunur ve yeni değişikliklerle genişler).
2. **Rol istemciden atanamaz** (`handle_new_user`). `profiles.role` ve `status` sütunları istemci güncellemesine kapalıdır.
3. **Yönetici hesaplarında TOTP MFA zorunludur.** Yönetici RPC'leri `aal2` ister. Web akışı 4.1/6'dadır.
4. **`SECURITY DEFINER` fonksiyonlarda** `search_path` sabitlenir. Yetki ve girdi kontrolü fonksiyonun içinde yapılır.
5. **Storage:** bucket'lar özel, politikalar yol bazlı, MIME ve boyut sınırı var, imzalı URL ≤ 10 dk. EXIF verisi tarayıcıda silinir ve testle doğrulanır.
6. **Anahtarlar:** Vercel'de yalnızca gizli olmayan değerler bulunur. Gizliler Supabase secrets'tadır. `.env*` dosyaları git dışındadır. Vercel–Supabase entegrasyonu kurulmaz.
7. **Oturum ve sunucu katmanı:**
   - httpOnly çerez kullanılır; tarayıcıda Supabase istemcisi yoktur (3.7).
   - Korumada `getClaims()` kullanılır.
   - Tüm Server Action'lar `defineAction` ile yazılır (oturum + Zod).
   - Route Handler'larda `Origin` kontrolü yapılır.
   - `?devam=` yalnızca göreli yol kabul eder.
   - Hassas veli işlemlerinde yeniden doğrulama istenir.
   - Oturumlu sayfalar `Cache-Control: private, no-store` ile sunulur.
8. **Güvenlik başlıkları** (`proxy.ts`, her istekte):

   | Başlık | Değer |
   |---|---|
   | `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'nonce-{N}' 'strict-dynamic'; style-src 'self' 'nonce-{N}'; style-src-attr 'unsafe-inline'`¹`; img-src 'self' blob: data: https://{proje}.supabase.co; media-src 'self' blob: https://{proje}.supabase.co; font-src 'self'; connect-src 'self'; frame-src https://8x8.vc; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests; report-to csp` |
   | `Reporting-Endpoints` | `csp="/api/csp-report"` |
   | `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` |
   | `X-Content-Type-Options` | `nosniff` |
   | `X-Frame-Options` | `DENY` |
   | `Referrer-Policy` | **`no-referrer`**. EBA vb. dış sitelere kullanıcının "Eğitim Köprüsü'nden geldiği" bilgisi gitmez; bu bilgi dolaylı sağlık çıkarımına yol açabilir (bkz. 9.3). Dış bağlantılarda ayrıca `rel="noopener noreferrer"`. |
   | `Permissions-Policy` | **Varsayılan:** `camera=(), microphone=(), display-capture=(), geolocation=(), payment=(), usb=(), browsing-topics=()`. **Ders sayfaları:** `camera` ve `microphone=(self "https://8x8.vc")`; `display-capture` yalnızca `/gonullu/ders/*`'te açık. **Gönüllü cevap sayfası:** `microphone=(self)`. |
   | `Cross-Origin-Opener-Policy` | `same-origin` (COEP kullanılmaz; JaaS iframe'ini bozar) |
   | `Clear-Site-Data` | Çıkış yanıtında `"cache"` |

   ¹ Sunucuda üretilen bazı `style=""` öznitelikleri nonce alamaz. `style-src-attr 'unsafe-inline'` gerekip gerekmediği spike'taki CSP rapor modunda belirlenir; gerekmiyorsa kaldırılır.

   - **Nonce'un bedeli:** Nonce kullanılınca tüm sayfalar dinamik olur; statik üretim, ISR ve PPR kullanılmaz. Bu bilinçli bir tercihtir: çocuk verisi var ve trafik küçük.
   - **Uygulama sırası:** CSP H1–H8 arasında `Content-Security-Policy-Report-Only` olarak çalışır, H9'dan itibaren zorunlu olur.
9. **Üçüncü taraf betik yoktur.**
   - `dangerouslySetInnerHTML` ESLint ile yasaktır. Markdown sunucuda ham HTML kapalı olarak işlenir.
   - Bağımlılıklar az ve tam sürümle sabitlenmiştir; Dependabot yalnızca güvenlik yamalarını önerir; `npm audit` CI'da koşar.
10. **Jitsi:** oda adı UUID; JWT yalnızca katılımcılara verilir, kısa ömürlüdür ve özellikleri kapalıdır; lobi açık; kayıt, yayın ve transkripsiyon kapalı; öğrencide ekran paylaşımı tarayıcı düzeyinde engellenir (4.3.5).
11. **Push:** endpoint için izinli alan adı listesi (SSRF koruması), genel metin, VAPID özel anahtarı yalnızca Supabase'te.
12. **Hız sınırları:**
    - Supabase Auth limitleri (sunucu IP'si notu, 3.7),
    - Edge Function başına kullanıcı limiti,
    - günlük soru sınırı,
    - Storage yükleme kotası,
    - CSP rapor uç noktasında sınır.
13. **Loglar:** Vercel ve Edge Function loglarında kişisel veri ve mesaj içeriği bulunmaz. Kullanıcıya gösterilen hata mesajları geneldir.
14. **Analitik ve hata izleme yok:** SDK kullanılmaz; Vercel Analytics ve Speed Insights kapalıdır. Uygulama arama motorlarına kapalıdır (`noindex`).

### 9.2 Çocuk koruma (değişmedi; web notları eklendi)

- **Hesap ve eşleşme:**
  - Öğrenci hesabını **yalnızca veli açar**.
  - Eşleşme **veli onayıyla** başlar.
  - Veli çocuğun tüm soru-cevaplarını ve ders geçmişini görür, **derse istediği an katılabilir**.
  - Veli özellikleri kapatabilir (soru-cevap, sesli cevap, görüntülü ders), gönüllüyü engelleyebilir ve rızayı geri alabilir.
- **Gönüllünün gördükleri:** Gönüllü öğrencinin yalnızca rumuzunu ve sınıfını görür.
- **İletişim platform içinde kalır:**
  - serbest metinlerde sunucu tarafı filtre çalışır,
  - mesajlar değiştirilemez,
  - ders katılımının meta kaydı tutulur,
  - görüşmeler yalnızca 08:00–21:00 arasında yapılabilir,
  - görüşme içi sohbet, davet ve öğrenci ekran paylaşımı kapalıdır.
- **İkinci savunma hattı:** her ekranda "Bildir" ve "Gönüllüyü engelle", yönetici kuyruğu, **"önce askıya al, sonra incele"** kuralı.
- **Gönüllü hazırlığı:** Gönüllüler davranış kurallarını öğrenir, eğitimi ve quizi geçer, taahhütname imzalar.
- **Çocuğa yönelik metinler:** İlk girişte yaşına uygun bilgilendirme; ilk sorudan ve ilk dersten önce "Güvende kal" hatırlatması.
- **Web'e özgü notlar:**
  - **Bildirim metinleri:** Web Push'ta kilit ekranı gizliliği ayarlanamadığı için metinler her zaman geneldir.
  - **Dış bağlantılar:** Öncesinde "Harici bir siteye gidiyorsun" bilgisi gösterilir; yönlendiren bilgisi gönderilmez.
  - **Ortak cihaz:** Ayarlar'da sade bir uyarı bulunur: "Bu telefonu başkası da kullanıyorsa işin bitince çıkış yap."
  - **Fotoğraf yönergesi:** "Fotoğrafta yüzün, adın ya da okulun görünmesin." Kırpma aracı da sunulur.

### 9.3 KVKK ve veri minimizasyonu

- **Toplanmayanlar:** hastalık, tanı veya engel türü; devamsızlık nedeni; TC kimlik no; öğrencinin soyadı, okulu, doğum tarihi ve telefonu; konum.
- **Dolaylı sağlık verisi:**
  - Platformun kullanıcısı olmak bile bir sağlık durumuna işaret edebilir.
  - Arayüzde neden sorulmaz ve nötr dil kullanılır.
  - Görünüm tercihleri sunucuya gitmez.
  - `Referrer-Policy: no-referrer` kullanılır.
  - Bildirim metinleri geneldir.
  - AR-1 açık rızası alınır (`hukuk`).
- **Rıza kaydı:** Veli aydınlatması ve açık rızası sürüm bilgisiyle kaydedilir (`channel = 'web'`) ve geri çekilebilir.
- **Yurt dışına aktarım (alıcılar):**
  - Supabase (AWS Frankfurt),
  - **Vercel Inc.** (ABD; fonksiyonlar Frankfurt'ta, CDN küresel, istek logları),
  - 8x8 JaaS,
  - **tarayıcı push servisleri** (Google, Apple, Mozilla, Microsoft; yalnızca bildirimi açanlar için, içerik şifreli),
  - Resend veya Brevo.

  **Çıkanlar:** Google Firebase (FCM, Hosting) ve Google CDN.

  KVKK m.9 (2024 değişikliği) uyarınca standart sözleşme gerekir ve imzadan sonra 5 iş günü içinde Kurum'a bildirilir. Bu yükümlülük veri sorumlusunundur. Demo sahte veriyle yapılır; pilot öncesinde bu yükümlülük tamamlanır.
- **Cihazda tutulanlar:**
  - görünüm tercihleri, hafif mod ve son seçilen mod (localStorage),
  - gönüllü cevap taslağı (localStorage),
  - öğrencinin çevrimdışı sayfaları (Cache Storage).

  Hepsi çıkışta silinir. Çıkış yapılmazsa cihazda kalırlar; bu, çerez politikasında ve gizlilik politikasında yazılır.
- **Saklama süreleri:** `docs/hukuk/saklama-ve-imha.md`. Web karşılıkları 9.5'te.
- **Hesap silme:** hem uygulama içinden hem herkese açık `/hesap-silme` sayfasından yapılabilir.
- **Erişim ve düzeltme talepleri:** MVP'de form + yönetici eliyle karşılanır.

### 9.4 Erişilebilirlik ve hafif mod

Hedef **WCAG 2.2 AA**.

- **Dokunma ve yazı:**
  - Dokunma alanı ≥ 48×48 px, ana eylemlerde 56 px.
  - Yazı boyutu rem cinsindendir; tarayıcı yakınlaştırmasıyla %200'de taşma olmaz.
  - 320 px genişlikte yatay kaydırma olmaz.
  - Uygulama içinde 3 kademeli yazı boyutu seçeneği vardır.
- **Kontrast:**
  - Metin ≥ 4.5:1; yüksek kontrastta ≥ 7:1.
  - Metin olmayan öğeler ≥ 3:1.
  - 4 tema + sistem ayarına uyum + Windows `forced-colors` desteği.
  - Bilgi yalnızca renkle verilmez.
- **Ekran okuyucu:**
  - Anlamsal HTML, doğru başlık sırası, görünür odak halkası (3 px; yüksek kontrastta 4 px).
  - Süs ikonları gizlenir. Soru fotoğrafının `alt` metni, öğrencinin yazdığı açıklamadır.
  - Denenecek eşleşmeler:
    - TalkBack + Chrome ve VoiceOver + Safari (öğrenci, veli),
    - NVDA + Firefox/Chrome (gönüllü, yönetici).
- **Etkileşim:**
  - Hiçbir işlem yalnızca jestle yapılmaz (WCAG 2.5.7).
  - Zaman aşımı yoktur.
  - "Animasyonları azalt" ayarına uyulur.
  - Kimlik doğrulamada yapıştırma ve parola yöneticileri çalışır (WCAG 3.3.8).
- **Ses ve dikte:** Sesli cevapta yazılı özet zorunludur. Dikte için telefonun klavye diktesi kullanılır; kod gerekmez.
- **Hafif mod** ve **kısa/tam mod:** 4.3.6 ve Ö1. Sağlık veya his sorusu sorulmaz; yalnızca seçilen mod saklanır.

### 9.5 Hukuk belgelerinde gereken değişiklikler (`hukuk`, H1–H2)

| Belge | Gereken değişiklik |
|---|---|
| `play-store-uyum.md` | `docs/hukuk/arsiv/` altına taşınır. İçindeki ürün kararları **kendi çocuk koruma ve KVKK politikamız** olarak korunur: güvenlik hatırlatması, "Gönüllüyü engelle", veli özellik anahtarları, izinden önce açıklama, herkese açık hesap silme sayfası. Diğer belgelerdeki "Play gereği" gerekçeleri buna göre yeniden yazılır. Aşama 3'te uygulama mağazaya paketlenirse belge arşivden geri alınır. |
| **Yeni: `cerez-politikasi.md`** | Kullanılan teknolojiler: oturum çerezi (`sb-<proje>-auth-token`, zorunlu, httpOnly), localStorage (görünüm tercihleri, hafif mod, son seçilen mod, gönüllü cevap taslağı), service worker + Cache Storage (çevrimdışı sayfalar), isteğe bağlı push aboneliği. Analitik, reklam ve üçüncü taraf çerez yok. Hukukun değerlendireceği konu: KVKK Çerez Rehberi'ne göre zorunlu çerezler için açık rıza gerekmez; görünüm tercihleri "kullanıcının açıkça istediği hizmet için zorunlu" sayılabilir mi, yani **onay bandına gerek yok mu**? Sayılmazsa tercihler yalnızca kullanıcı bir ayarı değiştirdiğinde yazılır, varsayılanlar sistem ayarından okunur. Metin herkese açık `/cerezler` sayfasında yayınlanır. |
| `veri-envanteri.md` (§1–§5: V7, Ö8, G11; §4 alıcılar) | **Çıkar:** FCM, Firebase Hosting, Firebase installation ID, Google CDN (gstatic) satırı. **Ekle:** (1) **Vercel Inc.**: barındırma; istek logları (IP, tarayıcı bilgisi, adres); fonksiyonlar fra1'de, CDN küresel; DPA ve AB standart sözleşmesi var, KVKK standart sözleşmesi ve bildirim gerekir. (2) **Tarayıcı push servisleri** (Chrome/Android → Google; Safari/iOS → Apple; Firefox → Mozilla; Edge → Microsoft): abonelik uç noktası (takma adlı kimlik), gönderim zamanı, yük boyutu. İçerik uçtan uca şifreli (RFC 8291). Bizimle sözleşme ilişkileri yok; **hukuki nitelemeleri** (veri işleyen mi, kullanıcının seçtiği hizmet mi, arızi aktarım mı) değerlendirilir. Push isteğe bağlıdır. (3) Cihazda tutulan veriler için yeni satır. (4) 8x8: tarayıcı `8x8.vc` iframe'ine doğrudan bağlanır (IP, tarayıcı bilgisi). `device_tokens` adı yeni tablo adıyla değiştirilir. |
| `aydinlatma-veli.md`, `aydinlatma-gonullu.md` | Platform tanımı: "web uygulaması; telefona eklenebilir". "Bildirim kimliği" → "isteğe bağlı tarayıcı bildirim aboneliği". Alıcı tablosu yukarıdaki gibi güncellenir. "EXIF cihazda silinir" → "yüklemeden önce tarayıcıda silinir". Çerez politikasına bağlantı eklenir. |
| `gizlilik-politikasi.md` | Başlıktaki Play notları kaldırılır (herkese açık adres şartı kendi kararımız olarak kalır). §1 platform tanımı güncellenir. §8'deki "Oturum bilgisi cihazda güvenli depolamada tutulur" cümlesi şöyle olur: "Oturum bilgisi yalnızca sunucunun okuyabildiği güvenli (HttpOnly, Secure) bir çerezde tutulur." Çevrimdışı önbellek ve ortak cihaz uyarısı eklenir. Alıcılar güncellenir. Çerez bölümü veya bağlantısı eklenir. |
| `kullanim-kosullari.md` | §1.1 "Android uygulaması ve web paneli" → "web uygulaması". Desteklenen tarayıcılar ve "telefona eklemek isteğe bağlıdır" ifadesi eklenir. Play kullanıcı içeriği politikası atıfları kendi kurallarımız olarak yeniden yazılır. |
| `saklama-ve-imha.md` | **SK-17:** `device_tokens`/FCM yerine web push aboneliği. Abonelik çıkışta, hesap silinince, push servisi 404/410 döndüğünde ve 60 gün güncellenmediğinde silinir. **SK-24:** drift yerine tarayıcıdaki Cache Storage ve localStorage. Çıkışta istemci ve `Clear-Site-Data` ile silinir; hesap silinince sunucu bunlara erişemez, kullanıcıya bildirilir. **Yeni satır:** barındırma logları (Vercel; Hobby'de çalışma zamanı logu 1 saat; istek loglarının süresi doğrulanmalı). **SK-18:** Vercel istek logları da kapsama girer. 5651 sayılı Kanun açısından web hizmetinin niteliği yeniden değerlendirilir. **Not 2:** "Google" yerine "push servisleri"; kural aynı. |
| `acik-riza-veli.md` | Kayıt alanlarında "kanal (Android/web)" → "kanal: web"; "uygulama sürümü" → web derleme sürümü |
| `cocuk-bilgilendirme.md` | "Google Play Families" gerekçesi yerine kendi çocuk koruma politikamız. İçerik aynı kalır; ton notları `ekran-akislari.md` §11/2'de. |
| `pilot-oncesi-kontrol-listesi.md` | **Çıkar:** Android manifest maddeleri (AD_ID, konum, Jitsi izinleri), Flutter web CDN maddesi, Play Console girişleri. **Ekle:** Vercel DPA + KVKK standart sözleşmesi + bildirim; Vercel Hobby'nin "ticari olmayan kişisel kullanım" koşulunun kurum adına yapılacak pilotla uyumu; push servislerinin niteliği; çerez politikasının yayında olması; "dış kaynak yok" ve CSP testlerinin geçmesi; loglarda kişisel veri olmaması; `Referrer-Policy: no-referrer`; çıkışta tarayıcı önbelleğinin temizlenmesi. |
| `gonullu-davranis-kurallari.md` | §3.2'deki "cihazına indirme" kuralı tarayıcı için de geçerlidir (indirme ve ekran görüntüsü). Küçük bir ifade değişikliği. |

Tüm metinler taslaktır; avukat incelemesinin yerini tutmaz.

## 10. Kapsam: MVP / Aşama 2 / Aşama 3

**MVP (bu dönem):**
1. **Dört rol web'de:** veli öncelikli kayıt, çocuk hesabı, rıza kaydı, yönetici MFA.
2. **Gönüllü doğrulama:** `.edu.tr` OTP, belge, eğitim + quiz, yönetici onayı.
3. **Soru-cevap:**
   - Fotoğrafla soru: kamera veya galeri; tarayıcıda sıkıştırma ve EXIF temizliği.
   - Cevap: metin, fotoğraf ve **kısa ses (≤ 120 sn)**.
   - **Web Push** (isteğe bağlı) + uygulama içi bildirim listesi.
   - Cevaplanmayan soru havuza düşer.
4. **Telafi planı:** 2026-27 konu tablosu, Bugün, **kısa/tam mod**.
5. **Kütüphane ve PWA:**
   - Kütüphane: bağlantılar + kısa özetler.
   - **PWA:** ana ekrana eklenebilir. **Bugün, plan ve açılmış konu özetleri çevrimdışı okunabilir.**
6. **Eşleştirme ve ders:** sistem önerir, yönetici atar, veli onaylar. Uygunluk, randevu, tarayıcıda JaaS görüntülü ders, hatırlatmalar.
7. **Çocuk güvenliği:** filtre, bildir, engelle, değiştirilemez kayıtlar, veli görünürlüğü ve derse katılım, askıya alma, denetim kaydı.
8. **KVKK:** veri minimizasyonu. Uygulama içi ve herkese açık hesap silme. Gizlilik, çerez ve kullanım koşulları sayfaları herkese açık.
9. **Erişilebilirlik:** WCAG 2.2 AA temel seti, 4 tema, hafif mod.
10. **Güvenlik başlıkları:** nonce'lu CSP.

**Zaman yetmezse sırayla atılacaklar (kesme listesi):**
1. **Sesli cevap.** Safari biçim riski en yüksek ve çekirdek olmayan özellik; yerine yalnızca metin + fotoğraf.
2. **Kırpma aracı.** Yerine yönerge + "Yeniden çek".
3. **Çevrimdışı okuma daraltılır.** Yalnızca Bugün ve son açılan özet kalır; plan ve kütüphane çevrimdışı olmaz. Kurulabilirlik (manifest) kalır.
4. **Web Push.** Yerine yalnızca uygulama içi liste + okunmamış sayısı.
5. **Quiz.** Yerine okuma + onay kutusu.
6. **Havuz mekanizması.** Yerine yönetici elle yeniden atama.
7. **Son çare: JaaS iframe yerine JWT'li 8x8 bağlantısının yeni sekmede açılması.** Bu durumda istemci ayarları uygulanamaz; `guvenlik` onayı gerekir.

**Asla atılmayacaklar:** veli onayı, RLS ve testleri, sunucu filtresi, bildir ve engelle, hesap silme (uygulama içi + herkese açık sayfa), denetim kaydı, CSP ve güvenlik başlıkları, yasal sayfalar.

| Aşama 2 (bahar dönemi) | Neden ertelendi |
|---|---|
| Video cevap | Ücretsiz katmanın depolama (1 GB) ve çıkış trafiği (5 GB) sınırları; moderasyon yükü |
| Köprü Raporu (öğretmene rapor) | Üçüncü kişiye aktarım: ayrı rıza ve öğretmen doğrulaması gerekir |
| Ayrıntılı ilerleme ekranı, gönüllü saat belgesi, basit istatistik paneli | MVP'de basit ilerleme çubuğu yeterli; ders verisi önce birikmeli |
| PDF indirme + çevrimdışı soru kuyruğu | Senkronizasyon karmaşıklığı; Background Sync iOS ve Firefox'ta yok; telif kontrolü |
| Realtime ile anlık cevap güncellemesi | httpOnly mimaride kısa ömürlü ayrı bir token gerekir |
| Sunucuda ses dönüştürme (tek biçim, AAC) | Edge Function'larda ffmpeg yok; ayrı bir servis gerekir |
| Genel (soru dışı) mesajlaşma | Kötüye kullanıma en açık alan |
| İçerik yönetim ekranları | MVP'de CSV + migration yeterli |
| E-posta özetleri; yönetici oturumu için süre sınırı | Önemli ama çekirdek değil |
| Mikrofon düğmeli dikte (Web Speech API), okuma kolaylığı yazı tipi, 2025-26 konu tablosu | Chrome'da dikte sesi Google sunucularına gider; `hukuk` değerlendirmesi gerekir |
| `students.prefs` sütununun kaldırılması | Şema temizliği |

| Aşama 3 | Neden |
|---|---|
| Yapay zekâ Sokratik ipucu | Reşit olmayanlarla LLM kullanımı: içerik güvenliği, yurt dışı aktarım, maliyet ve eval gerektirir. `yapay-zeka`, `guvenlik` ve `hukuk` birlikte çalışmalı. |
| Rozetler | Baskı yaratmayan bir tasarım gerekir |
| Mağaza uygulaması (gerekirse) | PWA'nın TWA ile Play Store'a paketlenmesi; iOS için yerel kabuk. `play-store-uyum.md` arşivden geri döner. |
| Diğer sınıf ve dersler; otomatik eşleştirme | Önce içerik ve güven verisi birikmeli |
| Okul/öğretmen ve hastane okulu entegrasyonu | Kurumsal ortaklık gerektirir |

## 11. İş planı

Hafta 1 = 19–25 Ekim 2026. **Her fazın sonunda** proje akışı uygulanır:
1. `kod-inceleyici` ve `guvenlik` paralel inceler.
2. Hata, Kritik ve Yüksek bulgular düzeltilir.
3. `testci` testleri çalıştırır.

Bu döngü süre tahminlerine dahildir. `∥` paralel yürüyen işleri gösterir.

**`mobil` ajanının işleri** artık şöyle paylaşılır:
- `tasarimci`: tarayıcı API'lerini kullanan arayüz (kamera dosyası, MediaRecorder, push izni, service worker, manifest, ikonlar).
- `backend`: push gönderimi, abonelik RPC'si, yükleme Route Handler'ı, `proxy.ts` ve başlıklar.
- `devops`: Vercel, CI, service worker başlıkları, yayın.

### 11.1 Haftalık takvim

| Hafta | Tarih | İşler |
|---|---|---|
| H1 | 19–25 Ekim | **Hazırlık** (kullanıcı + `devops`) → **web iskeleti + CI + Vercel** (`devops`, ilk 2 gün) → ∥ **tasarım sistemi aktarımı** başlar (`tasarimci`) ∥ **teknik doğrulama (spike)** başlar (`backend` + `tasarimci` + insan ekip, cihazlarla) ∥ şema güvenlik düzeltmeleri biter, ardından web şema değişiklikleri (`veritabani`) ∥ hukuk web güncellemesi (`hukuk`) ∥ ekip rehberi `docs/web-gelistirme.md` taslağı (`dokumantasyon`) |
| H2 | 26 Ekim–1 Kasım (28 Ekim yarım gün, 29 Ekim tatil) | Tasarım sistemi, AppShell ve galeri tamamlanır (`tasarimci`) ∥ spike sonuçları ve **kesme kararı (H2 ortası)** ∥ **erken güvenlik incelemesi**: şema değişiklikleri, oturum, CSP, başlıklar (`guvenlik` ∥ `kod-inceleyici`) ∥ içerik hazırlığı başlar (insan ekip) |
| H3 | 2–8 Kasım | **Faz A:** önce referans dikey dilim (Ö0 uçtan uca), sonra oturum, giriş, OTP, veli kaydı + rıza, çocuk ekle (`backend` ∥ `tasarimci`) |
| H4 | 9–15 Kasım | **Faz A:** gönüllü başvurusu (belge, eğitim, quiz), yönetici MFA ve onay, `/durum`, yasal sayfalar → Faz A inceleme döngüsü |
| H5 | 16–22 Kasım | **Faz B** (plan, Bugün, kısa/tam mod, kütüphane) ∥ **Faz C** başlangıcı (yükleme altyapısı, `ask_question`) |
| H6 | 23–29 Kasım | **Faz B:** PWA (manifest, service worker, çevrimdışı), görünüm ayarları ve hafif mod → B inceleme ∥ **Faz C:** fotoğraf, cevap, filtre |
| H7 | 30 Kasım–6 Aralık | **Faz C:** ses, uçtan uca Web Push, havuz, bildirim listesi → C inceleme ∥ **Faz D** başlar (eşleştirme RPC'leri) |
| H8 | 7–13 Aralık | **Faz D:** uygunluk, randevu, `jitsi-token`, ders ekranı, hatırlatmalar (`backend` ∥ `tasarimci`) |
| H9 | 14–20 Aralık | Faz D biter → D inceleme ∥ **Faz E:** bildir, engelle, moderasyon kuyruğu, askıya alma, denetim, hesap silme sayfası, lisanslar; CSP zorunlu moda geçer |
| H10 | 21–27 Aralık | **Kapsamlı inceleme** (`guvenlik` ∥ `kod-inceleyici` ∥ `hukuk` teknik uyum) → düzeltmeler başlar |
| H11 | 28 Aralık–3 Ocak (1 Ocak tatil) | Düzeltmeler ve yeniden kontrol ∥ **testler** (`testci`) + gerçek cihaz turu + Lighthouse (isteğe bağlı `performans`) |
| H12 | 4–10 Ocak | **Yayın hazırlığı** (`devops`, **kullanıcı onayıyla**) ∥ **dokümantasyon** ∥ demo verisi ve senaryo (insan ekip) |
| H13 | 11–15 Ocak | Tampon, son prova, teslim (15 Ocak Cuma) |

### 11.2 İş listesi ve bağımlılıklar

| # | İş | Ajan(lar) | Önce bitmesi gereken | Paralel çalışabileceği | Hafta |
|---|---|---|---|---|---|
| 0 | **Hazırlık:** git kimliği, `app/` arşivi (8.1; onaylı), GitHub deposu, Vercel hesabı (sahip), Supabase `dev` projesi, JaaS, SMTP, VAPID anahtarları; Docker Desktop (isteğe bağlı) | **Kullanıcı** + `devops` | – | – | H1 (1–2 gün) |
| 1 | **Web iskeleti:** `web/` (Next 16.4.2, TS 6.0.3, ESLint 9, Stylelint, Vitest, Playwright), CI (lint, tip denetimi, test, build, db-check), Vercel `fra1` + ortam değişkenleri, `proxy.ts` iskeleti (CSP rapor modu), `.gitignore` | `devops` (+ `backend`: proxy ve başlıklar) | 0 | 2, 4, 5 | H1 |
| 2 | **Şema:** devam eden güvenlik düzeltmeleri, ardından Ş1 (push aboneliği) ve gerekirse Ş2; pgTAP güncellemesi; tip üretimi | `veritabani` | Mevcut düzeltmeler | 1, 3, 4, 5 | H1–H2 |
| 3 | **Tasarım sisteminin aktarımı:** `tokens.css` (4 tema), WOFF2 yazı tipleri, SVG ikonlar, temel bileşenler, AppShell (alt gezinme / yan menü), galeri; kontrast ve tasarım kuralı testlerinin karşılıkları; `tasarim-sistemi.md` ve `ekran-akislari.md` web güncellemesi | `tasarimci` | 1 | 2, 4, 5 | H1–H2 |
| 4 | **Teknik doğrulama** (7 madde, 11.3) | `backend` + `tasarimci` + **insan ekip** (gerçek cihaz) | 1 (kısmen) | 2, 3, 5 | H1–H2 ortası |
| 5 | **Hukuk web güncellemesi** (9.5) + çerez politikası taslağı | `hukuk` | – | 1–4 | H1–H2 |
| 6 | **Erken güvenlik incelemesi:** şema değişiklikleri, oturum, CSP, başlıklar, spike bulguları | `guvenlik` ∥ `kod-inceleyici` | 2, 4 | 3 | H2 sonu |
| 7 | **İçerik:** 2026-27 takvimi; 5–8. sınıf MAT/FEN haftalık konu tablosu; konu başına 1–3 kaynak ve kısa özet | **İnsan ekip** + `veritabani` (içe aktarma) | 2 (şablon hazır) | Tüm fazlar | H2–H6 |
| 8 | **Faz A – Kimlik ve roller:** referans dikey dilim; giriş (üç tür), OTP, veli kaydı + rıza, `create-child-account`, gönüllü başvurusu (yükleme Route Handler'ı), eğitim + quiz, yönetici MFA + onay, rol kabukları, `/durum`, yasal sayfalar | `backend` (sunucu katmanı, RPC, Edge Function, `docs/api.md`) → `tasarimci` (ekranlar) | 2, 3, 4, 6 | Ekran iskeletleri backend'le paralel | H3–H4 |
| 9 | **Faz B – Plan, kütüphane, PWA:** plan RPC'leri, Bugün, kısa/tam mod, kütüphane, Markdown; manifest, service worker, çevrimdışı okuma, `/cevrimdisi`, kurulum yönergesi; görünüm ayarları, hafif mod | `backend` + `tasarimci` (+ `devops`: service worker başlıkları) | 8, 7 (en az örnek seed) | 10 | H5–H6 |
| 10 | **Faz C – Soru-cevap ve bildirim:** kamera/galeri, sıkıştırma ve EXIF, kırpma, yükleme, `ask_question`/`post_message`, filtre, ses kaydı ve oynatma, havuz (cron), `send-push` (Web Push), abonelik akışı, bildirim listesi | `backend` + `tasarimci` | 8 | 9 | H5–H7 |
| 11 | **Faz D – Eşleştirme ve canlı ders:** öneri ve onay, uygunluk, `list_open_slots`/`book_session`, `jitsi-token`, ders sayfası (JaaS), `Permissions-Policy`, hatırlatmalar, `session_events`, veli katılımı | `backend` + `tasarimci` | 8, 10 (bildirim altyapısı) | – | H7–H9 |
| 12 | **Faz E – Güvenlik özellikleri ve hesap:** bildir, engelle, yönetici kuyrukları, askıya alma, denetim ekranı, `delete-account` + herkese açık silme sayfası, veli yeniden doğrulaması, lisanslar; CSP zorunlu mod | `backend` + `tasarimci` | 8–11 | – | H9 |
| 13 | **Kapsamlı inceleme:** RLS, Storage, Edge Function'lar, Jitsi JWT, push, CSP ve başlıklar, çocuk koruma akışları; kod kalitesi; hukuk teknik uyum kontrolü | `guvenlik` ∥ `kod-inceleyici` ∥ `hukuk` | 12 | – | H10 |
| 14 | Düzeltmeler ve yeniden kontrol | İlgili ajanlar / `hata-ayiklayici` | 13 | 15 | H10–H11 |
| 15 | **Testler** (11.4) + gerçek cihaz turu | `testci` + **insan ekip** (+ isteğe bağlı `performans`) | 14 (testler fazlar boyunca kısmen yazılır) | 14 | H11 |
| 16 | **Yayın hazırlığı:** `prod` Supabase, migration (`--dry-run`, yedek), secrets, Vercel üretim ortamı, alan adı, CSP zorunlu, son Lighthouse ölçümü, demo verisi. **Kullanıcı onayıyla.** | `devops` | 15 | 17 | H12 |
| 17 | **Dokümantasyon:** README, `docs/api.md` son hali, rol bazlı kullanıcı kılavuzları ("telefona ekleme" ve bildirim açma dahil), yönetici el kitabı, `docs/web-gelistirme.md`. İsteğe bağlı: SSS (`musteri-destek`). | `dokumantasyon` | 15 | 16 | H12 (rehber taslağı H1–H2) |
| – | Tampon | – | – | – | H13 |

### 11.3 Teknik doğrulama (spike) maddeleri (H1–H2)

Her maddenin çıktısı "çalışıyor / sınırlı / çalışmıyor" kararı ve gerekirse kesme önerisidir. H2 ortasında kullanıcıya özetlenir.

1. **Oturum:** `@supabase/ssr` + httpOnly çerez + `proxy.ts` + `getClaims()`. Server Action ile şifreyle giriş, OTP doğrulama, MFA (aal2) ve oturum yenileme çalışıyor mu?
2. **CSP ve service worker:** Nonce'lu CSP altında Next 16 + React Aria + Serwist ihlalsiz çalışıyor mu? `style-src-attr` gerekiyor mu?
3. **Web Push:** Android Chrome, iOS 26 ana ekran uygulaması ve masaüstü Chrome/Firefox'a `send-push` Edge Function'ından (Deno kütüphanesiyle) gönderim yapılabiliyor mu?
4. **Ses:** Chrome'da kaydedip iPhone Safari'de çalma ve tersi; Storage'a parametresiz MIME ile yükleme. iOS ana ekran uygulamasında mikrofon izni.
5. **Fotoğraf:** `<input capture>` + sıkıştırma + EXIF temizliği; 2 GB RAM'li bir Android'de ve iPhone'da (HEIC).
6. **JaaS iframe:** Android Chrome ve iPhone Safari'de (normal ve ana ekran uygulaması) deep link sayfası çıkıyor mu, kamera kapalı başlıyor mu, `Permissions-Policy` ile ekran paylaşımı engelleniyor mu, JWT özellikleri (`send-groupchat` dahil) uygulanıyor mu?
7. **Vercel:** Özel depodan yayın (hesap sahibi kuralı), `fra1` bölgesi, Supabase'e gecikme.

### 11.4 Test stratejisi

| Katman | Araç | Kapsam | Ne zaman |
|---|---|---|---|
| Veritabanı | pgTAP (736+), `tools/db-check` (`npm test`); Docker gelince `supabase test db` | RLS rol matrisi, filtre, plan, randevu, Storage, yeni push aboneliği kuralları; mutasyon testi geleneği sürer | Her PR |
| Edge Functions | Deno test (dış servisler sahte) | `send-push` (şifreleme, 404/410, alan adı listesi), `jitsi-token` (pencere, özellikler), `create-child-account` (rıza kontrolü) | Her PR |
| Birim ve bileşen | Vitest 5 + Testing Library + jsdom | Bileşen durum matrisi (normal, odak, pasif, yükleniyor, hata, seçili); yardımcılar (Europe/Istanbul tarih, Türkçe büyük harf, MIME seçimi, güvenli yönlendirme); Zod şemaları; `defineAction` (sahte Supabase ile yetki ve hata eşleme); **token kontrast testi** (4 temada WCAG oranları; v1 `theme_contrast_test`'in karşılığı); **tasarım kuralı testleri** (ünlem yok; öğrenci ve gönüllü metinlerinde sağlık sözcüğü yok, `legal` istisnası; üretimde galeri yok) | Her PR |
| Statik | ESLint 9 (`eslint-config-next`, `jsx-a11y` strict), özel kurallar (`createBrowserClient`, `dangerouslySetInnerHTML` ve çıplak `toUpperCase` yasak), Stylelint, `tsc --noEmit` | Tüm kod | Her PR |
| Uçtan uca | Playwright 1.64. Projeler: Android telefon (Chromium, Pixel öykünmesi), iPhone (WebKit), masaüstü Chrome ve Firefox. `dev` Supabase'e karşı; test kullanıcıları her koşu öncesi kurulur. | **Ana senaryo:** veli kaydı → rıza → çocuk ekle → öğrenci girişi → plan → Bugün → soru (EXIF'li fotoğraf; Storage'da üst veri kalmaz) → gönüllü cevabı (Chromium sahte mikrofonuyla ses) → bildirim listesi. **Diğer senaryolar:** yönetici MFA (TOTP kodu test içinde üretilir) → başvuru onayı; eşleşme → randevu → ders sayfası (iframe yüklenir, öğrencide `display-capture` politikası); çevrimdışı (`setOffline`) → Bugün ve özet okunur; çıkış → önbellek temiz; herkese açık hesap silme. **Güvenlik:** CSP ve nonce var; 8x8 ve Supabase Storage dışında dış alan adına istek yok; oturumlu sayfalar `no-store`; rol aşımı (öğrenci → `/yonetici`) reddedilir. | PR'da kısa set, her gece tam set |
| Erişilebilirlik | `@axe-core/playwright` (WCAG 2.0 / 2.1 / 2.2 A ve AA) | Her sayfa 4 temada; galeride tüm bileşenler 4 tema × (%100, %200). 320 px'de yatay kaydırma yok; klavyeyle gezinme ve odak görünürlüğü; **kanarya testleri** (bilerek erişilemez yapılmış örneği axe yakalamalı). Statik denetim: `eslint-plugin-jsx-a11y`. | Her PR + faz sonu |
| Elle erişilebilirlik | İnsan ekip + `testci` kontrol listesi | TalkBack + Chrome (düşük donanımlı Android), VoiceOver + Safari (iPhone), NVDA + Firefox (masaüstü), Windows yüksek kontrast, %200/%400 yakınlaştırma, "animasyonları azalt", koyu ve yüksek kontrast temalar | Faz sonu + H11 |
| Performans | Lighthouse CI (`@lhci/cli`): mobil ön ayar (yavaş 4G, 4× CPU yavaşlatma), CI'da üretim derlemesine (`next start`) karşı | Herkese açık sayfalar, Bugün, Plan, Konu, Soru sor; giriş betiği ile | Her gece + faz sonu |
| Gerçek cihaz | İnsan ekip | Kurulum (Android, iOS), push, kamera, ses (iki yönlü), Jitsi, çevrimdışı, 3G'de Bugün'ün açılışı | Faz sonu + H11 |

**Performans hedefleri** (düşük donanımlı telefon öykünmesi). Analitik olmadığı için sahadan veri toplanmaz; hedefler laboratuvar ölçümüdür.

| Ölçüt | Hedef |
|---|---|
| Lighthouse Performans | ≥ 90 (herkese açık sayfalar), ≥ 85 (Bugün, Plan, Konu) |
| Lighthouse Erişilebilirlik | **100** (tüm sayfalar) |
| Lighthouse En İyi Uygulamalar | ≥ 95 |
| LCP | ≤ 2,5 sn (yavaş 4G); tekrar ziyarette (service worker) ≤ 1,5 sn |
| CLS | ≤ 0,1 (hedef ≤ 0,05) |
| INP / TBT | INP ≤ 200 ms; laboratuvarda TBT ≤ 200 ms |
| İlk yükleme JS (gzip) | Çerçeve temeli (Next.js + React) ölçümle ~158 KB (18 Ekim 2026, boş sayfa); bu yüzden hedef **temelin üzerine eklenen** JS ile tanımlanır: öğrenci rotaları ≤ 50 KB ek (toplam ≈ 210 KB), yönetici ≤ 120 KB ek |
| Bugün sayfası, ilk ziyaret toplam aktarım | ≤ 350 KB (yazı tipleri dahil); tekrar ziyarette ≤ 50 KB |
| Yazı tipleri | 3 WOFF2 toplam ≤ 120 KB; yalnızca Regular önceden yüklenir |

### 11.5 İnsan ekibin işleri

- Hesapları açmak ve sahiplenmek: GitHub, Vercel (tek sahip), Supabase, JaaS, SMTP. Git kimliğini tanımlamak.
- İçerik CSV'lerini hazırlamak (H2'den başlar; takvimin en büyük riski).
- Rıza ve aydınlatma metinlerini onaylamak.
- **Her faz sonunda gerçek cihazda denemek:** en az bir düşük donanımlı Android ve bir iPhone (iOS 18.4+, tercihen 26). Uygulamayı ana ekrana eklemek ve bildirimleri açmak bu denemeye dahildir.
- Ekran okuyucu denemeleri ve demo için sahte kullanıcı senaryoları.

## 12. Riskler

1–12 v1'in numaralarıdır; diğer belgeler bu numaralara atıf yapıyor. 13 ve sonrası web'e özgüdür.

| # | Risk | Etki | Önlem |
|---|---|---|---|
| 1 | Gönüllü üzerinden çocuk istismarı veya kötüye kullanım | Çok yüksek | Bölüm 9.2'deki tüm önlemler. Gerçek pilot ancak kurumsal sahiplik ve hukuk onayıyla yapılır. |
| 2 | KVKK: reşit olmayanların verisi, dolaylı sağlık verisi çıkarımı, yurt dışı aktarım (artık Vercel ve push servisleri de var), belirsiz veri sorumlusu | Yüksek | Veri minimizasyonu, `no-referrer`, genel bildirim metinleri, push isteğe bağlı, `hukuk` kontrolü. Teslim sahte veriyle yapılır. |
| 3 | Supabase ücretsiz katmanı: 7 gün hareketsizlikte duraklatma, otomatik yedek yok, 1 GB dosya, 5 GB çıkış trafiği | Orta | Haftalık canlı tutma işi, demo öncesi kontrol, sıkı sıkıştırma. Pilotta Pro plan. |
| 4 | **Jitsi web'de:** telefonda performans ve ısınma, deep link sayfası, iOS ana ekran uygulamasında kamera/mikrofon, veli katılınca 3 kişilik görüşme. İstemci ayarlarını kullanıcı değiştirebilir; JWT ile zorlanabilenler sınırlı. JaaS ücretsiz katmanı 25 MAU. | Orta–Yüksek | `disableDeepLinking`, sesle başlama seçeneği, JWT özellikleri, `Permissions-Policy`, H1 spike. Yedek: Android Chrome'dan, bilgisayardan veya Safari sekmesinden katılım. Kesme listesinin 7. maddesi. |
| 5 | İçerik hazırlama yükü; Maarif geçişi; EBA bağlantılarının giriş istemesi veya kırılması | Yüksek (takvim) | `grade_programs` yapısı, "konu sırası yaklaşıktır" uyarısı, `requires_login`. Hazırlık H2'de başlar. |
| 6 | ~~OneDrive dosya kilitleri~~ | – | **Kapandı:** proje `C:\dev`'de |
| 7 | ~~Flutter web ilk yükleme ve erişilebilirlik~~ | – | **Kapandı:** Next.js'e geçildi |
| 8 | **Push teslimi:** iOS'ta yalnızca ana ekrana eklenmiş uygulamada çalışır (16.4+) ve izin kullanıcı hareketiyle istenir. Google servisleri olmayan Android cihazlarda (bazı Huawei modelleri) Chrome push'u çalışmaz. Agresif pil yönetimi. | Orta | Uygulama içi bildirim listesi, okunmamış sayısı, Bugün'deki "Yeni cevaplar" kartı; kurulum yönergesi; push hiçbir akışta tek kanal değildir |
| 9 | ~~Google Play hedef API, Families, kapalı test~~ | – | **Kapandı:** mağaza yok. Aşama 3'te TWA ile yeniden gündeme gelir. |
| 10 | Gönüllü arzı ve süreklilik | Orta | `max_students`, havuz, yönetici yeniden ataması |
| 11 | **Ekibin deneyimi:** React/Next.js'e yeni olması (Server ve Client Components sınırı, Server Action'ın herkese açık uç nokta olması, hidrasyon hataları, eski örneklerle karışan Next 16 API'leri) ve RLS hatasının veri sızıntısı demek olması | Yüksek | 3.6'daki "tek yol" kuralları, `defineAction` sarmalayıcısı, ESLint yasakları, H3'teki referans dikey dilim, `docs/web-gelistirme.md`, `kod-inceleyici` için Next.js kontrol listesi; pgTAP rol matrisi, erken (H2) ve final (H10) güvenlik incelemesi |
| 12 | Supabase anahtar geçişi | Düşük | Baştan publishable/secret anahtarlar; Vercel'de yalnızca publishable |
| 13 | **Safari'de MediaRecorder ve ses biçimleri:** Safari AAC/MP4, Chrome Opus üretir; eski iOS Opus çalmayabilir; WebM'de süre bilgisi yok; iOS ana ekran uygulamasında mikrofon izni farklı davranabilir | Orta | Biçim sırası (4.3.4), süre veritabanından gösterilir, yazılı özet zorunlu, spike; kesme listesinde 1. sırada |
| 14 | **PWA kurulum sürtünmesi:** iOS'ta elle "Paylaş → Ana Ekrana Ekle"; Android'de istem her zaman çıkmaz; kullanıcılar kurulumu bilmez | Orta | Kurulum isteğe bağlı, uygulama kurulmadan eksiksiz çalışır; adım adım yazılı yönerge; veli kılavuzunda anlatılır; iOS 26'da varsayılan olarak "web uygulaması" açılır |
| 15 | **Vercel Hobby koşulları ve sınırları:** yalnızca kişisel ve ticari olmayan kullanım; özel depoda iş birliği yok; aylık 4 CPU-saat ve 1M çağrı; aşımda 30 gün bekleme; tek bölge; nonce yüzünden tüm sayfalar dinamik | Orta | `fra1`, ölçüm (Faz B'den itibaren), H1'de yayın yöntemi doğrulanır. B planı: Cloudflare Workers Paid (5 USD/ay). Pilotta Vercel Pro veya Cloudflare. |
| 16 | **Sunucu tarafında yapılan girişler ve IP hız sınırı:** tüm Auth istekleri Vercel IP'sinden gider; deneme yanılma ve hizmet engelleme riski | Orta (pilotta) | Demoda kabul. Pilot öncesinde `Sb-Forwarded-For`, WAF veya veritabanı sayacı (Ş4). Çocuk şifresi için güçlü şifre kuralı. |
| 17 | **Service worker önbelleği:** ortak cihazda başka kullanıcının planının kalması, eski sürüme takılma | Orta | Yalnızca öğrenci rotaları önbelleğe alınır; çıkışta temizlik + `Clear-Site-Data`; HTTP `no-store`; "Yeni sürüm" bandı; SW kapatma sürümü |
| 18 | **XSS / CSP:** tek bir XSS çocuk verisine erişim demek; nonce dinamik render gerektirir; üçüncü taraf betik baskısı | Yüksek | Nonce'lu CSP (önce rapor modu, H9'dan itibaren zorunlu), dış betik yasağı, `dangerouslySetInnerHTML` yasağı, Markdown sunucuda güvenli işlenir, httpOnly oturum |
| 19 | **Tarayıcı ve cihaz çeşitliliği:** düşük bellekte büyük fotoğraf, eski Chrome, Samsung Internet, Huawei tarayıcısı | Orta | Destek matrisi (2. bölüm), kademeli küçültme, Playwright cihaz profilleri, gerçek cihaz turu |
| 20 | **Araç zinciri değişkenliği:** TypeScript 7 ve ESLint 10 ekosistemi henüz hazır değil; Next.js 17 dönem içinde çıkabilir | Düşük–Orta | Tam sürüm sabitleme (TS 6.0.3, ESLint 9.39, Next 16.4.x); teslimden önce ana sürüm yükseltmesi yok |
| 21 | **Alan adı değişikliği:** köken değişince PWA kurulumları ve push abonelikleri kaybolur | Düşük–Orta | Alan adı H1'de kesinleşir (Açık soru 2) |

## 13. Doğrulanan bilgiler ve kaynaklar (18 Ekim 2026)

- **Paket sürümleri ve uyumluluk:** npm kayıt defteri (`npm view`, 18.10.2026):
  - `next` 16.4.2 (16.4.0: 6 Ekim 2026; Next 17 yok, canary 16.5), `react` 19.3.1,
  - `typescript` 7.0.2 / 6.0.3 (`typescript-eslint` 8.71.2 yalnızca `<6.1.0` destekliyor),
  - `eslint` 10.13.0 / 9.39.5 (`eslint-plugin-jsx-a11y` 6.10.2 ve `eslint-plugin-react` ESLint ≤ 9 destekliyor),
  - `@supabase/ssr` 0.12.7, `react-aria-components` 1.22.1, `zod` 4.6.7, `@serwist/turbopack` 9.5.13, `vitest` 5.0.5, `@playwright/test` 1.64.1, `@axe-core/playwright` 4.14.0, `tailwindcss` 4.3.3.
- **Next.js'te TypeScript 7 desteği** (üçüncü taraf kaynaklar): [Achromatic](https://www.achromatic.dev/blog/nextjs-16-3-typescript-7-upgrade), [releases.sh](https://releases.sh/collections/frontend-frameworks/digest/2026-10-05)
- **Supabase SSR istemcisi** (Next 16'da `proxy.ts`, `getClaims()` önerisi): [Supabase docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- **Supabase Auth hız sınırları ve `Sb-Forwarded-For`** (yalnızca secret key ile): [Supabase rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- **Next.js CSP** (nonce dinamik render gerektirir, PPR uyumsuz, deneysel SRI): [Next.js CSP rehberi](https://nextjs.org/docs/app/guides/content-security-policy)
- **Next.js PWA rehberi** (manifest, Web Push, VAPID, Serwist önerisi): [Next.js PWA](https://nextjs.org/docs/app/guides/progressive-web-apps)
- **Serwist + Turbopack:** [serwist.pages.dev](https://serwist.pages.dev/docs/next/turbo)
- **Vercel Hobby** (sınırlar, ticari olmayan kullanım, iş birliği yok): [Vercel Hobby](https://vercel.com/docs/plans/hobby). Bölge: [Vercel regions](https://vercel.com/docs/functions/configuring-functions/region). Özel depo kısıtı (topluluk forumu): [Vercel Community](https://community.vercel.com/t/vercel-hobby-plan-deployment-blocked-because-commit-author-lacks-access/35446). DPF: [Vercel KB](https://vercel.com/kb/guide/is-vercel-certified-under-dpf)
- **Cloudflare Workers sınırları** (Free: istek başına 10 ms CPU, günde 100 bin istek): [Cloudflare limits](https://developers.cloudflare.com/workers/platform/limits/). [OpenNext Cloudflare](https://opennext.js.org/cloudflare)
- **Netlify fiyatlandırma** (Free: 300 kredi, bireysel): [Netlify pricing](https://www.netlify.com/pricing/)
- **iOS Web Push ve web uygulamaları:** [WebKit Declarative Web Push](https://webkit.org/?p=16535), [WebKit WWDC25 (iOS 26'da ana ekrandan web uygulaması varsayılan)](https://webkit.org/?p=16993), [heise](https://heise.de/-10749652)
- **MediaRecorder biçimleri:** [addpipe demo](https://addpipe.com/tech-demos/media-recorder-api-demo/), [caniuse Opus](https://caniuse.com/opus), [Apple Developer Forums](https://developer.apple.com/forums/thread/775937)
- **JaaS JWT özellikleri:** [8x8 JaaS JWT](https://developer.8x8.com/jaas/docs/api-keys-jwt). IFrame API: [8x8](https://developer.8x8.com/jaas/docs/iframe-api-integration), [jitsi.org](https://jitsi.org/iframe)
- **Deno için Web Push:** [JSR @negrel/webpush](https://jsr.io/@negrel/webpush/doc)
- **KVKK Çerez Rehberi:** [kvkk.gov.tr](https://kvkk.gov.tr/Icerik/7353/Cerez-Uygulamalari-Hakkinda-Rehber)
- **v1'den geçerliliğini koruyanlar:**
  - Supabase ücretsiz plan sınırları: [supabase.com/pricing](https://supabase.com/pricing)
  - Supabase yeni API anahtarları: [Supabase API keys](https://supabase.com/docs/guides/api/api-keys.md)
  - JaaS ve meet.jit.si'ye gömme: [jitsi.org/jaas](https://jitsi.org/jaas/), [JaaS fiyatlandırma](https://cpaas.8x8.com/en/pricing/jitsi-as-a-service-pricing/), [5 dakika sınırı notu](https://jitsi.org/blog/jitsi-moodle-with-a-dash-of-jaas/)
  - KVKK m.9: [Erdem & Erdem](https://www.erdem-erdem.av.tr/bilgi-bankasi/kisisel-verilerin-yurt-disina-aktarilmasinda-yasanan-son-gelismeler)
  - Maarif Modeli 2026-27: [Milliyet](https://www.milliyet.com.tr/7659867)
- **Doğrulanmadı (spike'ta denenecek):**
  - JaaS `disableDeepLinking`, `send-groupchat` ve araç çubuğu seçeneklerinin güncel adları,
  - iOS Safari'nin file input ile HEIC'i JPEG'e çevirip çevirmediği,
  - Vercel Hobby'de özel depodan yayın için hangi yöntemin çalıştığı,
  - `supabase functions deploy --use-api` ile Docker'sız yayın,
  - Netlify'ın kredi başına maliyetleri.

## 14. Açık sorular

1. **Vercel hesabı ve depo görünürlüğü:** Vercel Hobby hesabını ekipten kim sahiplenecek? Hobby'de özel depodan yalnızca hesap sahibinin commit'leri yayına çıkıyor. GitHub deposu özel kalıp birleştirmeleri bu kişi mi yapsın, yoksa depo herkese açık mı olsun?
2. **Alan adı:** Demo için `*.vercel.app` alt alan adı yeterli mi? Alan adı sonradan değişirse PWA kurulumları ve bildirim abonelikleri sıfırlanır. Özel (ücretli) alan adı isteniyorsa H1'de alınmalı.
3. **`app/` klasörü:** Arşivleme önerisini onaylıyor musunuz? Öneri: yeniden kullanılacaklar taşınır, ilk commit atılır ve `arsiv/flutter-v1` etiketi konur, sonra klasör silinir. Bunun için önce git kullanıcı adı ve e-postası tanımlanmalı.
4. **Test cihazları:** Ekipte gerçek bir iPhone (iOS 18.4+, tercihen 26) ve düşük donanımlı bir Android telefon var mı? iPhone yoksa iOS'ta push, ses ve görüntülü ders doğrulanamaz ve iOS desteği "denenmedi" olarak kalır.
5. **v1'den açık kalanlar:**
   - Haftalık konu tablosunu ve konu özetlerini kim hazırlayacak? H2'de başlaması gerekiyor.
   - Supabase, JaaS ve SMTP (Resend/Brevo) hesaplarını kim açacak? Ortak bir ekip e-postası önerilir.
