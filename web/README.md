# Eğitim Köprüsü: web uygulaması

Öğrenci, veli, gönüllü ve yönetici rollerinin kullandığı tek web uygulaması. **Next.js 16** (App Router) + **React 19** + **TypeScript 6**. Veritabanı ve giriş sistemi Supabase'dedir (bu klasörde değil, `../supabase/`). Neden bu seçimler yapıldı: `../docs/plan.md` bölüm 3 ve 4.

## Gereksinimler

- **Node 24** ve npm (`node -v` çıktısı `v24...` olmalı). Başka paket yöneticisi (yarn, pnpm) kullanılmaz.
- Docker gerekmez.

## İlk kurulum

```bash
cd web
npm ci                         # paketleri package-lock.json'daki sürümlerle kurar
npx playwright install chromium webkit firefox   # yalnızca uçtan uca testler için (bir kez)
npm run dev                    # http://localhost:3000
```

Supabase projesi henüz yoksa sorun değil: ana sayfa çalışır, terminalde sarı bir uyarı görürsün. Proje açılınca `.env.example` dosyasını `.env.local` olarak kopyalayıp doldur (aşağıda "Ortam değişkenleri").

> Next.js kullanım verisi toplar. Kapatmak için bir kez `npx next telemetry disable` çalıştır.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu (`localhost:3000`). Kaydettikçe sayfa yenilenir. |
| `npm run dev:https` | Aynısı, HTTPS ile. **iPhone/Safari ile denemek için şart** (oturum çerezi `Secure`). Kamera ve bildirim denemesi için de bunu kullan. |
| `npm run lint` | ESLint (kod + erişilebilirlik) ve Stylelint (CSS). |
| `npm run typecheck` | TypeScript tip denetimi. |
| `npm test` | Vitest: birim ve bileşen testleri (saniyeler sürer). |
| `npm run build` | Üretim derlemesi. Öncesinde ve sonrasında **güvenlik denetimleri** de çalışır (aşağıda). |
| `npm start` | Derlenmiş uygulamayı çalıştırır (önce `build`). |
| `npm run test:e2e` | Playwright: 4 profilde tarayıcı testleri (önce `npm run build`). |
| `npm run test:e2e:kisa` | Aynısı, yalnızca `@kisa` etiketli kısa set (CI bunu çalıştırır). |
| `npm run kontrol` | lint + typecheck + test. **Commit'ten önce çalıştır.** |
| `npm run tokens` | `src/styles/palette.json` (renklerin tek kaynağı) dosyasından `tokens.css` renk bölümünü yeniden üretir. Renk değiştirmek için **önce JSON'u** düzenle. |
| `npm run tokens:check` | `tokens.css` renk bölümü JSON ile aynı mı? (CI ve testler kullanır.) |
| `npm run icons` | Kullanılan Material Symbols ikonlarını indirip `src/components/icons/icon-paths.ts` dosyasına yazar. **Yalnızca ikon eklerken** gerekir; derlemede ağ erişimi yoktur. |

CI (`.github/workflows/ci.yml`) her push ve pull request'te bunları ve `tools/db-check` testlerini çalıştırır.

## Testler

