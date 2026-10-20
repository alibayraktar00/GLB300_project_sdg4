# Kişisel Veri İşleme Envanteri: Eğitim Köprüsü

> **TASLAKTIR – Yayınlamadan önce bir avukat tarafından incelenmelidir.** Bu belge avukat görüşünün yerini tutmaz.
> Sürüm v0.2 · 18.10.2026 · Hazırlayan: hukuk ajanı.
> **v0.1'den farkı:** Ürün tek bir web uygulamasına (Next.js, PWA) geçti. Firebase (FCM, Hosting), Firebase installation ID ve Google CDN çıktı. Vercel, tarayıcı push servisleri ve cihazda tutulan veriler eklendi.
> **Dayanak:** `docs/plan.md` v2 (Bölüm 3.7, 3.9, 4.3, 9.3, 9.5), `docs/veri-modeli.md`, `supabase/migrations/`. Web kodu henüz yazılmadığı için envanter **plana göre** çıkarıldı. Her fazın sonunda koda göre güncellenmelidir.

## 0. Kapsam ve roller

| Konu | Durum |
|---|---|
| Demo (GLB300, teslim Ocak 2027) | Yalnızca sahte veri ve test kullanıcıları kullanılır. Gerçek kişisel veri olarak yalnızca yetişkin ekip üyelerinin ve test kullanıcılarının e-posta adresi, IP adresi ve tarayıcı bilgisi işlenir. **Gerçek çocuk verisi işlenmez.** |
| Gerçek pilot | Envanter `[VERİ SORUMLUSU]` belirlendikten sonra kesinleşir. VERBİS kaydı gerekiyorsa sicil bildirimiyle uyumlu olmalıdır. |
| Veri sorumlusu | `[VERİ SORUMLUSU]`. Öneri: kurumsal bir tüzel kişi (üniversite, STK). |
| Veri işleyenler | Supabase (veritabanı, Auth, dosya, sunucu fonksiyonları); **Vercel** (barındırma, sunucu fonksiyonları, CDN); 8x8 (JaaS görüntülü ders); Resend veya Brevo (e-posta). Bkz. §4. |
| Sözleşme ilişkimiz olmayan alıcı | **Tarayıcı push servisleri** (Google, Apple, Mozilla, Microsoft). Yalnızca bildirimi açan kullanıcılar için. Nitelikleri §4.2'de değerlendirildi. |
| Veri sorumlusu bünyesindeki yetkililer | Yöneticiler. Gizlilik taahhüdü imzalarlar. |
| İlgili kişi grupları | Veli, öğrenci (çoğu 10–14 yaş), gönüllü, yönetici; ayrıca oturum açmamış ziyaretçiler (herkese açık sayfalar). |

**Hukuki sebep kısaltmaları** (6698 sayılı KVKK, güncel metin doğrulandı):
- **SÖZ**: m.5/2-c, sözleşme. Veli, kullanım koşullarını kendi adına ve yasal temsilci olarak çocuk adına kabul eder (TMK m.342). Çocuğun "taraf" sayılması avukatça teyit edilmelidir; teyit edilmezse yedek dayanak MM'dir.
- **HY**: m.5/2-ç, hukuki yükümlülük.
- **HAK**: m.5/2-e, bir hakkın tesisi, kullanılması veya korunması.
- **MM**: m.5/2-f, meşru menfaat (ağırlıklı olarak çocuk güvenliği ve bilgi güvenliği).
- **ÖAR**: m.6/3-a, özel nitelikli veri için açık rıza.

Saklama kodları (SK-xx) `saklama-ve-imha.md` dosyasına atıf yapar.

## 1. Veli

