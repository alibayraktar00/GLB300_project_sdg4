# Eğitim Köprüsü: Ekran Akışları

> **Durum:** v2 (web) · 18 Ekim 2026 · `tasarimci` ajanı · Plan adım 3. v1'in Android varsayımları kaldırıldı: **tüm roller tarayıcıdan kullanır** (Next.js, PWA). Kaynak: `docs/plan.md` Bölüm 4.1, 7, 9.2, 9.4; ürün kuralları `docs/hukuk/cocuk-koruma-kurallari.md` (A1-A15); çerez ve cihazda saklama `docs/hukuk/cerez-politikasi.md`; yasal metin taslakları `docs/hukuk/` (özellikle `aydinlatma-veli.md`, `acik-riza-veli.md`, `cocuk-bilgilendirme.md`, `kullanim-kosullari.md`, `saklama-ve-imha.md`).
> **Bu belge yalnızca akış ve tel çerçevedir;** ekranlar ilgili fazlarda yazılır. Görsel kurallar: `docs/tasarim-sistemi.md`. Bileşen adları (`Button`, `Card`, `Banner`...) `web/src/components/` içindedir.
> **Yasal metinler taslaktır** ve avukat incelemesinden geçene kadar ekranlar yer tutucu metinle kurulur.

## 1. Gezinme yapısı

### 1.1 Rol ve platform

Her rol tarayıcıdan çalışır; yüklenecek bir uygulama yoktur. Öğrenci ve veli çoğunlukla **telefon tarayıcısından** gelir, bu yüzden telefon düzeni birincil tasarlanır. Gönüllü ve yönetici ağırlıklı olarak masaüstü tarayıcısını kullanır; telefonda da çalışır.

| Rol | Öncelikli cihaz | Gezinme | Adres öneki |
|---|---|---|---|
| Öğrenci | Telefon tarayıcısı (PWA, "Telefona ekle") | Alt gezinme (4 hedef); geniş ekranda yan menü | `/ogrenci/...` |
| Veli | Telefon tarayıcısı (PWA) | Alt gezinme (4 hedef); geniş ekranda yan menü | `/veli/...` |
| Gönüllü | Masaüstü ve dizüstü; telefon da olur | Geniş ekranda yan menü, telefonda alt gezinme (4 hedef) | `/gonullu/...` |
| Yönetici | Yalnızca masaüstü tarayıcısı (MFA) | Yan menü, geniş (5 hedef) | `/yonetici/...` |

- **PWA:** "Telefona ekle" Ayarlar'da (O4) ve ilk girişin sonunda öneri olarak yer alır; zorunlu değildir. iPhone'da web bildirimi yalnızca ana ekrana eklenmiş uygulamada çalışır (bkz. 8).
- Oturum yoksa her adres `/` (açılış) ekranına düşer; `beklemede`/`askida` durumundaki hesaplar `/durum`'a gider (bkz. O7). Rol iskeleti `AppShell` ile kurulur; hedef listesi `web/src/lib/role-navigation.ts` içindedir (adresler orada).
- Herkese açık sayfalar (oturumsuz): `/` açılış, `/gizlilik`, `/cerezler`, `/kullanim-kosullari`, `/aydinlatma/*`, `/hesap-silme`, `/lisanslar`. Hepsinde `SiteFooter` ve çerez bilgilendirme notu bulunur.

### 1.2 Ana gezinme hedefleri

| Rol | Hedefler (soldan sağa / yukarıdan aşağıya) | Üst çubuk eylemleri |
|---|---|---|
| Öğrenci | **Bugün** · **Plan** · **Sorular** · **Dersler** | Bildirimler, Ayarlar |
| Veli | **Panel** · **Sorular** · **Dersler** · **Hesap** | Bildirimler, Ayarlar |
| Gönüllü | **Pano** · **Öğrenciler** · **Dersler** · **Takvim** | Bildirimler, Ayarlar |
| Yönetici | **Başvurular** · **Eşleştirme** · **Şikayetler** · **Kullanıcılar** · **Denetim** | Bildirimler, Ayarlar |

Kararlar:
- **Öğrenci 4 hedef.** Az seçenek sakin arayüz demektir. **Kütüphane** ayrı sekme değil: **Plan** sekmesinden ("Konulara göz at" kartı) ve Bugün'deki konu bağlantısından açılır. Soru sor düğmesi **Sorular** sekmesindedir (Sorularım listesinin üstünde, tek birincil eylem).
- **Bildirimler ve Ayarlar** hedef değil, üst çubuktaki eylemlerdir (geniş ekranda başlık satırının sağında). Çocuğun Ayarlar sayfasında rıza ve veli işlemleri yoktur; "Hesabı sil" yerine "Hesabımı silmek istiyorum" (veliye istek) bulunur.
- **Veli "Hesap"** sekmesi: çocuk hesapları, silme talepleri, Rızalarım, yasal metinler. Çocuk eklemek buradan ve Panel boş durumundan başlar.
- **Gönüllü onaylanana kadar** ana gezinme yoktur: başvuru sihirbazı ve "Başvuru durumu" ekranı tam ekrandır.
- **Ders sayfası (Jitsi)**, **soru detayı**, **konu/görev detayı**, **kayıt sihirbazları** ve onay ekranları kök gezinmeyi gizler (tam ekran, "Geri" düğmeli). Tarayıcının geri düğmesi de aynı yere döner; sayfa içi adımlar (sihirbaz) adresle ayrılır, geri düğmesi bir önceki adıma götürür.
- **Atla bağlantısı** her sayfada ilk odaklanabilir öğedir ("Ana içeriğe geç").

### 1.3 Duyarlı düzen kuralları

Kırılma noktaları **rem** tabanlıdır (`docs/tasarim-sistemi.md` 8); yazı büyüdükçe piksel karşılığı büyür, böylece büyük yazıda telefon düzeni daha geniş ekranlara uzanır ve taşma olmaz.

| Genişlik | Düzen |
|---|---|
| < 37,5 rem (600 px, telefon dikey) | Üst çubuk (başlık + 2 eylem) + içerik + alt gezinme. Tek sütun. Liste -> ayrıntı: tam sayfa geçiş. |
| 37,5-64 rem (yatay telefon, tablet, dar pencere) | Dar yan şerit (etiket simgenin altında), başlık satırı içerikte. İçerik en çok 70 rem. |
| >= 64 rem (1024 px, masaüstü) | Etiketli yan menü. Yönetici ve gönüllü: **liste + ayrıntı** iki panel (ayrıntı sağda). Formlar en çok 30 rem, okuma metni en çok 45 rem. |
| Yazı %200 ve %400 | Hiçbir ekran yatay kaydırma gerektirmez (WCAG 1.4.10); kartlar ve satırlar alt satıra iner. |

**Durum şablonu (her liste/ayrıntı ekranı):**

| Durum | Gösterim |
|---|---|
| Yükleniyor | Yeni veri gelene kadar varsa önceki veri gösterilir (sunucu bileşeni akışı), yoksa `SkeletonList` + "Yükleniyor" okunur (`LoadingState`). |
| Boş | `EmptyState`: sakin başlık + tek cümle + (varsa) tek eylem. |
| Hata | Veri varsa içerik + `Banner` (uyarı, "Tekrar dene"); yoksa `ErrorState` ("Şu an yüklenemedi" + "Tekrar dene"). Teknik ayrıntı hiçbir zaman gösterilmez. |
| Çevrimdışı | Üstte kalıcı `Banner` (bilgi). **Öğrencide** "Planın internetsiz de açılsın" seçeneği açıksa: "İnternet yok. Kayıtlı planın ve özetlerin açık." Seçenek kapalıysa: "İnternet yok. Bağlantı gelince yeniden denenecek." Diğer rollerde ikinci cümle yoktur. Yazma eylemleri kuyruğa alınmaz (MVP): düğme pasif + nedeni yazılı. |
| Başarı | Bildirim (`useNotice().show`; "Kaydedildi.", kendiliğinden kaybolmaz, "Tamam" ile kapanır, `aria-live`) ya da sayfa içi başarı kartı. |

Aşağıda "Durumlar" satırı, şablondan farklı olan ya da önemli olan durumları yazar.

### 1.4 Cihazda saklananlar (tüm ekranlar için ortak kural)

`cerez-politikasi.md` ve `cocuk-koruma-kurallari.md` A14-A15 uyarınca:
- Cihazda **hiçbir şey kullanıcı bir seçim yapmadan yazılmaz.** Görünüm tercihleri yalnızca kullanıcı bir ayarı değiştirince saklanır; varsayılana dönünce silinir. Çevrimdışı önbellek yalnızca öğrenci "Evet" derse açılır.
- Cihazda saklanan her tercihin yanında **"Bu ayar yalnızca bu cihazda saklanır."** yazar.
- Giriş ekranında **"Bu cihazda oturumum açık kalsın"** kutusu vardır, **varsayılan boş**.
- **Çıkış yap** görünürdür ve push aboneliğini, önbelleği, taslakları ve görünüm tercihlerini bu cihazdan siler.
- Ayarlar'da **"Bu cihazdaki kayıtlı verileri temizle"** düğmesi vardır (O4).
- Tarayıcıya yazılan veri sunucuya gönderilmez (görünüm tercihleri, çevrimdışı seçimi, taslak, çerez notu bilgisi).

## 2. Ortak ekranlar

### O1. Açılış / giriş
- **Amaç:** Rol seçimi; oturum yoksa herkesin ilk durağı.
- **Öğeler:** marka işareti, uygulama adı, tek cümle açıklama, üç kart: **Veliyim** · **Gönüllüyüm** · **Öğrenciyim** (velimin verdiği kullanıcı adıyla), altında "Öğrenci hesabını veli açar. Kullanıcı adı ve şifre veliden alınır." Altta `SiteFooter` (Gizlilik politikası, Çerez politikası, Kullanım koşulları, Çocuk güvenliği iletişimi). İlk ziyarette sayfayı engellemeyen **çerez bilgilendirme notu** (`CookieNotice`): "Bu site yalnızca çalışması için gereken çerezleri ve cihaz belleğini kullanır. Reklam veya analitik yoktur." + "Ayrıntı: Çerez Politikası" bağlantısı + tek düğme **Tamam** (rıza değil bilgilendirme; "Kabul et" yazılmaz). Kapatıldığı bilgisi cihazda saklanır.
- **Birincil eylem:** Kartlardan biri (hepsi eşit ağırlıkta; tamamı tıklanabilir, tek bağlantı). Veli -> V1 (kayıt/giriş), Gönüllü -> G1 (başvuru/giriş), Öğrenci -> kullanıcı adı + şifre formu (Faz A).
- **Durumlar:** Faz A'ya kadar kartlar "Giriş çok yakında açılacak." bildirimi verir ("yakında" durumu). Geniş ekranda iki sütun (solda tanıtım, sağda seçenekler). **Uygulandı** (`web/src/app/page.tsx`, `WelcomeChoices`).
- **Giriş formu (veli, gönüllü, öğrenci; Faz A):**
  - Öğrenci: alan 1 "Kullanıcı adı", alan 2 "Şifre" (göster/gizle düğmesi etiketli). Veli ve gönüllü: e-posta + şifre, ardından OTP (O2).
  - **Onay kutusu "Bu cihazda oturumum açık kalsın"**, **varsayılan boş**. Yardım metni: "İşaretlersen bu cihazda en fazla 30 gün açık kalır. Ortak bir cihazsa işaretleme." İşaretlenmezse oturum tarayıcı kapanınca biter. Yönetici girişinde kutu gösterilmez (bkz. 11, açık sorular).
  - **Giriş yap** (birincil). Hata: "Kullanıcı adı ya da şifre eşleşmedi." (hangisinin yanlış olduğu söylenmez). "Şifremi unuttum" yerine öğrencide: "Şifreni velin sıfırlayabilir." (öğrencinin e-postası yok).
  - Giriş formunun altında, ortak cihaz için tek cümle: "Bu telefonu başkası da kullanıyorsa işin bitince çıkış yap."

