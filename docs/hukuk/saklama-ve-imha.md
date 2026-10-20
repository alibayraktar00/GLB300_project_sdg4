# Saklama ve İmha Politikası (Taslak)

> **TASLAKTIR – Yayınlamadan önce bir avukat tarafından incelenmelidir.** Bu belge avukat görüşünün yerini tutmaz.
> Sürüm v0.2 · 18.10.2026 · Veri kalemleri için bkz. `veri-envanteri.md`.
> v0.2: Web uygulamasına geçiş. SK-17 push aboneliğine, SK-24 tarayıcı belleğine dönüştü; SK-18 Vercel loglarını kapsıyor; SK-25 eklendi.

## 1. Dayanak ve ilkeler
- **KVKK m.4/2-d ve m.7:** Veri, ilgili mevzuatta öngörülen veya işleme amacı için gerekli olan süre kadar saklanır. İşleme sebebi ortadan kalkınca re'sen silinir, yok edilir veya anonim hâle getirilir (güncel metin doğrulandı).
- **Kişisel Verilerin Silinmesi, Yok Edilmesi veya Anonim Hale Getirilmesi Hakkında Yönetmelik** (RG 28.10.2017, 30224; doğrulandı):
  - VERBİS'e kayıt yükümlüsü olanlar saklama ve imha politikası hazırlar (m.5). Politikanın asgari içeriği m.6'da sayılır.
  - İmha işlemlerinin kayıtları **en az 3 yıl** saklanır (m.7).
  - Periyodik imha aralığı **6 ayı geçemez** (m.11).
  - İlgili kişinin silme talebi **en geç 30 günde** sonuçlandırılır (m.12).
- **Platform kuralı:** `cleanup` işi pg_cron ile **her gün** çalışır. Bu, 6 aylık üst sınırı rahatça karşılar.
- **Tarih sırası:** Süre dolduğunda önce kişisel veri silinir. İstatistik gerekiyorsa veri anonimleştirilir. Hash veya özet almak anonimleştirme **değildir** (bkz. §5).

## 2. Saklama süreleri tablosu

"Hesap süresince" ifadesi §3'teki hareketsizlik kuralıyla birlikte uygulanır. Hukuki saklama (legal hold, §4) tüm süreleri askıya alır.