| # | Veri kategorisi | Veriler | Amaç | Hukuki sebep | Saklama | Alıcılar |
|---|---|---|---|---|---|---|
| V1 | Kimlik ve iletişim | `auth.users.email`, şifre özeti, `profiles.display_name` | Hesap, giriş, OTP, hizmet bildirimleri | SÖZ | SK-01 | Supabase, Vercel (geçiş), e-posta sağlayıcı |
| V2 | Veli–çocuk ilişkisi | `guardian_students.relation`, yasal temsilci beyanı | Yetki, çocuk adına işlem | SÖZ, MM | SK-02 | Supabase |
| V3 | Aydınlatma, rıza ve sözleşme kayıtları | `consents` (`channel = 'web'`, web derleme sürümü) | İspat | HY, HAK | SK-15 | Supabase |
| V4 | Hizmet işlemleri | Eşleşme onayı, randevu, özellik anahtarları (`student_features`), engelleme (`volunteer_blocks`), derse katılım (`session_events`) | Hizmet, veli denetimi | SÖZ, MM | SK-08, SK-09, SK-14 | Supabase, JaaS |
| V5 | Canlı görüntü ve ses | Derse katılırsa kamera ve mikrofon akışı (**kaydedilmez**) | Canlı ders | SÖZ | Kaydedilmez | 8x8 (tarayıcı doğrudan bağlanır) |
| V6 | Güvenlik kayıtları | `reports`, `audit_log` | Çocuk güvenliği, hesap verebilirlik | MM, HAK | SK-11, SK-13 | Supabase |
| V7 | Bağlantı ve tarayıcı | IP, tarayıcı bilgisi, istenen adres (Vercel istek ve çalışma logları; Supabase Auth ve API logları); **isteğe bağlı** push aboneliği (`push_subscriptions`: endpoint, şifreleme anahtarları) | Güvenlik, barındırma, bildirim | SÖZ, MM; 5651 kapsamındaysa HY | SK-17, SK-18, SK-25 | Vercel, Supabase, push servisi |
| V8 | Veri sahibi başvuruları | Başvuru ve cevap | KVKK m.13 | HY | SK-19 | – |

## 2. Öğrenci (reşit olmayan)

| # | Veri kategorisi | Veriler | Amaç | Hukuki sebep | Saklama | Alıcılar |
|---|---|---|---|---|---|---|
| Ö1 | Hesap | Rumuz (`profiles.display_name`), `students.username`, şifre özeti, sentetik e-posta | Giriş | SÖZ | SK-02 | Supabase |
| Ö2 | Eğitim bilgisi | `students.grade`, `recovery_plans` (devamsızlık tarih aralığı, günlük hedef), `plan_items` | Telafi planı | SÖZ + **ÖAR** (§3) | SK-03 | Supabase. Gönüllü yalnızca konu listesini görür (`matched_student_plan_items`); tarihleri görmez. |
| Ö3 | Görünüm tercihleri | Yazı boyutu, tema, yüksek kontrast, hafif mod, son seçilen mod | Arayüz | SÖZ (kullanıcının seçtiği ayar) | Cihazda (SK-24) | **Sunucuya gitmez** (Ş3). `students.prefs` kullanılmaz. |
| Ö4 | Soru-cevap içeriği | `questions`, `question_messages.body`, `attachments` (fotoğraf, ses). Fotoğraftaki EXIF ve konum bilgisi yüklemeden önce **tarayıcıda** silinir. | Soru-cevap | SÖZ; içerikte kendiliğinden geçebilecek sağlık bilgisi için ÖAR | SK-04, SK-05 | Supabase, Vercel (geçiş), gönüllü, veli |
| Ö5 | Canlı ders | `sessions`, `session_events`, canlı görüntü/ses (**kaydedilmez**) | Ders, çocuk güvenliği | SÖZ, MM | SK-08, SK-09 | Supabase, 8x8, gönüllü, veli |
| Ö6 | Uygunluk | `availability_slots` | Randevu | SÖZ | SK-02 | Eşleşmiş gönüllü |
| Ö7 | Güvenlik ve moderasyon | `moderation_flags.original_body`, `reports`, `audit_log` | Çocuk güvenliği | MM, HAK; 5651 kapsamındaysa HY | SK-10, SK-11, SK-13 | Yönetici |
| Ö8 | Bağlantı ve tarayıcı | IP, tarayıcı bilgisi (Vercel ve Supabase logları); isteğe bağlı push aboneliği | Güvenlik, bildirim | SÖZ, MM | SK-17, SK-18, SK-25 | Vercel, Supabase, push servisi |
| Ö9 | Çıkarım riski | "Platformun kullanıcısı olmak" + devamsızlık tarihleri + içerik | – (amaç değil, yan etki) | **ÖAR** (§3) | – | – |

