-- =====================================================================
-- 04 · ÇEKİRDEK TABLOLAR: telafi planı, soru-cevap, eşleştirme, ders,
--      güvenlik ve sistem  (plan 5.1)
--
-- Bu tablolara istemci doğrudan YAZMAZ (istisnalar 06'da sayılıdır);
-- yazma işlemleri `backend` ajanının yazacağı RPC'lerle yapılır.
-- Şema, o RPC'lerin ve zamanlanmış işlerin ihtiyaç duyacağı sütunları
-- (assigned_at, reminder_*_sent_at, ...) şimdiden içerir.
--
-- ON DELETE kararları (KVKK + çocuk güvenliği):
--  * Öğrenci/veli hesabı silinince onun kişisel verisi zincirleme silinir (CASCADE).
--  * Gönüllü silinince eşleşme/ders/mesaj geçmişi çocuğun kaydı olarak kalır,
--    gönüllü bağı boşalır (SET NULL). Kötü niyetli gönüllü hesabını silerek
--    kanıtı yok edemez. Aynı şekilde öğrenci silinince eşleşme satırı
--    anonim kalır (matches.student_id SET NULL); öğrencinin dersleri silinir.
--  * reports / audit_log / moderation_flags kişi bağı SET NULL ile anonimleşir.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Telafi planı
-- ---------------------------------------------------------------------
create table public.recovery_plans (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references public.students(profile_id) on delete cascade,
  academic_year_id text not null references public.academic_years(id),
  absence_start    date not null,
  absence_end      date not null,
  daily_goal       smallint not null check (daily_goal between 1 and 3),
  status           text not null default 'aktif' check (status in ('aktif', 'tamamlandi', 'arsiv')),
  closed_at        timestamptz,    -- plan aktif olmaktan çıkınca tetikleyici damgalar; saklama SK-03: +12 ay
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (absence_end >= absence_start)
);
create index recovery_plans_student_idx on public.recovery_plans (student_id, status);
create index recovery_plans_closed_idx on public.recovery_plans (closed_at) where closed_at is not null;
-- Öğrenci başına en çok BİR aktif plan: create_recovery_plan yeni plan açmadan önce eskisini 'arsiv'e almalıdır.
create unique index recovery_plans_tek_aktif on public.recovery_plans (student_id) where status = 'aktif';

comment on column public.recovery_plans.absence_start is
  'Nötr dil: "derslere ara verdiğin tarihler". Devamsızlık NEDENİ bilerek saklanmaz (plan 9.3). Dolaylı sağlık verisi riski: GÖNÜLLÜ bu tarihleri göremez (06: matched_student_plan_items).';

create table public.plan_items (
  id             uuid primary key default gen_random_uuid(),
  plan_id        uuid not null references public.recovery_plans(id) on delete cascade,
  topic_id       uuid not null references public.topics(id),
  seq            integer  not null check (seq > 0),
  status         text not null default 'bekliyor' check (status in ('bekliyor', 'tamamlandi', 'atlandi')),
  completed_at   timestamptz,
  completed_mode text check (completed_mode in ('kisa', 'tam')),
  unique (plan_id, seq),
  unique (plan_id, topic_id),
  check ((status = 'tamamlandi') = (completed_at is not null)),
  check ((status = 'tamamlandi') = (completed_mode is not null))
);
create index plan_items_topic_idx on public.plan_items (topic_id);

-- ---------------------------------------------------------------------
-- Soru-cevap
-- ---------------------------------------------------------------------
create table public.questions (
  id                    uuid primary key default gen_random_uuid(),
  student_id            uuid     not null references public.students(profile_id) on delete cascade,
  subject_id            smallint not null references public.subjects(id),
  grade                 smallint not null check (grade between 5 and 8),
  topic_id              uuid references public.topics(id) on delete set null,
  status                text not null default 'acik'
                        check (status in ('acik', 'atandi', 'havuzda', 'cevaplandi', 'kapandi')),
  assigned_volunteer_id uuid references public.volunteers(profile_id) on delete set null,
  assigned_at           timestamptz,       -- 24 saatlik havuza aktarma süresi buradan sayılır
  created_at            timestamptz not null default now(),
  first_answered_at     timestamptz,
  escalated_at          timestamptz,       -- havuza aktarıldığı an
  closed_at             timestamptz,       -- status = 'kapandi' olunca tetikleyici damgalar; saklama SK-05
  last_activity_at      timestamptz not null default now(),   -- son mesaj anı (tetikleyici günceller); saklama SK-05
  updated_at            timestamptz not null default now(),
  -- Kimsenin cevaplayamadığı soru olmasın: "atandi" ve "cevaplandi" durumlarında atanan gönüllü vardır.
  -- Atama kalkarsa (gönüllü silindi / engellendi) 05'teki tetikleyici durumu "havuzda"ya çevirir.
  constraint questions_atanan_gonullu_chk check (status not in ('atandi', 'cevaplandi') or assigned_volunteer_id is not null)
);
create index questions_student_idx on public.questions (student_id, created_at desc);           -- günlük soru sınırı + öğrenci listesi
create index questions_assigned_idx on public.questions (assigned_volunteer_id, status)
  where assigned_volunteer_id is not null;                                                       -- gönüllü panosu
create index questions_pool_idx on public.questions (subject_id, grade, created_at)
  where status = 'havuzda';                                                                       -- havuz listesi
create index questions_unanswered_idx on public.questions (assigned_at)
  where status = 'atandi';                                                                        -- cron: 24 saattir cevapsız
create index questions_retention_idx on public.questions (last_activity_at);                     -- cleanup: ek saklama süresi (SK-05)

create table public.question_messages (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  sender_id   uuid references public.profiles(id) on delete set null,
  kind        text not null check (kind in ('soru', 'cevap', 'takip')),
  body        text not null default '' check (char_length(body) <= 4000),   -- FİLTRELENMİŞ metin
  has_flag    boolean not null default false,                               -- filtreye takıldı mı
  hidden_at   timestamptz,                                                  -- yönetici gizledi
  hidden_by   uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index question_messages_question_idx on public.question_messages (question_id, created_at);
create index question_messages_flagged_idx on public.question_messages (created_at) where has_flag;
create index question_messages_sender_idx on public.question_messages (sender_id) where sender_id is not null;   -- hesap silinirken SET NULL taraması
-- Her sorunun yalnızca bir "soru" mesajı (ilk mesaj) olur.
create unique index question_messages_tek_soru on public.question_messages (question_id) where kind = 'soru';

comment on table public.question_messages is
  'DEĞİŞTİRİLEMEZ kayıt: istemci güncelleyemez/silemez; yalnızca yönetici hidden_at ile gizleyebilir (bkz. 05 tetikleyicisi).';

create table public.attachments (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid not null references public.question_messages(id) on delete cascade,
  storage_path text not null unique
               check (storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|m4a|aac|webm)$'),
  kind         text not null check (kind in ('foto', 'ses')),
  mime         text not null,
  size_bytes   integer not null check (size_bytes > 0),
  duration_sec smallint,
  purged_at    timestamptz,    -- cleanup, Storage nesnesini sildi (SK-05); satır kalır, arayüz "ek süresi doldu" der
  -- Fotoğraf: yalnızca JPEG, ≤ 2 MB. Ses: ≤ 3 MB ve ≤ 120 sn (plan 5.4).
  -- (Bucket tek bir boyut sınırı tanır: 3 MB; fotoğraf için 2 MB sınırı burada.)
  constraint attachments_foto_chk check (kind <> 'foto' or (mime = 'image/jpeg' and size_bytes <= 2097152 and duration_sec is null)),
  constraint attachments_ses_chk  check (kind <> 'ses'  or (mime in ('audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/webm')
                                         and size_bytes <= 3145728
                                         and duration_sec is not null and duration_sec between 1 and 120))
);
create index attachments_message_idx on public.attachments (message_id);

create table public.moderation_flags (
  id          uuid primary key default gen_random_uuid(),
  entity      text not null check (entity in ('mesaj', 'ders_notu', 'gorunen_ad')),   -- filtrenin çalıştığı alanlar
  entity_id   uuid not null,          -- çok biçimli referans; FK yok (kayıt anonim saklanabilsin diye)
  author_id   uuid references public.profiles(id) on delete set null,
  reasons     text[] not null check (cardinality(reasons) >= 1),
  original_body text,                 -- maskelenmemiş özgün metin: yalnızca yönetici görür
  original_body_purged_at timestamptz,  -- özgün metin silindi (SK-10)
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  action      text check (action in ('yok_sayildi', 'uyari', 'mesaj_gizlendi', 'askiya_alindi')),
  created_at  timestamptz not null default now()
);
create index moderation_flags_entity_idx on public.moderation_flags (entity, entity_id);
create index moderation_flags_author_idx on public.moderation_flags (author_id) where author_id is not null;     -- hesap silinirken SET NULL taraması
create index moderation_flags_open_idx on public.moderation_flags (created_at) where reviewed_at is null;
create index moderation_flags_purge_idx on public.moderation_flags (reviewed_at)
  where original_body is not null and original_body_purged_at is null;                -- cleanup (SK-10)

comment on table public.moderation_flags is
  'Yalnızca yönetici okur; kayıt yalnızca sistemden (mask_contact_info tetikleyicisi) eklenir. original_body kişisel veri içerebilir: işlem yapılmadıysa inceleme tarihinden 90 gün, işlem yapıldıysa bağlı bildirim süresince saklanır (saklama SK-10; original_body_purged_at).';

-- ---------------------------------------------------------------------
-- Uygunluk, eşleştirme, ders
-- ---------------------------------------------------------------------
-- weekday: ISO 1 = Pazartesi ... 7 = Pazar. Saatler yerel (Europe/Istanbul) duvar saati.
create table public.availability_slots (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,   -- gönüllü veya öğrenci
  weekday    smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time   time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Görüşmeler yalnızca 08:00-21:00 arasında yapılabilir (plan 9.2).
  check (start_time < end_time and start_time >= time '08:00' and end_time <= time '21:00'),
  unique (user_id, weekday, start_time)
);

create table public.matches (
  id                   uuid primary key default gen_random_uuid(),
  -- Öğrenci hesabı silinince satır SİLİNMEZ: öğrenci bağı kopar (SET NULL) ve satır anonimleşir
  -- (saklama SK-14; gönüllü güvenlik geçmişi için). O öğrencinin dersleri ise silinir (05: students_silinirken).
  student_id           uuid references public.students(profile_id) on delete set null,
  volunteer_id         uuid references public.volunteers(profile_id) on delete set null,
  subject_id           smallint not null references public.subjects(id),
  -- onerildi: yönetici önerdi, veli kararı bekleniyor
  -- veli_onayi: veli onayladı, başlamasını bekliyor
  -- aktif: devam ediyor
  -- bitti: sona erdi (veli reddi dahil; end_reason açıklar)
  status               text not null default 'onerildi'
                       check (status in ('onerildi', 'veli_onayi', 'aktif', 'bitti')),
  proposed_by          uuid references public.profiles(id) on delete set null,
  guardian_decision_at timestamptz,
  started_at           timestamptz,
  ended_at             timestamptz,
  -- Serbest metin DEĞİL, kod: gönüllü bu alanı görür; çocuktan/veliden gelen metin gönüllüye sızmasın.
  end_reason           text constraint matches_end_reason_chk check (end_reason is null or end_reason in (
                         'veli_reddetti', 'yonetici_sonlandirdi', 'gonullu_ayrildi', 'ogrenci_ayrildi', 'amac_tamamlandi',
                         'engellendi', 'riza_geri_cekildi', 'velisiz_kaldi', 'gonullu_hesabi_silindi', 'ogrenci_hesabi_silindi',
                         'guvenlik', 'diger')),
  anonymized_at        timestamptz,   -- kişi alanları boşaltıldı (SK-14: bitişten 2 yıl sonra ya da öğrenci silinince)
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (volunteer_id is not null or status = 'bitti'),   -- gönüllü hesabı silinince yalnızca biten kayıt kalabilir
  check (student_id is not null or status = 'bitti'),     -- öğrenci hesabı silinince yalnızca biten kayıt kalabilir
  check (status <> 'aktif' or started_at is not null),
  check (status <> 'bitti' or ended_at is not null)
);
-- Ders başına tek açık eşleşme: bir öğrencinin aynı dersi için aynı anda
-- yalnızca bir (önerilmiş / onaylanmış / aktif) eşleşme bulunabilir.
create unique index matches_tek_acik_eslesme on public.matches (student_id, subject_id)
  where status <> 'bitti';
create index matches_volunteer_idx on public.matches (volunteer_id, status) where volunteer_id is not null;
create index matches_student_idx on public.matches (student_id, status) where student_id is not null;
create index matches_retention_idx on public.matches (ended_at) where anonymized_at is null and ended_at is not null;  -- cleanup (SK-14)

create table public.sessions (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references public.matches(id) on delete cascade,
  starts_at    timestamptz not null,
  duration_min smallint not null check (duration_min in (20, 40)),   -- 20 dk = kısa ders, 40 dk = tam ders
  status       text not null default 'planlandi'
               check (status in ('planlandi', 'iptal', 'tamamlandi', 'gelinmedi')),
  room_name    uuid not null default gen_random_uuid() unique,       -- tahmin edilemez Jitsi oda adı
  booked_by    uuid references public.profiles(id) on delete set null,
  cancelled_by uuid references public.profiles(id) on delete set null,
  cancelled_at timestamptz,
  -- Serbest metin DEĞİL, kod (sağlık/özel durum bilgisi yazılamaz; gönüllü bu alanı görür).
  cancel_reason text constraint sessions_cancel_reason_chk check (cancel_reason is null or cancel_reason in (
                  'zaman_uygun_degil', 'teknik_sorun', 'eslesme_bitti', 'engellendi', 'yonetici_iptal', 'hesap_silindi', 'diger')),
  volunteer_note text check (volunteer_note is null or char_length(volunteer_note) <= 1000),  -- serbest metin: filtre tetikleyicisi uygulanacak
  topic_id     uuid references public.topics(id) on delete set null,
  reminder_24h_sent_at timestamptz,    -- pg_cron hatırlatmaları tekrar göndermesin diye
  reminder_15m_sent_at timestamptz,
  anonymized_at timestamptz,           -- ders notu / iptal gerekçesi / kişi alanları temizlendi (SK-08: dersten 1 yıl sonra)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (status <> 'iptal' or cancelled_at is not null),
  -- Saat penceresi (çocuk koruma kuralı, Europe/Istanbul): ders 08:00'den önce
  -- başlayamaz, 21:00'den sonra bitemez. book_session RPC'si de kontrol eder;
  -- bu kısıt, RPC hatasına karşı son savunmadır.
  constraint sessions_saat_araligi_chk check (
    (starts_at at time zone 'Europe/Istanbul')::time >= time '08:00'
    and (starts_at at time zone 'Europe/Istanbul')::time <= time '21:00' - (duration_min * interval '1 minute')
  )
);
create unique index sessions_ayni_anda_tek on public.sessions (match_id, starts_at) where status = 'planlandi';
create index sessions_match_idx on public.sessions (match_id, starts_at desc);
create index sessions_upcoming_idx on public.sessions (starts_at) where status = 'planlandi';   -- hatırlatma ve "gelinmedi" işi
create index sessions_retention_idx on public.sessions (starts_at) where anonymized_at is null;   -- cleanup (SK-08)

comment on column public.sessions.volunteer_note is
  'Gönüllünün ders sonrası notu. Öğrenci, veli ve yönetici de okur (sessions okuma politikası).';

create table public.session_events (
  id         bigint generated always as identity primary key,
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete set null,
  event      text not null check (event in ('katildi', 'ayrildi')),
  at         timestamptz not null default now()
);
create index session_events_session_idx on public.session_events (session_id, at);
create index session_events_user_idx on public.session_events (user_id) where user_id is not null;               -- hesap silinirken SET NULL taraması
comment on table public.session_events is
  'Görüşme meta kaydı (katıldı/ayrıldı). Video kaydı YOKTUR (plan 9.2).';

-- ---------------------------------------------------------------------
-- volunteer_blocks: "Gönüllüyü engelle" (Google Play: bire bir etkileşimde engelleme zorunlu)
-- Öğrenci veya veli bir gönüllüyü ENGELLEYEBİLİR. İşlem block_volunteer RPC'siyle yapılır
-- (eşleşmeyi bitirir, açık soruları serbest bırakır, yöneticiye bildirim üretir).
-- Bu tablo kalıcı izdir ve şunları sağlar:
--   * (öğrenci, gönüllü) çifti bir daha eşleştirilemez / soru atanamaz / havuzdan üstlenemez
--     (05'teki tetikleyiciler ve can_access_question bunu veritabanında zorlar),
--   * yönetici kuyruğu: reviewed_at IS NULL olanlar henüz incelenmedi,
--   * denetim kaydı (audit_log) otomatik yazılır.
-- ---------------------------------------------------------------------
create table public.volunteer_blocks (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.students(profile_id) on delete cascade,
  -- Gönüllü hesabı silinince engel kaydı SİLİNMEZ, gönüllü bağı boşalır (güvenlik geçmişi; yönetici incelemesi sürebilir).
  volunteer_id    uuid references public.volunteers(profile_id) on delete set null,
  match_id        uuid references public.matches(id) on delete set null,
  blocked_by      uuid references public.profiles(id) on delete set null,
  blocked_by_role text not null check (blocked_by_role in ('ogrenci', 'veli')),
  reason_code     text check (reason_code in
                    ('uygunsuz_davranis', 'rahatsiz_edici', 'platform_disi_iletisim', 'tercih_etmiyorum', 'diger')),
  created_at      timestamptz not null default now(),
  reviewed_by     uuid references public.profiles(id) on delete set null,
  reviewed_at     timestamptz,
  unique (student_id, volunteer_id)
);
create index volunteer_blocks_volunteer_idx on public.volunteer_blocks (volunteer_id);
create index volunteer_blocks_queue_idx on public.volunteer_blocks (created_at) where reviewed_at is null;

comment on table public.volunteer_blocks is
  'Öğrenci/veli engelleme kaydı. Serbest metin YOK (çocuktan gelen metin için ayrı filtre gerekir); neden kodlu. Gönüllü bu tabloyu göremez.';

-- ---------------------------------------------------------------------
-- Güvenlik ve sistem
-- ---------------------------------------------------------------------
create table public.reports (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid references public.profiles(id) on delete set null,
  target_type    text not null check (target_type in ('mesaj', 'soru', 'ders', 'kullanici')),
  target_id      uuid not null,        -- çok biçimli referans (FK yok)
  target_user_id uuid references public.profiles(id) on delete set null,
  category       text not null constraint reports_category_chk check (category in (
                   'uygunsuz_icerik', 'kisisel_bilgi_istendi', 'platform_disi_iletisim',
                   'taciz_zorbalik', 'yanlis_bilgi', 'diger')),
  description    text check (description is null or char_length(description) <= 1000),
  status         text not null default 'yeni' check (status in ('yeni', 'inceleniyor', 'kapandi')),
  handled_by     uuid references public.profiles(id) on delete set null,
  handled_at     timestamptz,
  action_taken   text check (action_taken is null or char_length(action_taken) <= 1000),
  closed_at      timestamptz,          -- status = 'kapandi' olunca tetikleyici damgalar; SK-11: kapanıştan 2 yıl sonra anonimleştirilir
  anonymized_at  timestamptz,          -- kişi alanları ve açıklama temizlendi
  created_at     timestamptz not null default now()
);
create index reports_queue_idx on public.reports (created_at) where status <> 'kapandi';
create index reports_reporter_idx on public.reports (reporter_id);
create index reports_target_user_idx on public.reports (target_user_id) where target_user_id is not null;
create index reports_retention_idx on public.reports (closed_at) where closed_at is not null and anonymized_at is null;  -- cleanup (SK-11)

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null check (type ~ '^[a-z][a-z0-9_]{1,49}$'),   -- ör. yeni_cevap, eslesme_onerildi (kapalı liste YOK)
  title      text not null check (char_length(title) between 1 and 120),
  body       text check (body is null or char_length(body) <= 500),
  data       jsonb not null default '{}'::jsonb
             check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 4096),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_created_idx on public.notifications (created_at);   -- cleanup: 90 günlük saklama (SK-20)

-- ---------------------------------------------------------------------
-- push_subscriptions: Web Push (RFC 8030/8291) tarayıcı abonelikleri  (eski device_tokens'ın yerine)
-- Bir kullanıcının birden çok tarayıcısı/cihazı olabilir. Satırı YALNIZCA register_push_subscription RPC'si
-- yazar (05); istemci kendi satırlarını okur ve siler. send-push Edge Function'ı (servis rolü) okur.
--   * endpoint SSRF'e karşı KISITLIDIR: yalnızca https:// ve bilinen push servisi alan adları
--     (Chrome/Edge/Opera/Samsung: fcm.googleapis.com · Firefox: updates.push.services.mozilla.com ·
--      Safari/iOS web uygulamaları: *.push.apple.com (Apple belgesi) · Edge/Windows: *.notify.windows.com).
--     Listeye yeni bir push servisi eklemek bir migration gerektirir (bilerek: send-push bu listenin DIŞINA istek atmaz).
--     Kullanıcı bilgisi (@), port (yalnızca :443), ters eğik çizgi, boşluk ve büyük harfli alan adı REDDEDİLİR.
--   * p256dh = 65 bayt P-256 açık anahtarı (base64url, 87 karakter); auth = 16 bayt gizli (base64url, 22 karakter).
--     İkisi de şifreleme anahtarıdır: yalnızca sahibi ve servis rolü okur, yönetici BİLE okumaz.
--   * HAM kullanıcı aracısı (User-Agent) SAKLANMAZ (hukuk: SK-17, veri en aza indirme). device_label İSTEĞE BAĞLI ve KABA bir
--     etikettir ("Chrome · Android", "Safari · iOS"): yalnızca harf, boşluk, nokta, tire ve " · " ayırıcısı; RAKAM, "/", "(", ";" yok
--     (sürüm numarası ya da ham UA dizgesi CHECK'e takılır). Kullanıcıya "şu cihazlarda bildirim alıyorsun" listesi göstermek içindir.
--   * SK-17: updated_at her açılışta tazelenir (register RPC'si); 60 gün tazelenmeyen abonelik cleanup ile silinir.
--     404/410 yanıtı alan abonelik send-push tarafından hemen silinir.
--   * Kullanıcı başına en çok 10 abonelik (register RPC'si en eskisini siler).
-- ---------------------------------------------------------------------
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null
             constraint push_subscriptions_endpoint_chk check (
               char_length(endpoint) <= 2048
               and endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9]([a-z0-9-]*[a-z0-9])?\.push\.apple\.com|[a-z0-9]([a-z0-9-]*[a-z0-9])?\.notify\.windows\.com)(:443)?/[]A-Za-z0-9._~:/?#[@!$&''()*+,;=%-]*$'),
  p256dh     text not null constraint push_subscriptions_p256dh_chk check (p256dh ~ '^[A-Za-z0-9_-]{87}$'),
  auth       text not null constraint push_subscriptions_auth_chk check (auth ~ '^[A-Za-z0-9_-]{22}$'),
  device_label text constraint push_subscriptions_device_label_chk check (
               device_label is null
               or (char_length(device_label) <= 40
                   and device_label ~ '^[A-Za-z][A-Za-z .-]{0,19}( · [A-Za-z][A-Za-z .-]{0,19})?$')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_endpoint_key unique (endpoint)
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);
create index push_subscriptions_updated_idx on public.push_subscriptions (updated_at);   -- cleanup: 60 gün tazelenmeyen abonelik (SK-17)

comment on table public.push_subscriptions is
  'Web Push abonelikleri. Yazma yalnızca register_push_subscription / remove_push_subscription RPC''leri; endpoint yalnızca bilinen push servisi alan adlarına izin verir (SSRF).';

-- audit_log: yönetici ve sistem işlemlerinin DEĞİŞTİRİLEMEZ kaydı.
-- details içine kişisel veri (mesaj metni, ad-soyad) YAZILMAZ; yalnızca kimlik ve eylem bilgisi.
create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles(id) on delete set null,   -- NULL: sistem / SQL / silinmiş kullanıcı
  action     text not null check (action ~ '^[a-z][a-z0-9_]{1,59}$'),
  entity     text not null check (char_length(entity) between 1 and 60),
  entity_id  text,
  details    jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);
create index audit_log_actor_idx on public.audit_log (actor_id) where actor_id is not null;

-- ---------------------------------------------------------------------
-- deleted_volunteer_links: silinen gönüllünün KİMLİK BAĞLANTISI (saklama SK-16)
-- Gönüllü hesabı silinince mesajları/eşleşmeleri "Ayrılan gönüllü" olarak kalır (sender_id / volunteer_id NULL olur).
-- Güvenlik incelemesi gerekirse "bu mesajı kim yazmıştı?" sorusunun cevabı 2 yıl boyunca YALNIZCA yöneticide bulunur.
-- volunteers BEFORE DELETE tetikleyicisi (05) doldurur; istemci yazamaz. Ad / e-posta TUTULMAZ:
-- yalnızca eski profil kimliği, varlık referansı ve (tuz tanımlıysa) tuzlu özet.
-- Süresi dolan satırları cleanup siler (servis rolü silebilir, değiştiremez).
-- ---------------------------------------------------------------------
create table public.deleted_volunteer_links (
  id                bigint generated always as identity primary key,
  former_profile_id uuid not null,                                  -- silinen gönüllünün eski kimliği (FK yok: profil artık yok)
  entity            text not null check (entity in ('question_messages', 'matches')),
  entity_id         uuid not null,                                  -- o gönüllünün yazdığı mesaj / eşleşme
  name_digest       text check (name_digest is null or name_digest ~ '^[0-9a-f]{64}$'),   -- tuzlu özet (tuz: app.kimlik_tuzu; backend)
  deleted_at        timestamptz not null default now(),
  expires_at        timestamptz not null default now() + interval '2 years'
);
create index deleted_volunteer_links_entity_idx on public.deleted_volunteer_links (entity, entity_id);
create index deleted_volunteer_links_former_idx on public.deleted_volunteer_links (former_profile_id);
create index deleted_volunteer_links_expiry_idx on public.deleted_volunteer_links (expires_at);
