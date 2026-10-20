# Google Play Uyum Notları: Families, Data Safety, Hesap Silme

> **ARŞİV (18.10.2026):** Ürün web uygulamasına (PWA) geçti, Google Play'de yayın yapılmayacak (plan v2). Bu belge **yürürlükte değildir.**
> - Buradaki ürün kararları (güvenlik hatırlatması, "Gönüllüyü engelle", veli özellik anahtarları, izinden önce açıklama, herkese açık hesap silme sayfası, CSAE standartları) artık kendi politikamızdır: `../cocuk-koruma-kurallari.md` Bölüm A.
> - Aşama 3'te uygulama mağazaya paketlenirse (ör. TWA) bu belge güncellenerek geri alınır. Families, Data safety ve hesap silme şartları o tarihte yeniden kontrol edilir.

> **TASLAKTIR – Yayınlamadan önce bir avukat tarafından incelenmelidir.** Bu belge avukat görüşünün yerini tutmaz.
> Sürüm v0.1 · 16.10.2026. Politika sayfaları 16.10.2026'da okundu (kaynaklar sonda). Google politikaları sık değiştiği için Play Console'a girmeden önce yeniden kontrol edilmelidir.
> Teslim için imzalı APK yeterliyse bu belge yalnızca hazırlık amaçlıdır. Play kapalı testi hedefleniyorsa uygulanmalıdır.

## 1. Hedef kitle ve Families politikası
- **Play Console > Uygulama içeriği > Hedef kitle ve içerik:** 9–12, 13–15 ve 18+ yaş grupları seçilir.
  - Öğrenciler çoğunlukla 10–14 yaşında; veli ve gönüllüler yetişkin.
  - 13 yaş altı çocuklar hedef kitlede olduğu için **Families politikası tüm uygulama için geçerlidir.**
  - Uygulama "karma kitle" (hem çocuk hem yetişkin) olarak değerlendirilir.
- **Kategori:** Eğitim. "Child Safety Standards" politikası şu anda Sosyal ve Flört kategorilerine uygulanıyor. Eğitim kategorisi için zorunlu değil. Yine de bu politikanın unsurları gönüllü olarak karşılanır: CSAE standartları kullanım koşulları §5'te, uygulama içinde "Bildir" ve bir iletişim noktası.

| Families şartı | Bizdeki durum | Yapılacak |
|---|---|---|
| Çocuğa erişilebilen içerik uygun olmalı | Eğitim içeriği; kullanıcı içeriği filtre ve moderasyondan geçiyor | – |
| Play Console cevapları (hedef kitle, Data safety, IARC) doğru olmalı | §3'teki taslak | IARC anketinde "kullanıcılar etkileşime girer" ve "kullanıcı içeriği paylaşılır" seçenekleri **evet** olarak işaretlenir |
| Uygulama ve SDK'lar ilgili yasalara uygun olmalı | KVKK; ürün AB'yi hedeflemiyor | SDK koşulları kontrol edilir (aşağıda) |
| Çocuklardan ve yaşı bilinmeyen kullanıcılardan AAID, SIM/Build seri no, BSSID, MAC, SSID, IMEI, IMSI iletilmez; API 33+ hedeflenirken AD_ID izni istenmez | Analitik ve reklam SDK'sı yok | **`mobil`:** birleştirilmiş manifestte `com.google.android.gms.permission.AD_ID` var mı, kontrol edilir. Varsa `tools:node="remove"` ile kaldırılır. |
| Konum izni yok, kesin konum toplanmaz | Fotoğraf EXIF verisi cihazda silinir | **`mobil`:** konum izni manifestte bulunmamalı |
| Telefon numarası TelephonyManager'dan istenmez | – | **`mobil`:** Jitsi SDK'nın eklediği izinler (`READ_PHONE_STATE`, `SYSTEM_ALERT_WINDOW`, `BLUETOOTH*`, `FOREGROUND_SERVICE_MEDIA_PROJECTION`) incelenir, gereksizler kaldırılır |
| Bluetooth için Companion Device Manager kullanılır | Jitsi SDK kulaklık için `BLUETOOTH_CONNECT` isteyebilir | **`mobil`:** gerekliliği ve bu şartla uyumu doğrulanmalı |
| Çocuğa yönelik hizmette kullanımı onaylanmamış API/SDK kullanılmaz | Supabase, Firebase (yalnızca FCM), Jitsi Meet SDK | **Doğrulanmalı:** Bu üç sağlayıcının koşulları çocuklara yönelik uygulamada kullanımı yasaklıyor mu? |
| Reklam | Yok | – |
| **Sosyal özellikler** (serbest içerik paylaşımı): çocuk içerik paylaşmadan önce uygulama içi çevrimiçi güvenlik hatırlatması gösterilir | Soru-cevap (metin ve fotoğraf) ve görüntülü ders bu kapsamda | `cocuk-bilgilendirme.md` B bölümü ilk sorudan ve ilk dersten önce gösterilir. Gösterildiği kayıt altına alınır. |
| Sosyal özellikler: yetişkin, çocuk için bu özellikleri yönetebilir (aç/kapat) | Eşleşme veli onayına bağlı | **Eklenir:** veli panelinde çocuk başına "Soru-cevap", "Sesli cevaplar" ve "Görüntülü ders" anahtarları |
| Kişisel bilgi paylaşımını açan özellik için yetişkin eylemi gerekir | Kişisel bilgi paylaşımı zaten yasak ve filtreleniyor. Çocuk hesabını veli (e-posta OTP ile doğrulanmış yetişkin) açıyor. | – |
| Yabancılarla anonim sohbet odaklı uygulamalar çocuklara yönelemez | Gönüllüler doğrulanıyor, eşleşme veli onaylı, iletişim bire bir ve ders amaçlı | Mağaza açıklaması bu çerçevede yazılır |