### O2. OTP doğrulama
- **Amaç:** E-postaya gelen 6 haneli kodu girmek (veli, gönüllü; plan 3.3).
- **Öğeler:** açıklama (adres maskeli), tek alan (`inputmode="numeric"`, `autocomplete="one-time-code"`, 6 hane, yapıştırma çalışır), **Doğrula**, "Kodu yeniden gönder" (geri sayımlı, süre yazıyla).
- **Birincil eylem:** Doğrula. **Durumlar:** yanlış kod ("Kod eşleşmedi. Yeniden deneyebilirsiniz."), süresi dolmuş, çok deneme (bekleme süresi yazılı), yükleniyor (düğme içinde).

### O3. Bildirimler
- **Amaç:** Uygulama içi bildirim listesi; push ulaşmasa da, kapalı olsa da yedek (plan Risk 8).
- **Öğeler:** tarih gruplu liste (`CardLink`): olay başlığı, kısa metin, okunmadı işareti (nokta + "Yeni" yazısı). Metinler genel kalır (bkz. 8).
- **Birincil eylem:** Bildirime tıklamak ilgili sayfayı açar. "Tümünü okundu say" ikincil.
- **Durumlar:** boş ("Şimdilik yeni bir şey yok."), hata, yükleniyor.

### O4. Ayarlar
- **Amaç:** Erişilebilirlik, bildirim, cihazdaki veriler, yasal metinler, hesap.
- **Bölümler** (`SectionHeader` + satırlar):
  1. **Görünüm ve erişilebilirlik:** Tema (Sistem/Açık/Koyu), **Yüksek kontrast** anahtarı, **Yazı boyutu** (Normal/Büyük/Daha büyük; tarayıcının yakınlaştırması ve yazı boyutu ayarı da çalışır), **Animasyonları azalt**, **Hafif mod** (görseller dokununca yüklenir, animasyonlar kapalı, ses otomatik inmez; plan 9.4). Her değişiklik anında uygulanır (`web/src/lib/appearance.ts`); varsayılan değerler cihazın ayarından okunur ve **kullanıcı değiştirene kadar hiçbir şey saklanmaz**. **Her ayarın yardım satırında "Bu ayar yalnızca bu cihazda saklanır." yazar** (sunucuya gitmez; `students.prefs` kullanılmaz, bkz. `docs/veri-modeli.md`).
  2. **Bildirim tercihleri:** önce **"Bildirimleri aç"** düğmesi (sayfa açılınca izin istenmez). Düğmeye basınca, tarayıcı iznini istemeden **hemen önce** tek cümlelik açıklama gösterilir: "Cevap gelince haber vermek için **[Google | Apple | Mozilla | Microsoft]** bildirim servisini kullanırız. Bildirimde yalnızca genel bir cümle yazar." (servis adı kullanılan tarayıcıya göre seçilir; tespit edilemezse "tarayıcının bildirim servisini"); düğmeler **Devam** (birincil, tarayıcı iznini açar) ve **Vazgeç**. İzin verilince tür bazında aç/kapa (öğrencide yalnızca cevap ve ders; gönüllüde yeni soru, havuz). İzin reddedilmişse: "Bildirimler kapalı. Cevaplar ve hatırlatmalar yine Bildirimler sayfasında görünür. İstersen tarayıcı ayarlarından açabilirsin." iPhone'da ana ekrana eklenmemişse önce "Bildirim için uygulamayı telefona eklemen gerekir" adımı (bkz. 8).
  3. **Bu cihazda:** (a) **Telefona ekle** (PWA kurulumu; iPhone'da "Paylaş > Ana Ekrana Ekle" adımları yazılı, Android'de tarayıcı istemi). (b) Ortak cihaz uyarısı: "Bu telefonu başkası da kullanıyorsa işin bitince çıkış yap." (c) **Bu cihazdaki kayıtlı verileri temizle** (ikincil düğme): onay iletişim kutusu "Bu telefonda saklanan görünüm ayarların, çevrimdışı kayıtların ve taslakların silinecek. Hesabın ve sunucudaki verilerin etkilenmez." + **Vazgeç (birincil)** / **Temizle**. Sonuç bildirimi: "Bu cihazdaki kayıtlı veriler silindi." Silinenler: görünüm tercihleri, çerez notu bilgisi, çevrimdışı sayfa önbelleği, çevrimdışı seçimi, cevap taslakları. **Silinmeyenler:** oturum (ayrıca "Çıkış yap"), hesap ve sunucu verisi. (d) Öğrencide: **"Planın internetsiz de açılsın mı?"** seçimi tekrar değiştirilebilir (Ö0 ile aynı iki seçenek; "Hayır" seçilince çevrimdışı kayıtlar hemen silinir).
  4. **Yasal metinler:** Aydınlatma metni · Kullanım koşulları · Gizlilik politikası · Çerez politikası · **Rızalarım** (yalnızca veli, bkz. V8).
  5. **Lisanslar** (bkz. O4d).
  6. **Hesap:** Çıkış yap · Hesabı sil (veli, gönüllü) · **"Hesabımı silmek istiyorum"** (öğrenci, bkz. Ö12).
- **Birincil eylem:** yok (ayar anahtarları anında etkiler). **Durumlar:** bildirim aboneliği oluşturulamadı (anahtar eski konumuna döner + bant).

### O4d. Lisanslar (`/lisanslar`)
- **Amaç:** Açık kaynak lisansları ve yazı tipi lisansı (kullanım koşulları 9.3; kendi çocuk koruma politikamız A8: yasal metinler herkese açık HTML sayfadır).
- **Öğeler:** üstte tek cümle "Eğitim Köprüsü açık kaynak yazılımlardan yararlanır." Sonra liste: paket adı, sürüm, lisans türü, lisans metni (açılır). **Atkinson Hyperlegible Next (SIL OFL 1.1)** yazı tipi lisansı (`web/assets/fonts/OFL.txt`) ve **Material Symbols (Apache 2.0)** simge lisansı listede açıkça yer alır. Liste derleme sırasında bir betikle üretilir (çalışma anında üçüncü taraf isteği yok).
- **Birincil eylem:** yok (salt okunur). Oturumsuz da açılır. **Durumlar:** yok (statik sayfa).

### O5. "Bildir" alt sayfası ve "Gönüllüyü engelle"
- **Amaç:** Güvenlik ikinci hattı: her sayfada içerik/kullanıcı bildirmek; öğrenci ve veli için gönüllüyü engellemek (kendi çocuk koruma politikamız A3-A4, `docs/hukuk/cocuk-koruma-kurallari.md`: bire bir etkileşimde engelleme her zaman bulunur).
- **Giriş:** Mesaj, soru, ders sayfası ve gönüllü kartlarında "Bildir" (bayrak simgesi + yazı). Aynı iletişim kutusunda, **"Bildir"in hemen altında**, gönüllünün göründüğü sayfalarda ("Soru detayı", "Gönüllüm ve derslerim", ders sayfası, veli "Çocuk hesabı yönetimi") **"Gönüllüyü engelle"** satırı bulunur.
- **İletişim kutusu (başlık "Bir sorun mu var?"):** iki `CardButton`: **Bu içeriği bildir** · **Gönüllüyü engelle** (ikinci yalnızca gönüllü varsa). Telefonda alt sayfa, masaüstünde ortada iletişim kutusu (`<dialog>`; odak kutuya girer, Esc kapatır, kapanınca odak tetikleyiciye döner).
- **Bildir akışı:** (1) neden listesi, `RadioCard`lar: "Bana ya da başkasına yakışmayan bir şey söylendi", "Kişisel bilgi (telefon, adres, uygulama adı) istendi", "Beni rahatsız eden bir şey var", "Başka bir sorun" (2) isteğe bağlı kısa açıklama (3) "Bildir" -> başarı: "Bildirimin ulaştı. Yöneticiler inceleyecek. Bildirdiğin için kimse sana kızmaz." Öğrencide bildirim **veliye de** iletilir.
- **Gönüllüyü engelle akışı** (onay gerektiren, geri alınması zor eylem):
  1. Onay ekranı/iletişim kutusu: başlık "**Ad S.** ile devam etmek istemiyor musun?" (veli için: "…ile eşleşme sona erdirilsin mi?"). Sonuçlar listesi: eşleşme sona erer · planlı dersler iptal olur · bu gönüllü bir daha eşleştirilmez ve sorularını üstlenemez · yöneticiler bilgilendirilir.
  2. Düğmeler: **Vazgeç (birincil)** ve **Gönüllüyü engelle** (ikincil, hata renginde kenarlık). Onay kutusu yok; eylem adı düğmede açık yazar.
  3. Sonuç: "Eşleşme sona erdi. Yöneticiler sana yeni bir gönüllü önerecek. Sorularını yine sorabilirsin." (soru havuza düşer). Öğrenci engellediyse veliye bildirim gider; veli engellediyse çocuğa nötr bir cümle gösterilir ("Gönüllün değişti.").
- **Durumlar:** gönderiliyor (düğme yükleniyor), hata ("Gönderilemedi. Bağlantı gelince yeniden deneyebilirsin."; metin kaybolmaz), çevrimdışı (pasif + neden). Öğrenci için "Bildir" asla zor duruma sokan dille yazılmaz.
- **Gönüllü tarafı:** "Bu öğrenciyle devam etmek istemiyorum" yeniden atama talebidir (G6 öğrenci satırında), engelleme değildir.

### O6. Hesap silme sayfası (`/hesap-silme`, herkese açık)
- **Amaç:** Oturum açmadan hesap silme talebi (A7). Uygulama içi yol da vardır (Ayarlar > Hesabı sil). **Hangi e-postanın kayıtlı olduğunu sızdırmaz.**
- **Akış:** (1) açıklama: ne silinir, 30 gün, kalan güvenlik kayıtları (hukukun metni). (2) e-posta alanı + **Kod gönder**; yanıt her zaman aynıdır: "Bu adres bir hesaba bağlıysa doğrulama kodu gönderdik." (3) OTP (O2). (4) sonuçlar listesi + **Hesabı sil** (hata renginde ikincil) ve **Vazgeç** (birincil). (5) başarı: "Talebiniz alındı. Hesabınız kapatıldı; verileriniz en geç 30 gün içinde silinir." + "Bu cihazdaki kayıtlı verileri ayrıca tarayıcı ayarlarından silebilirsiniz." notu (cerez-politikasi "Hesap silme").
- **Kapsam notu:** Öğrenci hesabının e-postası yoktur; öğrenci hesabı bu sayfadan değil, veli üzerinden (V7, V9, Ö12) silinir. Sayfada tek cümleyle yazılır.
- **Durumlar:** doğrulanmadı, kod süresi doldu, çok deneme (bekleme süresi yazılı), hata.

