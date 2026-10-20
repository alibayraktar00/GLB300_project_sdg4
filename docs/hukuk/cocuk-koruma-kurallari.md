# Çocuk Koruma ve Veri Koruma Ürün Kuralları; Gönüllü İnceleme Prosedürü

> **TASLAKTIR – Yayınlamadan önce bir avukat tarafından incelenmelidir.** Bu belge avukat görüşünün yerini tutmaz.
> Sürüm v0.1 · 18.10.2026. Bu belge ekip ve yöneticiler içindir; kullanıcıya gösterilmez.
> **Bölüm A**, eski `play-store-uyum.md` (artık `arsiv/` altında) belgesindeki ürün kararlarını **kendi politikamız** olarak toplar. Bu kurallar bir mağaza şartı olduğu için değil, çocuk güvenliği ve KVKK'daki veri minimizasyonu, şeffaflık ve güvenlik ilkeleri (m.4, m.10, m.12) gereği uygulanır.
> **Bölüm B**, yöneticinin gönüllü başvurusunu inceleme prosedürüdür.

## A. Ürün kuralları

| # | Kural | Nerede | Gerekçe |
|---|---|---|---|
| A1 | **Güvenlik hatırlatması.** Çocuk ilk sorusunu sormadan ve ilk derse girmeden önce `cocuk-bilgilendirme.md` B bölümü gösterilir. Gösterildiği `consents` tablosuna `cocuk_guvenlik_hatirlatma` türüyle yazılır. | Ö: soru sor, ders hazırlık ekranı | Çocuğun serbest içerik paylaşmadan önce risklerden haberdar olması; yaşa uygun aydınlatma (KVKK Çerez Rehberi §9 da çocuklara uygun dil ister) |
| A2 | **Veli özellik anahtarları.** Veli, her çocuk için soru-cevap, sesli cevap ve görüntülü ders özelliklerini açıp kapatabilir (`student_features`). | V: çocuk ayarları | Velinin, çocuğun hangi iletişim özelliklerini kullanacağını yönetmesi |
| A3 | **"Gönüllüyü engelle".** Öğrenci ve veli bir gönüllüyü engelleyebilir (`volunteer_blocks`). Engellenen gönüllüyle eşleşme biter, o gönüllü öğrenciye bir daha atanmaz ve havuzdaki sorularını üstlenemez. Yöneticiye bildirim gider. Gönüllü için karşılığı "Bu öğrenciyle devam etmek istemiyorum" yeniden atama talebidir. | Ö, V: gönüllü kartı ve soru ekranı | Bire bir iletişimde istenmeyen kişiyle teması hemen kesebilmek |
| A4 | **"Bildir" her ekranda bulunur.** Çocuk güvenliği bildirimlerinde "önce askıya al, sonra incele" kuralı uygulanır. İlk inceleme hedefi `[24 saat]`. | Tüm roller | Filtrenin yakalayamadığı durumlar için ikinci savunma hattı |
| A5 | **Koşulların kabulü.** Veli ve gönüllü içerik oluşturmadan önce kullanım koşullarını kabul eder. Çocuk "Güvende kal" kurallarını görür. | Kayıt ve başvuru akışı | Yasak davranışların önceden bildirilmesi |
| A6 | **İzinden önce açıklama.** Mikrofon, kamera (görüntülü ders) ve bildirim izni yalnızca kullanıcı ilgili düğmeye bastığında istenir; hemen önce tek cümlelik açıklama gösterilir. Örnekler: "Sesli cevap kaydetmek için mikrofonu kullanırız. Kayıt yalnızca öğrencine ve veline gider." ve "Cevap gelince haber vermek için tarayıcının bildirim servisini kullanırız. Bildirimde yalnızca genel bir cümle yazar." Soru fotoğrafında telefonun kendi kamera uygulaması açılır; sayfa kamera izni istemez. | İlgili ekranlar | Şeffaflık (KVKK m.10); beklenmeyen veri toplamanın önlenmesi |
| A7 | **Herkese açık hesap silme sayfası** (`/hesap-silme`). Oturum açmadan, e-posta OTP ile çalışır. Sayfada ne silindiği, 30 günlük süre ve kalan güvenlik kayıtları yazar. Hangi e-postanın kayıtlı olduğunu sızdırmaz. Uygulama içi yol da bulunur (Ayarlar > Hesabı sil). | Herkese açık | Silme hakkının kolayca kullanılabilmesi (KVKK m.7, m.11) |
| A8 | **Yasal metinler herkese açıktır.** Metinler oturumsuz okunabilen HTML sayfalardır (`/gizlilik`, `/cerezler`, `/kullanim-kosullari`, `/aydinlatma/*`), PDF değildir. Sürümlüdür ve yayımlanan sürüm değiştirilemez (`legal_documents`). | Herkese açık | Aydınlatmanın erişilebilir olması; hangi metnin onaylandığının ispatı |
| A9 | **CSAE standartları ve iletişim noktası.** Çocukların cinsel istismarı ve sömürüsüne sıfır tolerans (kullanım koşulları §5). Yayımlanan bir iletişim adresi `[ÇOCUK GÜVENLİĞİ İLETİŞİM ADRESİ]` bulunur. | Kullanım koşulları, iletişim | Çocuk güvenliği |
| A10 | **İzleme yok.** Reklam, analitik, hata izleme, sosyal medya eklentisi, tarayıcı parmak izi, konum ve üçüncü taraf betik kullanılmaz. Tek dış köken ders sayfasındaki `8x8.vc` iframe'idir. Bunlardan biri eklenecekse önce `hukuk` değerlendirir; zorunlu değilse çalışmadan önce onay alınır (bkz. `cerez-politikasi.md`). | Tüm site (CSP ile zorlanır) | Veri minimizasyonu; çerez onay bandı gerekmemesinin ön koşulu |
| A11 | **Görüntülü ders kısıtları.** Kamera öğrencide ve velide kapalı başlar. Görüşme içi sohbet, davet, kayıt, canlı yayın ve transkripsiyon kapalıdır. Öğrenci ve veli sayfalarında ekran paylaşımı tarayıcı düzeyinde engellenir (`Permissions-Policy: display-capture=()`). Görünen ad rumuz ya da "Ad S." olur. | Ders sayfası, `jitsi-token` | Kaydı ve filtre dışı iletişimi önlemek |
| A12 | **Bildirim metinleri geneldir.** Push metninde rumuz, konu veya mesaj içeriği bulunmaz. Push servisinin görebildiği `Topic` başlığı da içerik ya da tür ele vermez (ör. opak kısa kod). | `send-push` | Kilit ekranı ve push servisi üst verisi; dolaylı sağlık çıkarımı |
| A13 | **Dış bağlantılar.** Kullanıcıya önce "Harici bir siteye gidiyorsun" bilgisi gösterilir. `Referrer-Policy: no-referrer` ve `rel="noopener noreferrer"` kullanılır. **Gerekçe:** Yönlendiren bilgisi EBA vb. sitelere kullanıcının "Eğitim Köprüsü'nden geldiğini" söyler. Platformun kitlesi düşünüldüğünde bu, dolaylı sağlık çıkarımına yol açabilir (`veri-envanteri.md` §3). | Tüm site | Dolaylı sağlık verisinin üçüncü kişilere sızmaması |
| A14 | **Ortak cihaz.** Görünür bir "Çıkış yap" düğmesi bulunur. Çıkışta push aboneliği, önbellek ve cihaz belleği temizlenir. Oturumun kalıcı olması kullanıcının seçimine bağlıdır ("Bu cihazda oturumum açık kalsın", varsayılan kapalı). Ayarlar'da "Bu telefonu başkası da kullanıyorsa işin bitince çıkış yap." uyarısı bulunur. | Tüm roller | Aynı cihazı kullanan aile bireylerine çocuğun verisinin görünmemesi |
| A15 | **Cihazda saklama kullanıcı isteğiyle yapılır.** Görünüm tercihleri yalnızca kullanıcı bir ayarı değiştirdiğinde yazılır; ayarın yanında "Bu ayar yalnızca bu cihazda saklanır." yazar. Öğrenci sayfalarının çevrimdışı saklanması ilk girişte sorulur ("Planın internetsiz de açılsın mı?", hiçbir seçenek önceden seçili değil). Ayarlar'da "Bu cihazdaki kayıtlı verileri temizle" düğmesi bulunur. | Ayarlar, öğrenci ilk giriş | KVKK Çerez Rehberi Kriter B: kullanıcının açıkça talep ettiği hizmet (bkz. `cerez-politikasi.md` §1) |