**Toplanmayanlar:** hastalık, tanı veya engel türü; devamsızlık nedeni; TC kimlik no; öğrencinin soyadı, okulu, doğum tarihi ve telefonu; konum; reklam kimliği; tarayıcı parmak izi.

## 3. Dolaylı sağlık verisi değerlendirmesi

**Risk.** Hedef kitle "sağlık sorunu, engel veya uzun devamsızlık" nedeniyle okula gidemeyen öğrencilerdir. Şu bilgiler birleştiğinde bir sağlık durumu çıkarılabilir:
- platformun kullanıcısı olmak,
- devamsızlık tarihleri,
- görünüm tercihleri (büyük yazı, yüksek kontrast),
- serbest metin ve fotoğraflar.

**Web'e özgü yeni çıkarım yolları:**
- Dış sitelere giden yönlendiren bilgisi (referrer),
- push bildirimlerinin kilit ekranında ve push servisinde görünen üst verisi,
- ortak cihazda kalan önbellek.

**Mevzuat.**
- KVKK m.6/1 sağlığı özel nitelikli veri sayar. Bu faaliyete uyan tek işleme şartı m.6/3-a'daki açık rızadır (doğrulandı).
- Kurul, okul rehberlik testinden çıkan ruh sağlığı bilgisi için veli açık rızası aradı (2020/255).
- AB Adalet Divanı dolaylı çıkarımı da özel nitelikli sayıyor (C-184/20).
- Kurul'un dolaylı çıkarım hakkında doğrudan bir kararı bulunamadı. **Doğrulanmalı.**

**Karar (taslak).** Veri "olası özel nitelikli veri" olarak ele alınır.

1. **Önce azaltma:**
   - Kamuya açık her yerde nötr dil kullanılır ("derslere ara vermek zorunda kalan öğrenciler").
   - Görünüm tercihleri cihazda tutulur ve sunucuya gitmez.
   - Gönüllü devamsızlık tarihlerini görmez.
   - **`Referrer-Policy: no-referrer`** kullanılır. Böylece EBA gibi dış sitelere kullanıcının "Eğitim Köprüsü'nden geldiği" bilgisi gitmez.
   - Push metinleri ve `Topic` başlığı geneldir.
   - Oturum ve önbellek ortak cihazda kalmayacak biçimde tasarlanır (`cocuk-koruma-kurallari.md` A12–A15).
   - Kurul'un 2018/10 sayılı yeterli önlemler kararındaki tedbirler uygulanır.
2. **Kalan risk için veli açık rızası (AR-1):** Bkz. `acik-riza-veli.md`. AR-1 olmadan çocuk hesabı açılamaz. Rızanın hizmete şart koşulması **avukat tarafından değerlendirilmelidir.**

**VERBİS etkisi.** "Ana faaliyet konusu özel nitelikli veri işleme" sayılırsa istisna eşiği 10 çalışan / 10 milyon TL olur (Kurul 2025/1572). **Avukat değerlendirmeli.**

## 4. Alıcılar ve yurt dışına aktarım

KVKK m.9'a göre (2024 değişikliği, doğrulandı) yurt dışına aktarım şu sırayla mümkündür:
- yeterlilik kararı,
- yoksa uygun güvence. Pratikte bu, **Kurul'un standart sözleşmesidir.** Sözleşme değiştirilmeden kullanılır ve imzadan sonra **5 iş günü içinde** Kurum'a bildirilir (m.9/5).
- bunlar da yoksa yalnızca **arızi** aktarım (m.9/6).

