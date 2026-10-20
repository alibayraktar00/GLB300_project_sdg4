-- =====================================================================
-- 02 · MÜFREDAT VE İÇERİK TABLOLARI  (plan 5.1 "Müfredat ve içerik")
--
-- Tüm tablolar "herkese açık bilgi" niteliğindedir (kişisel veri yok);
-- okuma politikaları 06_rls_politikalari.sql içindedir. Yazma yalnızca
-- migration / seed ile yapılır (içerik ekibi CSV'leri
-- supabase/seed/curriculum/ altında hazırlar).
--
-- Durum/tür değerleri için enum yerine CHECK kullanıyoruz (gerekçe
-- docs/veri-modeli.md): değer eklemek tek satırlık ALTER TABLE'dır,
-- geri alınabilir ve migration içinde güvenle kullanılabilir.
-- =====================================================================

-- ---------------------------------------------------------------------
-- subjects: dersler (MAT, FEN). Referans veri olduğu için burada eklenir.
-- ---------------------------------------------------------------------
create table public.subjects (
  id    smallint generated always as identity primary key,
  code  text not null unique check (code ~ '^[A-Z]{2,6}$'),
  name  text not null check (char_length(name) between 1 and 60)
);
comment on table public.subjects is 'Dersler. MVP: MAT ve FEN.';

insert into public.subjects (code, name) values
  ('MAT', 'Matematik'),
  ('FEN', 'Fen Bilimleri');

-- ---------------------------------------------------------------------
-- academic_years / academic_weeks: öğretim yılı ve haftalar
-- ---------------------------------------------------------------------
create table public.academic_years (
  id         text primary key check (id ~ '^[0-9]{4}-[0-9]{4}$'),   -- ör. '2026-2027'
  starts_on  date not null,
  ends_on    date not null,
  created_at timestamptz not null default now(),
  check (ends_on > starts_on)
);
comment on table public.academic_years is 'Öğretim yılı. id örneği: 2026-2027.';

create table public.academic_weeks (
  academic_year_id text     not null references public.academic_years(id) on delete cascade,
  week_no          smallint not null check (week_no between 1 and 53),
  starts_on        date     not null,
  ends_on          date     not null,
  is_break         boolean  not null default false,   -- ara tatil, yarıyıl tatili vb.
  note             text     check (note is null or char_length(note) <= 200),
  primary key (academic_year_id, week_no),
  unique (academic_year_id, starts_on),
  check (ends_on >= starts_on)
);
comment on column public.academic_weeks.is_break is
  'Tatil haftası: konu atanmaz, telafi planında atlanır.';