## B. Gönüllü başvurusu inceleme prosedürü (yönetici)

Yönetici başvuruyu yalnızca yönetici sayfalarında (`/yonetici/*`), MFA'lı (aal2) oturumla inceler. Bunu yaparken sayfa içeriğini okuyan tarayıcı eklentileri kapalı olur. Belge tarayıcıda kısa ömürlü bağlantıyla açılır. **Belge indirilmez, ekran görüntüsü alınmaz, kopyalanmaz.**

1. **E-posta:** Adres `.edu.tr` uzantılı ve OTP ile doğrulanmış olmalı (sistem kontrol eder).
2. **Belgenin geçerliliği:**
   - Belge güncel bir öğrenci belgesi olmalı (tarih ve dönem).
   - e-Devlet barkodlu belgede barkod, e-Devlet "Barkodlu Belge Doğrulama" hizmetinde doğrulanır. Bu sırada belgedeki TC kimlik numarası yalnızca doğrulama ekranına girilir; **hiçbir yere not edilmez** ve sisteme yazılmaz.
3. **Kimlik eşleşmesi:** Başvurudaki ad, soyad, üniversite ve bölüm **belgeyle karşılaştırılır.** Uyuşmazlık varsa başvuru reddedilir ya da gönüllüden düzeltme istenir. Gönüllü bu alanları yalnızca başvuru aşamasında değiştirebilir.
4. **Serbest metin alanlarında iletişim ipucu kontrolü:**
   - Başvuru aşamasında alanlar yalnızca harf kabul eder. Bu yüzden rakam filtresi devreye girmez, ama iletişim bilgisi harflerle yazılabilir.
   - Bu nedenle ad, soyad, görünen ad, bölüm ve diğer metin alanları şunlar için **gözle** kontrol edilir:
     - yazıyla yazılmış rakamlar ("sıfır beş yüz…"),
     - uygulama adları ve kısaltmaları ("insta", "vatsap", "tg", "dc"),
     - kullanıcı adı biçimleri ("ahmetyilmaz on iki"),
     - e-posta veya site adresinin yazıyla yazılmış hâli ("nokta com", "et işareti"),
     - "bana yaz", "ulaş" gibi yönlendirmeler.
   - İpucu bulunursa başvuru **reddedilir**. Ret gerekçe koduyla kaydedilir (ör. `iletisim_ipucu`). Davranış kurallarına aykırı bir niyet şüphesi varsa ilgili e-posta tekrar kayıt engel listesine eklenir (SK-12).