**Düzenli aktarım açık rızaya dayandırılamaz.** Yurt dışındaki sunucuda saklama da aktarımdır (Yönetmelik m.4/1-e). AB-ABD Veri Gizliliği Çerçevesi (DPF) sertifikası KVKK için bir güvence değildir.

### 4.1 Veri işleyenler

| Alıcı | Rol | Veri | Konum | Gereken güvence | Durum |
|---|---|---|---|---|---|
| Supabase | Veri işleyen | Tüm uygulama verisi, dosyalar, Auth logları. Auth istekleri sunucudan gittiği için Supabase loglarında çoğunlukla Vercel'in IP'si görünür. | AWS Frankfurt (eu-central-1). Sözleşme tarafı güncel DPA'da Supabase Pte. Ltd. (Singapur); **doğrulanmalı**. | Standart sözleşme + bildirim | Pilot öncesi |
| **Vercel Inc.** | Pro ve Enterprise DPA'sına göre müşteri verisi için veri işleyen. Vercel, servisin ürettiği veriler (ör. loglar) için kendini veri sorumlusu sayıyor. **DPA Hobby planını kapsamıyor.** | Tüm HTTP istekleri: IP, tarayıcı bilgisi, adres, zaman. Sunucuda üretilen sayfa içeriği ve form verileri (geçici). Geçen dosyalar (≤ 3 MB). Çalışma zamanı logları (Hobby'de 1 saat). İstek loglarının süresi **doğrulanmalı.** | ABD şirketi. Fonksiyonlar `fra1` (Frankfurt), CDN küresel. | Standart sözleşme + bildirim. Pilotta **Pro plan + DPA** gerekir; Hobby yalnızca sahte veriyle yapılan demo için uygundur. | Pilot öncesi |
| 8x8 (JaaS) | Veri işleyen | Tarayıcı `8x8.vc` iframe'ine **doğrudan** bağlanır: canlı görüntü/ses (kaydedilmez), görünen ad (rumuz / "Ad S."), IP, tarayıcı bilgisi, iframe içindeki çerez ve yerel bellek. JWT yalnızca oda ve rol bilgisi taşır. | ABD merkezli; veri bölgesi **doğrulanmalı** | Standart sözleşme + bildirim. İmzalamazsa alternatif: Türkiye'de barındırılan Jitsi sunucusu. | Pilot öncesi |
| Resend **veya** Brevo | Veri işleyen | Veli ve gönüllünün e-posta adresi, OTP ve hizmet e-postalarının içeriği | Resend: ABD; Brevo: Fransa/AB. **Doğrulanmalı.** | Standart sözleşme + bildirim | Pilot öncesi |

### 4.2 Tarayıcı push servisleri (sözleşme ilişkimiz yok)

**Kim.** Abonelik adresini kullanıcının tarayıcısı belirler:
- Chrome, Samsung Internet ve Chromium tabanlı tarayıcılar: Google (`fcm.googleapis.com`). Firebase SDK'sı kullanılmıyor, ama Chrome'un push servisi Google'dır.
- Safari: Apple (`*.push.apple.com`).
- Firefox: Mozilla (`updates.push.services.mozilla.com`).
- Edge: Microsoft (`*.notify.windows.com`).

**Ne gider.**
- Abonelik adresi: servisin tarayıcıya verdiği takma adlı bir kimlik.
- **Şifreli yük** (RFC 8291). Servis içeriği okuyamaz.
- Açık üst veriler: gönderim zamanı, TTL, `Urgency`, `Topic`, yük boyutu.
- Gönderen sunucunun IP'si (Supabase Edge Function).
- VAPID açık anahtarı ve ekip iletişim adresi.

Servis bu abonelik adresini kendi tarafında tarayıcı ve cihazla eşleştirebilir. Bu yüzden gönderilen veri, servis açısından kişisel veridir.

