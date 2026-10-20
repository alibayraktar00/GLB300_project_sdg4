-- =====================================================================
-- 03 · KİMLİK, ROLLER, RIZA, GÖNÜLLÜ BAŞVURUSU  (plan 5.1 "Kimlik ve roller")
--
-- Önemli ilkeler (plan 9.1, 9.2, 9.3):
--  * Öğrencinin soyadı, okulu, doğum tarihi, telefonu, sağlık bilgisi YOK.
--  * profiles.role / status istemciden değiştirilemez (bkz. 05 ve 06).
--  * Kullanıcı silinince (auth.users) kişisel veriler zincirleme silinir;
--    güvenlik kayıtları (reports, audit_log, moderation_flags) ise
--    kullanıcı bağı koparılarak (SET NULL) anonim olarak kalır.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles: auth.users ile 1-1
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null check (role in ('ogrenci', 'veli', 'gonullu', 'yonetici')),
  display_name text not null
               check (char_length(display_name) between 1 and 40
                      and display_name = btrim(display_name)
                      and display_name !~ '@'),          -- e-posta benzeri görünen ad olmasın
  status       text not null default 'aktif' check (status in ('aktif', 'beklemede', 'askida')),
  last_seen_at timestamptz not null default now(),   -- hareketsiz hesap temizliği (saklama SK-01/02); istemci yazamaz, backend günceller
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index profiles_role_status_idx on public.profiles (role, status);
create index profiles_last_seen_idx on public.profiles (last_seen_at);

comment on table public.profiles is
  'Her auth.users için bir satır. Öğrencide display_name = rumuz. role ve status istemciden değiştirilemez.';
comment on column public.profiles.status is
  'aktif: normal. askida: askıya alındı (verilere erişim kapanır). beklemede: ileride kullanılmak üzere ayrıldı; aktif sayılmaz.';