-- ---------------------------------------------------------------------
-- curriculum_versions: program sürümü (Maarif geçişi bu yapıyla çözülür)
-- ---------------------------------------------------------------------
create table public.curriculum_versions (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (code ~ '^[A-Za-z0-9_.-]{2,40}$'),  -- CSV'lerde kararlı anahtar, ör. TYMM-MAT-5
  name       text not null check (char_length(name) between 1 and 120),      -- ör. 'TYMM Matematik 5'
  subject_id smallint not null references public.subjects(id),
  grade      smallint not null check (grade between 5 and 8),
  source_url text check (source_url is null or source_url ~ '^https://[^[:space:]]+$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, subject_id, grade)   -- grade_programs için bileşik FK hedefi
);
create index curriculum_versions_subject_idx on public.curriculum_versions (subject_id);

-- grade_programs: hangi yıl, hangi sınıf+ders için hangi program geçerli.
-- Bileşik FK, programın ders/sınıfının satırla tutarlı olmasını DB seviyesinde zorlar.
create table public.grade_programs (
  academic_year_id      text     not null references public.academic_years(id) on delete cascade,
  grade                 smallint not null check (grade between 5 and 8),
  subject_id            smallint not null,
  curriculum_version_id uuid     not null,
  primary key (academic_year_id, grade, subject_id),
  foreign key (curriculum_version_id, subject_id, grade)
    references public.curriculum_versions (id, subject_id, grade)
);
create index grade_programs_version_idx on public.grade_programs (curriculum_version_id);

-- ---------------------------------------------------------------------
-- units / topics
-- ---------------------------------------------------------------------
create table public.units (
  id                    uuid primary key default gen_random_uuid(),
  curriculum_version_id uuid     not null references public.curriculum_versions(id) on delete cascade,
  seq                   smallint not null check (seq > 0),
  title                 text     not null check (char_length(title) between 1 and 200),
  unique (curriculum_version_id, seq) deferrable initially deferred   -- CSV içe aktarmada sıra numaraları aynı işlemde yer değiştirebilsin
);

create table public.topics (
  id              uuid primary key default gen_random_uuid(),
  unit_id         uuid     not null references public.units(id) on delete cascade,
  seq             smallint not null check (seq > 0),
  code            text     not null unique check (code ~ '^[A-Za-z0-9_.-]{2,60}$'),  -- CSV'lerde kararlı anahtar
  title           text     not null check (char_length(title) between 1 and 200),
  outcome_code    text     check (outcome_code is null or char_length(outcome_code) <= 40),  -- kazanım kodu
  summary_md      text     check (summary_md is null or char_length(summary_md) <= 20000),
  mini_review_md  text     check (mini_review_md is null or char_length(mini_review_md) <= 5000), -- "5 dakika" modu
  est_minutes     smallint check (est_minutes is null or est_minutes between 1 and 240),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (unit_id, seq) deferrable initially deferred
);
comment on column public.topics.code is
  'İçerik ekibinin verdiği kararlı kısa kod (ör. TYMM-MAT-5-U1-K2). CSV içe aktarmada yeniden yükleme (upsert) anahtarıdır.';

-- ---------------------------------------------------------------------
-- weekly_topics: "haftalık konu tablosu" (seed)
-- Bir haftada bir dersin birden fazla konusu olabilir (seq).
-- ---------------------------------------------------------------------
create table public.weekly_topics (
  academic_year_id text     not null,
  grade            smallint not null check (grade between 5 and 8),
  subject_id       smallint not null references public.subjects(id),
  week_no          smallint not null,
  topic_id         uuid     not null references public.topics(id) on delete cascade,
  seq              smallint not null default 1 check (seq > 0),
  primary key (academic_year_id, grade, subject_id, week_no, seq),
  unique (academic_year_id, grade, subject_id, week_no, topic_id),
  foreign key (academic_year_id, week_no)
    references public.academic_weeks (academic_year_id, week_no) on delete cascade
);
create index weekly_topics_topic_idx on public.weekly_topics (topic_id);

-- ---------------------------------------------------------------------
-- resources: konu başına dış kaynak (EBA, OGM Materyal...) ve özetler
-- Telif: içerik kopyalanmaz, yalnızca bağlantı verilir (plan 1).
-- ---------------------------------------------------------------------
create table public.resources (
  id              uuid primary key default gen_random_uuid(),
  topic_id        uuid not null references public.topics(id) on delete cascade,
  kind            text not null check (kind in ('baglanti', 'ozet', 'pdf')),
  title           text not null check (char_length(title) between 1 and 200),
  url             text check (url is null or url ~ '^https://[^[:space:]]+$'),   -- yalnızca https
  storage_path    text check (storage_path is null or char_length(storage_path) <= 300),
  provider        text check (provider is null or char_length(provider) <= 80),   -- EBA, OGM Materyal...
  mode            text not null default 'ikisi' check (mode in ('kisa', 'tam', 'ikisi')),
  est_minutes     smallint check (est_minutes is null or est_minutes between 1 and 240),
  requires_login  boolean not null default false,   -- EBA girişi gerekiyor mu
  offline_ok      boolean not null default false,
  last_checked_at timestamptz,                      -- bağlantı son ne zaman kontrol edildi
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (topic_id, title),
  check (not (url is not null and storage_path is not null)),
  check (kind <> 'baglanti' or url is not null),
  check (kind <> 'pdf' or url is not null or storage_path is not null)
);
create index resources_active_idx on public.resources (topic_id) where is_active;
comment on column public.resources.storage_path is
  'Aşama 2 (PDF barındırma) için ayrıldı; MVP''de yalnızca bağlantı kullanılır.';

-- ---------------------------------------------------------------------
-- Tutarlılık: haftalık konu satırı, konunun ait olduğu program sürümüyle
-- (ders + sınıf) uyumlu olmalı, o yıl için grade_programs'ın GÖSTERDİĞİ program sürümünden gelmeli
-- (örn. 8. sınıf eski programdaysa TYMM konusu yazılamaz) ve tatil haftasına konu atanmamalı.
-- Bileşik FK ile ifade edilemediği için tetikleyici kullanıyoruz.
-- ---------------------------------------------------------------------
create or replace function private.check_weekly_topic()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cv      uuid;
  v_subject smallint;
  v_grade   smallint;
  v_break   boolean;
begin
  select cv.id, cv.subject_id, cv.grade
    into v_cv, v_subject, v_grade
  from public.topics t
  join public.units u on u.id = t.unit_id
  join public.curriculum_versions cv on cv.id = u.curriculum_version_id
  where t.id = new.topic_id;

  if v_subject is distinct from new.subject_id or v_grade is distinct from new.grade then
    raise exception 'weekly_topics: konunun dersi/sınıfı satırla uyuşmuyor (konu: ders %, sınıf %)', v_subject, v_grade
      using errcode = '23514';
  end if;

  if not exists (
       select 1 from public.grade_programs gp
       where gp.academic_year_id = new.academic_year_id
         and gp.grade = new.grade
         and gp.subject_id = new.subject_id
         and gp.curriculum_version_id = v_cv) then
    raise exception 'weekly_topics: konu, % yılı için grade_programs''ta tanımlı program sürümünden gelmiyor (veya program tanımsız)', new.academic_year_id
      using errcode = '23514';
  end if;

  select w.is_break into v_break
  from public.academic_weeks w
  where w.academic_year_id = new.academic_year_id and w.week_no = new.week_no;

  if v_break then
    raise exception 'weekly_topics: % yılı % . hafta tatil olarak işaretli, konu atanamaz', new.academic_year_id, new.week_no
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger weekly_topics_tutarlilik
  before insert or update on public.weekly_topics
  for each row execute function private.check_weekly_topic();

-- updated_at tetikleyicileri
create trigger curriculum_versions_set_updated_at before update on public.curriculum_versions
  for each row execute function private.set_updated_at();
create trigger topics_set_updated_at before update on public.topics
  for each row execute function private.set_updated_at();
create trigger resources_set_updated_at before update on public.resources
  for each row execute function private.set_updated_at();