### O7. Durum ekranı (`/durum`)
- **Amaç:** `beklemede` (gönüllü başvurusu incelemede) ve `askida` hesaplar.
- **Öğeler:** tek başlık, sakin açıklama, iletişim bilgisi. Askıya alma nedeni **gösterilmez**; "Hesabın şu an kullanılamıyor. Velinle konuş." (öğrenci), "Hesabınız şu an kullanılamıyor. Ayrıntı için bize ulaşabilirsiniz." (veli, gönüllü).

## 3. Öğrenci (telefon tarayıcısı öncelikli)

### Ö0. İlk girişte bilgilendirme ve internetsiz kullanım sorusu (çocuğa uygun)
- **Amaç:** Çocuğun kendi verileri hakkında yaşına uygun bilgilenmesi (`cocuk-bilgilendirme.md` A; hukuki aydınlatmanın yerini tutmaz) ve çevrimdışı saklamanın **kullanıcının açık seçimiyle** açılması (`cocuk-koruma-kurallari.md` A15, `cerez-politikasi.md`).
- **Zamanlama:** öğrencinin **ilk girişinde**, Bugün ekranından önce. Bir kez; sonra Ayarlar > Yasal metinler'den okunabilir. İki adım ("Adım 1 / 2" yazılı):

| Adım | İçerik | Düğme |
|---|---|---|
| 1 | **Bilgilendirme:** kısa paragraflı kaydırılabilir sayfa; başlıklar: Hesabını kim açtı? · Gönüllün seni ne kadar tanıyor? · Neleri saklıyoruz? · Neleri saklamıyoruz? · Kimler görebilir? · Bilgilerinle ilgili bir şey mi istiyorsun? (metin: `docs/hukuk/cocuk-bilgilendirme.md` A). Ekran okuyucuyla okunur; %200 yazıda taşmaz. | **Anladım** (metin bitince görünür; sayfanın altına yapışık değil; pasif değil) |
| 2 | **"Planın internetsiz de açılsın mı?"** Açıklama: "Evet dersen planın ve konu özetlerin bu telefona kaydedilir. İnternet kesilse de okuyabilirsin. Kayıtlar en fazla 14 gün kalır ve çıkış yapınca silinir. Telefonu başkası da kullanıyorsa Hayır seçebilirsin. Bunu sonra Ayarlar'dan değiştirebilirsin." İki `RadioCard`: **Evet, kaydedilsin** · **Hayır, kaydedilmesin**. **İkisi de önceden seçili değil.** Metin: `cocuk-bilgilendirme.md` A2. | **Devam**: seçim yapılana kadar **pasif**, nedeni yanında yazılı ("Devam etmek için bir seçenek işaretle.") |

- **Kayıt:** adım 1 sonunda `consents` `cocuk_bilgilendirme` (sunucu). Adım 2'nin seçimi **yalnızca cihazda** saklanır, sunucuya gitmez (bu seçimi tutan kayıt `cerez-politikasi.md` tablosunda ayrıca satır bekliyor, bkz. 11). "Hayır" ya da henüz seçilmediyse service worker öğrenci sayfalarını önbelleğe almaz. "Evet" ise Bugün, Plan ve açılan konu özetleri 14 güne kadar önbelleğe alınır; çıkışta silinir. Ö1 çevrimdışı satırı bu seçime bağlıdır.
- **Durumlar:** hata (kayıt yazılamadı: "Şu an kaydedilemedi, tekrar denenebilir" ve ilerlemeye izin verilmez), çevrimdışı (ilk giriş zaten bağlantı gerektirir; bağlantı yoksa "İnternet yok. Bağlantı gelince devam edebilirsin."). Adım 2 atlanamaz ama hiçbir seçenek diğerine tercih edilmiş gibi görünmez (aynı boyut, aynı renk).

### Ö1. Bugün (en önemli ekran)
- **Amaç:** Öğrenci uygulamayı açtığında, yorgun olsa bile, **tek bakışta ne yapacağını** bilir ve **tek dokunuşla** başlar. Baskı yoktur: tarih, borç, gecikme, seri gösterilmez. Plan **tarihe bağlı değildir:** sıradaki N konu gösterilir (plan 4.1/5).
- **Soruları sormayız:** "Bugün nasılsın?", "Kendini iyi hissediyor musun?" yok. Yalnızca **"Bugün ne kadar vaktin var?"** (plan 9.4). Seçilen mod cihazda saklanır ("Bu ayar yalnızca bu cihazda saklanır." notu seçimin yanında yazar); başka hiçbir şey sorulmaz.

```
┌────────────────────────────────────┐  telefon 360 px
│ Bugün                    🔔    ⚙   │  üst çubuk (title-lg), eylemler etiketli
├────────────────────────────────────┤
│ Merhaba, Ela                       │  headline-md (rumuz)
│ Bugün için seni 2 konu bekliyor.   │  body-lg
│                                    │
│ Bugün ne kadar vaktin var?         │  SectionHeader (2)
│ ┌────────────────────────────────┐ │
│ │ (●) 5 dakika                   │ │  RadioCard
│ │     Kısa bir tekrar            │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ ( ) Tam ders                   │ │
│ │     Konuyu baştan sona çalış   │ │
│ └────────────────────────────────┘ │
│  Bu ayar yalnızca bu cihazda       │  yardım satırı
│  saklanır.                         │
│ Sıradaki görev                     │  SectionHeader (2)
│ ┌────────────────────────────────┐ │  Card (birincil ton), durağan
│ │ Kesirleri karşılaştırma        │ │  title-md
│ │ Matematik · 5. sınıf           │ │
│ │ 5 dakikalık tekrar             │ │  seçilen moda göre
│ │ [ ▶  Göreve başla ]            │ │  Button (tek birincil eylem)
│ └────────────────────────────────┘ │
│ Sonraki görevler                   │  yalnızca günlük hedef > 1 ise
│ ┌ Eğim ve yüzde  · Matematik ───> ┐│  CardLink (satır)
│                                    │
│ Yaklaşan ders                      │  varsa
│ ┌ Yarın 16.00 · Ad S. ──────────> ┐│  CardLink; ders yaklaşınca "Derse katıl"
│ Yeni cevaplar                      │  varsa
│ ┌ 1 sorunun yeni bir cevabı var ─> ┐│  CardLink
│ Plan ilerlemen                     │
│ 3 / 10 konu  ▓▓▓░░░░░░░            │  ProgressBar
├────────────────────────────────────┤
│ ☀Bugün  ▤Plan  ▣Sorular  ◉Dersler  │  alt gezinme (Bugün seçili)
└────────────────────────────────────┘
```

- **"5 dakika / Tam ders" seçimi:**
  - İki `RadioCard` (yerel `<input type="radio">`; ekran okuyucu radyo rolünü ve "işaretli" durumunu bildirir; grup başlığı "Bugün ne kadar vaktin var?" `<fieldset>` + `<legend>` ile önce okunur). Tıklama alanı kartın tamamı (>= 72 px).
  - **Varsayılan:** daha önce seçtiği mod; ilk kullanımda **"5 dakika"** önerilir (en düşük eşik: yorgun çocuk için "küçük başla") ama bu **saklanmaz**; seçim saklanması için kullanıcının dokunması gerekir. Seçim her an değiştirilir; değişince görev kartı **anında** o mod için güncellenir (kaynaklar `mode`: kısa/tam).
  - **5 dakika:** `mini_review_md` + en fazla bir kısa kaynak. **Tam ders:** konu özeti + tam kaynak listesi. Süreler `est_minutes`'tan ("yaklaşık 5 dakika", "yaklaşık 25 dakika").
  - Seçim yalnızca modu saklar (`completed_mode` kısa/tam, sunucuda tamamlanan görev kaydında); neden o seçildiği sorulmaz.