-- ---------------------------------------------------------------------
-- students: yalnızca veli tarafından açılır (Edge Function: create-child-account)
-- ---------------------------------------------------------------------
create table public.students (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  grade      smallint not null check (grade between 5 and 8),
  username   text not null unique check (username ~ '^[a-z0-9][a-z0-9._-]{2,29}$'),   -- küçük harf, 3-30 karakter
  prefs      jsonb not null default '{}'::jsonb
             check (jsonb_typeof(prefs) = 'object' and octet_length(prefs::text) <= 2048),  -- yazı boyutu, kontrast, hafif mod
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.students is
  'Öğrenci bilgileri. Bilerek YOK: soyad, okul, doğum tarihi, telefon, sağlık/engel bilgisi (veri minimizasyonu).';

-- ---------------------------------------------------------------------
-- guardian_students: veli <-> öğrenci (N-N; en çok iki veli)
-- ---------------------------------------------------------------------
create table public.guardian_students (
  guardian_id uuid not null references public.profiles(id) on delete cascade,
  student_id  uuid not null references public.students(profile_id) on delete cascade,
  relation    text not null default 'diger' check (relation in ('anne', 'baba', 'vasi', 'diger')),
  created_at  timestamptz not null default now(),
  primary key (guardian_id, student_id)
);
create index guardian_students_student_idx on public.guardian_students (student_id);

-- ---------------------------------------------------------------------
-- legal_documents: yayımlanmış hukuki metinlerin sürüm kaydı
-- (aydınlatma, açık rıza, kullanım koşulları, gizlilik politikası...)
-- Herkes okur (kayıttan ÖNCE de gösterilir); yazma YALNIZCA migration ile.
-- Bir rıza kaydı yalnızca burada yayımlanmış (doc_type, version) için açılabilir
-- ve o anki sha256 değeri rıza satırına kopyalanır (kanıt).
-- doc_type: rıza gerektiren metinlerde consent_types.code ile aynıdır;
-- rızası olmayan metinler (ör. gizlilik_politikasi) de buraya yazılabilir.
-- ---------------------------------------------------------------------
create table public.legal_documents (
  doc_type     text not null check (doc_type ~ '^[a-z][a-z0-9_]{2,59}$'),
  version      text not null check (char_length(version) between 1 and 40),    -- ör. 'v1.0'
  sha256       text not null check (sha256 ~ '^[0-9a-f]{64}$'),                -- yayımlanan metnin SHA-256 özeti (küçük harf hex)
  published_at timestamptz not null,                                           -- gelecekteki tarih = henüz yayında değil
  url          text check (url is null or url ~ '^https://[^[:space:]]+$'),
  body_md      text check (body_md is null or char_length(body_md) <= 200000),
  created_at   timestamptz not null default now(),
  primary key (doc_type, version),
  check (url is not null or body_md is not null)                               -- bağlantı veya metin, en az biri
);
create index legal_documents_latest_idx on public.legal_documents (doc_type, published_at desc);

comment on table public.legal_documents is
  'Hukuki metin sürümleri. Yazma yalnızca migration ile (yeni sürüm = yeni satır; eski satır değiştirilmez). En güncel sürüm: published_at <= now() olanlar içinde en yenisi.';

-- ---------------------------------------------------------------------
-- consent_types / consents: rıza kanıtı
-- Rıza türleri bir arama tablosunda tutulur. Yeni tür eklemek =
-- tek INSERT (şema değişikliği yok).
--   audiences       : türü hangi roller verebilir
--   student_scoped  : true ise kayıt belirli bir çocuk için açılmalıdır (student_id zorunlu),
--                     ör. açık rıza HER ÇOCUK için ayrı alınır
--   withdrawal_suspends_student : true ise, çocuğa ait SON geçerli kaydın geri çekilmesi çocuk hesabını
--                     "beklemede"ye alır, açık eşleşmeleri bitirir (05: consents_askiya_al). Hizmetin
--                     dayandığı rıza (AR-1) için true; isteğe bağlı rızalar için false.
-- ---------------------------------------------------------------------
create table public.consent_types (
  code           text primary key check (code ~ '^[a-z][a-z0-9_]{2,59}$'),
  audiences      text[] not null
                 check (cardinality(audiences) >= 1 and audiences <@ array['veli', 'gonullu', 'ogrenci']::text[]),
  student_scoped boolean not null default false,
  withdrawal_suspends_student boolean not null default false
                 check (not withdrawal_suspends_student or student_scoped),   -- çocuk bazlı olmayan rıza çocuk hesabını askıya alamaz
  description    text not null check (char_length(description) <= 300),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);
comment on table public.consent_types is
  'Geçerli rıza/onay türleri. Yeni tür: INSERT INTO consent_types ... (şema değişikliği gerekmez).';

insert into public.consent_types (code, audiences, student_scoped, withdrawal_suspends_student, description) values
  ('aydinlatma_veli',           '{veli}',          false, false, 'Veli aydınlatma metninin okunduğunun teyidi'),
  ('kullanim_kosullari',        '{veli,gonullu}',  false, false, 'Kullanım koşullarının kabulü'),
  ('acik_riza_dolayli_saglik',  '{veli}',          true,  true,  'AR-1: çocuğun sağlık durumuna dolaylı işaret edebilecek verilerin işlenmesine açık rıza (her çocuk için ayrı; geri çekilince çocuk hesabı askıya alınır)'),
  ('aydinlatma_gonullu',        '{gonullu}',       false, false, 'Gönüllü aydınlatma metninin okunduğunun teyidi'),
  ('gonullu_davranis_kurallari','{gonullu}',       false, false, 'Gönüllü davranış kurallarının kabulü'),
  ('gonullu_taahhut',           '{gonullu}',       false, false, 'Gönüllü taahhütnamesi'),
  ('cocuk_bilgilendirme',       '{ogrenci}',       false, false, 'Çocuğa yönelik sade bilgilendirmenin okunduğunun teyidi (Anladım)'),
  ('cocuk_guvenlik_hatirlatma', '{ogrenci}',       false, false, 'Çocuğa çevrimiçi güvenlik hatırlatması gösterildiğinin kaydı (Anladım)');

create table public.consents (
  id           uuid primary key default gen_random_uuid(),
  -- Hesap silinince kişi bağı kopar (SET NULL) ama rıza KANITI kalır (saklama SK-15: 10 yıl).
  -- Kalan asgari kanıt: tür, sürüm, özet değeri, zaman damgaları, tuzlu e-posta özeti (subject_hash).
  user_id      uuid references public.profiles(id) on delete set null,
  student_id   uuid references public.students(profile_id) on delete set null,   -- rıza belirli bir çocukla ilgiliyse
  type         text not null references public.consent_types(code),
  doc_version  text not null,
  doc_sha256   text not null check (doc_sha256 ~ '^[0-9a-f]{64}$'),  -- legal_documents'tan sunucu kopyalar; istemci yazamaz
  granted      boolean not null,           -- false = "açık rıza vermiyorum" seçimi de KAYDEDİLİR
  accepted_at  timestamptz not null default now(),   -- seçimin yapıldığı an (sunucu zamanı)
  withdrawn_at timestamptz,
  withdrawn_by uuid references public.profiles(id) on delete set null,   -- geri alan kişi (kaydı veren veli ya da çocuğun diğer velisi)
  channel      text check (channel in ('android', 'ios', 'web')),
  app_version  text check (app_version is null or char_length(app_version) <= 40),
  subject_hash text check (subject_hash is null or char_length(subject_hash) between 32 and 128),  -- tuzlu e-posta özeti; tuzu BACKEND üretir/yazar
  foreign key (type, doc_version) references public.legal_documents (doc_type, version),
  check (withdrawn_at is null or withdrawn_at >= accepted_at),
  check (granted or withdrawn_at is null)    -- "vermiyorum" kaydı geri alınmaz
);
create index consents_user_idx on public.consents (user_id, type);
create index consents_student_idx on public.consents (student_id, type) where student_id is not null;
create index consents_subject_hash_idx on public.consents (subject_hash) where subject_hash is not null;

comment on table public.consents is
  'Rıza kanıtı: hangi sürüm/özet, verildi mi, ne zaman, hangi kanal. Silinmez; geri çekme withdrawn_at ile. Aynı tür/sürüm için birden çok satır olabilir (red sonra kabul); geçerlilik = en yeni granted=true ve withdrawn_at IS NULL satırı.';
comment on column public.consents.subject_hash is
  'Hesap silindikten sonra kanıtı kişiye (talep halinde) bağlamak için tuzlu e-posta özeti. Tuz yalnızca backend''dedir; anonim DEĞİL takma addır (saklama-ve-imha.md §5).';

-- ---------------------------------------------------------------------
-- student_features: veli özellik anahtarları (Google Play Families: yetişkin,
-- çocuk için sosyal özellikleri açıp kapatabilmeli). Çocuk BAŞINA; yalnızca
-- o çocuğun velisi değiştirebilir (RLS). Kapalı özellik veritabanında da
-- zorlanır (bkz. 05 tetikleyicileri): soru açılamaz, sesli ek eklenemez,
-- ders planlanamaz.
-- ---------------------------------------------------------------------
create table public.student_features (
  student_id    uuid primary key references public.students(profile_id) on delete cascade,
  qa_enabled    boolean not null default true,    -- soru-cevap
  voice_enabled boolean not null default true,    -- sesli ek (ses kaydı): kapalıysa bu öğrencinin sorularına HİÇBİR kullanıcı ses eki ekleyemez
  video_enabled boolean not null default true,    -- görüntülü ders
  updated_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.student_features is
  'Çocuk başına özellik anahtarları. Satır, öğrenci oluşturulunca otomatik açılır (varsayılan: hepsi açık; eşleşme ve ders yine veli onayına bağlıdır).';

-- ---------------------------------------------------------------------
-- volunteers: gönüllü başvurusu ve onay durumu
-- ---------------------------------------------------------------------
create table public.volunteers (
  profile_id         uuid primary key references public.profiles(id) on delete cascade,
  -- Ad iki ayrı sütundadır: kısa ad = given_name + soyadın baş harfi ("Ad S."), çift soyadlar sorun olmaz.
  -- Yalnızca harf, tek boşluk, kesme ve tire (rakam, @, :, /, bölünemez boşluk reddedilir): bu alanlar
  -- çocuğa ve veliye gösterilir, serbest metin filtresine (mask_contact_info) güvenilmez.
  given_name         text not null constraint volunteers_given_name_chk
                     check (char_length(given_name) between 1 and 60 and private.is_safe_name(given_name)),
  family_name        text not null constraint volunteers_family_name_chk
                     check (char_length(family_name) between 1 and 60 and private.is_safe_name(family_name)),
  university         text not null constraint volunteers_university_chk
                     check (char_length(university) between 2 and 120 and private.is_safe_name(university)),
  department         text constraint volunteers_department_chk
                     check (department is null or (char_length(department) between 2 and 120 and private.is_safe_name(department))),
  class_year         smallint check (class_year is null or class_year between 1 and 8),
  status             text not null default 'basvuru'
                     check (status in ('basvuru', 'egitim', 'inceleme', 'onayli', 'reddedildi', 'askida')),
  training_passed_at timestamptz,
  approved_by        uuid references public.profiles(id) on delete set null,
  approved_at        timestamptz,
  reject_reason      text check (reject_reason is null or char_length(reject_reason) <= 500),
  max_students       smallint not null default 3 check (max_students between 1 and 10),
  decided_at         timestamptz,   -- onay/ret kararının anı (tetikleyici damgalar); saklama SK-06/SK-07 buradan sayılır
  left_at            timestamptz,   -- gönüllü platformdan ayrıldı (ayrılış akışı yazar); SK-07: ayrılıştan 2 yıl
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (status <> 'onayli' or approved_at is not null),
  check (status <> 'reddedildi' or reject_reason is not null)
);
create index volunteers_status_idx on public.volunteers (status);
create index volunteers_decided_idx on public.volunteers (decided_at) where decided_at is not null;
create index volunteers_left_idx on public.volunteers (left_at) where left_at is not null;

comment on table public.volunteers is
  'given_name + family_name (tam ad) yalnızca gönüllünün kendisi ve yöneticiye görünür. Öğrenci "Ad S." biçiminde kısa adı; veli buna ek olarak üniversite ve bölümü görür (matched_volunteers_for_student / _for_guardian görünümleri). Onaydan sonra profil alanları kilitlidir (06: volunteers_update_own).';

-- volunteer_documents: öğrenci belgesi dosyası (saklama SK-06).
--   Karar verilmişse: karar anından en çok 30 gün sonra silinir.
--   Karar verilmemişse: yüklemeden 60 gün sonra silinir.
-- purge_after'ı sunucu tetikleyicileri yazar (05): istemci değiştiremez.
-- cleanup fonksiyonu (servis rolü) süresi dolanların Storage nesnesini siler ve purged_at'i doldurur.
create table public.volunteer_documents (
  id           uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.volunteers(profile_id) on delete cascade,
  storage_path text not null unique
               check (storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg)$'
                  and starts_with(storage_path, volunteer_id::text || '/')),
  uploaded_at  timestamptz not null default now(),
  reviewed_at  timestamptz,   -- karar anında tetikleyici damgalar
  reviewed_by  uuid references public.profiles(id) on delete set null,
  purge_after  timestamptz,   -- yükleme + 60 gün; karar verilince min(mevcut, karar + 30 gün)
  purged_at    timestamptz    -- cleanup, dosyayı Storage'tan sildikten sonra doldurur
);
create index volunteer_documents_volunteer_idx on public.volunteer_documents (volunteer_id);
create index volunteer_documents_purge_idx on public.volunteer_documents (purge_after)
  where purged_at is null and purge_after is not null;

comment on column public.volunteer_documents.purge_after is
  'Silinme zamanı: yüklemeden 60 gün (karar yoksa) ya da karardan 30 gün (hangisi önceyse). Tetikleyiciler yazar (05).';

create table public.volunteer_subjects (
  volunteer_id uuid     not null references public.volunteers(profile_id) on delete cascade,
  subject_id   smallint not null references public.subjects(id),
  grade        smallint not null check (grade between 5 and 8),
  primary key (volunteer_id, subject_id, grade)
);
create index volunteer_subjects_lookup_idx on public.volunteer_subjects (subject_id, grade);

-- ---------------------------------------------------------------------
-- Gönüllü eğitimi quiz'i
-- Doğru cevaplar AYRI tabloda: training_questions gönüllülere okunabilir,
-- training_answer_keys yalnızca yöneticiye (puanlama RPC'si içinde okunur).
-- Böylece "select *" ile bile cevap anahtarı sızamaz.
-- ---------------------------------------------------------------------
create table public.training_questions (
  id         uuid primary key default gen_random_uuid(),
  seq        smallint not null unique check (seq > 0),
  body       text not null check (char_length(body) between 1 and 1000),
  options    jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.training_answer_keys (
  question_id    uuid primary key references public.training_questions(id) on delete cascade,
  correct_option smallint not null check (correct_option between 0 and 5),   -- options dizisindeki sıfır tabanlı indeks
  explanation    text check (explanation is null or char_length(explanation) <= 1000)
);

create table public.training_attempts (
  id           uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.volunteers(profile_id) on delete cascade,
  score        smallint not null check (score between 0 and 100),   -- yüzde; eşik (%80) RPC'de
  passed       boolean not null,
  created_at   timestamptz not null default now()
);
create index training_attempts_volunteer_idx on public.training_attempts (volunteer_id, created_at desc);