5. **Görünen ad biçimi:** Görünen ad "Ad S." biçiminde olmalı (ör. "Elif K."). Takma ad, emoji, unvan, sosyal medya adı ya da tam soyad kabul edilmez.
6. **Yaş:** Gönüllü 18 yaşını doldurmuş olmalıdır. Bu, taahhütnamede beyan edilir. Belgede doğum tarihi görünüyorsa ayrıca kontrol edilir. Doğum tarihi sisteme yazılmaz.
7. **Eğitim ve taahhüt:** Quiz geçilmiş (eşik %80), taahhütname ve davranış kuralları güncel sürümle onaylanmış olmalı (sistem gösterir).
8. **`[YALNIZCA PİLOTTA KARAR VERİLİRSE]` Adli sicil:**
   - Önce gönüllünün ayrı açık rızası (AR-G1) alınmış olmalı.
   - Yönetici barkodlu kaydı doğrular ve yalnızca "görüldü/uygun", tarih ve kendi kimliğini kaydeder.
   - Engel sayılacak kayıtlar avukatla belirlenen yazılı ölçüte göre değerlendirilir.
9. **Karar:**
   - Onay veya ret RPC ile verilir; işlem denetim kaydına yazılır.
   - Ret gerekçesi **kod** olarak girilir. Serbest metne kişisel veya hassas bilgi yazılmaz.
   - Karar gönüllüye bildirilir; itiraz yolu `[E-POSTA]`.
   - Belge karardan sonra en geç 30 gün içinde otomatik silinir (SK-06).
10. **Şüphe hâlinde:**
    - Karar ikinci bir yöneticiye danışılarak verilir (pilotta önerilir).
    - Çocuk güvenliğine ilişkin ciddi bir şüphe varsa (ör. başvuruda uygunsuz içerik) çocuk güvenliği sorumlusuna iletilir.

## Kaynaklar
- KVKK m.4, 7, 10, 11, 12: [mevzuat.gov.tr](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6698.pdf) (doğrulandı).
- KVKK Çerez Uygulamaları Hakkında Rehber, Temmuz 2025 (KVKK Yayınları No: 69): [kvkk.gov.tr](https://kvkk.gov.tr/Icerik/7353/Cerez-Uygulamalari-Hakkinda-Rehber) (resmî PDF okundu).
- Eski gerekçeler için: `arsiv/play-store-uyum.md`.
