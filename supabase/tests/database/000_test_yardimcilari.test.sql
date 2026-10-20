-- =====================================================================
-- 000 · TEST YARDIMCILARI  (diğer tüm test dosyalarından ÖNCE çalışır)
--
-- Bu dosya `tests` şemasında kalıcı yardımcı fonksiyonlar oluşturur
-- (yalnızca test veritabanında; üretimde ÇALIŞTIRILMAZ).
--
--   tests.id('veli_a')            -> o isim için sabit uuid
--   tests.login('veli_a')         -> bu kullanıcı olarak "authenticated" rolüne geç
--   tests.login('admin','aal2')   -> MFA'lı (aal2) oturum; JWT'nin amr dizisi "30 sn önce TOTP" içerir
--   tests.login('admin','aal2',50000) -> aynı, ama TOTP doğrulaması 50000 sn önce yapılmış (is_admin 12 saat ister)
--   tests.login_claims('admin', '{"aal":"aal2","amr":[]}') -> JWT içeriğini elle ver
--   tests.login_anon()            -> "anon" rolü (giriş yapmamış)
--   tests.logout()                -> test sahibine (postgres) dön
--   tests.cnt('select ...')       -> mevcut rolle satır say (RLS uygulanır)
--   tests.affected('update ...')  -> mevcut rolle çalıştır, etkilenen satır sayısı
--   tests.make_fixture()          -> ortak örnek veri (testin transaction'ında; rollback ile silinir)
--
-- Not: Bu dosya BEGIN/ROLLBACK içermez; fonksiyonlar kalıcı olsun diye.
-- =====================================================================

-- pgTAP yoksa kur (Supabase yerel veritabanında genellikle hazırdır; varsa bu satır bir şey yapmaz).
create extension if not exists pgtap with schema extensions;

-- auth.mfa_factors gerçek Supabase'te vardır; yoksa (taklit ortam) sütunları uyumlu basit bir tablo oluştur.
create table if not exists auth.mfa_factors (
  id            uuid primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  friendly_name text,
  factor_type   text not null,
  status        text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create schema if not exists tests;
grant usage on schema tests to anon, authenticated, service_role;

create or replace function tests.id(p_name text)
returns uuid
language sql
immutable
as $$
  select md5('egitim-koprusu-pgtap:' || p_name)::uuid;
$$;

create or replace function tests.logout()
returns void
language plpgsql
as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;

-- Supabase'in JWT'sindeki amr dizisi: [{"method": "...", "timestamp": <saniye>}]
create or replace function tests.amr(p_aal text, p_totp_age_sec int default 30)
returns jsonb
language sql
stable
as $$
  select case when p_aal = 'aal2' then
    jsonb_build_array(
      jsonb_build_object('method', 'password', 'timestamp', extract(epoch from now())::bigint - p_totp_age_sec - 60),
      jsonb_build_object('method', 'totp',     'timestamp', extract(epoch from now())::bigint - p_totp_age_sec))
  else
    jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', extract(epoch from now())::bigint))
  end;
$$;

create or replace function tests.login_claims(p_name text, p_claims jsonb)
returns void
language plpgsql
as $$
begin
  perform tests.logout();
  perform set_config('request.jwt.claims',
    (jsonb_build_object('sub', tests.id(p_name), 'role', 'authenticated') || p_claims)::text, true);
  perform set_config('request.jwt.claim.sub', tests.id(p_name)::text, true);
  set local role authenticated;
end;
$$;

create or replace function tests.login(p_name text, p_aal text default 'aal1', p_totp_age_sec int default 30)
returns void
language plpgsql
as $$
begin
  perform tests.login_claims(p_name, jsonb_build_object('aal', p_aal, 'amr', tests.amr(p_aal, p_totp_age_sec)));
end;
$$;

-- Veritabanında profili OLMAYAN bir kullanıcı olarak oturum (ör. silinmiş hesap)
create or replace function tests.login_uuid(p_user uuid, p_aal text default 'aal1')
returns void
language plpgsql
as $$
begin
  perform tests.logout();
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal, 'amr', tests.amr(p_aal))::text, true);
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  set local role authenticated;
end;
$$;

create or replace function tests.login_anon()
returns void
language plpgsql
as $$
begin
  perform tests.logout();
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
end;
$$;