**Hukuki nitelik (değerlendirme):**
1. **Veri işleyen değildir.** Hizmeti biz seçmedik, servis bizim talimatımızla çalışmıyor ve aramızda bir sözleşme yok. Servis, kullanıcının kullandığı tarayıcının parçasıdır ve kullanıcı ile tarayıcı sağlayıcısı arasındaki koşullara tabidir.
2. **En uygun nitelik:** İletinin, ilgili kişinin kendi seçtiği iletişim kanalıyla **kendisine teslim edilmesi.** Durum, bir e-postanın alıcının kendi e-posta sağlayıcısına teslim edilmesine benzer. Bu görüşe göre servis kendi faaliyeti bakımından bağımsız veri sorumlusudur ve bizim açımızdan m.9 anlamında bir "alıcıya aktarım" oluşup oluşmadığı tartışmalıdır.
3. **Temkinli görüş:** Bu bir yurt dışı aktarım sayılırsa güvence kurulamaz. Yeterlilik kararı yok. Sözleşme ilişkisi olmadığı için standart sözleşme imzalanamaz. m.9/6'daki istisnalar da yalnızca **arızi** aktarım içindir; düzenli bildirimleri kapsamaz.

**Karar (taslak).**
- Push **isteğe bağlıdır** ve yalnızca kullanıcının **açık talebiyle** açılır (ayar veya bant). Açmadan hemen önce servis ve görebildiği üst veri tek cümleyle anlatılır (`cocuk-koruma-kurallari.md` A6).
- İçerik şifreli ve geneldir; `Topic` başlığı opaktır.
- Push hiçbir akışta tek kanal değildir; uygulama içi bildirim listesi her zaman vardır.
- Bu tasarım (2) numaralı nitelemeyi destekler ve riski en aza indirir.
- **Pilot öncesinde avukat görüşü alınır.** Görüş olumsuzsa push pilotta kapatılır.
- Öğrenci de push'u kendisi açabilir. Bu, veli aydınlatmasında yazılıdır. İstenirse veli özellik anahtarlarına "Bildirimler" eklenebilir (öneri).