## 2. Kullanıcı içeriği politikası
- **Koşulların kabulü:** Kullanıcılar içerik oluşturmadan önce koşulları kabul eder. Veli kayıtta kabul eder; çocuk adına da kabul etmiş olur. Gönüllü başvuruda kabul eder.
- **Bildirme:** Kayıtlı kullanıcıların olduğu uygulamalarda içerik ve kullanıcı bildirme özelliği gerekir. Mevcut: her ekranda "Bildir".
- **Engelleme:** **Bire bir etkileşim** (doğrudan mesajlaşma) içeren uygulamalarda kullanıcı **engelleme** özelliği gerekir. **Eksik:**
  - Öğrenci ve veli için "Gönüllüyü engelle" eklenir. Bu işlem eşleşmeyi bitirir, o gönüllünün öğrenciye tekrar atanmasını ve havuzdaki sorularını üstlenmesini engeller, yöneticiye bildirim gider.
  - Gönüllü için "Bu öğrenciyle devam etmek istemiyorum" eklenir. Bu bir yeniden atama talebidir.
- **Moderasyon ve koruma:** Moderasyon "sağlam, etkili ve sürekli" olmalıdır; özellikle reşit olmayanlara karşı taciz ve zorbalığa karşı önlem bulunmalıdır. Mevcut: filtre, yönetici kuyruğu, önce askıya alma. Yönetici kuyruğu için bir hedef süre yazılmalıdır (kullanım koşulları §7.2).

## 3. Data safety formu: taslak cevaplar

**Genel sorular**