-- Servis rolü (Edge Function'ların secret key ile çalıştığı rol)
create or replace function tests.login_service()
returns void
language plpgsql
as $$
begin
  perform tests.logout();
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  set local role service_role;
end;
$$;

-- Örnek verideki tüm kullanıcı kimlikleri (gerçek local veritabanındaki seed verisinden ayırt etmek için)
create or replace function tests.fixture_user_ids()
returns uuid[]
language sql
immutable
as $$
  select array[tests.id('admin'), tests.id('veli_a'), tests.id('veli_b'), tests.id('ogr_a1'), tests.id('ogr_a2'),
               tests.id('ogr_b1'), tests.id('gon_x'), tests.id('gon_y'), tests.id('gon_z'), tests.id('gon_s')];
$$;

-- Verilen örnek-veri adlarından (ör. 'q1','q2') mevcut rolün GÖREBİLDİKLERİNİ virgülle birleştirip döndürür.
--   tests.visible('public.questions', array['q1','q2','q3'])  ->  'q1,q3'
create or replace function tests.visible(p_table text, p_names text[], p_col text default 'id')
returns text
language plpgsql
as $$
declare
  r text;
begin
  execute format(
    'select coalesce(string_agg(n, '','' order by n), '''') from unnest($1) n
      where exists (select 1 from %s t where t.%I = tests.id(n))', p_table, p_col)
    into r using p_names;
  return r;
end;
$$;

create or replace function tests.cnt(p_sql text)
returns bigint
language plpgsql
as $$
declare
  n bigint;
begin
  execute format('select count(*) from (%s) q', p_sql) into n;
  return n;
end;
$$;

create or replace function tests.affected(p_sql text)
returns bigint
language plpgsql
as $$
declare
  n bigint;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Kayıt simülasyonu: auth.users'a satır ekler (handle_new_user tetikleyicisi çalışır).
--   p_user = istemcinin signUp(data: {...}) ile gönderdiği user_metadata (GÜVENİLMEZ)
--   p_app  = yalnızca servis rolünün yazabildiği app_metadata
create or replace function tests.signup(
  p_name  text,
  p_email text,
  p_user  jsonb default '{}'::jsonb,
  p_app   jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
as $$
begin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', tests.id(p_name), 'authenticated', 'authenticated',
          p_email, '', now(), '{"provider":"email"}'::jsonb || p_app, p_user, now(), now());
  return tests.id(p_name);
end;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Ortak örnek veri. Kimler var (hepsi sahte):
--
--   admin   : yönetici (SQL ile atanmış)
--   veli_a  : çocukları ogr_a1 (6. sınıf) ve ogr_a2 (7. sınıf)
--   veli_b  : çocuğu ogr_b1 (6. sınıf)
--   gon_x   : ONAYLI gönüllü, MAT 6-7; ogr_a1 ile MAT için AKTİF eşleşme;
--             ogr_a2 ile MAT eşleşmesi BİTMİŞ
--   gon_y   : ONAYLI gönüllü, MAT 6 + FEN 6; ogr_b1 ile FEN için yalnızca ÖNERİLMİŞ eşleşme
--   gon_z   : başvuru aşamasında gönüllü (onaysız)
--   gon_s   : onaylı ama hesabı ASKIDA gönüllü
--
--   q1: ogr_a1 MAT sorusu, gon_x'e atanmış (mesajlar: soru, cevap, gizlenmiş takip; 1 foto eki)
--   q2: ogr_b1 MAT 6 sorusu, HAVUZDA
--   q3: ogr_a2 FEN 7 sorusu, HAVUZDA
--   q4: ogr_a1 FEN 6 sorusu, gon_y'ye atanmış (eşleşme yok)
-- ---------------------------------------------------------------------
create or replace function tests.make_fixture()
returns void
language plpgsql
as $fx$
declare
  v_mat smallint := (select id from public.subjects where code = 'MAT');
  v_fen smallint := (select id from public.subjects where code = 'FEN');
  v_tomorrow_10 timestamptz :=
    (date_trunc('day', now() at time zone 'utc') + interval '31 hours') at time zone 'utc';  -- yarın 07:00 UTC = 10:00 İstanbul
begin
  -- Kullanıcılar: auth.users INSERT -> handle_new_user -> profiles
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  select '00000000-0000-0000-0000-000000000000', tests.id(v.n), 'authenticated', 'authenticated',
         v.e, '', now(), v.app, v.usr, now(), now()
  from (values
    ('admin',  'yonetici@pgtap.test',      '{"provider":"email"}'::jsonb,           '{"role":"veli","display_name":"Yonetici"}'::jsonb),
    ('veli_a', 'veli.a@pgtap.test',        '{"provider":"email"}'::jsonb,           '{"role":"veli","display_name":"Veli A"}'::jsonb),
    ('veli_b', 'veli.b@pgtap.test',        '{"provider":"email"}'::jsonb,           '{"role":"veli","display_name":"Veli B"}'::jsonb),
    ('ogr_a1', 'ogr.a1@ogrenci.pgtap.test', '{"provider":"email","role":"ogrenci"}'::jsonb, '{"display_name":"Mavi Kus"}'::jsonb),
    ('ogr_a2', 'ogr.a2@ogrenci.pgtap.test', '{"provider":"email","role":"ogrenci"}'::jsonb, '{"display_name":"Yesil Elma"}'::jsonb),
    ('ogr_b1', 'ogr.b1@ogrenci.pgtap.test', '{"provider":"email","role":"ogrenci"}'::jsonb, '{"display_name":"Kirmizi Balik"}'::jsonb),
    ('gon_x',  'x@uni.pgtap.edu.tr',       '{"provider":"email"}'::jsonb,           '{"role":"gonullu","display_name":"Gonullu X"}'::jsonb),
    ('gon_y',  'y@uni.pgtap.edu.tr',       '{"provider":"email"}'::jsonb,           '{"role":"gonullu","display_name":"Gonullu Y"}'::jsonb),
    ('gon_z',  'z@uni.pgtap.edu.tr',       '{"provider":"email"}'::jsonb,           '{"role":"gonullu","display_name":"Gonullu Z"}'::jsonb),
    ('gon_s',  's@uni.pgtap.edu.tr',       '{"provider":"email"}'::jsonb,           '{"role":"gonullu","display_name":"Gonullu S"}'::jsonb)
  ) as v(n, e, app, usr);

  -- Yönetici: doğrulanmış TOTP faktörü olmadan grant_admin reddedilir
  insert into auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at)
  values (tests.id('mfa_admin'), tests.id('admin'), 'totp', 'verified', now(), now());
  perform private.grant_admin('yonetici@pgtap.test');

  -- Öğrenciler ve veli bağlantıları
  insert into public.students (profile_id, grade, username) values
    (tests.id('ogr_a1'), 6, 'pgtap_a1'),
    (tests.id('ogr_a2'), 7, 'pgtap_a2'),
    (tests.id('ogr_b1'), 6, 'pgtap_b1');
  insert into public.guardian_students (guardian_id, student_id, relation) values
    (tests.id('veli_a'), tests.id('ogr_a1'), 'anne'),
    (tests.id('veli_a'), tests.id('ogr_a2'), 'anne'),
    (tests.id('veli_b'), tests.id('ogr_b1'), 'baba');

  -- Gönüllüler
  insert into public.volunteers (profile_id, given_name, family_name, university, department, class_year, status, approved_at) values
    (tests.id('gon_x'), 'Gizliad', 'Soyadx', 'Test Universitesi', 'Matematik', 3, 'onayli',  now()),
    (tests.id('gon_y'), 'Gizliad', 'Soyady', 'Test Universitesi', 'Fizik',     4, 'onayli',  now()),
    (tests.id('gon_z'), 'Gizliad', 'Soyadz', 'Test Universitesi', 'Kimya',     2, 'basvuru', null),
    (tests.id('gon_s'), 'Gizliad', 'Soyads', 'Test Universitesi', 'Biyoloji',  2, 'onayli',  now());
  insert into public.volunteer_subjects (volunteer_id, subject_id, grade) values
    (tests.id('gon_x'), v_mat, 6), (tests.id('gon_x'), v_mat, 7),
    (tests.id('gon_y'), v_mat, 6), (tests.id('gon_y'), v_fen, 6),
    (tests.id('gon_s'), v_mat, 6);
  update public.profiles set status = 'askida' where id = tests.id('gon_s');

  -- Eşleşmeler
  insert into public.matches (id, student_id, volunteer_id, subject_id, status, started_at, ended_at, end_reason) values
    (tests.id('m1'), tests.id('ogr_a1'), tests.id('gon_x'), v_mat, 'aktif',  now() - interval '10 days', null, null),
    (tests.id('m2'), tests.id('ogr_b1'), tests.id('gon_y'), v_fen, 'onerildi', null, null, null),
    (tests.id('m3'), tests.id('ogr_a2'), tests.id('gon_x'), v_mat, 'bitti',  now() - interval '40 days', now() - interval '20 days', 'amac_tamamlandi');

  -- Sorular ve mesajlar
  insert into public.questions (id, student_id, subject_id, grade, status, assigned_volunteer_id, assigned_at) values
    (tests.id('q1'), tests.id('ogr_a1'), v_mat, 6, 'atandi',  tests.id('gon_x'), now()),
    (tests.id('q2'), tests.id('ogr_b1'), v_mat, 6, 'havuzda', null, null),
    (tests.id('q3'), tests.id('ogr_a2'), v_fen, 7, 'havuzda', null, null),
    (tests.id('q4'), tests.id('ogr_a1'), v_fen, 6, 'atandi',  tests.id('gon_y'), now());
  insert into public.question_messages (id, question_id, sender_id, kind, body, hidden_at) values
    (tests.id('msg1'), tests.id('q1'), tests.id('ogr_a1'), 'soru',  'Kesirleri nasil toplariz?', null),
    (tests.id('msg2'), tests.id('q1'), tests.id('gon_x'),  'cevap', 'Paydalari esitle.', null),
    (tests.id('msg3'), tests.id('q1'), tests.id('ogr_a1'), 'takip', 'GIZLENMIS MESAJ', now()),
    (tests.id('msg4'), tests.id('q2'), tests.id('ogr_b1'), 'soru',  'Havuz sorusu', null),
    (tests.id('msg5'), tests.id('q3'), tests.id('ogr_a2'), 'soru',  'Baska havuz sorusu', null),
    (tests.id('msg6'), tests.id('q4'), tests.id('ogr_a1'), 'soru',  'Fen sorusu', null);
  insert into public.attachments (id, message_id, storage_path, kind, mime, size_bytes) values
    (tests.id('att1'), tests.id('msg1'),
     tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('file1')::text || '.jpg',
     'foto', 'image/jpeg', 150000);
  insert into public.moderation_flags (entity, entity_id, author_id, reasons, original_body) values
    ('mesaj', tests.id('msg2'), tests.id('gon_x'), array['telefon'], 'ORIJINAL METIN');

  -- Telafi planı
  insert into public.academic_years (id, starts_on, ends_on) values ('2098-2099', '2098-09-07', '2099-06-20');
  insert into public.academic_weeks (academic_year_id, week_no, starts_on, ends_on, is_break) values
    ('2098-2099', 1, '2098-09-07', '2098-09-13', false),
    ('2098-2099', 2, '2098-09-14', '2098-09-20', false),
    ('2098-2099', 3, '2098-09-21', '2098-09-27', true);
  insert into public.curriculum_versions (id, code, name, subject_id, grade) values
    (tests.id('cv_mat6'), 'PGTAP-MAT-6', 'PGTAP Matematik 6', v_mat, 6),
    (tests.id('cv_fen6'), 'PGTAP-FEN-6', 'PGTAP Fen 6',       v_fen, 6);
  insert into public.units (id, curriculum_version_id, seq, title) values
    (tests.id('u_mat6'), tests.id('cv_mat6'), 1, 'PGTAP unite 1'),
    (tests.id('u_fen6'), tests.id('cv_fen6'), 1, 'PGTAP unite 1');
  insert into public.topics (id, unit_id, seq, code, title) values
    (tests.id('t_mat6'), tests.id('u_mat6'), 1, 'PGTAP-MAT6-K1', 'PGTAP kesirler'),
    (tests.id('t_fen6'), tests.id('u_fen6'), 1, 'PGTAP-FEN6-K1', 'PGTAP hucre');
  insert into public.resources (topic_id, kind, title, url, is_active) values
    (tests.id('t_mat6'), 'baglanti', 'PGTAP aktif kaynak',  'https://example.org/aktif', true),
    (tests.id('t_mat6'), 'baglanti', 'PGTAP pasif kaynak',  'https://example.org/pasif', false);
  insert into public.recovery_plans (id, student_id, academic_year_id, absence_start, absence_end, daily_goal) values
    (tests.id('plan1'), tests.id('ogr_a1'), '2098-2099', '2098-09-07', '2098-09-20', 2);
  insert into public.plan_items (id, plan_id, topic_id, seq) values
    (tests.id('pi1'), tests.id('plan1'), tests.id('t_mat6'), 1),
    (tests.id('pi2'), tests.id('plan1'), tests.id('t_fen6'), 2);

  -- Dersler
  insert into public.sessions (id, match_id, starts_at, duration_min, volunteer_note, booked_by) values
    (tests.id('s1'), tests.id('m1'), v_tomorrow_10, 40, 'Ilk ders notu', tests.id('veli_a'));
  insert into public.session_events (session_id, user_id, event) values
    (tests.id('s1'), tests.id('gon_x'), 'katildi');

  -- Uygunluk
  insert into public.availability_slots (id, user_id, weekday, start_time, end_time) values
    (tests.id('slot_a1'), tests.id('ogr_a1'), 1, '16:00', '18:00'),
    (tests.id('slot_b1'), tests.id('ogr_b1'), 2, '16:00', '18:00'),
    (tests.id('slot_x'),  tests.id('gon_x'),  1, '17:00', '19:00'),
    (tests.id('slot_z'),  tests.id('gon_z'),  3, '17:00', '19:00');

  -- Hukuki metin sürümleri: her rıza türü için v1, v2, v9 (dün yayımlanmış). Özet değerleri sahte.
  insert into public.legal_documents (doc_type, version, sha256, published_at, url)
  select ct.code, v.ver, md5('pgtap-' || ct.code || v.ver) || md5(v.ver || ct.code || 'x'),
         now() - interval '1 day', 'https://example.org/' || ct.code || '/' || v.ver
  from public.consent_types ct cross join (values ('v1'), ('v2'), ('v9')) v(ver);

  -- Rıza, belge, quiz
  insert into public.consents (id, user_id, student_id, type, doc_version, granted) values
    (tests.id('c_veli_a'), tests.id('veli_a'), tests.id('ogr_a1'), 'acik_riza_dolayli_saglik', 'v1', true),
    (tests.id('c_veli_b'), tests.id('veli_b'), tests.id('ogr_b1'), 'acik_riza_dolayli_saglik', 'v1', true),
    (tests.id('c_gon_x'),  tests.id('gon_x'),  null, 'gonullu_taahhut', 'v1', true);
  insert into public.volunteer_documents (id, volunteer_id, storage_path) values
    (tests.id('doc_z'), tests.id('gon_z'), tests.id('gon_z')::text || '/' || tests.id('docfile_z')::text || '.pdf'),
    (tests.id('doc_x'), tests.id('gon_x'), tests.id('gon_x')::text || '/' || tests.id('docfile_x')::text || '.pdf');
  insert into public.training_questions (id, seq, body, options) values
    (tests.id('tq1'), 9001, 'PGTAP quiz sorusu', '["A","B","C"]'::jsonb);
  insert into public.training_answer_keys (question_id, correct_option) values (tests.id('tq1'), 1);
  insert into public.training_attempts (volunteer_id, score, passed) values
    (tests.id('gon_x'), 90, true), (tests.id('gon_z'), 40, false);

  -- Bildirim, cihaz, bildirimler (report)
  insert into public.notifications (id, user_id, type, title) values
    (tests.id('n_veli_a'), tests.id('veli_a'), 'yeni_cevap', 'Veli A bildirimi'),
    (tests.id('n_ogr_a1'), tests.id('ogr_a1'), 'yeni_cevap', 'Ogrenci A1 bildirimi'),
    (tests.id('n_gon_x'),  tests.id('gon_x'),  'yeni_soru',  'Gonullu X bildirimi'),
    (tests.id('n_admin'),  tests.id('admin'),  'yeni_rapor', 'Yonetici bildirimi');
  -- Web Push abonelikleri (anahtar uzunlukları RFC 8291: p256dh 87, auth 22 base64url karakter)
  insert into public.push_subscriptions (id, user_id, endpoint, p256dh, auth) values
    (tests.id('ps_veli_a'), tests.id('veli_a'), 'https://fcm.googleapis.com/fcm/send/veli-a-aaaaaaaaaaaaaaaaaaaaaaaa', repeat('A', 87), repeat('a', 22)),
    (tests.id('ps_gon_x'),  tests.id('gon_x'),  'https://updates.push.services.mozilla.com/wpush/v2/gon-x-xxxxxxxxxxxx', repeat('X', 87), repeat('x', 22));
  insert into public.reports (id, reporter_id, target_type, target_id, category) values
    (tests.id('r_veli_a'), tests.id('veli_a'), 'mesaj', tests.id('msg2'), 'diger'),
    (tests.id('r_gon_x'),  tests.id('gon_x'),  'kullanici', tests.id('ogr_a1'), 'diger');
end;
$fx$;

-- Test dosyasının kendisi (pg_prove her dosyada TAP çıktısı bekler)
select plan(2);
select has_function('tests', 'make_fixture', 'test yardımcıları kuruldu');
select ok(tests.id('veli_a') = tests.id('veli_a') and tests.id('veli_a') <> tests.id('veli_b'), 'tests.id deterministik ve ayırt edici');
select * from finish();