- **Görev kartı** durağandır (içinde düğme olduğu için tamamı tıklanabilir değil); **tek birincil düğme "Göreve başla"** konu/görev detayına (Ö4) götürür. Birden fazla görev varsa yalnızca sıradaki vurgulanır, diğerleri satır kartıdır.
- **Tamamlandığında:** (Ö4'te "Tamamladım" sonrası) Bugün'e dönülür: görev kartı yerinde **başarı tonlu** kart: "Bugünlük bu kadar yeter." (hedef sayısı bittiyse) ya da sıradaki görev. Konfeti, puan, seri yok. İsteğe bağlı ikincil: "İstersen bir sonraki konuya geçebilirsin."
- **Durumlar:**

| Durum | Gösterim |
|---|---|
| Yükleniyor | Önbellekte plan varsa (yalnızca öğrenci "Evet" demişse) **hemen** gösterilir, arkada yenilenir. Aksi halde selamlama + `SkeletonList(2)`; "Yükleniyor" okunur. Hafif modda animasyon yok. |
| Plan yok (boş) | `EmptyState`: "Henüz bir planın yok" / "Birkaç adımda sana uygun bir plan hazırlayabiliriz." / **Plan oluştur** (-> Ö2). Mod seçimi gizlenir. |
| Tüm görevler tamam | Başarı kartı "Bugünlük bu kadar yeter." + ilerleme çubuğu; yarın için baskı cümlesi yok. |
| Plan bitti | Sakin kart: "Planındaki tüm konuları tamamladın." / **Yeni plan oluştur**. |
| Konu bilgisi yok (seed olmayan hafta) | `Banner` uyarı: "Bu haftalar için konu bilgisi henüz yok. Konu sırası yaklaşıktır." (plan 4.1: "konu bilgisi yok" uyarısı) |
| Hata | Veri var: içerik + banner "Güncellenemedi" + "Tekrar dene". Yok: `ErrorState`. |
| Çevrimdışı | Kalıcı `Banner`: çevrimdışı seçeneği açıksa "İnternet yok. Kayıtlı planın açık."; kapalıysa "İnternet yok. Bağlantı gelince yeniden denenecek." Görev (önbellekteyse) **okunabilir**; "Tamamladım" kuyruğa alınmaz, nedeni yazılı pasif. |
| Yeni cevap / yaklaşan ders | İlgili kartlar yalnızca varsa görünür; yoksa hiç yer kaplamaz. |
| Ders yaklaşıyor (<= 10 dk) | Kart "Derse katıl" birincil olmaz; Bugün'ün tek birincil eylemi "Göreve başla" kalır. Ders kartı kendi içinde tıklanabilir; ders sayfası Ö10'dur. |

- **Erişilebilirlik:** Okuma sırası: başlık, selamlama, mod grubu, sıradaki görev, düğme, diğer kartlar. Görev kartı ekran okuyucuda "Sıradaki görev: Kesirleri karşılaştırma, Matematik, 5. sınıf, 5 dakikalık tekrar" diye tek cümle; düğme ayrı. Mod değiştiğinde görev kartı `aria-live="polite"` ile güncellemeyi duyurur. Tıklama alanları >= 56 px (birincil) / 48 px; %200 yazıda her şey alt alta, kaydırılır.
- **Backend (`get_today_tasks(plan_id)`):** sıradaki `daily_goal` madde + kısa ve tam mod kaynakları tek çağrıda dönmeli; yanıt (öğrenci "Evet" demişse) service worker tarafından önbelleğe alınır.

### Ö2. Plan oluşturma sihirbazı (3 adım) + konu önizleme
- **Amaç:** Kişisel telafi planı (plan 4.1/5).
- **Adımlar** ("Adım 1 / 3" yazılı, `ProgressBar`): (1) **Sınıf ve dersler** (5-8 `RadioCard`; Matematik, Fen onay çipleri) (2) **Derslere ara verdiğin tarihler** (başlangıç ve bitiş; `<input type="date">` + yazı girişi; neden **sorulmaz**) (3) **Günde kaç konu?** (1, 2, 3 `RadioCard`; "Küçük başlamak iyi bir fikir"). Ardından **önizleme:** ilk konular, toplam konu sayısı, "Konu sırası yaklaşıktır" bandı, **Planı oluştur**.
- **Birincil eylem:** her adımda "Devam", sonda "Planı oluştur". **Geri** her adımda (jestsiz, görünür düğme).
- **Durumlar:** tarih hatası ("Bitiş tarihi başlangıçtan önce olamaz."), konu bilgisi yok haftalar uyarısı, oluşturuluyor (düğme yükleniyor), hata (girilenler korunur).

### Ö3. Planım
- **Amaç:** Sıralı konular ve basit ilerleme.
- **Öğeler:** `ProgressBar` ("3 / 10 konu"), üstte "Konulara göz at" kartı (-> Ö8 Kütüphane), konu listesi (`CardLink` satırları: başlık, ders, durum metni "Tamamlandı" / "Sırada" / "Atlandı" + simge).
- **Birincil eylem:** Satıra tıklamak konu detayını açar. "Yeni plan oluştur" ikincil.
- **Durumlar:** plan yok (`EmptyState` -> Ö2), yükleniyor, hata, çevrimdışı (okunur; yalnızca çevrimdışı seçeneği açıksa).

### Ö4. Konu / görev detayı
- **Amaç:** Konuyu çalışmak, bitirmek ya da takılınca soru sormak.
- **Öğeler:** konu başlığı, ders ve sınıf, mod etiketi ("5 dakikalık tekrar"), **özet** (Markdown'dan güvenli biçimde üretilmiş öğeler, `body-lg`; HTML olarak basılmaz), **kaynaklar** (kart listesi: sağlayıcı, süre, "Giriş gerekir" etiketi, "Çevrimdışı açılır" işareti), altta "Tamamladım" ve "Anlamadım, soru sor".
- **Birincil eylem:** **Tamamladım**. İkincil: **Anlamadım, soru sor** (-> Ö5, konu önceden seçili).
- **Durumlar:** özet yüklenemedi (önbellek ya da `ErrorState`), kaynak bağlantısı açılamadı ("Bağlantı şu an açılmıyor." + "Başka kaynak seç"), **harici site bilgisi** (A13): bağlantıya tıklanınca önce küçük iletişim kutusu "Harici bir siteye gidiyorsun. Bu site Eğitim Köprüsü'nden bağımsızdır; giriş gerekebilir." + **Siteye git** (yeni sekmede, `rel="noopener noreferrer"`, `Referrer-Policy: no-referrer`) / **Vazgeç (birincil)**; çevrimdışı (özet açık, bağlantılar pasif ve nedeni yazılı).

### Ö5. Soru sor
- **Amaç:** Fotoğrafla soru (plan 4.1/3).
- **Öğeler:** (1) Fotoğraf: **Fotoğraf çek** ve **Galeriden seç** (iki kart). Fotoğraf çek, telefonun **kendi kamera uygulamasını** açar (`<input type="file" accept="image/*" capture="environment">`); sayfa **kamera izni istemez**. Galeriden seç aynı alanın `capture` olmayan hâlidir. (2) **Kırpma** (araç düğmeli, jestsiz alternatif: "Tümünü seç", sürükleme + ok düğmeleri) (3) Açıklama (metin alanı; "Fotoğrafta yüzün, adın ya da okulun görünmesin." yönergesi) (4) Ders ve konu (konu önceden seçili olabilir). Önizlemede fotoğraf etiketi = öğrencinin yazdığı açıklama.
- **Güvende kal:** ilk soruda önce **Ö11** gösterilir.
- **Birincil eylem:** **Soruyu gönder**. İkincil: Vazgeç.
- **Durumlar:** kamera uygulaması bilgisi (izin değil, bilgi): "Soru fotoğrafı çekmek için telefonunun kamera uygulaması açılır. Fotoğraf cihazında küçültülür, konum bilgisi silinir." Fotoğraf seçilmeden sayfaya dönüldü (sakin: "Fotoğraf seçilmedi."), sıkıştırılıyor/yükleniyor (ilerleme + iptal), günlük sınır ("Bugünlük soru sınırına ulaştın, yarın yine sorabilirsin."), çevrimdışı (gönderilemez; fotoğraf sayfada kalır), hata. **Veli soru-cevabı kapatmışsa** bu ekran yerine: "Soru sorma şu an kapalı. Velinle konuşabilirsin."

### Ö6. Sorular (Sorularım)
- **Amaç:** Gönderilen soruların listesi + yeni soru.
- **Öğeler:** üstte **Soru sor** (birincil); liste: küçük fotoğraf (süs, açıklama etiketi), konu, durum metni ("Cevap bekliyor", "Cevaplandı", "Kapandı") + "Yeni" işareti.
- **Birincil eylem:** Soru sor. **Durumlar:** boş ("Henüz sorun yok. İlk sorunu sorduğunda cevaplar burada görünür."), yükleniyor, hata, çevrimdışı (pasif + neden).

### Ö7. Soru detayı
- **Amaç:** Soru-cevap akışı.
- **Öğeler:** fotoğraf (yakınlaştırma düğmeleri + "Aç" ile tam sayfa; hafif modda dokununca yüklenir), mesajlar (kronolojik; gönderen "Sen" / **"Ad S."**; gönüllü cevapları metin, fotoğraf, ses + **yazılı özet**), takip sorusu alanı, **Anlaşıldı**, **Bildir** (+ Gönüllüyü engelle, O5). Sesli cevap: oynat/duraklat düğmesi, süre, metin özeti her zaman görünür (işitme engeli olan kullanıcılar için, ama arayüzde bu gerekçe yazılmaz).
- **Birincil eylem:** cevap geldiyse **Anlaşıldı**; yoksa takip sorusu gönder. **Durumlar:** cevap bekleniyor ("Gönüllü cevap yazınca haber vereceğiz."), maskelenmiş içerik (filtre: "Kişisel bilgi gizlendi" etiketi), gizlenmiş mesaj, ses indirilmedi (hafif mod: "Sesi indir" düğmesi), yükleniyor, hata.

### Ö8. Kütüphane (+ kaynak detayı)
- **Amaç:** Sınıf -> ders -> ünite -> konu gezintisi; kaynaklara ulaşmak. Plan sekmesinden açılır.
- **Öğeler:** adım adım liste (her seviyede başlık + `CardLink` satırları, ekmek kırıntısı gezinmesi), konu satırında özet var işareti. Kaynak detayı: başlık, sağlayıcı (EBA, OGM Materyal), süre, "Giriş gerekir", "Çevrimdışı açılır", **Kaynağı aç** (harici site bilgisi için Ö4'e bkz.).
- **Birincil eylem:** Konuya tıklamak (Ö4 salt okuma sürümü: "Planıma ekle" yok, MVP). **Durumlar:** boş ünite, yükleniyor, hata, çevrimdışı (yalnızca önbellekteki özetler).

### Ö9. Gönüllüm ve derslerim
- **Amaç:** Eşleşen gönüllüyü ve dersleri görmek; randevu almak.
- **Öğeler:** gönüllü kartı ("**Ad S.**", ders; üniversite ve bölüm **çocuğa gösterilmez**), **yaklaşan dersler**, **randevu al** (boş saatler: gün seçici + saat kartları; 20 dk "Kısa ders", 40 dk "Tam ders"; 08:00-21:00), geçmiş dersler, **Bildir / Gönüllüyü engelle** (O5).
- **Birincil eylem:** **Randevu al** (veya yaklaşan derste **Derse katıl**, ders başlamadan 10 dk önce etkinleşir). **Durumlar:** eşleşme yok (`EmptyState`: "Henüz bir gönüllün yok. Sana uygun biri seçilince velinle birlikte haber vereceğiz."), boş saat yok, çakışma ("Bu saat az önce doldu, başka bir saat seçilebilir."), iptal onayı, **görüntülü ders kapalı** ("Görüntülü ders şu an kapalı. Velinle konuşabilirsin."), çevrimdışı.

### Ö10. Ders sayfası (Jitsi)
- **Amaç:** Gönüllüyle görüntülü ders (bkz. 9, ders kuralları). Ders, sayfa içine gömülü `8x8.vc` (JaaS) iframe'iyle açılır; sitedeki **tek** üçüncü taraf köken budur (A10).
- **Hazırlık ekranı:** "Derse hazır mısın?"; **mikrofon** anahtarı; **kamera anahtarı varsayılan KAPALI** ("Kameranı açmak zorunda değilsin."); "Dersler kaydedilmez." bilgi bandı; bağlantı zayıfsa **"Yalnızca sesle katıl"** önerisi (hafif mod otomatik önerir); **Derse katıl**. Tarayıcı izinleri (mikrofon, kamera) yalnızca **Derse katıl** düğmesine basılınca, hemen öncesinde tek cümlelik açıklamayla istenir: "Derste konuşabilmen için mikrofonu, sen açarsan kamerayı kullanırız." (A6).
- **Ders içi:** gönüllü ve öğrenci karelerinde **görünen ad**: öğrenci **rumuz**, gönüllü **"Ad S."**; büyük, her zaman görünür **Dersten çık** düğmesi; **Bildir** (sabit); mikrofon/kamera anahtarları (kamera açmak öğrencinin tercihidir, kimse isteyemez). **Görüşme içi sohbet, davet ve bağlantı paylaşma kapalıdır; öğrenci ve veli sayfalarında ekran paylaşımı tarayıcı düzeyinde de kapalıdır** (`Permissions-Policy: display-capture=()`; bkz. 9). Süre bitimine 5 dk kala nazik bant; ders kendiliğinden kesilmez, 15 dk tolerans sonrası oda kapanır.
- **Durumlar:** bağlanıyor, bağlantı koptu ("Bağlantı koptu. Yeniden bağlanıyoruz." + **Yeniden dene**), gönüllü henüz gelmedi ("Gönüllün birazdan katılacak."), ders süresi dışı (katılım penceresi: ders - 10 dk -> bitiş), tarayıcı mikrofon/kamera iznini reddetti ("Mikrofon kapalı. Derse yazıyla ya da sessiz katılabilirsin; tarayıcı ayarlarından açabilirsin."). **iPhone ana ekran uygulamasında** iframe içinden kamera ve mikrofon çalışmazsa sayfa "Dersi tarayıcıda aç" bağlantısı sunar (Safari sekmesi); bu davranış gerçek cihazda doğrulanmalı (bkz. 11).

### Ö11. "Güvende kal" hatırlatması
- **Amaç:** İlk sorudan **ve** ilk görüntülü dersten önce çevrimiçi güvenlik hatırlatması (`cocuk-koruma-kurallari.md` A1; `cocuk-bilgilendirme.md` B).
- **Zamanlama:** İlk "Soru sor" ve ilk "Derse katıl" öncesi; ikisi için ayrı ayrı bir kez (ilk soruda gösterildiyse ders öncesi kısa tekrar). Ayarlar'dan her zaman tekrar okunabilir.
- **Öğeler:** numaralı kısa maddeler (gerçek bilgilerini paylaşma · fotoğrafa dikkat · konuşma hep burada kalır · kameranı açmak zorunda değilsin · "Bildir" ne zaman · bildirmek seni zor duruma sokmaz · acil durumda 112). Metin: `docs/hukuk/cocuk-bilgilendirme.md` B.
- **Birincil eylem:** **Anladım** -> kaldığı eyleme döner. Kayıt: `consents` `cocuk_guvenlik_hatirlatma` (ilk soru / ilk ders ayrı kayıt).
- **Ton notu:** `cocuk-bilgilendirme.md` v0.2 B madde 3 artık "Kendinle ilgili özel bir şey anlatmak zorunda değilsin." diyor; öğrenci arayüzünde sağlık/hastalık sözcüğü geçmeme kuralı korunuyor (bkz. 11, madde 2).

### Ö12. "Hesabımı silmek istiyorum"
- **Amaç:** Çocuğun silme isteğini velisine iletmek (veli onaylar; `saklama-ve-imha.md`).
- **Giriş:** Ayarlar > Hesap > "Hesabımı silmek istiyorum" (ikincil düğme).
- **Ekran:** başlık "Hesabını silmek mi istiyorsun?"; "Bu isteği velin onaylar. Hesabın silinince planın, soruların ve cevapların da silinir; geri getirilemez. Güvenlikle ilgili bazı kayıtlar kısa bir süre daha saklanabilir." (`cocuk-bilgilendirme.md` C); **Vazgeç** (birincil, güvenli seçenek) ve **Velime istek gönder** (ikincil).
- **Sonuç:** "İsteğin velime gönderildi. Velin onaylayana kadar hesabın açık kalır." Veliye genel bir bildirim gider (bkz. 8). Bekleyen istek varken ekranda "İsteğin velinde" durumu ve **İsteği geri çek** düğmesi.
- **Durumlar:** gönderiliyor, hata, çevrimdışı (gönderilemez, nedeni yazılı).

### Öğrenci: veli özellik anahtarları kapalıyken
Soru-cevap, sesli cevap ya da görüntülü ders velice kapatıldıysa ilgili giriş (Soru sor, ses oynatma, Randevu al/Derse katıl) gizlenmez; **pasif kart** ve yanında nötr açıklama gösterilir: "Bu özellik şu an kapalı. Velinle konuşabilirsin." (suçlayıcı ya da gerekçe belirten dil yok). Pasif kart `aria-disabled="true"` taşır ve açıklaması `aria-describedby` ile bağlıdır; klavyeyle odaklanabilir kalır.

## 4. Veli (telefon tarayıcısı öncelikli)

### V1. Kayıt (aydınlatma, kullanım koşulları, hesap, OTP)
- **Amaç:** Veli hesabını yasal gereklilikleri doğru sırayla tamamlayarak açmak (`aydinlatma-veli.md`, `kullanim-kosullari.md`, plan 4.1/1). Metinler herkese açık sayfalarla (`/aydinlatma/veli`, `/kullanim-kosullari`) aynıdır; kayıt akışında aynı bileşenle gömülür.
- **Sıra** (yukarıda "Adım n / 5" yazılı):

| Adım | Ekran | Düğme | Not |
|---|---|---|---|
| 1 | **Aydınlatma metni:** başlıklı bölümler (veri sorumlusu, hangi veriler, amaçlar, paylaşım, saklama, haklarınız), "Gizlilik politikası" ve "Çerez politikası" bağlantıları | **Okudum, anladım** (*"Kabul ediyorum" yok, onay kutusu yok*) | Veri toplanmadan **önce** gösterilir (e-posta alınmadan). Metnin sonuna kadar kaydırma **şart değildir**; düğme baştan etkin (kaydırma zorlaması yok), ama sürüm ve zaman kaydedilir. |
| 2 | **Kullanım koşulları** (12 madde, özetli, açılır bölümler) | **Kabul ediyorum** | Taslak: `kullanim-kosullari.md` son satırı. Yalnızca bu ekranda onay dili kullanılır. |
| 3 | **Hesap:** e-posta, görünen ad, şifre (güçlü şifre ipucu, göster/gizle), **"Bu cihazda oturumum açık kalsın"** kutusu (varsayılan boş, O1'deki yardım metniyle) | **Devam** | Hata metinleri nötr ("Bu e-posta ile bir hesap var. Giriş yapabilirsiniz."). |
| 4 | **OTP** (O2) | **Doğrula** | Doğrulanınca `consents` kayıtları yazılır: `aydinlatma_veli`, `kullanim_kosullari` (sürüm + zaman + kanal). Adım 1-2'de verilen onaylar sihirbazın belleğinde taşınır, **sunucuya ve cihaza yazılmaz**; hesap doğrulanınca tek istekle yazılır (bkz. 11). |
| 5 | **Hoş geldiniz:** "Şimdi çocuğunuzun hesabını oluşturabilirsiniz." | **Çocuk ekle** (V2) / ikincil **Sonra** | AR-1 çocuk eklenirken alınır. |

- **Durumlar:** hesap doğrulandıktan sonra yarım kalan kayıt (çocuk ekleme) devam ettirilebilir ("Kaldığınız yerden devam edin"); doğrulamadan önce sayfa yenilenirse akış baştan başlar (henüz veri alınmadığı için kayıp yoktur); çevrimdışı; hata. Aydınlatma metni sürümü değişirse (kayıtlı sürümden farklıysa) bir sonraki girişte kısa "Güncellendi" ekranı ve yeniden **Okudum, anladım**.

### V2. Çocuk ekle (rumuz, sınıf, **ayrı rıza ekranı**, kullanıcı adı/şifre)
- **Amaç:** Çocuk hesabı açmak. **Her çocuk için ayrı** açık rıza (AR-1) alınır (`acik-riza-veli.md` 2).
- **Adımlar** ("Adım n / 4"):
  1. **Rumuz ve sınıf:** rumuz (gerçek ad ve soyad kullanmayın uyarısı, "Okuldaki adı değil, çocuğun seveceği bir ad."), sınıf (5-8 `RadioCard`). **Devam.**
  2. **Açık rıza (AR-1), AYRI sayfa:** başlık "Açık Rıza Beyanı"; metnin tamamı ya da açılır özeti + aydınlatma metnine bağlantı (**aydınlatmayla aynı onay kutusunda birleştirilmez**). Yasal temsilci beyanı ("**[Rumuz]** adlı çocuğun velisi veya vasisi olduğumu beyan ederim"). İki seçenek, **ikisi de önceden seçili değil**: **( ) Açık rıza veriyorum** · **( ) Açık rıza vermiyorum** (`RadioCard`). **Devam düğmesi seçim yapılana kadar pasif;** neden pasif olduğu yanında yazılı ("Devam etmek için bir seçenek işaretleyin."). Metin: `docs/hukuk/acik-riza-veli.md` 3.
     - **"Vermiyorum":** bilgi ekranı "Bu rıza olmadan çocuk hesabı açılamıyor, çünkü bu işleme hizmetten ayrılamaz." + **Geri dön** (birincil) + "Siteden çık" (ikincil, açılış sayfasına). Kayıt `granted=false`.
     - **"Veriyorum":** `acik_riza_dolayli_saglik` kaydı (kullanıcı, öğrenci, sürüm, metin özeti, zaman, kanal `web`, derleme sürümü).
  3. **Kullanıcı adı ve şifre:** kullanıcı adı (küçük harf, boşluksuz, "çocuğunuzun kolay yazabileceği bir ad"), şifre (güçlü + göster/gizle), **"Neler açık?"** özellik anahtarları (Soru-cevap, Sesli cevaplar, Görüntülü ders; varsayılan hepsi açık, "İstediğiniz zaman değiştirebilirsiniz", bkz. V7). **Hesabı oluştur.**
  4. **Hazır:** "**[Rumuz]** için hesap oluşturuldu." Kullanıcı adı ve şifre büyük puntoyla bir kez gösterilir, **Kopyala** düğmesi, "Bu bilgileri çocuğunuza siz verin." + çocuğun siteye nasıl giriş yapacağı ("Telefonunun tarayıcısında bu adresi aç; **Öğrenciyim**'e dokun."). İsteğe bağlı: "Çocuğunuzun telefonuna ekleyin" (PWA kurulumu için kısa yönerge). **Bitti.**
- **Backend:** `create-child-account` AR-1 `granted=true` ve `withdrawn_at` boş değilse reddeder. Hata: "Rıza kaydı bulunamadı."
- **Durumlar:** kullanıcı adı alınmış ("Bu kullanıcı adı kullanılıyor. Başka bir ad deneyin."), oluşturuluyor, hata (girilenler korunur), hız sınırı ("Biraz bekleyip tekrar deneyin.").

### V3. Çocuk paneli
- **Amaç:** Çocuğun durumunu tek bakışta görmek (plan ilerlemesi, son sorular, yaklaşan dersler). Birden çok çocuk varsa üstte çocuk seçici (çip).
- **Öğeler:** çocuk adı ve sınıf, **plan ilerlemesi** (`ProgressBar`), **son sorular** (en çok 3, "Tümünü gör" -> V4), **yaklaşan dersler** (V6), bekleyen **işlemler** kartı (eşleşme önerisi V5, silme talebi V9) en üstte.
- **Birincil eylem:** Bekleyen bir işlem varsa o kart; yoksa panel salt okunurdur ("Çocuk ekle" ikincil). **Durumlar:** çocuk yok (`EmptyState`: "Henüz çocuk hesabı yok." / **Çocuk ekle**), plan yok ("Çocuğunuz henüz plan oluşturmadı."), yükleniyor, hata.

### V4. Çocuğun soru-cevapları (salt okunur)
- **Amaç:** Şeffaflık: veli tüm soru-cevapları görür.
- **Öğeler:** liste (konu, tarih, durum) -> ayrıntı: mesajlar, fotoğraf, ses + özet; gönüllü **"Ad S."**, **Bildir** ve **Gönüllüyü engelle** (O5). Yazma alanı yoktur.
- **Birincil eylem:** yok (okuma). **Durumlar:** boş, yükleniyor, hata; filtre maskeli içerik etiketi görünür.

### V5. Eşleşme önerisini onaylama
- **Amaç:** Yöneticinin önerdiği gönüllüyü onaylamak ya da reddetmek (eşleşme **veli onayıyla** başlar; plan 9.2).
- **Öğeler:** **gönüllü kartı:** "**Ad S.**" · **üniversite** · **bölüm** · sınıf yılı · verebileceği dersler ve sınıflar · "Eğitimi tamamladı" · uygun saatlerin özeti. Açıklama: "Eşleşirseniz gönüllü çocuğunuzun yalnızca rumuzunu ve sınıfını görür. Derslere istediğiniz an katılabilirsiniz."
- **Birincil eylem:** **Onayla**. İkincil: **Reddet** (neden sorulmaz). **Durumlar:** süresi doldu, zaten karar verildi, hata.

### V6. Dersler
- **Amaç:** Randevu al/iptal, geçmiş (katılım meta verisi), **derse katıl**.
- **Öğeler:** yaklaşan dersler, **Randevu al** (Ö9 ile aynı seçici; veli adına), geçmiş dersler (tarih, süre, kimler katıldı: "Çocuk, gönüllü, siz" **yalnızca katılım zamanı**; kayıt yok), **Derse katıl** (istediği an; ders sırasında "katılan veli" gönüllüye bildirilir). Ders sayfası Ö10 kurallarıyla; **veli kamerası da kapalı başlar** (A11), ekran paylaşımı yoktur.
- **Birincil eylem:** **Derse katıl** (ders penceresindeyse) ya da Randevu al. **Durumlar:** eşleşme yok, boş saat yok, görüntülü ders kapalı, iptal onayı, hata.

### V7. Çocuk hesabı yönetimi
- **Amaç:** Şifre, uygunluk, **özellik anahtarları**, gönüllü, hesap silme.
- **Bölümler:**
  1. **Şifre:** "Şifreyi sıfırla" (yeni şifre bir kez gösterilir).
  2. **Uygunluk saatleri:** haftalık ızgara (gün + saat aralığı, düğmeyle ekle/sil; sürükleme zorunlu değil).
  3. **Neler açık? (özellik anahtarları):** üç anahtar (`Switch`, etiket + tek cümle açıklama):
     - **Soru-cevap** (kapatılırsa çocuk soru soramaz; mevcut sorular okunur).
     - **Sesli cevaplar** (yalnızca Soru-cevap açıkken; kapalıyken cevaplar yalnızca yazılı).
     - **Görüntülü ders** (kapatılırsa planlı dersler iptal edilir: değiştirmeden önce onay "Planlı 2 ders iptal olacak. Devam edilsin mi?").
     Değişiklik anında kaydedilir; çocuğa nötr bilgi gider; kayıt `audit_log`'a düşer. Açıklama: bu anahtarlar çocuğun hangi iletişim özelliklerini kullanacağını yetişkinin yönetmesi içindir (A2).
  4. **Gönüllü:** eşleşen gönüllü kartı ("Ad S., üniversite, bölüm"), **Bildir**, **Gönüllüyü engelle** (O5), eşleşme geçmişi.
  5. **Hesabı sil** (hata renginde ikincil): sonuç ekranı (silinenler, 30 gün, geri alınamaz) + **Vazgeç (birincil)** / **Hesabı sil**.
- **Durumlar:** kaydetme hatası (anahtar eski konuma döner + bant), yükleniyor.

### V8. Ayarlar > Yasal metinler > **Rızalarım** (+ rıza geri alma)
- **Amaç:** Verilen onayları görmek ve **geri almak** (KVKK: geri alma, verme kadar kolay olmalı; `acik-riza-veli.md` 2/7).
- **Ana ekran:** her çocuk için bir `Card`:
  - Çocuk adı (rumuz), **Açık rıza (AR-1)**: durum ("Verildi, 16.10.2026" / "Geri alındı, 20.10.2026"), belge sürümü (`veli-acik-riza v0.1`), **Metni oku**, **Rızamı geri al**.
  - Altında veliye ait kayıtlar: Aydınlatma metni (okundu, tarih, sürüm), Kullanım koşulları (kabul, tarih, sürüm).
  - Çocuğun diğer velisi varsa: "Bu rızayı **[diğer veli]** da geri alabilir." bilgi satırı.
- **Rızamı geri al -> sonuç açıklayan onay sayfası (tam sayfa, yeni adres):**
  - Başlık: "**[Rumuz]** için rızanızı geri almak üzeresiniz."
  - **Geri alırsanız ne olur** (liste, sade cümlelerle):
    1. Çocuğunuzun hesabı **hemen kullanılamaz** olur.
    2. Eşleşme biter ve planlı dersler iptal edilir.
    3. Plan, soru, cevap ve fotoğraf dahil verileri **en geç 30 gün içinde silinir** ve geri getirilemez.
    4. Güvenlik kayıtları gizlilik politikasında yazılan süre boyunca saklanabilir.
    5. Daha sonra devam etmek isterseniz yeni bir çocuk hesabı ve yeniden rıza gerekir.
  - **Düğmeler:** **Vazgeç** (birincil) ve **Rızamı geri al** (ikincil, hata renginde kenarlık). Onay kutusu yok; eylem adı düğmede yazılı.
  - Doğrulama: şifre/OTP yeniden istenir (kazara tıklamaya karşı).
  - **Sonuç sayfası:** "Rızanız geri alındı." + tarih + yukarıdaki sonuçların özeti + **Tamam**. Çocuk bir sonraki girişte nötr mesaj görür: "Hesabın şu an kullanılamıyor. Velinle konuş." (rıza geri alma ayrıntısı yazılmaz).
  - Diğer veliye genel bildirim gider (bkz. 8).
- **Durumlar:** hata (geri alınamadı: "Şu an tamamlanamadı. Hiçbir şey silinmedi."), çevrimdışı (pasif + neden), zaten geri alınmış.
- **Açık nokta:** "Verilerimi önce indir" seçeneği saklama dokümanında geçiyor (`saklama-ve-imha.md`) ama plan kapsamında yok; ekranda yer ayrılmadı (bkz. 11).

### V9. Çocuğun silme talebini onaylama
- **Amaç:** Öğrencinin (Ö12) gönderdiği silme isteğine veli kararı.
- **Öğeler:** bildirim -> sayfa: "**[Rumuz]** hesabının silinmesini istiyor." + sonuçlar (V7 5. madde ile aynı), **Vazgeç/Reddet** (birincil: "Hesabı silme"), **Hesabı sil** (ikincil, hata). 30 gün yanıt gelmezse yönetici veliyle iletişime geçer (yazılı).
- **Durumlar:** süresi doldu, çocuk isteği geri çekti, hata.

## 5. Gönüllü (masaüstü öncelikli, telefonda da çalışır)

### G1. Başvuru sihirbazı
- **Amaç:** Doğrulanmış gönüllü olmak (plan 4.1/2). Adım listesi solda (geniş ekran) / üstte "Adım n / 10" (telefon); yarım kalan başvuru devam ettirilir.

| # | Adım | Ana öğeler | Düğme |
|---|---|---|---|
| 1 | **Aydınlatma metni** (e-posta alınmadan önce, `aydinlatma-gonullu.md`) | Bölümlü metin | **Okudum, anladım** |
| 2 | **Kullanım koşulları** | Özetli metin | **Kabul ediyorum** |
| 3 | **E-posta + OTP** (`.edu.tr`) + "Bu cihazda oturumum açık kalsın" kutusu (varsayılan boş) | O2 | **Doğrula** (`.edu.tr` değilse: "Başvuru için üniversite e-postanız (.edu.tr) gerekir.") |
| 4 | **Profil** | Ad soyad, üniversite, bölüm, sınıf yılı. **"Öğrencilerin göreceği adınız: Ayşe K."** önizlemesi (salt okunur; ad + soyadın baş harfi) ve altında "Öğrenci adınızı ve soyadınızın baş harfini görür; veli ek olarak üniversite ve bölümünüzü görür." | Devam |
| 5 | **Ders ve sınıf** | Matematik/Fen, 5-8. sınıf onay kartları | Devam |
| 6 | **Uygunluk** | Haftalık saat ızgarası (08:00-21:00) | Devam |
| 7 | **Belge yükleme** | Öğrenci belgesi (tercihen e-Devlet barkodlu), PDF/JPG <= 5 MB; dosya seçme + yükleme ilerlemesi; saklama notu "Karar sonrası en geç 30 gün içinde silinir." | Devam |
| 8 | **Davranış kuralları** | Kısa maddeler (`gonullu-davranis-kurallari.md`), her bölüm açılır | **Okudum, anladım** |
| 9 | **Eğitim + quiz** (G2) | Eğitim modülleri, quiz | Quiz'i bitir |
| 10 | **Taahhütname** | 12 madde, **her madde ayrı onay kutusu** (`gonullu-taahhutname.md`) | **Taahhüt ediyorum** (tüm kutular işaretlenene kadar pasif; yanında "Devam etmek için tüm maddeleri işaretleyin.") |

- Pilotta karar verilirse adli sicil için **ayrı bir açık rıza ekranı** eklenir (taahhüde gömülmez).
- **Kayıtlar:** `aydinlatma_gonullu`, `kullanim_kosullari`, davranış kuralları sürümü, `gonullu_taahhut` (sürüm + zaman).
- **Durumlar:** belge yüklenemedi (tekrar dene, boyut/tür hatası net), dosya türü uygun değil, başvuru gönderildi (-> G3), çevrimdışı, oturum süresi (taslak korunur).

### G2. Güvenlik ve iletişim eğitimi + quiz
- **Amaç:** Eğitimi tamamlamak ve quizi geçmek (eşik %80, puanlama sunucuda).
- **Öğeler:** modül listesi (adım adım, tamamlandı işaretli), okuma sayfası (okunur metin, `body-lg`), quiz (soru başına bir sayfa; **zaman sınırı yok**; `RadioCard`lar), sonuç: geçti/kaldı, kaldıysa "Yeniden dene" (doğru cevaplar gösterilmez, konu başlıkları önerilir).
- **Birincil eylem:** Sonraki / Quiz'i bitir. **Durumlar:** yükleniyor, hata (cevaplar korunur), çevrimdışı (eğitim metinleri açık, quiz gönderimi pasif + neden).

### G3. Başvuru durumu
- **Amaç:** Başvurunun nerede olduğunu göstermek (`beklemede`).
- **Öğeler:** adımlar listesi (Gönderildi · İncelemede · Karar), tahmini süre yok (söz verilmez), onay sonrası "Hoş geldiniz, **Panoya git**"; ret: sakin metin + (varsa) gerekçe + iletişim.
- **Durumlar:** incelemede (`EmptyState` benzeri sakin kart), onaylandı, reddedildi, ek belge istendi (G1 7. adıma dönüş).

### G4. Pano
- **Amaç:** Bana atanan sorular, havuz, yaklaşan dersler.
- **Düzen:** telefonda tek sütun sekmeler (Bana atananlar · Havuz); geniş ekranda (>= 64 rem) **iki sütun:** solda sorular (sekmeli), sağda yaklaşan dersler + kısa özet.
- **Öğeler:** soru kartları (öğrenci **rumuzu + sınıf**, ders/konu, bekleme süresi "2 saattir bekliyor"), havuzda **Üstlen** (onaylı gönüllü).
- **Birincil eylem:** Soruya tıkla -> G5. Havuz kartında **Soruyu üstlen**. **Durumlar:** boş ("Şu an cevap bekleyen soru yok."), havuz boş, yükleniyor, hata, çevrimdışı.

### G5. Soru cevaplama
- **Amaç:** Soruyu görüp cevaplamak (metin, fotoğraf, ses).
- **Düzen:** geniş ekran: solda fotoğraf (yakınlaştır/döndür düğmeleri), sağda yazma alanı; telefon: üstte fotoğraf, altta alan.
- **Öğeler:** soru fotoğrafı + açıklama, konu, **yazı alanı** (filtre uyarısı: "Telefon, adres ve uygulama adları gizlenir."), **fotoğraf ekle**, **ses kaydı** (kayıt/durdur/dinle/sil; <= 120 sn; **yazılı özet zorunlu**: "Sesli cevabın kısa bir yazılı özetini de ekleyin."), **cevap taslağı** yazarken cihazda saklanır.
- **Taslak (cihazda, en çok 7 gün):** yazı alanının altında "Taslak bu cihazda saklanıyor" yazar. Taslak **cevap gönderilince**, **çıkış yapılınca** ve **en geç 7 gün sonra** silinir; sunucuya gönderilmez. "Bu cihazdaki kayıtlı verileri temizle" (O4) taslakları da siler.
- **Mikrofon izni:** tarayıcının izin penceresi yalnızca **Kayıt** düğmesine basılınca açılır; hemen öncesinde tek cümle gösterilir: "Sesli cevap kaydetmek için mikrofonu kullanırız. Kayıt yalnızca öğrenciye ve velisine gider." (A6) + **Devam** / **Vazgeç**.
- **Birincil eylem:** **Cevabı gönder**. **Durumlar:** mikrofon izni reddedildi ("Mikrofon kapalı. Yazıyla cevaplayabilirsiniz; tarayıcı ayarlarından açabilirsiniz."), kayıt süresi doldu, gönderiliyor, maskelenen içerik uyarısı ("Mesajınızdaki bazı bilgiler gizlendi."), hata (taslak korunur), soru başkasına verildi/kapandı.

### G6. Öğrencilerim
- **Amaç:** Eşleştiği öğrencilerin özeti.
- **Öğeler:** öğrenci kartı: **rumuz, sınıf**, plan özeti (ilerleme), geçmiş dersler; **derslere ara verilen tarihler ve erişilebilirlik tercihleri gösterilmez** (hukuk J: pgTAP). **Bu öğrenciyle devam etmek istemiyorum** (yeniden atama talebi, onay ekranlı).
- **Birincil eylem:** Karta tıkla -> ayrıntı/ders geçmişi. **Durumlar:** boş ("Henüz eşleşmiş öğrencin yok."), yükleniyor, hata.

### G7. Uygunluk takvimi
- **Amaç:** Haftalık uygun saatler.
- **Öğeler:** hafta ızgarası (geniş ekranda gün sütunlu, telefonda gün sekmeli), saat aralığı ekle/sil düğmeleri (sürükleme zorunlu değil), "08:00-21:00 dışı seçilemez" notu.
- **Birincil eylem:** **Kaydet**. **Durumlar:** çakışma, kaydetme hatası, kaydedildi.

### G8. Derslerim + derse katıl + ders sonrası kısa not
- **Amaç:** Yaklaşan/geçmiş dersler; derse girmek; ders sonrası öğrenci hakkında kısa not.
- **Öğeler:** yaklaşan ders kartı (rumuz, saat, **Derse katıl** pencereyle etkin), geçmiş dersler, **ders sonrası not** alanı (kısa; filtreli; "Kişisel bilgi yazmayın.").
- **Ders sayfası** (gönüllü): Ö10 kurallarıyla; gönüllü moderatördür; görünen ad **"Ad S."**; masaüstü tarayıcıda kendi sekmesinde açılır. Gönüllü ekran paylaşımı yalnızca ders içeriği içindir (yalnızca gönüllü sayfasında izin verilir).
- **Birincil eylem:** **Derse katıl**. **Durumlar:** ders penceresi dışı, öğrenci gelmedi ("Gelinmedi" işaretleme), hata, iptal.

## 6. Yönetici (yalnızca masaüstü tarayıcısı, MFA)

Yönetici girişi: e-posta + şifre -> **MFA (TOTP) ekranı** (6 haneli kod; kurulumda QR + elle anahtar; hata: "Kod eşleşmedi."). MFA yoksa hiçbir yönetici ekranı açılmaz (`aal2`).

### Y1. Gönüllü başvuruları
- **Amaç:** Başvuruları incelemek, onay/ret.
- **Düzen:** >= 64 rem **liste + ayrıntı**; filtre çipleri (inceleme, eğitim, onaylı, reddedildi); dar ekranda liste -> tam sayfa ayrıntı.
- **Ayrıntı:** profil, **belge görüntüleyici** (imzalı URL, 10 dk; inceleme sonrası otomatik kapanır), quiz sonucu, taahhüt sürümü, **Onayla** (birincil), **Reddet** (ikincil, gerekçe zorunlu). İnceleme prosedürü: `cocuk-koruma-kurallari.md` B.
- **Durumlar:** boş, belge açılamadı, işlem sonucu (başarı + audit notu), hata.

### Y2. Eşleştirme
- **Amaç:** Eşleşmesi olmayan öğrencilere gönüllü önermek.
- **Öğeler:** solda eşleşmesiz öğrenci listesi (rumuz, sınıf, ders), sağda **önerilen gönüllüler** (skor: ders-sınıf uyumu, saat kesişimi, mevcut yük; kart: "Ad S.", üniversite, bölüm, yük 2/3), **Öner** (birincil), aktif eşleşmeler listesi ve **Sonlandır** (onay + neden).
- **Durumlar:** uygun gönüllü yok, veli yanıt bekliyor (bekleyen öneri etiketi), hata.

### Y3. Şikayet ve moderasyon kuyruğu
- **Amaç:** Bildirimler ve filtreye takılan mesajlar; "önce askıya al, sonra incele".
- **Öğeler:** iki sekme (**Bildirimler** · **Filtreye takılanlar**), öncelik sırası (çocuk güvenliği önde), ayrıntı: bağlam (mesaj, orijinal metin yalnızca yönetici), **Askıya al** (birincil, onay), **Kapat** (not), **Yok say**. Engelleme bildirimleri bu kuyruğa düşer.
- **Durumlar:** boş kuyruk ("Şu an incelenecek bir şey yok."), yoğun kuyruk uyarısı (hedef süre aşıldı), hata.

### Y4. Kullanıcılar
- **Amaç:** Arama, askıya alma/açma.
- **Öğeler:** arama kutusu (e-posta, rumuz), sonuç tablosu (rol, durum, son giriş), ayrıntı paneli, **Askıya al / Askıyı kaldır** (onay + neden). Çocuk hesabının silinmiş/pasif durumu görünür.
- **Durumlar:** sonuç yok, hata, işlem tamam.

### Y5. Denetim kaydı
- **Amaç:** Yönetici işlemlerinin izi.
- **Öğeler:** filtreler (kullanıcı, işlem, tarih), değiştirilemez kayıt tablosu (kim, ne, ne zaman), sayfalama (sonsuz kaydırma değil), dışa aktarma yok (MVP).
- **Durumlar:** boş, yükleniyor, hata.

## 7. Çapraz kurallar

### 7.1 Kimin kimi nasıl gördüğü

| Görüntüleyen | Gönüllüyü | Öğrenciyi |
|---|---|---|
| Öğrenci | **"Ad S."** (ad + soyadın baş harfi) | rumuz |
| Veli | **"Ad S."** + **üniversite** + **bölüm** (+ sınıf yılı) | rumuz, sınıf |
| Gönüllü | Kendi adı | **rumuz + sınıf** (soyad, okul, adres, telefon, ara verme tarihleri, erişilebilirlik tercihi **yok**) |
| Yönetici | Tam ad, üniversite, bölüm | rumuz, sınıf, hesap durumu |
| Görüşme (Jitsi) | **"Ad S."** | **rumuz** |

"Ad S." üretimi Türkçe büyük harf kuralıyla yapılır (`shortPublicName`, `web/src/lib/public-name.ts`; çıplak `toUpperCase` yasaktır, `@/lib/turkish` kullanılır): "Mehmet iplik" -> "Mehmet İ.". Sunucuda üretiliyorsa Postgres `upper()` varsayılan harmanlamada `i`yi `I` yapar; aynı kural uygulanmalı (backend notu).

### 7.2 Kayıtlar (`consents`) ve ekranlar

| Tür (`consents.type`) | Ekran | Kim |
|---|---|---|
| `aydinlatma_veli` | V1 adım 1 ("Okudum, anladım") | Veli |
| `kullanim_kosullari` | V1 adım 2, G1 adım 2 ("Kabul ediyorum") | Veli, gönüllü |
| `acik_riza_dolayli_saglik` (AR-1, çocuk başına, `student_id`) | V2 adım 2 (ayrı sayfa, seçenekler boş) | Veli |
| `aydinlatma_gonullu` | G1 adım 1 | Gönüllü |
| davranış kuralları sürümü | G1 adım 8 | Gönüllü |
| `gonullu_taahhut` | G1 adım 10 (12 madde) | Gönüllü |
| `cocuk_bilgilendirme` | Ö0 adım 1 | Öğrenci |
| `cocuk_guvenlik_hatirlatma` | Ö11 (ilk soru, ilk ders ayrı) | Öğrenci |

Rıza geri alma (V8) `withdrawn_at` yazar. Her kayıtta: sürüm, metin özeti, zaman, kanal (`web`), web derleme sürümü. Cihazda saklanan seçimler (Ö0 adım 2, görünüm, çerez notu) `consents` tablosuna **yazılmaz**.

### 7.3 Çocuk koruma ve veli kontrolü özeti
Veli, çocuğun tüm soru-cevaplarını ve ders geçmişini görür, derse istediği an katılır, **özellikleri (soru-cevap, sesli cevap, görüntülü ders) kapatabilir**, gönüllüyü **engelleyebilir**, rızayı **geri alabilir**. Öğrenci "Bildir" ve "Gönüllüyü engelle"yi kullanabilir; bu eylemler veliye bildirilir. Bu kuralların kaynağı kendi çocuk koruma politikamızdır (`docs/hukuk/cocuk-koruma-kurallari.md` A1-A4, A11).

## 8. Bildirim metinleri (web push ve e-posta): **genel**

Bildirimler **Web Push** ile gider. Push metni tarayıcının bildirim servisinden (Chrome ve Android: Google; Edge: Microsoft; Safari: Apple; Firefox: Mozilla) ve e-posta metni e-posta sağlayıcısından geçer; içerik şifreli taşınsa da bu yüzden **mesaj içeriği, rumuz, ad, konu/ders adı, fotoğraf bilgisi, sağlık/ara verme izlenimi içermez** (`saklama-ve-imha.md` Not 2; A12). Ayrıntı yalnızca giriş yapılmış sitede gösterilir. Başlık her zaman **"Eğitim Köprüsü"**; gövde <= 60 karakter, ünlemsiz. Push `Topic` başlığı da içerik ya da tür ele vermeyen opak bir koddur.

| Olay | Alıcı | Gövde (örnek) |
|---|---|---|
| Sorunun cevabı geldi | Öğrenci | "Sorunun yeni bir cevabı var" |
| Sorunun cevabı geldi | Veli | "Çocuğunuzun sorusuna yeni bir cevap geldi" |
| Yeni soru atandı | Gönüllü | "Size yeni bir soru atandı" |
| Havuza soru düştü | Gönüllü (isteğe bağlı) | "Üstlenebileceğiniz yeni bir soru var" |
| Ders hatırlatma (24 saat / 15 dk) | Öğrenci | "Yarın bir dersin var" / "Dersin 15 dakika sonra başlıyor" |
| Ders hatırlatma | Veli, gönüllü | "Yarın bir dersiniz var" / "Dersiniz 15 dakika sonra başlıyor" |
| Eşleşme önerisi | Veli | "Onayınızı bekleyen bir öneri var" |
| Eşleşme onaylandı | Gönüllü, yönetici | "Bir eşleşme güncellendi" |
| Çocuktan istek | Veli | "Onayınızı bekleyen bir istek var" (**silme** kelimesi geçmez) |
| Rıza/ayar değişikliği | Veli (e-posta) | "Hesap ayarlarınızda bir değişiklik yapıldı" |
| Başvuru sonucu | Gönüllü | "Başvurunuz hakkında bir güncelleme var" |
| İncelenecek öğe | Yönetici | "İncelenecek yeni bir öğe var" |
| OTP e-postası | Veli, gönüllü | "Doğrulama kodunuz: 123456" (yalnızca kod; konu "Eğitim Köprüsü doğrulama kodu") |

Kurallar:
- **Kilit ekranı gizliliği web'de ayarlanamaz** (Android'deki `publicVersion` karşılığı yoktur); bu yüzden metinler her zaman genel yazılır, ayrıca bir "gizli sürüm" yoktur.
- **İzin yalnızca kullanıcı "Bildirimleri aç" düğmesine basınca istenir;** hemen öncesinde servisi adıyla söyleyen tek cümle gösterilir (O4 bölüm 2, A6). Sayfa açılışında izin istenmez.
- **iPhone/iPad:** web bildirimi yalnızca site **ana ekrana eklenmişse** çalışır. Ekle yapılmamışsa "Bildirimleri aç" yerine "Telefona ekle" yönergesi gösterilir. Bildirim hiç açılmasa da tüm cevaplar ve hatırlatmalar O3 listesinde görünür.
- Bildirime tıklayınca giriş yoksa önce giriş; e-postada bağlantı yok (OTP kodu hariç); tür bazında kapatılabilir (O4), güvenlik bildirimleri kapatılamaz.
- Çıkış yapılınca push aboneliği silinir; 60 gün kullanılmayan abonelik sunucuda silinir (`cerez-politikasi.md`).

## 9. Ders sayfası kuralları (özet, Ö10 / V6 / G8)

| Kural | Uygulama |
|---|---|
| Görüşme içi **sohbet** kapalı | Jitsi araç çubuğunda sohbet düğmesi yok (filtreyi atlatır) |
| **Davet ve bağlantı paylaşma** kapalı | Düğmeler kaldırılır; oda adı UUID, JWT kısa ömürlü |
| **Ekran paylaşımı** öğrenci ve veli sayfalarında kapalı | Tarayıcı düzeyinde: sayfanın `Permissions-Policy: display-capture=()` başlığı (öğrenci ve veli rotalarında); öğrenci JWT'sinde ve araç çubuğunda da yok. Gönüllü yalnızca ders içeriği için paylaşabilir |
| **Öğrencinin ve velinin kamerası kapalı başlar** | `startWithVideoMuted` öğrencide ve velide açık; açmak kullanıcının kararıdır; "Kameranı açmak zorunda değilsin" (A11) |
| Kayıt, yayın, transkripsiyon kapalı | "Dersler kaydedilmez." bandı |
| Görünen ad | Öğrenci: rumuz; gönüllü: "Ad S."; JWT'de e-posta ve avatar yok |
| Hafif mod | Düşük çözünürlük ya da yalnızca ses önerilir |
| Çıkış | Büyük "Dersten çık"; kendiliğinden kesme yok |
| Üçüncü taraf | Yalnızca `8x8.vc` iframe'i; telemetri ayarları `cerez-politikasi.md` doğrulama listesinde |

## 10. Faz eşlemesi

| Faz (plan 11) | Bu belgeden yazılacak ekranlar |
|---|---|
| A: Kimlik ve roller | O1 (giriş formu, "oturumum açık kalsın"), O2, O7, V1, V2, V8 (Rızalarım), Ö0 (bilgilendirme + çevrimdışı sorusu), G1-G3, Y1, MFA, `AppShell` rol kabukları, `/gizlilik` ve `/cerezler` gerçek metinleri |
| B: Plan ve kütüphane | Ö1-Ö4, Ö8, O4 (görünüm/erişilebilirlik, "Bu cihazdaki kayıtlı verileri temizle", Telefona ekle), V3, PWA (`manifest`, ikonlar, service worker) |
| C: Soru-cevap | Ö5-Ö7, Ö11, G4-G5, O3, V4, bildirim izni akışı (O4 bölüm 2) |
| D: Eşleştirme ve ders | Ö9-Ö10, V5-V7, G6-G8, Y2 |
| E: Güvenlik ve hesap | O5 (Bildir + Gönüllüyü engelle), O6 (`/hesap-silme`), Ö12, V9, Y3-Y5, O4d (`/lisanslar`), V7 (özellik anahtarları) |

(Bildir ve Gönüllüyü engelle ilk soru-cevap ekranlarından önce hazır olmalıdır: Faz C'de `Bildir` düğmesinin yeri ayrılır, Faz E'de işlevi tamamlanır; kendi çocuk koruma politikamız (A3-A4) gereği ikisi de yayın öncesi şarttır.)

## 11. Açık sorular ve notlar

1. **Veli aydınlatması kayıt formundan önce mi?** Burada aydınlatma, e-posta alınmadan **önce** gösterilir (veri toplanırken bilgilendirme) ve onay kaydı OTP doğrulanınca yazılır (`consents.user_id` gerektirdiği için). `hukuk` onaylamalı; backend: OTP doğrulanınca iki onayı (`aydinlatma_veli`, `kullanim_kosullari`) tek istekle `consents`'a yazmalı, zaman damgası olarak ekranda okunma/kabul anını (istemci) ve sunucu zamanını birlikte almalı. `my_pending_consents` görünümü farklı bir işe yarar (yayımlanmış yeni sürümde yeniden onay) ve kayıt akışında kullanılmaz.
2. **Ton çelişkisi (çözüldü):** `cocuk-bilgilendirme.md` v0.2 B madde 3 artık "Kendinle ilgili özel bir şey anlatmak zorunda değilsin." diyor ve "velin/velinize" tutarsızlığı giderilmiş. Ürün kuralı aynen geçerli: öğrenci ve gönüllü arayüzünde hastalık/engel/sağlıktan **hiç** söz edilmez.
3. **Yasal istisna:** Veli aydınlatması ve AR-1, hukuken "sağlık durumuna dolaylı işaret" ifadesini içerir. Bunlar yalnızca velinin ayrı sayfalarında gösterilir; metin anahtarları `web/src/strings/tr.ts` içinde `legal` önekiyle ayrılır (test bu önek dışında sağlık sözcüğünü yasaklar). Öğrenci ve gönüllü ekranlarında istisna yoktur.
4. **Özellik anahtarı varsayılanları:** Öneri hepsi açık (hizmetin çekirdeği; veli çocuk eklerken görür ve değiştirir). Sesli cevabın varsayılanı kapalı mı olmalı? Karar: ürün sahibi + `hukuk`/`guvenlik`. "Görüntülü ders"i kapatmak planlı dersleri iptal eder (onay ekranı var; backend kuralı gerekir).
5. **Rıza geri alma kapsamı:** AR-1 metni "hesabı kapatılır ve verileri en geç 30 gün içinde silinir" der; `saklama-ve-imha.md` "veli isterse verileri önce indirebilir" ekler. "Verileri indir" planda yok; MVP'de ekran yok. 30 günlük bekleme sırasında **geri dönüş** mümkün mü? Şimdilik "geri getirilemez" yazıldı. Hukuk + backend karar vermeli. Geri almada eşleşmenin bitmesi ve planlı derslerin iptali tasarımcı varsayımıdır (backend doğrulasın).
6. **Gönüllüyü engelle sonrası:** öğrenci engellediyse veliye bildirim gitmesi ve soruların havuza düşmesi tasarımcı önerisidir (`cocuk-koruma-kurallari.md` A3 yalnızca eşleşmenin bitmesini, yeniden atamanın engellenmesini ve yönetici bildirimini yazar).
7. **Kamera varsayılanı (çözüldü):** Kamera öğrencide ve velide kapalı başlar (A11). Gönüllü kamerası için varsayılan belirtilmedi: öneri açık; moderatör görünürlüğü ders güvenliği için yararlıdır.
8. **Lisanslar sayfası:** artık Flutter `LicensePage` değil, `/lisanslar` web sayfası (derleme sırasında üretilen liste + OFL + Material Symbols Apache 2.0). Üretim betiği ve paket taraması devops/backend ile ortak; Faz E.
9. **Yönetici ekranları dar ekranda:** yalnızca masaüstü genişlik hedeflenir; telefon tarayıcısında iskelet alt gezinmeye düşer ama tablo yoğun ekranlar için ayrı optimizasyon yapılmadı.
10. **Çevrimdışı saklama tercihi için `cerez-politikasi.md` tablosunda satır yok.** Ö0 adım 2'nin seçimi cihazda (localStorage) saklanır ve "bilgilendirme notu kapatıldı" kaydına benzer; `hukuk` tabloya satır eklemeli ("Çevrimdışı saklama tercihi, localStorage, siz değiştirene veya çıkış yapana kadar, sunucuya gitmez") ve `saklama-ve-imha.md` SK-24'te anılmalı.
11. **Bildirim izni cümlesindeki servis adı:** `cocuk-koruma-kurallari.md` A6 örnek cümlesi "tarayıcının bildirim servisini" der, servis adını yazmaz. Burada servis adı (Google, Apple, Mozilla, Microsoft) arayüzde gösterilir (`cerez-politikasi.md` ve `veri-envanteri.md` listesiyle uyumlu). `hukuk` cümleyi bu biçimle günceller ya da onaylar.
12. **Görünüm tercihleri sunucuda tutulmaz:** v1'de "Faz B'de `students.prefs`'e yazılır" denmişti; `docs/veri-modeli.md` (Ş3) ve `cerez-politikasi.md` bunu kaldırdı. Bu belge de buna uyar: tercihler yalnızca cihazda.
13. **iPhone ana ekran uygulamasında Jitsi (JaaS) iframe'i ve web push** gerçek cihazda denenmeli (Faz D spike'ı). Kamera/mikrofon çalışmazsa Ö10'daki "Dersi tarayıcıda aç" yolu yedektir; push için iOS 16.4+ ve ana ekrana ekleme gerekir.
14. **"Bu cihazda oturumum açık kalsın" yönetici girişinde:** öneri: yönetici için kutu gösterilmez ve oturum her zaman tarayıcı oturumudur (MFA, `aal2`); güvenlik ve backend onaylamalı.