- **Vitest** (`*.test.ts(x)` dosyaları, kodun yanında): hızlı testler. Bileşen testleri Testing Library ile "kullanıcı ne görür?" diye yazılır (`getByRole`, `getByText`). `tests/static/` altındaki testler ESLint/Stylelint yasaklarının ve gizli anahtar denetiminin gerçekten çalıştığını kanıtlar.
- **Playwright** (`e2e/`): gerçek tarayıcıda üretim derlemesini dener. Profiller: `android-telefon` (Chromium, Pixel 7), `iphone` (WebKit, iPhone 15), `masaustu-chrome`, `masaustu-firefox`. Playwright'ın WebKit'i gerçek Safari değildir; gerçek iPhone denemesi ayrıca yapılır. Ana sayfa için axe erişilebilirlik testi, güvenlik başlığı ve "dış siteye istek yok" testi vardır.
- Rapor: başarısız testte `npx playwright show-report` (CI'da rapor artifact olarak saklanır).

## Klasör yapısı

```
web/
├── src/
│   ├── app/            sayfalar ve adresler (klasör adı = adres). layout.tsx tüm sayfaları sarar.
│   │   ├── page.tsx        ana sayfa (/)
│   │   ├── api/health/     sağlık kontrolü (/api/health)
│   │   └── api/csp-report/ tarayıcının güvenlik ihlali raporları
│   ├── proxy.ts        HER istekte çalışır: güvenlik başlıkları (CSP) + oturum yenileme
│   ├── server/         YALNIZCA SUNUCUDA çalışan kod (Supabase istemcisi burada). Dosyalar `import 'server-only'` ile başlar.
│   ├── lib/            saf yardımcılar (Türkçe harf, güvenlik başlıkları, çerez kuralları); kolay test edilir
│   ├── strings/        Türkçe arayüz metinleri (metinler bileşenlere gömülmez)
│   ├── styles/         tokens.css (renkler/boyutlar), global.css
│   └── test/           test ortamı ayarları
├── e2e/                Playwright senaryoları
├── tests/static/       yasakların çalıştığını gösteren testler
├── scripts/            derleme öncesi/sonrası güvenlik denetimleri
├── .env.example        ortam değişkeni örneği
└── vercel.json         Vercel ayarı (fra1 bölgesi)
```

Tasarım sistemi klasörleri: `src/components/` (ortak bileşenler, her biri `.module.css` ile), `src/features/gallery/` (yalnızca geliştirmede açılan `/galeri`), `assets/fonts/` (kendi sunucumuzdan sunulan yazı tipi + `OFL.txt`). Plandaki diğer klasörler (`client/`, `validation/`) ilk ihtiyaçta eklenecek (plan bölüm 8).

## Tasarım sistemi (kısa)

Ayrıntı: `../docs/tasarim-sistemi.md` (kurallar), `../docs/ekran-akislari.md` (ekranlar).

- **Renk, boşluk, köşe, yazı boyutu** yalnızca `src/styles/tokens.css` içindedir (renk bölümü `palette.json`'dan üretilir). Dört tema: açık, koyu, açık yüksek kontrast, koyu yüksek kontrast. Tetikleyiciler: `prefers-color-scheme`, `prefers-contrast: more`, uygulama içi `data-theme`. Tüm boyutlar `rem` olduğundan %200 ve %400 yazıda düzen taşmaz.
- **Tema tercihi** yalnızca kullanıcı değiştirince `localStorage`'a (`ek-gorunum`) yazılır; sunucuya gitmez. İlk boyamadan önce nonce'lu küçük bir betik uygular (`src/lib/appearance-script.ts`), böylece sayfa renk değiştirerek yanıp sönmez.
- **Yazı tipi:** Atkinson Hyperlegible Next (WOFF2, Latin + Türkçe alt küme, toplam yaklaşık 48 KB). Yalnızca Regular önyüklenir. Nasıl üretildiği: `assets/fonts/README.md`.
- **Bileşenler:** önce yerel HTML (`<button>`, `<a>`, `<input>`, `<dialog>`). Tıklanabilir kartın tamamı tek `<a>` ya da `<button>`'dır. Metinler `src/strings/tr.ts` içindedir, ünlem işareti kullanılmaz (test denetler).
- **Galeri:** `npm run dev` ile `/galeri`. Üretim derlemesinde 404 verir; `GALLERY=on` yalnızca yerelde `next start` ile denemek içindir ve Vercel production ortamında kod tarafından zaten yok sayılır. Orada 4 tema ve yazı ölçeği (%200 dahil) denenebilir.

## React'e yeni başlayanlar için üç kural

1. **Varsayılan: Server Component.** Bu dosyalar sunucuda çalışır ve doğrudan veritabanından okuyabilir. Dosyanın başına `'use client'` yalnızca tarayıcı özelliği (kamera, mikrofon, localStorage) ya da anlık etkileşim gerekiyorsa yazılır. Ayrıntı: `../docs/plan.md` bölüm 3.6.
2. **Yazma işlemleri Server Action ile** (formlar `<form action={...}>`). Girdi sunucuda Zod ile doğrulanır.
3. **Her yeni metin `src/strings/` içine**, her yeni renk/boyut `tokens.css` içine yazılır.

## Otomatik yasaklar (ESLint ve Stylelint hata verir)

| Yasak | Neden |
|---|---|
| Tarayıcıda Supabase (`createBrowserClient`, bileşenlerde `@supabase/*` importu) | Oturum httpOnly çerezdedir; tarayıcıda Supabase istemcisi yoktur. Sunucuda `@/server/supabase` kullan. |
| `dangerouslySetInnerHTML` | XSS riski. |
| Çıplak `toUpperCase()` / `toLowerCase()` | Türkçe `i/İ` ve `ı/I` bozulur. `@/lib/turkish` içindeki `upperTr`, `lowerTr`, `lowerAscii` kullan. |
| `process.env` ile `SECRET`/`SERVICE_ROLE`/`PRIVATE` adlı değişken okumak | Web uygulamasında gizli anahtar yoktur. |
| CSS'te ham renk (`#fff`, `red`, `rgb()`), `px` ile yazı boyutu | Renkler `tokens.css` değişkenlerinden gelir (`var(--color-...)`); yazı boyutu `rem` ile. |
| Erişilebilirlik hataları (`jsx-a11y` strict) | Alt metinsiz görsel, klavyeyle erişilemeyen tıklanabilir `div` vb. |

Dış CDN, Google Fonts, analitik ve üçüncü taraf betik **yoktur** (çocuk gizliliği). Yazı tipleri ve ikonlar kendi sunucumuzdan sunulur.

## Ortam değişkenleri

Dosya: `web/.env.local` (git'e girmez). Örnek: `.env.example`.

| Değişken | Açıklama |
|---|---|
| `SUPABASE_URL` | Supabase proje adresi |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_` ile başlayan anahtar |

- **Hiçbir değişken `NEXT_PUBLIC_` ile başlamaz.** Next.js bu önekli değerleri tarayıcıya gönderir. Tarayıcıda Supabase kullanılmadığı için gerek de yoktur.
- **`sb_secret_` anahtarı bu klasörde hiçbir yerde olmaz** (Vercel'de de yok). `npm run build` bunu otomatik denetler: önce (`scripts/check-env.mjs`) `NEXT_PUBLIC_` ile anahtar tanımı ve `.env` dosyalarındaki gizli anahtarı arar; sonra (`scripts/check-client-bundle.mjs`) tarayıcıya giden `.next/static` içinde `sb_secret`, Google/CDN adresleri ve gizli değer izi arar. Bulursa derleme **başarısız** olur.
- Değişkenler eksikse uygulama çökmez. Geliştirmede terminale açıklayıcı uyarı yazılır; üretimde kullanıcı genel bir hata sayfası görür ve günlüğe yalnızca eksik değişkenin adı yazılır.

## Oturum çerezi

Giriş bilgisi tarayıcıda **httpOnly + Secure + SameSite=Lax** çerezde tutulur (JavaScript okuyamaz). Kurallar `src/lib/session-cookies.ts` içindedir ve test edilir.

- **Varsayılan: tarayıcı oturumu çerezi.** `Max-Age`/`Expires` yoktur, tarayıcı kapanınca silinir. Gerekçe: KVKK Çerez Rehberi, tarayıcı oturumları arasında kalıcı olan giriş çerezini "zorunlu" saymaz (`../docs/hukuk/cerez-politikasi.md`). `@supabase/ssr` kendiliğinden 400 günlük çerez yazar ve `cookieOptions.maxAge` ayarını bile ezer; bu yüzden düzeltme, çerez yazılırken `setAll` içinde yapılır (`proxy.ts` ve `src/server/supabase.ts`).
- **"Bu cihazda oturumum açık kalsın"** (girişte, varsayılanı **boş**): işaretlenirse oturum çerezleri **30 gün** yaşar. Tercih, ayrıca `ek-kalici-oturum` çerezinde saklanır (yalnızca kutu işaretlenirse yazılır). Giriş ekranı Faz A'da yazılacak; hazır parçalar:
  ```ts
  const supabase = await createSupabaseServerClient({ remember });  // jeton bu tercihle yazılır
  await supabase.auth.signInWithPassword({ email, password });
  await setRememberChoice(remember);                                 // tercih çerezini yaz/sil
  // Çıkışta: await setRememberChoice(false)
  ```
- Çıkış yapılırken Supabase'in çerez silmesi (`Max-Age=0`) bozulmaz.
- Safari `http://localhost` adresinde `Secure` çerezi kaydetmez; iPhone ile yerelde denerken `npm run dev:https` kullan.

## Güvenlik başlıkları ve CSP

`src/proxy.ts` her istekte yeni bir **nonce** üretir ve plan 9.1'deki başlıkları ekler (`Referrer-Policy: no-referrer`, `Permissions-Policy`, HSTS (yalnızca üretimde), `X-Content-Type-Options`, `X-Frame-Options`, `Cross-Origin-Opener-Policy`; oturumlu isteklere `Cache-Control: private, no-store`).

- **CSP şimdilik yalnızca RAPOR modunda** (`Content-Security-Policy-Report-Only`): ihlaller engellenmez, `/api/csp-report` adresine bildirilir. Zorunlu moda geçmek için `src/lib/security-headers.ts` içinde `CSP_ENFORCED = true` yapılır (plan: H9).
- Nonce'un çalışması için sayfaların her istekte sunucuda üretilmesi gerekir; bu yüzden `layout.tsx` içindeki `export const dynamic = 'force-dynamic'` satırı **silinmemelidir**. `cacheComponents` ve PPR açılmaz.
- Satır içi `<script>` yazman gerekirse nonce'u `(await headers()).get('x-nonce')` ile al.

## Sağlık kontrolü

`GET /api/health` → `{"status":"ok"}` (kimlik doğrulama ve Supabase yok; yalnızca "sunucu ayakta mı?").

## Yayın (Vercel)

`vercel.json` fonksiyon bölgesini `fra1` (Frankfurt) yapar. Hesap açma, ortam değişkenleri ve ilk yayın adımları: devops raporunda ve `../docs/plan.md` bölüm 3.9–3.10. Yayını yalnızca proje sahibi onayıyla yapılır.

## Sık karşılaşılan sorunlar

- **`npm run dev` ilk açılışta `AGENTS.md` oluşturdu:** Next.js'in yapay zekâ ajanları için eklediği bir nottur; repoda kalması normaldir.
- **Windows'ta Playwright Firefox açılmıyor ("yan yana yapılandırma"):** "Microsoft Visual C++ Redistributable (x64)" kurulumu gerekebilir. CI'da Linux üzerinde sorunsuz çalışır.
- **Port 3000 dolu:** `npm run dev -- --port 3001`.
- **Tip hatası "Cannot find module '*.css'" ya da `.next/types` bulunamadı:** `npm run typecheck` çalıştır (önce `next typegen` yapar).