### 4.3 Diğer alıcılar
- **Eşleşen gönüllü:** rumuz, sınıf, soru-cevap, plan konu listesi, uygunluk. Taahhütname ve gizlilik yükümlülüğü altındadır.
- **Yetkili kurumlar:** yalnızca yasal talep üzerine (HY).
- **EBA ve diğer dış kaynaklar:** Platform veri göndermez ve yönlendiren bilgisi de gitmez. Kullanıcı bağlantıya tıklarsa o siteye kendisi gider.
- **GitHub:** Yalnızca kaynak kod ve sahte seed verisi tutulur; kullanıcı verisi bulunmaz.
- **Çıkanlar (v0.1'e göre):** Google Firebase (FCM, Hosting), Firebase installation ID, Google CDN (gstatic). Yazı tipleri, ikonlar ve Jitsi `external_api.js` kendi alan adımızdan sunulur.

**GDPR notu:** Ürün AB'deki kişileri hedeflemiyor. Sunucuların Frankfurt'ta olması, veri sorumlusunu tek başına GDPR'a tabi kılmaz (GDPR m.3).

## 5. Gönüllü

| # | Veri kategorisi | Veriler | Amaç | Hukuki sebep | Saklama | Alıcılar |
|---|---|---|---|---|---|---|
| G1 | Kimlik ve iletişim | Ad, soyad, `.edu.tr` e-posta, şifre özeti, görünen ad ("Ad S.") | Başvuru, hesap | SÖZ | SK-01 | Supabase, Vercel (geçiş), e-posta sağlayıcı |
| G2 | Öğrenim bilgisi | Üniversite, bölüm, sınıf | Uygunluk, eşleştirme | SÖZ, MM | SK-01 | Yönetici. Veli "Ad S." + üniversite + bölüm görür; öğrenci "Ad S." görür. |
| G3 | Öğrenci belgesi | Belge dosyası. Belgede ad, soyad, TC kimlik no ve okul bilgisi bulunabilir. | Öğrencilik doğrulaması | SÖZ, MM | **SK-06: karar sonrası ≤ 30 gün** | Yalnızca yönetici (tarayıcıda görüntüleme) |
| G4 | Ders, sınıf ve uygunluk | `volunteer_subjects`, `availability_slots` | Eşleştirme | SÖZ | SK-01 | Yönetici, eşleşmiş öğrenci ve veli |
| G5 | Eğitim ve quiz | `training_attempts` | Yeterlilik kanıtı | SÖZ, MM, HAK | SK-07 | Yönetici |
| G6 | Taahhüt ve kurallar | `consents` | İspat | SÖZ, HAK | SK-15 | – |
| G7 | Cevaplar | Mesaj, fotoğraf, ses kaydı + yazılı özet, ders notu; cevap taslağı (yalnızca cihazda) | Hizmet | SÖZ | SK-04, SK-05, SK-08, SK-24 | Öğrenci, veli, yönetici |
| G8 | Canlı ders | Görüntü/ses akışı (kaydedilmez), ekran paylaşımı (yalnızca gönüllü), `session_events` | Ders, güvenlik | SÖZ, MM | SK-09 | 8x8, öğrenci, veli |
| G9 | Değerlendirme ve denetim | Onay/ret gerekçe kodu, `reports`, `moderation_flags`, askıya alma, `audit_log`, silinen gönüllünün kimlik bağlantısı | Çocuk güvenliği | MM, HAK | SK-10–SK-13, SK-16 | Yönetici |
| G10 | **Adli sicil (yalnızca pilotta karar verilirse)** | Yalnızca "görüldü/uygun", tarih, doğrulayan. Belge saklanmaz. | Çocuk güvenliği | **ÖAR** (m.6/1, ceza mahkûmiyeti) | SK-07 | Yalnızca yönetici |
| G11 | Bağlantı ve tarayıcı | IP, tarayıcı bilgisi, isteğe bağlı push aboneliği | Güvenlik, bildirim | SÖZ, MM | SK-17, SK-18, SK-25 | Vercel, Supabase, push servisi |

## 6. Yönetici ve ziyaretçi

| # | Veri | Amaç | Hukuki sebep | Saklama |
|---|---|---|---|---|
| Y1 | Ad, e-posta, TOTP MFA faktörü | Hesap, yetki | Görev ilişkisi / MM | Görev süresi + SK-01 |
| Y2 | `audit_log` (işlemi yapan olarak); belge ve `original_body` görüntüleme kayıtları | Hesap verebilirlik | MM, HY (KVKK m.12) | SK-13 |
| Z1 | **Oturum açmamış ziyaretçi:** IP, tarayıcı bilgisi ve adres (Vercel logları); hesap silme sayfasında girilen e-posta (OTP için) | Barındırma, güvenlik, silme talebi | MM, HY | SK-18, SK-25 |

## 7. Cihazda tutulan veriler (sunucuya gitmez ya da yalnızca kullanıcının cihazında kalır)

| # | Ne | Nerede | Kim yazar | Silinme |
|---|---|---|---|---|
| C1 | Oturum çerezi (httpOnly) | Çerez | Sunucu | Çıkış; tarayıcı oturumu veya kullanıcı seçerse `[30 gün]` (`cerez-politikasi.md`) |
| C2 | Görünüm tercihleri, hafif mod, son seçilen mod | localStorage | İstemci, yalnızca kullanıcı bir ayarı değiştirince | Çıkış, "Bu cihazdaki kayıtlı verileri temizle" |
| C3 | Gönüllü cevap taslağı | localStorage | İstemci | Gönderince, çıkışta, en fazla `[7 gün]` |
| C4 | Öğrenci sayfalarının çevrimdışı kopyası (plan, Bugün, konu özetleri) | Cache Storage | Service worker, yalnızca öğrenci "internetsiz de açılsın" derse | Çıkış, 14 gün, temizle düğmesi |
| C5 | Push aboneliği | Tarayıcı + sunucu (`push_subscriptions`) | Kullanıcı isteğiyle | Çıkış, kapatma, 404/410, 60 gün (SK-17) |
| C6 | 8x8 iframe'inin kendi çerez ve belleği | `8x8.vc` alanı (bölümlenmiş) | 8x8 | 8x8'in süresi; **doğrulanmalı** |

**Not.** Hesap silindiğinde sunucu bu cihaz verilerine erişemez. Silme akışı önce çıkış ve temizlik yapar; kullanıcıya ayrıca bilgi verilir (`saklama-ve-imha.md` SK-24).

## 8. Otomatik işlemler (KVKK m.11/1-g)
- `mask_contact_info` filtresi iletişim bilgisi içeren metni maskeler ve işaretler. Hesapla ilgili kararı insan verir.
- `suggest_volunteers` yalnızca öneri üretir. Kararı yönetici verir, veli onaylar.
- Quiz puanlaması otomatiktir; itiraz yolu vardır.

## 9. Kaynaklar (doğrulama durumu)
- 6698 sayılı KVKK, güncel metin: [mevzuat.gov.tr](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6698.pdf) (**doğrulandı**).
- Aydınlatma Tebliği m.5: [RG 10.03.2018](https://www.resmigazete.gov.tr/eskiler/2018/03/20180310-5.htm) (doğrulandı).
- Kurul 2026/347 (RG 24.03.2026, 33203): [RG fihristi](https://www.resmigazete.gov.tr/eskiler/2026/03/20260324.htm). İçerik [ikincil kaynaktan](https://www.alomaliye.com/2026/03/24/kvkkdan-yeni-ilke-karari-acik-riza-metni-ile-aydinlatma-metni-artik-ayri-duzenlenmeli/).
- KVKK Çerez Uygulamaları Hakkında Rehber, Temmuz 2025: [kvkk.gov.tr](https://kvkk.gov.tr/Icerik/7353/Cerez-Uygulamalari-Hakkinda-Rehber) (resmî PDF okundu).
- Kurul 2020/255: [kvkk.gov.tr](https://www.kvkk.gov.tr/Icerik/6894/2020-255). Kurul 2018/10: [kvkk.gov.tr](https://www.kvkk.gov.tr/Icerik/4110/2018-10).
- VERBİS, Kurul 2025/1572: [Erdem & Erdem](https://www.erdem-erdem.av.tr/bilgi-bankasi/verbis-kayit-yukumlulugune-iliskin-istisna-kriteri-degistirildi) (ikincil).
- Standart sözleşme bildirimi: [Erdem & Erdem](https://www.erdem-erdem.av.tr/bilgi-bankasi/standart-sozlesme-bildirim-modulu-hakkinda-kamuoyu-duyurusu), [kvkk.gov.tr duyurusu](https://www.kvkk.gov.tr/Icerik/8170/Yurt-Disina-Kisisel-Veri-Aktariminda-Kullanilacak-Standart-Sozlesmelerde-Dikkat-Edilmesi-Gereken-Hususlara-Iliskin-Kamuoyu-Duyurusu).
- **Vercel:**
  - DPA (Vercel Inc., yalnızca Pro ve Enterprise; müşteri verisi için işleyen, servisin ürettiği veriler için sorumlu; AB standart sözleşmeleri; güncelleme 17.03.2026): [vercel.com/legal/dpa](https://vercel.com/legal/dpa)
  - Hobby planı (çalışma zamanı logu 1 saat; ticari olmayan kişisel kullanım): [vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby)
  - Ticari kullanım tanımı: [Fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines)
  - Hepsi 18.10.2026'da okundu.
- Supabase DPA: [supabase.com](https://supabase.com/legal/customer-resources/data-processing-addendum).
- Web Push: IETF RFC 8030 ve RFC 8291. Push servisi alan adları: plan 4.3.2.
- AB Adalet Divanı C-184/20: [ikincil özet](https://ganado.com/cjeu-widens-the-scope-of-sensitive-personal-data-under-the-gdpr/).