| Soru | Cevap |
|---|---|
| Uygulama gerekli kullanıcı veri türlerini topluyor veya paylaşıyor mu? | **Evet** |
| Tüm kullanıcı verileri aktarım sırasında şifreleniyor mu? | **Evet** (HTTPS/TLS; cleartext kapalı) |
| Kullanıcılar verilerinin silinmesini isteyebiliyor mu? | **Evet**: uygulama içi yol + web bağlantısı `[HESAP SİLME SAYFASI URL]` |
| Families politikasına uyuyor musunuz? | **Evet** (§1'deki eksikler kapatıldıktan sonra) |
| Bağımsız güvenlik incelemesi | Hayır |
| Gizlilik politikası URL | `[GİZLİLİK POLİTİKASI URL]` |

"Paylaşım" sütunu her satırda **Hayır**dır. Gerekçe: Supabase, Google FCM, 8x8 ve e-posta sağlayıcısı bizim adımıza işleyen hizmet sağlayıcılardır. Yasal talepler de paylaşım istisnası kapsamındadır.

**Toplanan veri türleri**

| Play veri türü | Toplanıyor mu | Ne | İsteğe bağlı mı | Amaç |
|---|---|---|---|---|
| Kişisel bilgiler > **Ad** | Evet | Veli görünen adı, gönüllü ad soyadı, öğrenci rumuzu (Play tanımında takma ad da "ad" sayılır) | Zorunlu | Uygulama işlevselliği, Hesap yönetimi |
| Kişisel bilgiler > **E-posta adresi** | Evet | Veli ve gönüllü | Zorunlu | Hesap yönetimi, Uygulama işlevselliği, Geliştirici iletişimi (OTP ve hizmet bildirimleri) |
| Kişisel bilgiler > **Kullanıcı kimlikleri** | Evet | Hesap kimliği, öğrenci kullanıcı adı | Zorunlu | Hesap yönetimi, Uygulama işlevselliği, Dolandırıcılık önleme/güvenlik |
| Kişisel bilgiler > **Diğer bilgiler** | Evet | Sınıf düzeyi, veli–çocuk ilişkisi, gönüllünün üniversite/bölüm/sınıf bilgisi | Zorunlu | Uygulama işlevselliği |
| Sağlık ve fitness > Sağlık bilgileri | **Beyan edilmiyor** | Kasıtlı olarak toplanmıyor. Serbest metinde kendiliğinden geçebilir; bu "Diğer uygulama içi mesajlar" altında kalır. | – | Yayın öncesi `veri-envanteri.md` §3 ile birlikte **yeniden değerlendirilmeli** |
| Mesajlar > **Diğer uygulama içi mesajlar** | Evet | Soru-cevap mesajları | Zorunlu | Uygulama işlevselliği, Dolandırıcılık önleme/güvenlik (moderasyon) |
| Fotoğraflar ve videolar > **Fotoğraflar** | Evet | Soru ve cevap fotoğrafları | İsteğe bağlı | Uygulama işlevselliği |
| Fotoğraflar ve videolar > **Videolar** | Evet, **geçici işleme** (kaydedilmez) | Görüntülü dersin canlı akışı (JaaS sunucusu üzerinden; uçtan uca şifreli değil) | İsteğe bağlı | Uygulama işlevselliği |
| Ses dosyaları > **Ses kayıtları** | Evet | Gönüllünün sesli cevapları (saklanır); canlı ders sesi (geçici) | İsteğe bağlı | Uygulama işlevselliği |
| Dosyalar ve belgeler | Evet (gönüllü belgeyi Android'den yüklerse) | Öğrenci belgesi | Gönüllüler için zorunlu | Hesap yönetimi, Dolandırıcılık önleme/güvenlik |
| Uygulama etkinliği > **Uygulama etkileşimleri** | Evet | Plan ilerlemesi, tamamlanan konular, ders katılım zamanları | Zorunlu | Uygulama işlevselliği |
| Uygulama etkinliği > **Kullanıcı tarafından oluşturulan diğer içerikler** | Evet | Soru açıklamaları, ders notları, şikâyet açıklamaları | Zorunlu | Uygulama işlevselliği, Dolandırıcılık önleme/güvenlik |
| **Cihaz veya diğer kimlikler** | Evet | FCM token, Firebase installation ID | Zorunlu | Uygulama işlevselliği |
| Konum | **Hayır** | EXIF cihazda silinir; IP'den konum türetilmez | – | – |
| Uygulama bilgileri ve performansı | **Hayır** | Crashlytics veya analitik yok | – | Sentry eklenirse (plan Aşama 2) güncellenir |
| Takvim, Kişiler, Finansal bilgiler, Web tarama | Hayır | Uygunluk saatleri cihaz takviminden okunmuyor | – | – |

Firebase'in kendi beyan sayfasına göre FCM uygulama sürümünü ve Firebase kullanıcı aracısını, Installations ise Firebase installation ID'yi toplar. Google Analytics SDK eklenmediği sürece ek veri toplanmaz.

## 4. Hesap silme şartı
- **Uygulama içi yol:**
  - Ayarlar > Hesabı sil. Bu yol görünür bir yerde olmalı.
  - Veli kendi hesabını ve çocuk hesabını silebilir, gönüllü kendi hesabını silebilir.
  - Öğrenci silme talebini başlatır, talep veliye gider.
- **Web bağlantısı:** `[HESAP SİLME SAYFASI URL]`.
  - Uygulama adını veya mağazadaki geliştirici adını içermeli.
  - Sayfa hatasız yüklenmeli ve silme yolu sayfada kolayca bulunmalı.
  - Uygulamayı yeniden yüklemeden kullanılabilmeli. Kimlik e-posta OTP ile doğrulanır.
  - Çocuk hesapları bu sayfadan veli hesabıyla silinir.
- **Silinecek veri:** Data safety'de "toplanıyor" denen ve hesapla ilişkili tüm veriler. Hizmet sağlayıcılardaki kopyalar da silinir: Storage dosyaları, FCM token'ı, e-posta sağlayıcısındaki kişi kaydı.
- **Saklanan veriler:** Güvenlik ve yasal nedenlerle saklanan kayıtlar (SK-11 ile SK-16 arası, SK-19) gizlilik politikası §6'da açıklanır.
- **Form:** Data safety'deki "Veri silme" sorularına bu bağlantı girilir.

## 5. Diğer Play kontrolleri
- **Gizlilik politikası:** Etkin, herkese açık, coğrafi kısıtlaması olmayan bir URL'de olmalı; **PDF olamaz**, düzenlenemez olmalı ve "Gizlilik Politikası" başlığını taşımalı. Play Console'da ve uygulama içinde bağlantı verilir.
- **Belirgin açıklama ve izin:** Kamera, mikrofon ve bildirim izinleri ilgili özellik kullanılırken istenir. İzinden hemen önce kısa bir açıklama gösterilir; örnek: "Soru fotoğrafı çekmek için kamerayı kullanırız. Fotoğrafı yalnızca gönüllün ve velin görür." Arka planda veri toplama yoktur.
- **Ön plan hizmeti izinleri:** Jitsi SDK görüşme sırasında ön plan hizmeti kullanırsa (kamera, mikrofon, medya projeksiyonu) Play Console'daki ön plan hizmeti beyanı doldurulur. Ekran paylaşımı **öğrenci için kapatılır.**
- **Sağlık uygulaması beyanı:** Uygulama sağlık özelliği sunmuyor. Play Console'da sağlık uygulaması beyanı istenirse "sağlık özelliği yok" olarak cevaplanır. Mağaza metninde sağlık iddiası ve "hasta çocuklar" gibi ifadeler kullanılmaz.
- **Hedef API:** 36 (plan Risk 9).
- **Kapalı test:** Yeni kişisel geliştirici hesaplarında üretime çıkmadan önce kapalı test gerekir: 12 test kullanıcısı, 14 gün (plan; **üçüncü taraf kaynak, doğrulanmalı**). Test kullanıcıları yetişkindir ve gerçek çocuk verisi girmez. Kayıt, davet kodu veya izin listesiyle sınırlandırılır.
- **Mağaza listesi:** Geliştirici adı gizlilik politikasında geçmelidir. Açıklama nötr olmalıdır: "derslere ara vermek zorunda kalan öğrenciler için".

## 6. Kaynaklar (16.10.2026'da okundu)
- Families politikası: [support.google.com/…/9893335](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en)
- Kullanıcı içeriği politikası: [support.google.com/…/9876937](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en)
- Data safety formu: [support.google.com/…/10787469](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- Kullanıcı verileri politikası ve gizlilik politikası şartları: [support.google.com/…/10144311](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
- Hesap silme şartı: [support.google.com/…/13327111](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- Child Safety Standards kapsamı: [support.google.com/…/14747720](https://support.google.com/googleplay/android-developer/answer/14747720?hl=en)
- Firebase'in Play veri beyanı (FCM, Installations): [firebase.google.com](https://firebase.google.com/docs/android/play-data-disclosure)