| Kod | Veri | Süre | Süre dolunca | Gereken alan/iş |
|---|---|---|---|---|
| SK-01 | Veli, gönüllü ve yönetici hesabı (e-posta, ad, profil, uygunluk, ders tercihleri) | Hesap süresince | Silme | `profiles.last_seen_at` |
| SK-02 | Öğrenci hesabı (rumuz, sınıf, kullanıcı adı, tercihler, uygunluk, veli bağlantısı) | Hesap süresince. Son velinin hesabı silinirse öğrenci hesabı da silinir. | Silme | `last_seen_at` |
| SK-03 | Telafi planı (`recovery_plans`, `plan_items`, devamsızlık tarihleri) | Plan `tamamlandi` veya `arsiv` olduktan sonra **12 ay**, hesap silinirse hemen | Silme | `recovery_plans.closed_at` |
| SK-04 | Soru ve mesaj metinleri (`questions`, `question_messages`) | Öğrenci hesabı süresince | Silme | – |
| SK-05 | Soru ve cevap ekleri (fotoğraf, ses) | Soru kapandıktan veya son mesajdan **12 ay** sonra ya da hesap silinince (hangisi önce gelirse). Mesaj metni kalır, ekin yerinde "ek süresi doldu" yazar. | Storage nesnesi silinir | `questions.closed_at`, `last_activity_at`; `attachments.purged_at` |
| SK-06 | **Gönüllü belgesi dosyası** | Onay/ret kararından sonra **en geç 30 gün**. Karar verilmeyen başvuruda yüklemeden itibaren **60 gün**. | Storage nesnesi silinir. Satırda yalnızca `uploaded_at`, `reviewed_at`, `reviewed_by` ve `purged_at` kalır. | `volunteer_documents.purge_after` |
| SK-07 | Gönüllü doğrulama kayıtları (`training_attempts`, onay kaydı, varsa adli sicil "görüldü" sonucu) | Gönüllülük süresince + ayrılıştan sonra **2 yıl**. Reddedilen başvurularda ret tarihinden **6 ay**. | Silme | `volunteers.decided_at`, `left_at` |
| SK-08 | Ders kayıtları (`sessions`, `volunteer_note`, `cancel_reason`) | Ders tarihinden **1 yıl** | Anonimleştirme: not ve gerekçe silinir, kişi alanları boşaltılır. Ay, süre ve durum istatistik için kalır. | `sessions.anonymized_at` |
| SK-09 | Katılım meta verisi (`session_events`) | Ders tarihinden **1 yıl** | Silme | – |
| SK-10 | `moderation_flags.original_body` (maskelenmemiş metin) | İşlem yapılmadıysa inceleme tarihinden **90 gün**. İşlem yapıldıysa (uyarı, askı) bağlı rapor kadar (SK-11). | Metin silinir, kayıt anonimleştirilir | `original_body_purged_at` |
| SK-11 | Şikâyetler (`reports`) | Kapanıştan **2 yıl** | Anonimleştirme: kişi alanları boşaltılır, açıklama silinir. Kategori, ay ve işlem türü kalır. | `reports.closed_at`, `anonymized_at` |
| SK-12 | Askıya alma ve çıkarma kararları; tekrar kaydı önleme listesi (tuzlu e-posta özeti + sebep kodu) | Karardan **2 yıl** | Silme | `blocked_identities.expires_at` |
| SK-13 | `audit_log` (belge ve `original_body` görüntüleme kayıtları dahil) | **2 yıl** | Silme | – |
| SK-14 | Eşleşmeler (`matches`) | Eşleşmenin bitişinden **2 yıl**. Öğrenci hesabı silinirse öğrenci tarafı takma adla değiştirilir. | Anonimleştirme | `matches.anonymized_at` |
| SK-15 | Aydınlatma teyidi, açık rıza, rıza geri alma, kullanım koşulları kabulü, gönüllü taahhüdü (`consents`) | İlişkinin bitişinden (hesap silme veya rıza geri alma) itibaren **10 yıl** (TBK m.146 genel zamanaşımı; olası talep ve idari süreçlerde ispat için). Hesap silinince yalnızca asgari kanıt kalır: tuzlu e-posta özeti, belge türü, sürüm ve özet değeri, zaman damgaları. | Silme | `consents.subject_hash`; FK'ler silmede `SET NULL` olmalı. **Avukat daha kısa bir süre belirleyebilir.** |
| SK-16 | Silinen gönüllünün mesajlarıyla kimlik bağlantısı | Gönüllü hesabının silinmesinden **2 yıl**. Bu bağlantı yalnızca güvenlik incelemesi için kullanılır. | Eşleme tablosu yok edilir; mesajlar "Ayrılan gönüllü" olarak kalır | Kısıtlı eşleme tablosu |
| SK-17 | Web push aboneliği (`push_subscriptions`: endpoint, `p256dh`, `auth`). Tam kullanıcı aracısı dizesi saklanmaz. Şemadaki `user_agent` sütunu ya boş bırakılır ya da yalnızca "Chrome · Android" gibi kaba bir cihaz etiketi tutar. | Şu durumlarda silinir: çıkışta, kullanıcı bildirimleri kapatınca, hesap silinince, push servisi 404/410 döndürünce veya **60 gün** güncellenmeyince | Silme. Çıkışta tarayıcıdaki abonelik de iptal edilir (`unsubscribe`). | `push_subscriptions.updated_at` (plan Ş1) |
| SK-18 | Bağlantı logları: IP, tarayıcı bilgisi, adres. Kaynaklar: Supabase Auth audit ve oturum kayıtları, Supabase API logları, **Vercel çalışma zamanı ve istek logları**. Auth istekleri sunucudan gittiği için Supabase'te çoğunlukla Vercel'in IP'si görünür; kullanıcının IP'si Vercel'de kalır. | 5651 kapsamında "yer sağlayıcı" sayılırsa **1 yıl**. Sayılmazsa **90 gün**. Bkz. not 1. | Silme | `auth.audit_log_entries` ve `auth.sessions` sütunları `veritabani` tarafından doğrulanmalı. Vercel için bkz. SK-25. |
| SK-19 | Veri sahibi başvuruları ve cevapları; imha kayıtları (`deletion_log`); veri ihlali kayıtları | **3 yıl** (imha kayıtları için Yönetmelik m.7'deki asgari süre) | Silme | `data_requests`, `deletion_log` |
| SK-20 | `notifications` (uygulama içi bildirimler) | **90 gün** | Silme | – |
| SK-21 | E-posta sağlayıcısının gönderim logları | Sağlayıcının izin verdiği en kısa süre (hedef 30 gün). **Doğrulanmalı.** | Sağlayıcı siler | Panel ayarı |
| SK-22 | Yedekler | Free planda otomatik yedek yok. Pilotta (Pro plan) silinen veri, yedeğin dönmesiyle birlikte **en geç 30 gün** içinde yedekten de çıkar. | Yedek döngüsü | – |
| SK-23 | Demo verisi (sahte kullanıcılar, test hesapları) | Ders notu kesinleştikten sonra ya da pilot başlamadan önce | Projeler ve hesaplar silinir. Pilot yeni ve temiz bir `prod` ile başlar. | – |
| SK-24 | **Tarayıcıda tutulanlar:** localStorage (görünüm tercihleri, hafif mod, son seçilen mod, gönüllü cevap taslağı, bilgilendirme notu) ve Cache Storage (öğrencinin çevrimdışı sayfaları; yalnızca öğrenci isterse) | Taslak: gönderilince veya en fazla `[7 gün]`. Çevrimdışı sayfalar: en fazla 14 gün. Diğerleri: kullanıcı değiştirene kadar. **Hepsi çıkışta silinir.** | Çıkışta istemci kodu siler; yanıt ayrıca `Clear-Site-Data: "cache"` taşır. Ayarlar'da "Bu cihazdaki kayıtlı verileri temizle" düğmesi bulunur. **Hesap silindiğinde sunucu bu verilere erişemez.** Bu yüzden silme akışı önce çıkış ve temizlik yapar, kullanıcıya da "Bu cihazdaki kayıtlar silindi; başka cihazlarda tarayıcı ayarlarından silebilirsin." bilgisi verilir. | `tasarimci` (istemci). `Clear-Site-Data` için `"storage"` yönergesinin de eklenip eklenmeyeceğine `guvenlik` karar verir: bu yönerge localStorage'ı ve service worker'ı da temizler, ama JavaScript çalışmasa bile işe yarar. |
| SK-25 | **Barındırma logları (Vercel)** | Çalışma zamanı logları Hobby planında **1 saat** (Vercel belgesi). Vercel'in kendi istek, güvenlik ve CDN logları için süre **doğrulanmalı**; Vercel bunları "servisin ürettiği veri" olarak kendi sorumluluğunda tutuyor (DPA). Uygulama loglarına kişisel veri ve mesaj içeriği **yazılmaz** (plan 9.1/13). | Vercel siler | `devops`. Pilotta 5651 için 1 yıllık trafik logu gerekirse Hobby'de log aktarımı (drain) yoktur; Pro plan veya uygulama düzeyinde ayrı bir log çözümü gerekir. |

**Not 1 (5651).**
- 5651 m.5/3, yer sağlayıcının trafik bilgisini **1 yıldan az ve 2 yıldan fazla olmamak üzere yönetmelikte belirlenecek süre** kadar saklamasını öngörür (mevzuat.gov.tr'den doğrulandı).
- 2007 tarihli İnternet Ortamında Yapılan Yayınların Düzenlenmesine Dair Usul ve Esaslar Hakkında Yönetmelik'in m.7 hükmü hâlâ "altı ay" diyor (ikincil kaynaktan). Kanun ile yönetmelik arasında çelişki var.
- Platformun kullanıcı içeriği barındırdığı için "yer sağlayıcı" sayılıp sayılmayacağı ve uygulanacak süre **avukata sorulmalı.**
- Supabase Free ve Vercel Hobby planlarında platform logları kısa süre tutulur. 1 yıllık saklama gerekirse ayrı ve erişimi kısıtlı bir log çözümü gerekir.
- **Web'e geçiş etkisi:** 2007 Yönetmeliği'ndeki "yer sağlayıcı trafik bilgisi" tanımı (kaynak IP, hedef IP, tarih-saat, istenen sayfa adresi, işlem bilgisi, sonuç; ikincil kaynaktan) Vercel'in istek loglarına doğrudan karşılık gelir. Vercel, bize göre altyapı yer sağlayıcısıdır. Kullanıcı içeriğini barındıran platform olarak bizim de "yer sağlayıcı" sayılıp sayılmayacağımız web'de de aynı sorudur ve **avukata sorulmalıdır.**

**Not 2 (bildirim içerikleri).** E-posta metinleri e-posta sağlayıcısından geçer. Push bildirimlerinde içerik şifrelidir, ama kilit ekranında görünür ve push servisi (Google, Apple, Mozilla, Microsoft) üst veriyi görür. Bu yüzden:
- Bu metinlerde mesaj içeriği, çocuğun rumuzu, konu adı veya sağlık izlenimi veren ifade yer almaz. Örnek: "Sorunuza yeni bir cevap var." Ayrıntı uygulama içinde gösterilir.
- Push servisinin şifresiz gördüğü `Topic` başlığı da içerik veya tür ele vermez.

## 3. Hareketsiz hesaplar
- **Veli ve gönüllü:** Hesap **12 ay** boyunca hiç kullanılmazsa e-postayla uyarı gönderilir. Sonraki **30 gün** içinde giriş yapılmazsa §4'teki silme akışı başlar.
- **Öğrenci:** 12 ay boyunca giriş yoksa veliye uyarı gönderilir. Veli 30 gün içinde işlem yapmazsa öğrenci hesabı silinir.

## 4. Hesap silme ve hukuki saklama

Hesap silme uygulama içinden ve web sayfasından yapılır (`delete-account`). Hesap **hemen kapatılır** (giriş engellenir). Veriler hedef olarak anında, **en geç 30 gün** içinde silinir. Yedekler için bkz. SK-22.

| Kim siliyor | Ne olur |
|---|---|
| Veli kendi hesabını siler | Veliye ait SK-01 verileri silinir. Çocuğun başka velisi varsa çocuk hesabı kalır. Yoksa çocuk hesabı da silinir; uyarı ekranında bu açıkça gösterilir. |
| Veli çocuk hesabını siler | SK-02, SK-03, SK-04, SK-05 ve öğrenciye ait SK-08 ile SK-09 kayıtları silinir. Eşleşmeler SK-14'e göre takma adlandırılır. |
| Veli AR-1 rızasını geri alır | Çocuk hesabı hemen pasifleşir. Rızaya dayanan işleme durur ve veriler 30 gün içinde silinir. Veli isterse verileri önce indirebilir. |
| Öğrenci silme ister | Uygulama içinden talep gönderir, talep veliye bildirim olarak gider ve veli onaylar. Veli 30 gün içinde yanıt vermezse yönetici veliyle iletişime geçer. |
| Gönüllü kendi hesabını siler | Aktif eşleşmeler biter, gelecekteki dersler iptal edilir ve veliler bilgilendirilir. Profil, belge, uygunluk ve token silinir. Öğrencilere verdiği cevaplar öğrencinin kaydının parçası olduğu için kalır; gönderen "Ayrılan gönüllü" olarak görünür. Kimlik bağlantısı SK-16'ya göre tutulur. |
| Yönetici görevden ayrılır | Hesap kapatılır. `audit_log` kayıtları SK-13'e göre kalır. |

**Her durumda kalanlar.** Kayıt bulunmasa bile şunlar kendi sürelerince kalır: SK-11 (rapor, anonim), SK-12, SK-13, SK-15 (asgari kanıt) ve SK-19. Gizlilik politikası ve `/hesap-silme` sayfası bunu açıkça belirtir (`cocuk-koruma-kurallari.md` A7).

**Hukuki saklama (legal hold).** Açık bir şikâyet, adli veya idari makam talebi ya da hukuki uyuşmazlık varsa ilgili kayıtlar silinmez:
- mesajlar ve ekler,
- `session_events`,
- `reports`,
- `moderation_flags`.

Kaydı yönetici açar (`legal_holds`: varlık, kimlik, sebep, açan kişi, açılış ve kapanış zamanı). Kayıt 6 ayda bir gözden geçirilir. Kapanınca normal süreler işlemeye başlar. Hesabı silinen kullanıcıya silme talebine verilen cevapta saklama gerekçesi bildirilir (KVKK m.13/3).

## 5. Anonimleştirme kuralları
"Anonim hâle getirme", verinin başka verilerle eşleştirilse dahi hiçbir kişiyle ilişkilendirilememesidir (KVKK m.3/1-b; Yönetmelik m.10). Uygulama:
1. Doğrudan tanımlayıcılar boşaltılır: `user_id`, `student_id`, `volunteer_id`, `reporter_id`, `target_user_id`, `handled_by`, ad, rumuz, kullanıcı adı ve e-posta.
2. Serbest metinler silinir: `body`, `description`, `original_body`, `volunteer_note`, `cancel_reason`, `reject_reason` ve `details` jsonb içindeki kişisel alanlar.
3. Zaman damgaları **aya** yuvarlanır.
4. **Geri dönüş anahtarı tutulmaz.** Takma ad eşleme tablosu varsa yok edilir.
5. Hash, tuzlu özet veya sabit takma ad **takma adlandırmadır, anonimleştirme değildir.** Bunlar kişisel veri sayılır ve süreleri tabloda belirtilir (SK-12, SK-15, SK-16).
6. İstatistik ve raporlarda 5'ten küçük hücreler gösterilmez. Küçük bir pilotta tek bir kayıt da kişiyi belli edebilir.
7. Dosyalarda yalnızca veritabanı satırını silmek yetmez; Storage nesnesi de silinir.
8. Anonim veri araştırma ve istatistik için kullanılabilir (KVKK m.28/1-b).

## 6. Kayıt ortamları ve sorumlular
- **Kayıt ortamları:**
  - Supabase Postgres ve Storage (Frankfurt),
  - Supabase platform logları,
  - Vercel (sunucu fonksiyonları `fra1`, CDN, loglar; SK-25),
  - tarayıcı push servisleri (yalnızca iletim; içerik şifreli),
  - JaaS (yalnızca canlı akış; kayıt kapalı),
  - e-posta sağlayıcısı,
  - kullanıcının tarayıcısı: çerez, localStorage, Cache Storage (SK-24).
- **Yönetici cihazları:** Gönüllü belgesi ve diğer dosyalar yönetici cihazına **indirilmez**; yalnızca kısa ömürlü imzalı URL ile tarayıcıda görüntülenir.
- **Sorumlular:**
  - Politika sahibi: `[VERİ SORUMLUSU – YETKİLİ KİŞİ]`.
  - Teknik uygulama: `[TEKNİK SORUMLU]`.
  - Gözden geçirme: yılda bir ve her yeni veri türünde.
- **İmha kaydı:** `cleanup` her çalıştığında `deletion_log` tablosuna kategori, adet, yöntem, tarih ve tetikleyeni yazar. Bu tabloya kişisel veri yazılmaz. Kayıtlar 3 yıl tutulur (SK-19).

## 7. Kaynaklar
- KVKK m.3, 4, 7, 13, 28: [mevzuat.gov.tr](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6698.pdf) (doğrulandı).
- Silme Yönetmeliği m.5, 6, 7, 10, 11, 12: [Resmî Gazete 28.10.2017](https://www.resmigazete.gov.tr/eskiler/2017/10/20171028-10.htm) (doğrulandı).
- 5651 m.5: [mevzuat.gov.tr](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5651.pdf) (doğrulandı). 2007 Yönetmeliği m.7: [ikincil kaynak](https://av-saimincekas.com/kanunlar-tr/internet-ortaminda-yapilan-yayinlarin-duzenlenmesine-dair-usul-ve-esaslar-hakkinda-yonetmelik/) (doğrulanmalı).
- TBK m.72 ve m.146: [mevzuat.gov.tr](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6098.pdf) (doğrulandı).
- Vercel Hobby (çalışma zamanı logu 1 saat; drain yok) ve DPA: [vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby), [vercel.com/legal/dpa](https://vercel.com/legal/dpa) (18.10.2026'da okundu).
- Hesap silme kuralları: `cocuk-koruma-kurallari.md` A7. Eski Play gerekçesi: `arsiv/play-store-uyum.md`.
