# Eğitim Köprüsü: Veri Modeli, Erişim Kuralları (RLS) ve Veritabanı Çalışma Kılavuzu

> Sürüm: 18 Ekim 2026 (güvenlik yeniden denetimi N1–N6 + web'e geçiş: Web Push, plan 5.5) · Kaynak: `supabase/migrations/` (gerçek sürüm kaynağı odur; bu belge onu özetler).
> Hedef: Supabase Postgres 17. Plan: `docs/plan.md` bölüm 5, 6, 9. Hukuki dayanak: `docs/hukuk/saklama-ve-imha.md`.
> Tüm roller **Next.js web uygulaması** kullanır (mobil uygulama bırakıldı; plan v2). Şema web'e göre güncellendi: FCM/APNs jetonları yerine Web Push abonelikleri.

## 1. Bir bakışta

- 38 tablo, hepsinde **RLS açık**, varsayılan davranış **ret**. `anon` rolü yalnızca `legal_documents` tablosunu **okuyabilir**.
- İstemci tablolara kısıtlı **sütun bazlı** yetkilerle erişir. Karmaşık yazma işlemleri (soru sorma, eşleşme, randevu...) **RPC** ile yapılır; bunları `backend` ajanı yazacak.
- Yardımcı fonksiyonlar `private` şemasındadır (PostgREST'e açık değil). Hepsi `SECURITY DEFINER`, `STABLE` (kota fonksiyonu bilerek `VOLATILE`), `set search_path = ''`.
- Gönüllü, çocuğun yalnızca **rumuz + sınıfını** ve plandaki **sıradaki 3 bekleyen konuyu** görür; devamsızlık tarihlerini, kullanıcı adını, tercihleri, tamamlanmış konuların listesini **görmez**.
- Mesajlar **değiştirilemez**; yalnızca yönetici gizleyebilir.
- Yönetici yetkisi = rol `yonetici` **ve** hesap aktif **ve** oturum `aal2` **ve** **son 12 saatte TOTP doğrulaması** (JWT `amr` iddiası).
- Gönüllüyü **engellemek** veritabanında tam uygulanır: engel kaydı eklenince eşleşme biter, atamalar kalkar, planlı dersler iptal olur (RPC yarım kalsa bile).
- Gönüllü profili (ad, soyad, üniversite, bölüm) onaydan sonra **kilitlidir**; öğrenci rumuzunu yalnızca **velisi** değiştirir.
- Bildirimler **Web Push** ile gider (`push_subscriptions`): uç nokta yalnızca bilinen push servislerinin alan adlarına izin verir (SSRF kısıtı), abonelik yalnızca RPC ile yazılır; ham kullanıcı aracısı SAKLANMAZ (yalnızca isteğe bağlı kaba "Chrome · Android" etiketi).
- Hukuki metin yeni sürüme geçince "yeniden onay" gerekenler `public.my_pending_consents` görünümüyle sorgulanır (§5.4); zorlama backend'indir.
- Bu belgedeki her kural bir pgTAP testiyle sınanır: **1154 test, 20 dosya** (bkz. §11).

## 2. Klasör yapısı

```
supabase/
├── config.toml                      # CLI 2.121.0 ile `init`; auth sıkılaştırmaları (§9)
├── migrations/                      # zaman damgalı, sırayla uygulanır
│   ├── 20261016100000_temel.sql                      # private şema, varsayılan yetkilerin sıkılaştırılması, is_safe_name
│   ├── 20261016100100_mufredat.sql                   # dersler, yıllar, haftalar, program, ünite, konu, haftalık konu, kaynak
│   ├── 20261016100200_kimlik.sql                     # profiles, students, rıza, legal_documents, gönüllü, quiz, özellik anahtarları
│   ├── 20261016100300_cekirdek_tablolar.sql          # plan, soru-cevap, eşleşme, ders, engelleme, bildirim, denetim, deleted_volunteer_links
│   ├── 20261016100400_fonksiyonlar_ve_tetikleyiciler.sql  # RLS yardımcıları, handle_new_user, koruma/denetim tetikleyicileri, grant_admin, seed kilidi
│   ├── 20261016100500_rls_politikalari.sql           # RLS, GRANT, görünümler
│   └── 20261016100600_storage.sql                    # bucket'lar, yol bazlı Storage politikaları, yükleme kotası
├── seed/
│   ├── seed.sql                     # YALNIZCA yerel: sahte kullanıcılar ve örnek veri (başında seed kilidi; yönetici VERMEZ, gönüllü ONAYLAMAZ, eşleşme KURMAZ)
│   ├── yerel/yonetici.sql           # YALNIZCA yerel, elle çalıştırılır: seed'deki hesabı yönetici yapar (seed'in parçası DEĞİL)
│   ├── yerel/onayli_gonullu_ve_eslesme.sql  # YALNIZCA yerel, elle çalıştırılır: örnek gönüllüleri ONAYLAR, eşleşme / ders / cevaplı soru ekler
│   └── curriculum/                  # içerik ekibinin CSV şablonları + csv-to-migration.mjs + testleri (README.md içinde anlatılır)
├── tests/database/                  # pgTAP (1154 test)
└── rollback/dev_ilk_sema_geri_al.sql   # yalnızca geliştirme: ilk şemayı kaldırır (yukarı-aşağı-yukarı denendi)
```

## 3. Tablolar ve ilişkiler (ER özeti)

```
auth.users 1─1 profiles ─┬─ 1─1 students ──(guardian_students N─N, en çok 2 veli)── profiles[veli]
                         │        ├─ 1─1 student_features        (veli özellik anahtarları)
                         │        ├─ 1─N recovery_plans (öğrenci başına 1 AKTİF) 1─N plan_items N─1 topics
                         │        ├─ 1─N questions 1─N question_messages 1─N attachments ; messages 1─0..N moderation_flags*
                         │        └─ 1─N volunteer_blocks N─1 volunteers (gönüllü silinince NULL)
                         ├─ 1─1 volunteers ─┬─ volunteer_subjects · volunteer_documents · training_attempts
                         │                  └─ matches (öğrenci × gönüllü × ders; ders başına 1 AÇIK eşleşme) 1─N sessions 1─N session_events
                         └─ consents N─1 consent_types ; consents N─1 legal_documents(doc_type, version)
                            availability_slots · notifications · push_subscriptions · reports · audit_log
                            deleted_volunteer_links (yalnız yönetici; silinen gönüllünün kimlik bağlantısı, SK-16)
Müfredat: subjects, academic_years 1─N academic_weeks ; curriculum_versions 1─N units 1─N topics 1─N resources
          grade_programs(yıl, sınıf, ders) → curriculum_versions ; weekly_topics(yıl, sınıf, ders, hafta) → topics
          (weekly_topics'te konunun sürümü, o yıl için grade_programs'ın gösterdiği sürüm OLMAK ZORUNDA: tetikleyici)
(*) moderation_flags çok biçimli bağlıdır (entity + entity_id), FK yoktur: kayıt, mesaj silinse de anonim kalabilsin.
```

| Grup | Tablolar |
|---|---|
| Kimlik ve roller | `profiles`, `students`, `guardian_students`, `student_features` |
| Rıza ve hukuk | `legal_documents`, `consent_types`, `consents` |
| Gönüllü | `volunteers`, `volunteer_documents`, `volunteer_subjects`, `training_questions`, `training_answer_keys`, `training_attempts` |
| Müfredat | `subjects`, `academic_years`, `academic_weeks`, `curriculum_versions`, `grade_programs`, `units`, `topics`, `weekly_topics`, `resources` |
| Telafi planı | `recovery_plans`, `plan_items` |
| Soru-cevap | `questions`, `question_messages`, `attachments`, `moderation_flags` |
| Eşleşme ve ders | `matches`, `sessions`, `session_events`, `availability_slots`, `volunteer_blocks` |
| Sistem | `reports`, `notifications`, `push_subscriptions`, `audit_log`, `deleted_volunteer_links` |

Görünümler (kısıtlı alan açığa çıkarma): `matched_students`, `matched_student_plan_items`, `matched_volunteers_for_student`, `matched_volunteers_for_guardian`.

## 4. Tasarım kararları ve gerekçeleri

| Karar | Gerekçe |
|---|---|
| **Durum/tür değerleri için `enum` yerine `CHECK`** | Değer eklemek tek satırlık `ALTER TABLE` (geri alınabilir, aynı migration'da kullanılabilir). Enum'a değer eklemek aynı işlemde kullanılamaz, kaldırılamaz. Web istemcisi (TypeScript) düz metin kullanır. |
| **Rıza türleri bir tabloda (`consent_types`)** | Hukuk yeni tür belirlediğinde tek `INSERT` yeter. Tür; hedef rol (`audiences`), çocuk-bazlı olup olmadığı (`student_scoped`) ve geri çekilince çocuk hesabını askıya alıp almadığı (`withdrawal_suspends_student`) bilgisini taşır. |
| **Yardımcılar `private` şemasında** | PostgREST yalnızca `public` şemasını açar; yardımcılar RPC olarak çağrılamaz. Politikalar ve görünümler çağıranın rolüyle çalıştığı için `authenticated`'a `USAGE` + yalnızca **gereken** fonksiyonlara `EXECUTE` verilmiştir (izin listesi `001` testiyle denetlenir). |
| **Varsayılan yetkiler kapalı** | Migration 01: `public` şemasında yeni tablo/sıra/fonksiyon `anon/authenticated/service_role`'e otomatik açılmaz. **Fonksiyonlar için ayrıca** `alter default privileges for role postgres revoke execute on functions from public` (Postgres yeni fonksiyonu varsayılan olarak PUBLIC'e açar; bu ayar olmadan `revoke` unutulan her yeni SECURITY DEFINER fonksiyon `anon` tarafından çağrılabilirdi). `extensions` şemasında eski davranış korunur (eklentiler çalışsın). |
| **Sütun bazlı yazma yetkisi** | `role`, `status`, onay alanları, saklama damgaları istemciden yazılamaz. İkinci hat: tetikleyiciler (sütun yetkisi ve politika yanlışlıkla genişletilse bile engeller; `071` testi bunu geçici politika ile doğrular). |
| **Görünümler `security_invoker` DEĞİL** | RLS satır süzer, sütun süzmez. Gönüllüye `students/profiles` satırı açmak kullanıcı adı ve tercihleri de açardı. Görünümler tablo sahibinin yetkisiyle çalışır, satır kapsamını `WHERE` içinde yardımcı fonksiyonla sınırlar ve yalnızca izinli sütunları seçer. `security_barrier=true` ile sızdıran-fonksiyon saldırısına karşı korunur (`040` sonundaki test sızıntıyı gerçekten gösterecek biçimde tasarlandı ve mutasyonla doğrulandı). Supabase Advisor "Security Definer View" uyarısı verir; bilinçli tercihtir. Görünümdeki **fonksiyonlar** çağıranın yetkisiyle denetlenir, bu yüzden `private.short_name` ve `is_safe_name` `authenticated`'a açıktır. |
| **Askıdaki kullanıcı** | `private.active_role()` hesap `askida/beklemede` ise NULL döner; politikaların çoğu bunu şart koşar. Bazı "kendi satırım" okumaları (bildirim, rıza, başvuru, şikâyet...) bilerek açıktır (§5.1). |
| **Ad alanları** | Gönüllünün `given_name`, `family_name`, `university`, `department` alanları yalnızca harf, tek boşluk, kesme (`'` `’`) ve tire içerir (`private.is_safe_name`, `CHECK`). Rakam, `@`, `:`, `/`, bölünemez boşluk (U+00A0, U+2007, U+202F, U+3000), sıfır genişlikli karakterler **reddedilir** (temizlemek yerine reddetmek güvenlidir). Çocuğa/veliye giden kısa ad: **ad + soyadın baş harfi** ("Ayşe Nur" + "Kaya" → "Ayşe Nur K."). |
| **Serbest metin yerine kod** | `sessions.cancel_reason` ve `matches.end_reason` **kod listesidir** (CHECK). Gönüllü hiçbir serbest metin göremez; sağlık bilgisi gibi şeyler bu alanlara yazılamaz. Kodlar: `end_reason`: veli_reddetti, yonetici_sonlandirdi, gonullu_ayrildi, ogrenci_ayrildi, amac_tamamlandi, engellendi, riza_geri_cekildi, velisiz_kaldi, gonullu_hesabi_silindi, ogrenci_hesabi_silindi, guvenlik, diger. `cancel_reason`: zaman_uygun_degil, teknik_sorun, eslesme_bitti, engellendi, yonetici_iptal, hesap_silindi, diger. |
| **Durum tetikleyicileri `UPDATE OF` kullanmaz** | Bkz. §4.2. |
| **Zaman** | Hepsi `timestamptz` (UTC). Ders saati kuralı (08:00–21:00) `Europe/Istanbul` yerel saatine göre `CHECK` ile de zorlanır. |

### 4.1 ON DELETE ve silme zinciri

| Silinen / olay | Sonuç |
|---|---|
| `auth.users` → `profiles` | `CASCADE` (profile bağlı tüm kişisel veri gider) |
| öğrenci → `recovery_plans`, `questions` (+ mesaj, ek), `student_features` | `CASCADE` |
| öğrenci → `matches` | `SET NULL` + satır `bitti`, `end_reason='ogrenci_hesabi_silindi'`, anonim (`anonymized_at`); o öğrencinin **dersleri silinir** (`students_silinirken`) |
| gönüllü → `matches`, `questions.assigned_volunteer_id`, `question_messages.sender_id` | `SET NULL`; eşleşme `bitti` (`gonullu_hesabi_silindi`), atanmış açık soru **havuza döner** |
| gönüllü silinmeden hemen önce | `BEFORE DELETE` tetikleyicisi (profil **ve** gönüllü satırında) `deleted_volunteer_links` tablosuna "bu mesaj/eşleşme şu eski kimliğe aitti" kaydı yazar, 2 yıl sonra silinmek üzere (SK-16). Ad/e-posta tutulmaz; `app.kimlik_tuzu` tanımlıysa ad+soyad+üniversitenin tuzlu özeti (HMAC-SHA256) yazılır, yoksa özet NULL kalır ve silme **engellenmez**. Tabloyu yalnızca yönetici (aal2) okur; istemci ve servis rolü ekleyemez/güncelleyemez (servis rolü süresi dolanları silebilir) |
| gönüllü → `volunteer_blocks.volunteer_id` | `SET NULL`: engel kaydı (çocuğun güvenlik geçmişi) **kalır** |
| kullanıcı → `consents.user_id/student_id` | `SET NULL`: rıza kanıtı **kalır** (tür, sürüm, özet değeri, zamanlar, `subject_hash`) |
| kullanıcı → `reports`, `audit_log`, `moderation_flags` | `SET NULL` (anonimleşir) |
| eşleşme `bitti` olunca | (hangi yoldan olursa olsun) gelecekteki **planlı** dersler `iptal` olur; `cancel_reason` bitiş nedenine göre kodlanır |
| **son veli** ayrılınca (`guardian_students` silinir) | çocuk hesabı `beklemede` olur, açık eşleşmeleri biter (hesap silme akışı sonra çocuğu siler) |
| veli ayrılır ama **kalan velilerin hiçbirinin geçerli AR-1'i yoktur** (rızayı ayrılan veli vermişti) | çocuk yine `beklemede` olur (`cocuk_riza_gecersiz` denetim kaydı); geçerli AR-1 = verildi, geri çekilmedi ve **veren kişi hâlâ çocuğun velisi** |
| kullanıcı → `push_subscriptions` | `CASCADE`: hesap silinince Web Push abonelikleri de silinir |
| `legal_documents` | Rıza kaydı olan sürüm silinemez (FK) |

### 4.2 Tetikleyici yazım kuralı

Durumdan ya da başka sütundan **türeyen** alanları yazan tetikleyiciler (`closed_at`, `decided_at`, `purge_after`, `last_activity_at`, ...) `UPDATE OF <sütun>` **kullanmaz**; düz `BEFORE/AFTER INSERT OR UPDATE` kullanır. Neden: `UPDATE OF status`, yalnızca `SET status = ...` içinde adı geçen sütunlarda tetiklenir; başka bir tetikleyici `NEW.status`'u değiştirirse bu tetikleyici kaçırılırdı. Her tablo için küçük, ayrı bir tetikleyici yazılır (ortak "stamp_closed_at" yoktur: `recovery_plans_closed_at`, `questions_closed_at`, `reports_closed_at`). Denetim tetikleyicileri `AFTER UPDATE`'tir. `074` testi bu kuralı doğrular.

## 5. Erişim kuralları (RLS matrisi, uygulanan hali)

O = okur, E = ekler, G = günceller, S = siler, **RPC** = doğrudan yazma yok, sunucu fonksiyonuyla. "–" = erişim yok.
Aksi belirtilmedikçe "aktif hesap" varsayılır (§5.1'de askıdaki kullanıcının okuyabildikleri ayrıca sayılmıştır).

| Veri | Öğrenci | Veli | Gönüllü (onaylı) | Yönetici (aal2 + son 12 sa TOTP) |
|---|---|---|---|---|
| `profiles` | kendi: O (**rumuzunu DEĞİŞTİREMEZ**) | kendi + çocukları: O; kendi `display_name` G; **çocuğun rumuzu G** | kendi: O, `display_name` G | O |
| `students` | kendi: O, `prefs` G (*) | çocuğu: O, `grade`/`prefs` G (*) | – (görünüm: rumuz + sınıf + sesli/görüntülü ders durumu) | O |
| `guardian_students` | – | kendi: O | – | O |
| `student_features` | O | çocuğu: O, **G (yalnızca veli)** | – | O |
| `consents` | kendi "Anladım" kayıtları: O, E | kendi + çocuğuna ait: O; E; geri çekme G (iki veli de). **Çocuğa bağlı satırı yalnızca çocuğun HÂLÂ velisi okur / geri çeker** (velilikten çıkarılan kişi eski rıza satırını göremez, geri çekemez) | kendi: O, E, geri çekme | O |
| `consent_types`, `legal_documents` | O | O | O | O (`legal_documents`: **anon dahil herkes O**; yazma yalnızca migration) |
| `volunteers` | – (görünüm: "Ad S.") | – (görünüm: "Ad S." + üniversite + bölüm) | kendi: O, E (başvuru); `given_name/family_name/university/department/class_year` G **yalnızca `basvuru`/`egitim`/`inceleme` aşamasında** | O (onay/ret **RPC**) |
| `volunteer_documents` + bucket | – | – | kendi: E (başvuru açıkken, en çok 5) + kendi kaydını O | O (silme: cleanup/servis) |
| `volunteer_subjects` | – | – | kendi: O; **başvuru aşamasında** E, S | O |
| `training_questions` | – | – | O | O |
| `training_answer_keys` | – | – | – | **yalnızca yönetici O** |
| `training_attempts` | – | – | kendi: O (yazma: RPC) | O |
| Müfredat tabloları | O | O | O | O (yazma: migration) |
| `recovery_plans`, `plan_items` | kendi: O (yazma **RPC**) | çocuğu: O | **doğrudan –**; görünüm `matched_student_plan_items`: eşleşilen dersin **sıradaki 3 bekleyen konusu** + tamamlanan konu **sayısı** | O |
| `questions`, `question_messages`, `attachments` | kendi: O (yazma **RPC**) | çocuğu: O | atanmış / aktif eşleşmeli (aynı ders) / havuz (ders+sınıf): O; **engelli çift ve askıdaki öğrenci hariç**; **engellenen gönüllünün mesajları, yönetici engeli inceleyene kadar görünmez**; yazma **RPC** | O; mesajı gizleme G (`hidden_at`) |
| `moderation_flags` | – | – | – | O (ekleme: yalnızca sistem) |
| `audit_log` | – | – | – | O (ekleme: yalnızca sistem; kimse güncelleyemez/silemez) |
| `deleted_volunteer_links` | – | – | – | O (ekleme: yalnızca tetikleyici; süresi dolanı silme: cleanup) |
| `matches` | veli onayından sonra: O | çocuğu: O | veli onayından sonra kendi: O; **engelliyse görünmez** | O (yazma **RPC**) |
| `volunteer_blocks` | kendi çocuğuna ait: O | çocuğu: O | **–** | O, `reviewed_at` G (ekleme **RPC**; bkz. §5.2) |
| `availability_slots` | kendi: O, E, G, S | çocuğu: O, E, G, S | kendi: O, E, G, S + aktif eşleşmeli öğrenci: O | O |
| `sessions`, `session_events` | kendi: O (yazma **RPC**) | çocuğu: O | kendi: O (**engelliyse görünmez**); `volunteer_note` G **tek sefer, yalnızca tamamlanmış dersin bitişinden ≤ 48 saat sonrasına kadar** (bkz. §5.3) | O |
| `reports` | E; kendi: O | E; kendi: O | E; kendi: O | O; `status`/`action_taken` G |
| `notifications` | kendi: O, `read_at` G | aynı | aynı | aynı (yalnızca kendi) |
| `push_subscriptions` | kendi: O, S; **E, G yok: yalnızca `register_push_subscription` RPC'si (aktif hesapta)** | aynı | aynı | aynı (yalnızca kendi) |

(*) `students.prefs` **kullanılmıyor**: görünüm tercihleri (yazı boyutu, kontrast, hafif mod) tarayıcıda (localStorage) tutulur, sunucuya gitmez (veri en aza indirme; plan 5.5 Ş3). Sütun yerinde duruyor, kaldırılması Aşama 2'ye bırakıldı; yeni kod bu sütuna yazmamalıdır.

**"Kalıcı silme yok" kuralı:** istemci yalnızca `availability_slots`, `push_subscriptions` ve (başvuru aşamasında) `volunteer_subjects` satırlarını silebilir. Hesap silme yalnızca `delete-account` Edge Function'ıyla yapılır.

### 5.1 Askıdaki / beklemedeki kullanıcı ne okuyabilir?

`private.active_role()` NULL döner; politikaların çoğu bu yüzden kapanır. **Okuyabilecekleri** (bilerek açık): kendi `profiles` satırı (durumunu görebilsin), kendi `notifications` satırları (`read_at` işaretleyebilir), kendi `consents` kayıtları (bağı süren veli rızasını **geri çekebilir**; velilikten çıkarılan çocuğa bağlı kayıtları göremez), kendi `push_subscriptions` satırları (okuma ve **silme**; `register_push_subscription` "hesap aktif değil" ile reddeder, yani **abone olamaz**), kendi başvuru satırları (`volunteers`, `volunteer_documents`, `volunteer_subjects`, `training_attempts`) ve kendi `reports` kayıtları. **Okuyamadıkları:** sorular, mesajlar, plan, eşleşme, ders, uygunluk, öğrenci/gönüllü görünümleri, yönetici verileri; Storage'da kendi yüklediği nesne dahil (§8). Hesabı `beklemede` olan **çocuğun** velisi (aktifse) çocuğun verisini görmeye devam eder (indirme/silme için).

### 5.2 Gönüllüyü engelleme (veritabanı tarafı)

`volunteer_blocks` satırı eklenince (`AFTER INSERT` tetikleyicisi `volunteer_blocks_uygula`):

1. o öğrenci + gönüllü arasındaki açık eşleşmeler `bitti` olur (`end_reason='engellendi'`); gelecekteki planlı dersler iptal olur (`cancel_reason='engellendi'`),
2. gönüllünün **cevaplamadığı** (`atandi`) soruları atamadan çıkar ve **havuza döner**,
3. gönüllünün **zaten cevapladığı** (`cevaplandi`) sorular **`kapandi`** olur, havuza DÖNMEZ (atanan gönüllü kaydı tarihçe için kalır): aksi halde havuzdan üstlenen yeni bir gönüllü, çocuğu rahatsız etmiş kişinin yazdıklarını okurdu,
4. engellenen gönüllünün **mesajları**, yönetici engeli inceleyene kadar (`volunteer_blocks.reviewed_at` boş) yalnızca ilgili öğrenci, velisi ve yönetici tarafından görülür (`private.message_hidden_from_me`; ekler ve Storage nesneleri aynı zinciri izler). Yönetici inceleyince olağan kurallar döner; uygunsuz mesajı yönetici `hidden_at` ile gizler.

**Kaynak doğrulaması** (`BEFORE INSERT` tetikleyicisi `volunteer_blocks_kaynak_kontrol`): `blocked_by` ve rol İSTEMCİDEN ALINMAZ. `auth.uid()` doluysa (RPC içinde de) `blocked_by` = çağıran, rol profilden türetilir; çağıran çocuğun kendisi (aktif öğrenci) ya da çocuğun aktif velisi değilse reddedilir (`42501`). `auth.uid()` boşsa (servis rolü / SQL) verilen `blocked_by` çocukla ilişkili olmalıdır (çocuğun kendisi ya da velisi), rol bağdan türetilir; sahte "başka velinin adıyla engel" yazılamaz. `match_id` verilmişse **aynı öğrenci-gönüllü çiftine** ait olmalıdır (`23514`). Yönetici bu yoldan engel ekleyemez; yönetici SQL'iyle (`blocked_by` boş) ekler.

Engel yalnızca o öğrenci içindir. Ayrıca `can_answer_question`, `can_access_question`, `is_matched_volunteer`, `matches_select_volunteer` ve ders notu politikası engelli çifti **kendi başlarına** reddeder (RPC/tetikleyici yarım kalsa bile savunma katmanları vardır). `block_volunteer` RPC'si bu yüzden yalnızca engel satırını eklemeli; temizliği şema yapar.

### 5.3 Ders notu (`sessions.volunteer_note`)

Çocuğun ve velinin okuduğu tek **serbest metin** kanalı gönüllünün ders notudur. Bu yüzden yazım dardır: ders `tamamlandi`, bitişinden ≤ 48 saat geçmiş, `anonymized_at` boş, gönüllü onaylı ve çocukla arasında **engel yok**, ve **tek sefer** (not boşken yazılır; sonradan değiştirilemez). Yazım `audit_log`'a işlenir (`ders_notu_yazildi`, yalnızca **uzunluk**). İçerik süzgeci (`mask_contact_info`) backend'in `BEFORE UPDATE` tetikleyicisidir.

### 5.4 Yeniden onay: `public.my_pending_consents`

Bir hukuki metin yeni sürüme geçince (ör. gönüllü taahhüdü ve davranış kuralları **v0.2**) kullanıcıdan yeniden onay alınması gerekir. Şemada "en güncel sürüm onaylanmamış mı?" sorusunu cevaplayan bir görünüm vardır; satır yoksa kullanıcı güncel demektir. **Zorlamayı (engelleme / yönlendirme) backend yapar**; şema yalnızca soruyu cevaplar ve onayı kanıt olarak saklar.

- **En güncel sürüm** = `legal_documents`'ta `published_at <= now()` olanlardan `published_at`'i en yeni olan (gelecek tarihli sürüm sayılmaz; yayın zamanı eşitse sürüm adı büyük olan). **Onay** = o sürüm için `granted = true` ve `withdrawn_at` boş bir `consents` satırı.
- Yalnızca çağıranın rolüne uygun (`consent_types.audiences`) ve etkin (`is_active`) türler listelenir. Yönetici, askıdaki / beklemedeki kullanıcı ve `anon` satır görmez.
- Çocuğa bağlı türler (AR-1) **veli için çocuk başına** listelenir (`student_id` dolu); çocuğun **hâlâ velisi olan** birinin verdiği geçerli kayıt yeterlidir (biri onaylayınca iki veliden de kalkar; onaylayan velilikten çıkarılırsa yeniden belirir).
- Sütunlar: `consent_type`, `student_id`, `current_version`, `current_published_at`, `last_accepted_version` (kullanıcının en son verdiği sürüm; hiç vermediyse NULL), `reason`: `hic_onaylanmadi` (ilk onay), `yeni_surum` (eski sürümü onaylamış: **yeniden onay**), `geri_cekildi_veya_reddedildi` (bu sürüm için kayıt var ama geçerli değil).
- Yeni sürüm yayımlamak = `legal_documents`'a yeni satır (`doc_type`, `version`, **yayımlanan metnin** `sha256`'sı, `published_at`); eski sürüm satırı değiştirilmez. Yeniden onay **hesabı kilitlemez** (AR-1 hariç hesap durumuna dokunulmaz); uygulamanın hangi ekranı hangi rıza eksikken engelleyeceği backend kararıdır. Eski sürümü onaylamış kullanıcının kaydı geçerli kanıt olarak kalır.
- `legal_documents` türleri rıza türleriyle sınırlı değildir: **`cerez`** (Çerez ve Cihaz Belleği Politikası) rızası olmayan bir bilgilendirme metnidir. `/cerezler` sayfasında yayımlanır (anon okuyabilir) ve **`consents`'a yazılamaz** (`consent_types`'ta `cerez` yoktur; "Tamam" notu kayıt tutmaz). Gerçek metin kesinleşince yayın migration'ı: `insert into public.legal_documents (doc_type, version, sha256, published_at, body_md) values ('cerez', 'v0.1', '<yayımlanan metnin sha256 değeri>', now(), '<metin>');` Taslak özet değeri yazılmaz (özet, yayımlanan metne ait olmalıdır).

### Görünümler

| Görünüm | Kim | Neyi gösterir |
|---|---|---|
| `matched_students` | gönüllü | Aktif eşleşmedeki öğrencinin rumuzu, sınıfı, sesli/görüntülü ders anahtarı. Kullanıcı adı, tercihler, tarih **yok** |
| `matched_student_plan_items` | gönüllü | `match_id, student_id, topic_id, upcoming_rank, completed_count`: eşleşilen dersin **sıradaki en çok 3 bekleyen konusu** (`upcoming_rank` 1–3) ve o dersteki **tamamlanan konu sayısı**. Mutlak sıra (`seq`), `plan_id`, tamamlanan konuların kendisi, tarih, günlük hedef, mod **yok**. Neden dar: herkese açık `weekly_topics` ile birleşince tüm konu listesi, çocuğun devamsızlık aralığını (dolaylı sağlık verisi) geri hesaplatırdı |
| `matched_volunteers_for_student` | öğrenci | Gönüllünün **"Ad S."** kısa adı (veli onayından sonraki eşleşmeler) |
| `matched_volunteers_for_guardian` | veli | **"Ad S."** + üniversite + bölüm + verdiği dersler (öneri aşaması dahil) |
| `my_pending_consents` | herkes (kendi satırları) | Onaylaması gereken ama en güncel yayımlanmış sürümü onaylamadığı rızalar (bkz. §5.4) |

"Ad S." üretimi veritabanında yapılır (`private.short_name(given_name, family_name)`). Türkçe `i/ı/ş/ç/ğ/ö/ü` büyütmesi veritabanı dil ayarından bağımsız `translate` ile yapılır; testlerle doğrulanmıştır.

### Soru erişim kuralı (`can_access_question`) ve cevaplama (`can_answer_question`)

Erişim: yönetici (aal2) · sorunun sahibi aktif öğrenci · öğrencinin velisi · **onaylı** ve aktif gönüllü, **öğrenci aktifse** ve engelli çift değilse: soru ona atanmışsa **veya** soru havuzdaysa ve gönüllü o ders+sınıfı veriyorsa **veya** o öğrenciyle o ders için aktif eşleşmesi varsa. Gönüllü havuz sorusunu görse bile öğrencinin kaydını/rumuzunu **çözemez**.
Cevaplama (`can_answer_question`): soru gönüllüye **atanmış** (`atandi`/`cevaplandi`), gönüllü onaylı, öğrenci hesabı aktif ve çift engelli değil.
Soru tablosunda `atandi`/`cevaplandi` durumu **atanmış gönüllü ister** (`questions_atanan_gonullu_chk`); atama kalkarsa (gönüllü silindi/engellendi) soru otomatik `havuzda` olur.

## 6. Kimlik, rol ve yönetici koruması

- **`handle_new_user`** (`auth.users` INSERT): profil oluşturur.
  - İstemci `signUp(data: {role, display_name})` ile yalnızca `veli` ve `gonullu` isteyebilir; başka bir değer veya rolsüz kayıt **reddedilir** (sessizce veli yapılmaz).
  - Gönüllü e-postası `*.edu.tr` ile bitmeli (kayıttan sonra e-posta değişiminde de zorlanır).
  - `ogrenci` yalnızca **`app_metadata.role`** ile (servis anahtarlı Edge Function: `auth.admin.createUser`) alınır; istemci `app_metadata` yazamaz.
  - `yonetici` hiçbir metadata ile verilemez.
- **`private.is_admin()`**: rol `yonetici` **ve** hesap aktif **ve** `aal = aal2` **ve** `amr` iddiasında `method = totp` olan bir girişin zaman damgası **son 12 saat (43200 sn)** içinde. Yani çalınmış/açık unutulmuş bir yönetici oturumu 12 saat sonra yetkisini yitirir; yönetici paneli TOTP'yi yeniden doğrulatmalıdır (`mfa.challengeAndVerify`). Biçimi bozuk `amr` (dizi değil, sayı olmayan zaman damgası...) **hata vermez**, yönetici saymaz.
- **Yönetici atama (yalnızca SQL):** Studio SQL düzenleyicisinde `select private.grant_admin('ekip@ornek.com');` Sırayla şunları ister (hiçbiri atlanamaz):
  1. hesap `veli` olarak açılmış ve **bağlı çocuğu olmayan**,
  2. e-posta **doğrulanmış**,
  3. hesap **aktif** (askıdaki hesap sessizce aktifleştirilmez; önce incelenmeli),
  4. en az bir **doğrulanmış TOTP faktörü** var (`auth.mfa_factors`).
  Geri alma: `private.revoke_admin(email)`. `anon/authenticated/service_role` bu fonksiyonları **çağıramaz**.
- **`profiles.role`**: **yalnızca** `grant_admin` / `revoke_admin` içinde, işlem-yerel `app.rol_degisikligi_hedef` bayrağı o kullanıcı için kurulmuşken değişir. `update profiles set role = ...` SQL oturumunda bile (bayraksız) **reddedilir**; böylece yukarıdaki doğrulamalar atlanamaz. **`status`**: SQL, servis rolü ve `SECURITY DEFINER` RPC'ler. İstemci için sütun yetkisi yok **ve** tetikleyici var.
- **`audit_log`**: rol/durum değişikliği, gönüllü durumu, **gönüllü profil alanı değişikliği (hangi alan; değer yazılmaz)**, eşleşme, mesaj gizleme, bildirim durumu, engelleme, özellik anahtarı, **ders notu yazımı (uzunluk)**, AR-1 geri çekme ve velisiz kalma tetikleyicileriyle otomatik yazılır. `details` içine kişisel veri yazılmaz.
- **AR-1 geri çekme:** çocuğun hizmetin dayandığı açık rızası (`acik_riza_dolayli_saglik`) geri çekilir ve o çocuk için **başka geçerli AR-1 kaydı kalmazsa** çocuk hesabı `beklemede` olur, açık eşleşmeleri biter (planlı dersler iptal), `audit_log`'a yazılır. **Geçerli kayıt** = verildi, geri çekilmedi ve kaydı veren kişi çocuğun **hâlâ velisi** (velilikten çıkarılan kişinin eski rızası çocuğu açık tutmaz). Geri çekebilen: çocuğun bağı süren herhangi bir velisi (`private.has_guardian_link`: hesap askıdaysa bile; rızayı geri çekmek vermek kadar kolay olmalı). Velilikten çıkarılan kişi çocuğa bağlı rıza satırını **göremez ve geri çekemez**. Çocuğun geçerli tek AR-1'i velilikten çıkarılan kişiye aitse ve kalan velilerden geçerli AR-1 yoksa çocuk `beklemede` olur (`cocuk_riza_gecersiz`). **Geri çekme ya da geçersizlik sonrası yeni rıza verilse bile hesap kendiliğinden açılmaz** (hiçbir tetikleyici hesabı yeniden etkinleştirmez; testle sabitlendi: `075`). Yeniden aktifleştirme bilinçli bir işlemdir (yeni rıza + yönetici/RPC), otomatik değildir. Bu davranış rıza **türünün** özelliğidir (`consent_types.withdrawal_suspends_student`); isteğe bağlı rızalar hesabı askıya almaz.

## 7. Saklama ve imha (hukuk gereksinimlerinin şemadaki karşılığı)

Silme/anonimleştirme işlerini `backend` (`cleanup`, pg_cron) yazacak; şema ihtiyaç duyduğu alanları hazırlar.

| Kod | Alan | Kim yazar |
|---|---|---|
| SK-01/02 | `profiles.last_seen_at` | backend (girişte); istemci yazamaz |
| SK-03 | `recovery_plans.closed_at` | tetikleyici (`tamamlandi/arsiv` olunca) |
| SK-05 | `questions.closed_at`, `questions.last_activity_at` (hiç geriye gitmez, `greatest`), `attachments.purged_at` | tetikleyici (ilk ikisi); cleanup (`purged_at`) |
| SK-06 | `volunteer_documents.purge_after` | tetikleyici: **karar sonrası 30 gün**; karar yoksa **yüklemeden 60 gün**. `reviewed_at/by` karar anında damgalanır. `purged_at`: cleanup |
| SK-07 | `volunteers.decided_at` (tetikleyici; **açık duruma geri dönülürse sıfırlanır**), `volunteers.left_at` (ayrılış akışı) | |
| SK-08 | `sessions.anonymized_at` | cleanup (not, gerekçe, kişi alanları temizlenir) |
| SK-10 | `moderation_flags.original_body_purged_at` | cleanup |
| SK-11 | `reports.closed_at` (tetikleyici), `reports.anonymized_at` (cleanup) | |
| SK-14 | `matches.anonymized_at` | tetikleyici (öğrenci silinince) / cleanup (2 yıl sonra) |
| SK-15 | `consents` rıza kanıtı + `subject_hash` | `subject_hash`: backend (bkz. §13, tuz) |
| SK-16 | `deleted_volunteer_links` (`expires_at` = silinmeden +2 yıl) | tetikleyici yazar; cleanup süresi dolanı siler |
| SK-17 | `push_subscriptions.updated_at`: her açılışta `register_push_subscription` tazeler; **60 gün tazelenmeyen abonelik silinir**. 404/410 alan abonelik `send-push` tarafından hemen silinir. `device_label` yalnızca **kaba** etiket tutar ("Chrome · Android"; CHECK: rakamsız, ≤ 40 karakter, `/` `(` `;` yok); ham User-Agent hiçbir sütunda SAKLANMAZ | cleanup / send-push |
| SK-20 | `notifications.created_at` (90 gün) üzerindeki indeks temizlik içindir | cleanup |

`audit_log` satırları istemci ve **servis rolü dahil** güncellenemez/silinemez; 2 yıllık temizlik işi `postgres` sahibi bir pg_cron işi olmalıdır.

## 8. Storage

| Bucket | Yol | Sınır | Yükleme | Okuma |
|---|---|---|---|---|
| `soru-ekleri` (özel) | `{student_id}/{question_id}/{uuid}.jpg\|m4a\|aac\|webm` | 3 MB (bucket); fotoğraf ≤ 2 MB ve yalnızca JPEG, ses ≤ 120 sn `attachments` CHECK'inde. MIME: `image/jpeg`, `audio/mp4`, `audio/x-m4a`, `audio/aac`, `audio/webm`. **Kota: yükleyen başına son 24 saatte 30 nesne** | öğrenci kendi klasörüne; gönüllü yalnızca **kendisine atanmış** açık sorunun klasörüne (engelli değilse) | yükleyen (hesabı aktifse), yönetici (aal2), eki **görebilen** herkes (RLS zinciri); gizlenmiş mesajın eki görünmez. İmzalı URL ≤ 10 dk |
| `gonullu-belgeleri` (özel) | `{volunteer_id}/{uuid}.pdf\|jpg` | 5 MB; `application/pdf`, `image/jpeg`. **Kota: yükleyen başına toplam 5 nesne** | gönüllü kendi klasörüne, başvuru kilitlenene kadar | gönüllü kendi nesnesini (hesabı aktifse), yönetici (aal2) |

- İstemci için `UPDATE/DELETE` politikası **yoktur**: dosya değiştirilemez, silinemez, üzerine yazılamaz (`upsert` çalışmaz). Silme servis rolüyle (cleanup, delete-account).
- **Kota** `private.storage_kota_uygun(bucket)` içindedir (`VOLATILE`, politikada `(select ...)` ile **sarmalanmaz**): tek sorguda 200 nesne yüklemek de ilk 30'dan sonra reddedilir (`074` testi boş kotayla dener). Aynı kullanıcının **eşzamanlı** yüklemeleri `pg_advisory_xact_lock` (kullanıcı + bucket) ile sıraya girer: kilit olmadan iki işlem aynı anda "29 nesne var" görüp kotayı aşabilirdi (N5). `volunteer_documents` tablosundaki "en çok 5 belge" sınırı gönüllü satırını kilitleyerek (`FOR UPDATE`) eşzamanlı eklemeleri sıraya sokar.
- **Ses MIME türleri (Ş2):** Safari `audio/mp4` (`.m4a`), Chrome ve Firefox `audio/webm` (`.webm`) üretir; ikisi de bucket listesinde ve `attachments` CHECK'indedir, **şema değişmedi**. MIME **parametresiz** gönderilmelidir (`audio/webm;codecs=opus` değil): Supabase Storage'ın güncel kaynağı (`validators/mime-type.ts`) `;` parametrelerini ayrıştırıp yok sayar, ancak eski Storage sürümleri dizgeyi aynen karşılaştırır ve parametreliyi reddeder; `attachments.mime` ise parametreliyi her halükârda reddeder (CHECK). Backend `ask_question` / `post_message` içinde `mime`'i parametresiz yazmalı (`split_part(mime, ';', 1)` ya da yol uzantısından: `.m4a` → `audio/mp4`, `.webm` → `audio/webm`, `.aac` → `audio/aac`). Firefox'un varsayılanı `audio/ogg` kabul edilmez; istemci önce `audio/mp4`, sonra `audio/webm` dener (plan 4.3.4). `audio/ogg` gerekirse dört yer birlikte değişir: bucket listesi, `attachments` CHECK'i, yol regex'i, `can_upload_question_object`. Fotoğraf yalnızca JPEG kalır (istemci dönüştürür).
- **Yetim nesne temizliği (backend `cleanup`):** nesne yüklendi ama `ask_question` / `volunteer_documents` kaydı hiç oluşmadı ise (yarım kalan yükleme), `storage.objects` içinde karşılığı olmayan ve 24 saatten eski nesneler silinmelidir. Kota bu temizlik yetişene kadar kötüye kullanımı sınırlar.

## 9. Migration'ları uygulama

Gereksinim: Docker Desktop (yerel Supabase için) ve Node. CLI sürümü **sabittir**: `2.121.0` (`npx supabase@2.121.0 ...`).

```bash
# Yerel ortam (proje kökünden)
npx supabase@2.121.0 start                  # yerel Supabase'i başlatır (Docker)
npx supabase@2.121.0 db reset               # veritabanını sıfırlar: migration'lar + seed.sql
npx supabase@2.121.0 test db                # pgTAP testlerini çalıştırır (supabase/tests/database)
npx supabase@2.121.0 db lint                # şema uyarıları

# Yeni migration
npx supabase@2.121.0 migration new <ad>     # supabase/migrations/<zaman>_<ad>.sql oluşturur

# Uzak proje (dev / prod) — ÜRETİM İÇİN ÖNCE KULLANICI ONAYI
npx supabase@2.121.0 link --project-ref <proje-kimliği>
npx supabase@2.121.0 db push --dry-run      # neyin uygulanacağını gösterir
npx supabase@2.121.0 db push                # seed ÇALIŞTIRMAZ (varsayılan)
```

- **Üretimde `db push` öncesi:** yedek alın (Free planda otomatik yedek yoktur; `pg_dump` veya Pro plan), `--dry-run` çıktısını gözden geçirin.
- **Geri alma:** Supabase "down" migration desteklemez. Geliştirmede `db reset`. Üretimde geri alan **yeni** migration yazılır. `supabase/rollback/dev_ilk_sema_geri_al.sql` yalnızca geliştirme içindir (tüm veriyi siler; yukarı-aşağı-yukarı denendi: 38 tablo, 2 bucket).
- **Seed kilidi (uzak projeye sahte veri/yönetici gitmesin):**
  - `seed.sql` ilk satırında `private.assert_seed_allowed()` çağırır. Şunlarda **durur**: veritabanında seed'in kendi 9 örnek adresi dışında **herhangi bir kullanıcı** varsa, ya da `app.ortam = 'uzak'` işaretliyse (boş veritabanında bile).
  - Her **uzak** (hosted) projede bir kez işaretleyin: `alter database postgres set "app.ortam" = 'uzak';` (Studio SQL düzenleyicisi). Yerel veritabanında işaret yoktur.
  - `supabase db reset --linked` uzak veritabanını **siler**; yalnızca geliştirme projesinde ve kullanıcı onayıyla, **her zaman `--no-seed` ile** çalıştırın: `npx supabase@2.121.0 db reset --linked --no-seed`. (`--sql-paths` seed'i zorla açar; kilit yine de devrededir.)
  - `seed.sql` **yönetici hesabı oluşturmaz/rol vermez ve gönüllü ONAYLAMAZ, eşleşme / gönüllü cevabı OLUŞTURMAZ** (bilinen parolalı yönetici ya da çocuk verisine erişen onaylı gönüllü uzak projeye sızarsa felaket olurdu; güvenlik yeniden denetimi O4). Bütün örnek gönüllüler `basvuru` durumundadır. Yerelde gerekirse elle çalıştırılır (ikisi de `config.toml` `sql_paths` içinde **değildir**, ikisi de seed kilidini kendileri de çağırır): `supabase/seed/yerel/yonetici.sql` (önce hesapla girip TOTP kaydı yapmak gerekir; `grant_admin` doğrulanmış faktör ister) ve `supabase/seed/yerel/onayli_gonullu_ve_eslesme.sql` (gönüllüleri onaylar, eşleşme / ders / cevaplı soru ekler).
  - **DEVOPS KONTROL LİSTESİ (her uzak proje için, projeyi açar açmaz):** `alter database postgres set "app.ortam" = 'uzak';`. İşaret yokken kilit yalnızca "örnek olmayan kullanıcı var mı" diye bakar; işaretsiz BOŞ bir uzak veritabanında seed çalışabilirdi. İşaret konunca `seed.sql`, `yonetici.sql` ve `onayli_gonullu_ve_eslesme.sql` boş veritabanında bile durur. `db reset --linked` yalnızca `--no-seed` ile.
- **`config.toml` auth ayarları:** `minimum_password_length = 10`, `password_requirements = "letters_digits"`, `enable_confirmations = true` (e-posta doğrulama), `secure_password_change = true` (parola değişimi taze oturum ister), e-posta `max_frequency = "60s"`, `otp_expiry = 900`, TOTP kaydı ve doğrulama açık. Hosted projede bu ayarlar **panelden/CLI ile ayrıca** eşlenmelidir (`config.toml` yalnızca yerel ortamı sürer).
- **CAPTCHA (devops):** kayıt / giriş / parola sıfırlama uçlarında bot koruması (Cloudflare Turnstile veya hCaptcha) hosted projede açılmalıdır; `config.toml`'da `[auth.captcha]` yorum satırı olarak durur, anahtarlar `.env`/secret manager'da tutulur.
- **Yeni tablo kontrol listesi** (her migration'da): `enable row level security` · açık `GRANT` (yalnızca gereken sütun/komut) · en az bir politika · `service_role` yetkisi · tetikleyicilerde `search_path = ''` · **yeni `private` fonksiyonu varsayılan olarak kimseye açık değildir; politika/görünüm/CHECK içinde çağrılıyorsa `authenticated`'a ayrıca `GRANT EXECUTE` + `001` izin listesine ekleme** · durum tetikleyicilerinde `UPDATE OF` yok (§4.2) · pgTAP rol matrisi testi.
- **Yeni rıza türü:** `insert into public.consent_types ...` ve o tür için `legal_documents` satırı (aynı migration'da).
- **Yeni hukuki metin sürümü:** `insert into public.legal_documents (doc_type, version, sha256, published_at, url/body_md)`; eski sürüm satırı değiştirilmez (tetikleyici engeller).
- **İçerik (müfredat):** `supabase/seed/curriculum/README.md`.
- **Hosted projede** "Automatically expose new tables" seçeneğini kapalı tutun (migration yine de açık `GRANT` yazar).
- **Edge Function / backend notu:** `create-child-account` için `auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role: 'ogrenci' }, user_metadata: { display_name: <rumuz> } })`; ardından `students` ve `guardian_students` kayıtları servis rolüyle eklenir. Çocuk parolası da **en az 10 karakter, harf+rakam** olmalıdır.

## 10. Müfredat CSV aracı

`supabase/seed/curriculum/csv-to-migration.mjs` CSV'leri doğrular ve idempotent bir migration üretir. Okuyucu (`csv.mjs`): geçerli UTF-8 şart (bozuksa **satır numarasıyla** hata), kapanmamış tırnak **açıldığı satırla** hata, tırnak yalnızca alan başında açılır, ayraç (`,`/`;`) tırnak dışından tespit edilir, boş CSV için geçersiz SQL üretilmez, üretilen SQL `standard_conforming_strings = on` ile başlar. Haftalık konu, o yıl için `grade_programs`'ın gösterdiği sürümden gelmeli (araç **ve** veritabanı tetikleyicisi). Kaynak (`resources`) anahtarı konu + başlıktır; başlığı değiştirmek eski satırı etkin bırakır (README'de yazılı). Testler: `node --test supabase/seed/curriculum/csv-to-migration.test.mjs` (20 test).

## 11. Testleri çalıştırma

- Komut: `npx supabase@2.121.0 test db` (Docker gerekir). Dosyalar sırayla çalışır; `000_test_yardimcilari.test.sql` ortak yardımcıları (`tests` şeması) kurar. Docker'sız doğrulama düzeneği: `cd tools/db-check && npm ci && npm test` (`npm run test:seed` seed ile).
- Her test dosyası kendi verisini `tests.make_fixture()` ile üretir ve `ROLLBACK` ile siler. Seed verisi varken de geçer (kimlikler ayrı).
- Rol taklidi: `select tests.login('veli_a');` · `tests.login('admin','aal2');` · `tests.login('admin','aal2', <TOTP yaşı sn>)` · `tests.login_claims(ad, jsonb)` (özel JWT iddiaları) · `tests.login_anon();` · `tests.login_service();` · `tests.logout();`
  Sayım: `tests.cnt('select ...')`, etkilenen satır: `tests.affected('update ...')`, görünür örnek kimlikler: `tests.visible('public.questions', array['q1','q2'])`.
- **Dikkat:** `supabase test db` testleri `postgres` (süper kullanıcı) olarak çalıştırır ve rolü `set local role` ile taklit eder; testler bu yüzden bu kalıpla yazılır. Aynı SQLSTATE'i paylaşan kurallarda `throws_ok` **hata mesajını da** doğrular.

| Dosya | Test | Kapsam |
|---|---|---|
| `000_test_yardimcilari` | 2 | Yardımcılar (`tests` şeması) |
| `001_sema_korumalari` | 32 | Her tabloda RLS · `anon` yetkisi · SECURITY DEFINER kuralları · `authenticated` fonksiyon izin listesi (15 fonksiyon) · görünüm sütunları · bucket'lar |
| `010_handle_new_user` | 29 | Kayıt kuralları, `.edu.tr`, rol yükseltme denemeleri |
| `020_rls_kimlik` | 60 | `profiles`, `students`, `guardian_students` rol matrisi; başka velinin çocuğunu görememe |
| `021_rls_gonullu_riza` | 111 | Gönüllü başvurusu/belge/ders, quiz, rıza kayıtları ve geri çekme |
| `025_mufredat` | 40 | Müfredat okuma kuralları, bütünlük kısıtları, haftalık konu / program sürümü uyumu |
| `026_hukuk_saklama` | 52 | `legal_documents`, rıza kanıtının hesap silinince kalması, saklama damgaları, silme zincirleri |
| `030_rls_sorular` | 81 | Soru/mesaj/ek erişimi, **mesaj değiştirilemezlik**, askı/onay etkileri |
| `040_rls_eslesme_ders` | 157 | Eşleşme, görünümler ("Ad S."), plan gizliliği, ders, uygunluk, şikâyet, bildirim; `security_barrier` sızıntı testi |
| `045_engelleme_ozellik_ad` | 66 | `short_name`, gönüllüyü engelle, veli özellik anahtarları (DB'de zorlama) |
| `050_yonetici_rol_yukseltme` | 52 | aal1/aal2, `amr` TOTP süresi, sahte JWT alanları, `audit_log`, yetki aşımı denemeleri |
| `060_storage` | 55 | Yol bazlı yükleme/okuma, silme/değiştirme yok, askıdaki kullanıcı |
| `070_engelleme_ders_notu` | 36 | Engel tetikleyicisi (eşleşme biter, atama kalkar, ders iptal), ders notu kanalı |
| `071_gonullu_profil_kilidi` | 61 | Onay sonrası profil kilidi (politika **ve** tetikleyici), ad `CHECK`'leri (NBSP vb.), kod listeleri, rumuz kuralı |
| `072_riza_plan_soru` | 46 | AR-1 geri çekme → askı, dar plan görünümü, sahipsiz soru, çocuk bazlı ama bayraksız rıza |
| `073_yonetici_seed_yetki` | 51 | `grant_admin` koşulları, rol bayrağı, seed kilidi, varsayılan yetkiler |
| `074_depolama_silme_zinciri` | 53 | Storage kotaları, silme zinciri, son veli, SK-16 bağlantısı, `UPDATE OF` kuralı, küçük düzeltmeler |
| `075_yeniden_denetim` | 67 | N1–N6: servis rolü `volunteers` yazımı, engel kaynağı doğrulaması, engel sonrası soru kapanışı ve mesaj gizleme, çocuğa bağlı rıza + eski veli, kota kilidi, bağlantı kaydı silme koruması |
| `076_web_push` | 59 | `push_subscriptions`: endpoint SSRF CHECK'i (27 kötü / 6 geçerli örnek), anahtar biçimleri, RPC'ler, hesap devri, 10 abonelik sınırı, askıdaki kullanıcı, cihaz etiketi (ham User-Agent yok); ses MIME türleri |
| `077_bekleyen_riza_cerez` | 44 | `my_pending_consents` (yeni sürümde yeniden onay, çocuk başına AR-1, gelecek tarihli sürüm, geri çekme / ret), `cerez` belgesi rıza türü değildir |

## 12. Doğrulama durumu

Bu şema ve testler Docker olmadan, **gömülü Postgres (PGlite, PostgreSQL 18.6) + gerçek pgTAP** üzerinde, Supabase `auth`/`storage` şemaları ve roller taklit edilerek doğrulandı:

- `node run.mjs` ve `node run.mjs --seed` (`tools/db-check`): **1154/1154 test geçti**, seed'li ve seed'siz.
- **Mutasyon testi:** testlerin gerçekten koruduğunu göstermek için şemaya ve seed'e bilerek **182 hata** eklendi (önceki turlardan 121 + bu turdan 61); **178'i yakalandı**. Yakalanmayan 4 mutant eşdeğerdir (aynı kural iki katmanda vardır, tek katmanı bozmak davranışı değiştirmez): ders notu politikasındaki engel kontrolü (`USING`, `WITH CHECK` ve `sessions_select`); `register_push_subscription` içindeki `updated_at` ataması (`set_updated_at` tetikleyicisi de yazar); `remove_push_subscription` (`SECURITY INVOKER` yerine `DEFINER` yapılsa da `user_id = auth.uid()` koşulu kalır); engellenen gönüllü mesajlarında yönetici istisnası (`embargoed_volunteers` ön süzgeci de yöneticiyi dışarıda bırakır). Mutasyon denemeleri sırasında bulunan test boşlukları (cihaz etiketi uzunluk sınırı vb.) kapatıldı.
- **Performans:** `question_messages_select` yeni mesaj gizleme kuralıyla 60.000 mesajlık tabloda filtresiz tarama 15-20 ms (satır başına fonksiyon çağrısı ilk denemede ~2 sn sürüyordu; ucuz `embargoed_volunteers()` ön süzgeci bunu giderdi). Filtreli gerçekçi sorgular 1-10 ms.
- Saldırı senaryoları (`guvenlik` ajanı, `v2/`): **S1** (engelli gönüllü not yazamaz, atanan soru havuza döner, yeni gönüllü engelli gönüllünün mesajını göremez, sahte `blocked_by` reddedilir), **S3b** (velilikten çıkarılan kişi rıza satırını göremez / geri çekemez; çocuk `beklemede`), **S8** (seed uzak işaretli ya da gerçek kullanıcılı veritabanında durur; seed sonrası bütün gönüllüler `basvuru`, yönetici ve eşleşme yok), **S12** (servis rolü süresi dolmamış bağlantı kaydını silemez) ve S2, S4–S7, S9, S14 kapalıdır. Bilinen, kabul edilmiş kalanlar: servis rolü `audit_log`'a satır ekleyebilir ve mesaj silebilir (KVKK silme yolu; servis anahtarı sunucuda kalır).
- Dev geri alma betiği yukarı-aşağı-yukarı denendi.

**Gerçek Supabase'te henüz çalıştırılmadı**: `db reset`, `test db`, Storage API ile yükleme, GoTrue ile kayıt/MFA/`amr`, hosted proje ayarları. Bu adımlar Docker veya Supabase hesabı gelince yapılmalıdır. Taklitte `yonetici.sql` "auth.mfa_factors yok" hatası verir (mock eksikliği); gerçek Supabase'te beklenen TOTP mesajını verir.

## 13. Backend için RPC / iş mantığı sözleşmesi (özet)

Şema bunlara hazırdır; imzalar `docs/api.md` içinde kesinleştirilir. Hepsi `SECURITY DEFINER`, `set search_path = ''`, içeride yetki kontrolü (`private.*` yardımcılarıyla), `revoke ... from public, anon` + `grant execute ... to authenticated`. (Varsayılan yetkiler kapalı olduğu için `grant` unutulursa fonksiyon **çağrılamaz**, güvenli yönde başarısız olur.)

| Fonksiyon | Şemanın sağladığı / dikkat |
|---|---|
| `create_recovery_plan(grade, subject_codes[], absence_start, absence_end, daily_goal)` | `weekly_topics`, `academic_weeks.is_break`; `closed_at` otomatik. **Öğrenci başına tek `aktif` plan** (kısmi benzersiz indeks): yeni plandan önce eskisini `tamamlandi/arsiv` yapın, yoksa `23505` |
| `complete_plan_item(item_id, mode)` | `plan_items` CHECK: `tamamlandi` ⇒ `completed_at` ve `completed_mode` dolu |
| `ask_question(question_id, subject_id, topic_id?, body, attachment_paths[])` | **Yükleme soru oluşmadan önce yapılır** (yol `{student}/{question}/...`): istemci `question_id` üretir. Günlük sınır `questions_student_idx`. `qa_enabled` DB'de zorlanır (`OZELLIK_KAPALI:`). **Soru ya gönüllüye atanmalı (`atandi` + `assigned_volunteer_id`) ya da `acik`/`havuzda` kalmalı**; atamasız `atandi/cevaplandi` CHECK ile reddedilir. Atamada `private.is_blocked()` kontrol edilir |
| `post_message(question_id, body, attachment_paths[])` | `mask_contact_info` `BEFORE INSERT` tetikleyicisi; sesli ek için `voice_enabled` DB'de zorlanır. `attachments.mime` **parametresiz** yazılmalı (`audio/webm`, `audio/mp4`; `;codecs=...` atılır), bkz. §8 |
| `claim_question`, `close_question` | `closed_at` / `escalated_at` / `assigned_at`; engelli çift DB'de reddedilir (`ENGELLI:`) |
| `submit_training(answers)` | `training_answer_keys` okur; `training_attempts` yazar; eşik %80 |
| `review_volunteer(volunteer_id, decision, reason?)` | `volunteers.status/approved_*` yazar; **karar anı, belge süreleri ve denetim kaydı tetikleyicilerle otomatik**. Onaydan sonra gönüllü ad/üniversite/bölüm düzeltemez: düzeltme gerekirse yönetici RPC'si / SQL ile yapılır (`audit_log`'a düşer) |
| `propose_match`, `decide_match`, `end_match` | `matches` durumları; öneride `private.is_blocked()`; `end_reason` **kod listesinden** olmalı. `end_match` bitirince gelecekteki planlı dersleri **şema iptal eder**; ancak açık sorulardaki `assigned_volunteer_id`'yi **RPC boşaltmalı** (aksi halde bitmiş eşleşmenin gönüllüsü o sorulara erişmeye devam eder; boşalınca tetikleyici soruyu havuza döndürür) |
| **`block_volunteer(match_id, reason_code?)`** | **Yalnızca** `volunteer_blocks` satırı eklemeli: `student_id`, `volunteer_id`, `match_id`, `reason_code`. **`blocked_by` ve `blocked_by_role` yazılmaz (boş bırakın)**: tetikleyici çağıranın `auth.uid()`'inden ve profilinden doldurur; çağıran çocuğun kendisi ya da velisi değilse `42501`, `match_id` o çifte ait değilse `23514` verir. İkinci çağrıda `ON CONFLICT DO NOTHING`. Eşleşmeyi bitirme, atamaları boşaltma, **cevaplanmış soruları kapatma**, ders iptali ve **mesaj gizleme tetikleyicide / politikada**; RPC'nin işi yalnızca kaydı yazmak ve yöneticiye `notifications` üretmektir. Yönetici incelemesi `reviewed_at` yazar: bu, engellenen gönüllünün mesajlarının gizliliğini kaldırır (`hidden_at` ile tek tek gizleme yöneticide) |
| `book_session`, `cancel_session`, `log_session_event`, `list_open_slots` | Saat kuralı DB `CHECK`'inde de var; çakışma kontrolü RPC'de (satır kilidi); `video_enabled` DB'de zorlanır. **`book_session` eşleşmenin `aktif` olduğunu kontrol etmeli** (şema bitmiş eşleşmeye ders eklenmesini engellemez). `cancel_reason` **kod listesinden** |
| `handle_report`, `set_user_status` | `reports` güncellemesi tetikleyici damgalar (`handled_by/at`); `profiles.status` `SECURITY DEFINER` RPC'den yazılabilir |
| **`register_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_device_label text default null)`** → `uuid` | **PostgREST RPC (`public` şeması, yalnızca `authenticated`)**; `register_device_token`'ın yerini alır. Uygulama her açılışta çağırır (`updated_at` tazelenir, SK-17). `PushSubscription.toJSON()` değerleri: `endpoint`, `keys.p256dh` (65 bayt, base64url, **87** karakter), `keys.auth` (16 bayt, base64url, **22** karakter); dolgu (`=`) ve `+/` varsa çağırmadan önce `base64url`'e çevirin. Aynı endpoint başka hesaptaysa satır **çağırana taşınır** (aynı tarayıcıda hesap değişti); anahtarlar yenilenir. Kullanıcı başına en çok 10 abonelik (en eski tazelenen silinir). Hatalar: `42501` "oturum gerekli" / "hesap aktif değil" (askıdaki / beklemedeki kullanıcı abone olamaz); `23514` + kısıt adı `push_subscriptions_endpoint_chk` (izinli push servisi dışı, http, port, uzunluk), `_p256dh_chk`, `_auth_chk`, `_device_label_chk`. **Ham `navigator.userAgent` ASLA gönderilmez / saklanmaz** (hukuk SK-17): `p_device_label` isteğe bağlıdır ve yalnızca **kaba** etiket alır, ör. `Chrome · Android`, `Safari · iOS`, `Edge · Windows` (harf, boşluk, nokta, tire; iki parça ` · ` ile; **rakam yok**, ≤ 40 karakter; aksi halde `23514`). Etiket, kullanıcıya "bildirim aldığın cihazlar" listesi göstermek içindir; göndermeyebilirsiniz (veri en aza indirme). Yeniden kayıtta etiket gönderilmezse eskisi silinir |
| **`remove_push_subscription(p_endpoint text)`** → `boolean` | Çağıranın **kendi** aboneliğini siler (çıkış yaparken, bildirimi kapatırken, `pushManager` aboneliği iptal edilince). Başkasının aboneliği için `false` döner. Askıdaki kullanıcı da çağırabilir. Tablodan doğrudan `delete` de çalışır |
| **Yeniden onay (`public.my_pending_consents`)** | Giriş sonrası ve her sayfa yüklemesinde (ya da middleware'de) `select * from my_pending_consents` sorgulanır; satır varsa kullanıcı ilgili rızayı (`current_version` için) onaylayana dek yönlendirilir (**zorlama backend'in işidir**; şema yalnızca soruyu cevaplar). Onay: `consents` insert (`type`, `doc_version = current_version`, `granted = true`, `channel = 'web'`, `app_version` = web derleme sürümü). Gönüllü taahhüdü / davranış kuralları v0.2 için gönüllüler `reason = 'yeni_surum'` ile listelenir. Veli çocuk başına AR-1'i `student_id` ile görür. Hesap durumuna dokunulmaz: yalnızca AR-1 geri çekme / geçersizlik hesabı `beklemede` yapar ve **yeni rıza hesabı kendiliğinden açmaz** (yönetici / RPC bilinçli açar; iki veli uyuşmazlığında hukuk kararı: avukata danışılır) |
| **`send-push`** (Edge Function, servis rolü) | `push_subscriptions`'ı **servis rolüyle okur** (`endpoint, p256dh, auth, user_id`); gönderimden önce kullanıcının `profiles.status = 'aktif'` olduğunu denetler (**askıdaki kullanıcıya gönderilmez**, veritabanı bunu zorlamaz). DB endpoint'i kayıt anında kısıtlar; yine de `fetch` öncesinde alan adını **aynı listeyle yeniden doğrulayın** (`https://` + `fcm.googleapis.com`, `updates.push.services.mozilla.com`, `*.push.apple.com`, `*.notify.windows.com`), yönlendirmeleri **izlemeyin** (`redirect: 'manual'`), kısa zaman aşımı koyun. **404 / 410** alan aboneliği servis rolüyle silin (`delete` yetkisi vardır). Yük kişisel veri içermez (rumuz, konu, mesaj yok: kilit ekranında görünür). VAPID özel anahtarı döndürülürse tüm abonelikler geçersizdir: tabloyu boşaltıp uygulamaların yeniden abone olmasını isteyin. Servis rolü `push_subscriptions`'a doğrudan ekleme / güncelleme de yapabilir (RPC'yi atlar); yeni kod bunu yapmamalı |
| `touch_last_seen()` / giriş kancası | `profiles.last_seen_at` |
| AR-1 geri çekme (istemci `consents.withdrawn_at` günceller) | Askıya alma, eşleşmeleri bitirme ve denetim kaydı **şemada**; backend yalnızca bildirimleri (veliye/yöneticiye) üretir. Uygulama `profiles.status = 'beklemede'` durumunu karşılamalı |
| `mask_contact_info`, bildirim tetikleyicileri, pg_cron, `cleanup` | Kapsam dışı (backend). `mask_contact_info` `sessions.volunteer_note` için de uygulanmalı. `cleanup`: 2 yıllık `audit_log` silmesi **servis rolüyle yapılamaz** (bilerek); `postgres` sahibi pg_cron işi olmalı. Ayrıca `deleted_volunteer_links` (`expires_at < now()`), 60 günlük `push_subscriptions` (`updated_at`), 90 günlük `notifications`, yetim Storage nesneleri |
| `consents.subject_hash` ve `deleted_volunteer_links.name_digest` (**tuz**) | Tuz `app.kimlik_tuzu` ayarından okunur; yoksa özet NULL kalır, işlem engellenmez. Tuzu **repoya/veritabanı geneli ayara yazmayın** (veritabanı geneli `alter database set` ayarı tüm oturumlarca okunabilir). Öneri: silme işlemini yapan rolün (GoTrue için `supabase_auth_admin`) rol düzeyinde ayarı ya da Vault'tan okuma; karar `backend`/`devops`'ta (bkz. §14) |
| Yönetici paneli | Yönetici yetkisi 12 saat sonra düşer: arayüz TOTP'yi yeniden doğrulatmalı (oturum yenilemek `amr` zaman damgasını **yenilemez**) |
| Çocuk hesabı parolası | `create-child-account` en az 10 karakter, harf+rakam üretmeli |

Hata önekleri: `OZELLIK_KAPALI:` (veli özelliği kapattı), `ENGELLI:` (engelli çift), ikisi de SQLSTATE `42501`.

## 14. Açık sorunlar ve ertelenenler

**Açık sorunlar**
- **Storage `RETURNING` sorusu:** Storage API yüklemede yeni satırı geri okuyorsa yükleyenin kendi nesnesini görmesi gerekir; bu yüzden `owner_id = auth.uid()` SELECT dalları duruyor (artık yalnızca **aktif hesaplar** için). Gerçek Supabase'te yalnızca INSERT ile yüklemenin çalıştığı doğrulanırsa bu dallar **kaldırılmalıdır** (askıdaki kullanıcı kendi dosyasını da okuyamasın, yetki yüzeyi küçülsün).
- **Tuzun saklanma yeri** (§13): `app.kimlik_tuzu` için güvenli yer kararı bekliyor (rol düzeyi ayar / Vault).
- **CAPTCHA** hosted projede açılmalı (devops).
- **Gerçek Supabase doğrulaması** yapılmadı (§12).
- **Üniversite listesi tablosu** ertelendi: üniversite/bölüm şimdilik `is_safe_name` kuralıyla serbest metindir; kapalı bir liste (seçmeli) iletişim kanalı riskini tamamen kapatır. Pilot öncesi.

**Plan 5.5'ten ertelenenler**
- **Ş4 giriş hız sınırı** (`private.auth_attempts` + RPC): plan 5.5 bunu koşullu bırakmıştı; `guvenlik` pilot öncesinde Vercel WAF / `Sb-Forwarded-For` seçeneğiyle arasında karar verecek. Karar gelmeden tablo açılmadı (kullanılmayan, kişisel veri taşıyan bir sayaç tablosu eklememek için).
- **Bildirim tercihleri** (tür bazında aç/kapa): plan 5.5 bunu Faz C'ye bırakmıştı; şemada henüz yer yok. İhtiyaç netleşince küçük bir `notification_prefs` tablosu (kullanıcı, tür, açık/kapalı) eklenir.
- **`students.prefs` sütununun kaldırılması** (Ş3): Aşama 2; o zamana dek sütun "kullanılmıyor" (§5).

**Ertelenenler** (pilot öncesine; hukuk kararlarına bağlı): `legal_holds`, `deletion_log`, `data_requests`, `blocked_identities` tabloları; `auth.audit_log_entries` / `auth.sessions` IP temizliği.
