-- =====================================================================
-- seed.sql · YALNIZCA YEREL GELİŞTİRME / DEMO için SAHTE veri
--
-- * `supabase db reset` boş veritabanına migration'lardan sonra bunu çalıştırır
--   (config.toml [db.seed]). ÜRETİME GÖNDERİLMEZ (`db push` varsayılan olarak seed çalıştırmaz).
-- * Gerçek kişi, gerçek e-posta, gerçek çocuk verisi İÇERMEZ. Tüm adlar uydurmadır.
-- * Güvenlik kilidi (private.assert_seed_allowed): veritabanında bu dosyanın 9 örnek adresi dışında
--   kullanıcı varsa VEYA app.ortam = 'uzak' işaretliyse DURUR. Hosted (uzak) projelerde bu işaret bir kez konur:
--     alter database postgres set "app.ortam" = 'uzak';
--   `supabase db reset --linked` YALNIZCA `--no-seed` ile çalıştırılmalıdır (bkz. docs/veri-modeli.md).
-- * Bu dosya yönetici hesabı OLUŞTURMAZ, yönetici ROLÜ VERMEZ ve gönüllü ONAYLAMAZ (bilinen parolalı bir yönetici ya da
--   onaylı gönüllü hosted projeye sızarsa felaket olurdu). Yerelde gerekirse elle çalıştırılır:
--   seed/yerel/yonetici.sql, seed/yerel/onayli_gonullu_ve_eslesme.sql.
-- * DEVOPS KONTROL LİSTESİ: her uzak (hosted) projeyi açar açmaz  alter database postgres set "app.ortam" = 'uzak';  çalıştırın.
--   Bu işaret yokken seed BOŞ bir uzak veritabanında çalışırdı (kilit yalnızca "örnek olmayan kullanıcı" ya da işaret arar).
-- * Hepsinin yerel giriş parolası: Test1234!   (yalnızca yerel; kimseyle paylaşılan bir sır değildir)
--
-- Giriş yapabilen sahte hesaplar (e-posta -> rol):
--   yonetici@ornek.test            başlangıçta "veli" rolünde; yönetici yapmak için seed/yerel/yonetici.sql (TOTP kaydından SONRA)
--   veli1@ornek.test               Ayşe (veli)   çocukları: Mavi Kuş (6. sınıf), Yeşil Elma (7. sınıf)
--   veli2@ornek.test               Mehmet (veli) çocuğu: Turuncu Bulut (5. sınıf)
--   mavikus@ogrenci.ornek.test     öğrenci Mavi Kuş    (kullanıcı adı: mavikus)
--   yesilelma@ogrenci.ornek.test   öğrenci Yeşil Elma  (kullanıcı adı: yesilelma)
--   turuncubulut@ogrenci.ornek.test öğrenci Turuncu Bulut (kullanıcı adı: turuncubulut)
--   gonullu1@ornek-universite.edu.tr  gönüllü, "basvuru" durumunda (MAT 6-7 dersleri seçili)
--   gonullu2@ornek-universite.edu.tr  gönüllü, "basvuru" durumunda (FEN 6 dersi seçili)
--   gonullu3@ornek-universite.edu.tr  gönüllü, "basvuru" durumunda (FEN 5 dersi seçili)
--
-- BU DOSYA HİÇBİR GÖNÜLLÜYÜ ONAYLAMAZ ve eşleşme / gönüllü cevabı OLUŞTURMAZ (güvenlik yeniden denetimi O4):
-- bilinen parolalı ("Test1234!") bir hesabın çocuk verisine erişen ONAYLI gönüllü olması, seed yanlışlıkla uzak
-- projede çalışırsa çocuk verisini tehlikeye atardı. Onay ve eşleşme adımları yalnızca YEREL ortamda, elle çalıştırılan
-- seed/yerel/onayli_gonullu_ve_eslesme.sql içindedir (kendi kilidiyle).
--
-- NOT: Öğrenci e-postaları gerçekte Edge Function'ın ürettiği sentetik adrestir; backend
-- ajanı kullanıcı adı -> e-posta eşlemesini kesinleştirince bu dosyadaki adresler güncellenmelidir.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0) Güvenlik kilidi: gerçek kullanıcı varsa seed çalışmaz
-- ---------------------------------------------------------------------
select private.assert_seed_allowed();

-- ---------------------------------------------------------------------
-- 1) Hukuki metin sürümleri (DEV YER TUTUCU: özet değerleri gerçek metne ait değildir)
-- ---------------------------------------------------------------------
insert into public.legal_documents (doc_type, version, sha256, published_at, body_md)
select t.doc_type, 'v0.1-ornek',
       encode(extensions.digest('ORNEK:' || t.doc_type || ':v0.1-ornek', 'sha256'), 'hex'),
       now() - interval '1 day',
       'ÖRNEK METİN: ' || t.doc_type || ' (geliştirme yer tutucusu; gerçek metin docs/hukuk altındaki taslaklardan hazırlanır).'
from (
  select code as doc_type from public.consent_types
  union select 'gizlilik_politikasi'
  union select 'cerez'          -- rıza türü DEĞİL: yalnızca yayımlanan bilgilendirme metni (/cerezler)
) t
on conflict (doc_type, version) do nothing;

-- ---------------------------------------------------------------------
-- 2) Kullanıcılar (auth.users -> handle_new_user -> profiles)
--    Veli/gönüllü: user_metadata.role (istemci yolu). Öğrenci: app_metadata.role (Edge Function yolu).
-- ---------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('Test1234!', extensions.gen_salt('bf')), now(),
  u.app_meta, u.user_meta, now(), now(),
  '', '', '', '', '', '', '', ''
from (values
  ('d0000000-0000-4000-8000-000000000001'::uuid, 'yonetici@ornek.test',
     '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"veli","display_name":"Yonetici"}'::jsonb),
  ('d0000000-0000-4000-8000-000000000002'::uuid, 'veli1@ornek.test',
     '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"veli","display_name":"Ayşe"}'::jsonb),
  ('d0000000-0000-4000-8000-000000000003'::uuid, 'veli2@ornek.test',
     '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"veli","display_name":"Mehmet"}'::jsonb),
  ('d0000000-0000-4000-8000-000000000011'::uuid, 'mavikus@ogrenci.ornek.test',
     '{"provider":"email","providers":["email"],"role":"ogrenci"}'::jsonb, '{"display_name":"Mavi Kuş"}'::jsonb),
  ('d0000000-0000-4000-8000-000000000012'::uuid, 'yesilelma@ogrenci.ornek.test',
     '{"provider":"email","providers":["email"],"role":"ogrenci"}'::jsonb, '{"display_name":"Yeşil Elma"}'::jsonb),
  ('d0000000-0000-4000-8000-000000000013'::uuid, 'turuncubulut@ogrenci.ornek.test',
     '{"provider":"email","providers":["email"],"role":"ogrenci"}'::jsonb, '{"display_name":"Turuncu Bulut"}'::jsonb),
  ('d0000000-0000-4000-8000-000000000021'::uuid, 'gonullu1@ornek-universite.edu.tr',
     '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"gonullu","display_name":"Zeynep"}'::jsonb),
  ('d0000000-0000-4000-8000-000000000022'::uuid, 'gonullu2@ornek-universite.edu.tr',
     '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"gonullu","display_name":"Can"}'::jsonb),
  ('d0000000-0000-4000-8000-000000000023'::uuid, 'gonullu3@ornek-universite.edu.tr',
     '{"provider":"email","providers":["email"]}'::jsonb, '{"role":"gonullu","display_name":"Deniz"}'::jsonb)
) as u(id, email, app_meta, user_meta)
on conflict (id) do nothing;

-- E-posta/parola ile giriş için kimlik kaydı (GoTrue "identities")
insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
       'email', now(), now(), now()
from auth.users u
where not exists (select 1 from auth.identities i where i.user_id = u.id);

-- ---------------------------------------------------------------------
-- 3) Öğrenciler, veli bağlantıları
-- ---------------------------------------------------------------------
-- students.prefs KULLANILMAZ (görünüm tercihleri tarayıcıda tutulur, sunucuya gitmez; plan 5.5 Ş3): sütun varsayılan kalır.
insert into public.students (profile_id, grade, username) values
  ('d0000000-0000-4000-8000-000000000011', 6, 'mavikus'),
  ('d0000000-0000-4000-8000-000000000012', 7, 'yesilelma'),
  ('d0000000-0000-4000-8000-000000000013', 5, 'turuncubulut')
on conflict do nothing;

insert into public.guardian_students (guardian_id, student_id, relation) values
  ('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000011', 'anne'),
  ('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000012', 'anne'),
  ('d0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000013', 'baba')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 4) Gönüllüler
-- ---------------------------------------------------------------------
-- HEPSİ "basvuru" durumunda (onay: seed/yerel/onayli_gonullu_ve_eslesme.sql, yalnızca yerel).
insert into public.volunteers (profile_id, given_name, family_name, university, department, class_year, status) values
  ('d0000000-0000-4000-8000-000000000021', 'Zeynep', 'Kaya',  'Örnek Üniversitesi', 'Matematik Öğretmenliği', 3, 'basvuru'),
  ('d0000000-0000-4000-8000-000000000022', 'Can',    'Öz',    'Örnek Üniversitesi', 'Fen Bilgisi Öğretmenliği', 4, 'basvuru'),
  ('d0000000-0000-4000-8000-000000000023', 'Deniz',  'Aksoy', 'Örnek Üniversitesi', 'Kimya', 2, 'basvuru')
on conflict do nothing;

insert into public.volunteer_subjects (volunteer_id, subject_id, grade)
select v.id, s.id, v.grade
from (values
  ('d0000000-0000-4000-8000-000000000021'::uuid, 'MAT', 6::smallint),
  ('d0000000-0000-4000-8000-000000000021'::uuid, 'MAT', 7::smallint),
  ('d0000000-0000-4000-8000-000000000022'::uuid, 'FEN', 6::smallint),
  ('d0000000-0000-4000-8000-000000000023'::uuid, 'FEN', 5::smallint)
) v(id, code, grade)
join public.subjects s on s.code = v.code
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 5) Rıza kayıtları (granted = true)
-- ---------------------------------------------------------------------
insert into public.consents (user_id, student_id, type, doc_version, granted, channel, app_version)
select c.user_id, c.student_id, c.type, 'v0.1-ornek', true, 'web', 'seed'
from (values
  ('d0000000-0000-4000-8000-000000000002'::uuid, null::uuid, 'aydinlatma_veli'),
  ('d0000000-0000-4000-8000-000000000002'::uuid, null, 'kullanim_kosullari'),
  ('d0000000-0000-4000-8000-000000000002'::uuid, 'd0000000-0000-4000-8000-000000000011', 'acik_riza_dolayli_saglik'),
  ('d0000000-0000-4000-8000-000000000002'::uuid, 'd0000000-0000-4000-8000-000000000012', 'acik_riza_dolayli_saglik'),
  ('d0000000-0000-4000-8000-000000000003'::uuid, null, 'aydinlatma_veli'),
  ('d0000000-0000-4000-8000-000000000003'::uuid, null, 'kullanim_kosullari'),
  ('d0000000-0000-4000-8000-000000000003'::uuid, 'd0000000-0000-4000-8000-000000000013', 'acik_riza_dolayli_saglik'),
  ('d0000000-0000-4000-8000-000000000011'::uuid, null, 'cocuk_bilgilendirme'),
  ('d0000000-0000-4000-8000-000000000021'::uuid, null, 'aydinlatma_gonullu'),
  ('d0000000-0000-4000-8000-000000000021'::uuid, null, 'kullanim_kosullari'),
  ('d0000000-0000-4000-8000-000000000021'::uuid, null, 'gonullu_davranis_kurallari'),
  ('d0000000-0000-4000-8000-000000000021'::uuid, null, 'gonullu_taahhut'),
  ('d0000000-0000-4000-8000-000000000022'::uuid, null, 'aydinlatma_gonullu'),
  ('d0000000-0000-4000-8000-000000000022'::uuid, null, 'gonullu_taahhut')
) c(user_id, student_id, type)
where not exists (select 1 from public.consents x where x.user_id = c.user_id and x.type = c.type
                    and x.student_id is not distinct from c.student_id);

-- ---------------------------------------------------------------------
-- 6) Eğitim quiz'i (3 örnek soru + cevap anahtarı)
-- ---------------------------------------------------------------------
insert into public.training_questions (id, seq, body, options) values
  ('d0000000-0000-4000-8000-0000000000a1', 1, 'ÖRNEK: Öğrenci sana telefon numarasını verirse ne yaparsın?',
     '["Numarayı kaydeder, platform dışında yazışırım", "Kibarca reddeder, iletişimin platform içinde kalması gerektiğini söylerim", "Hiçbir şey demem"]'),
  ('d0000000-0000-4000-8000-0000000000a2', 2, 'ÖRNEK: Öğrencinin neden derslere ara verdiğini sormalı mısın?',
     '["Evet, bilmem gerekir", "Hayır, sağlık veya özel durum sorulmaz", "Veliye sorarım"]'),
  ('d0000000-0000-4000-8000-0000000000a3', 3, 'ÖRNEK: Bir öğrencinin davranışından endişe edersen?',
     '["Uygulamadaki Bildir düğmesini kullanırım", "Sosyal medyadan öğrenciye yazarım", "Görmezden gelirim"]')
on conflict do nothing;
insert into public.training_answer_keys (question_id, correct_option, explanation) values
  ('d0000000-0000-4000-8000-0000000000a1', 1, 'İletişim yalnızca platform içinde kalır.'),
  ('d0000000-0000-4000-8000-0000000000a2', 1, 'Sağlık bilgisi sorulmaz ve toplanmaz.'),
  ('d0000000-0000-4000-8000-0000000000a3', 0, 'Endişeler Bildir düğmesiyle yöneticilere iletilir.')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 7) ÖRNEK müfredat (yalnızca müfredat tabloları BOŞSA eklenir; gerçek içerik CSV'lerden gelir)
--    Başlıkların başındaki "ÖRNEK" gerçek içerik olmadığını gösterir.
-- ---------------------------------------------------------------------
do $$
declare
  v_mat smallint := (select id from public.subjects where code = 'MAT');
  v_fen smallint := (select id from public.subjects where code = 'FEN');
begin
  if exists (select 1 from public.academic_years) or exists (select 1 from public.topics) then
    raise notice 'seed: müfredat tabloları boş değil; ÖRNEK müfredat atlandı.';
    return;
  end if;

  insert into public.academic_years (id, starts_on, ends_on) values ('2026-2027', '2026-09-07', '2027-06-25');
  insert into public.academic_weeks (academic_year_id, week_no, starts_on, ends_on, is_break, note) values
    ('2026-2027', 1, '2026-09-07', '2026-09-13', false, null),
    ('2026-2027', 2, '2026-09-14', '2026-09-20', false, null),
    ('2026-2027', 3, '2026-09-21', '2026-09-27', false, null),
    ('2026-2027', 4, '2026-09-28', '2026-10-04', true,  'ÖRNEK tatil haftası'),
    ('2026-2027', 5, '2026-10-05', '2026-10-11', false, null),
    ('2026-2027', 6, '2026-10-12', '2026-10-18', false, 'ÖRNEK: bu haftanın konu bilgisi yok');

  insert into public.curriculum_versions (id, code, name, subject_id, grade, source_url) values
    ('d0000000-0000-4000-8000-0000000000c1', 'ORNEK-MAT-6', 'ÖRNEK Matematik 6', v_mat, 6, 'https://example.org/ornek-mat-6'),
    ('d0000000-0000-4000-8000-0000000000c2', 'ORNEK-FEN-6', 'ÖRNEK Fen Bilimleri 6', v_fen, 6, 'https://example.org/ornek-fen-6');
  insert into public.grade_programs (academic_year_id, grade, subject_id, curriculum_version_id) values
    ('2026-2027', 6, v_mat, 'd0000000-0000-4000-8000-0000000000c1'),
    ('2026-2027', 6, v_fen, 'd0000000-0000-4000-8000-0000000000c2');

  insert into public.units (id, curriculum_version_id, seq, title) values
    ('d0000000-0000-4000-8000-0000000000d1', 'd0000000-0000-4000-8000-0000000000c1', 1, 'ÖRNEK Ünite 1: Doğal Sayılar'),
    ('d0000000-0000-4000-8000-0000000000d2', 'd0000000-0000-4000-8000-0000000000c1', 2, 'ÖRNEK Ünite 2: Kesirler'),
    ('d0000000-0000-4000-8000-0000000000d3', 'd0000000-0000-4000-8000-0000000000c2', 1, 'ÖRNEK Ünite 1: Güneş Sistemi');

  insert into public.topics (id, unit_id, seq, code, title, outcome_code, summary_md, mini_review_md, est_minutes) values
    ('d0000000-0000-4000-8000-0000000000e1', 'd0000000-0000-4000-8000-0000000000d1', 1, 'ORNEK-MAT6-K1', 'ÖRNEK Doğal sayılarla işlemler', 'ÖRNEK.1.1',
       '**ÖRNEK özet.** Gerçek içerik içerik ekibi tarafından hazırlanır.', 'ÖRNEK 5 dakikalık tekrar.', 20),
    ('d0000000-0000-4000-8000-0000000000e2', 'd0000000-0000-4000-8000-0000000000d1', 2, 'ORNEK-MAT6-K2', 'ÖRNEK Çarpanlar ve katlar', 'ÖRNEK.1.2',
       '**ÖRNEK özet.**', 'ÖRNEK 5 dakikalık tekrar.', 20),
    ('d0000000-0000-4000-8000-0000000000e3', 'd0000000-0000-4000-8000-0000000000d2', 1, 'ORNEK-MAT6-K3', 'ÖRNEK Kesirlerle toplama', 'ÖRNEK.2.1',
       '**ÖRNEK özet.**', 'ÖRNEK 5 dakikalık tekrar.', 25),
    ('d0000000-0000-4000-8000-0000000000e4', 'd0000000-0000-4000-8000-0000000000d2', 2, 'ORNEK-MAT6-K4', 'ÖRNEK Kesirlerle çıkarma', 'ÖRNEK.2.2',
       '**ÖRNEK özet.**', 'ÖRNEK 5 dakikalık tekrar.', 25),
    ('d0000000-0000-4000-8000-0000000000e5', 'd0000000-0000-4000-8000-0000000000d3', 1, 'ORNEK-FEN6-K1', 'ÖRNEK Güneş ve Ay', 'ÖRNEK.F.1',
       '**ÖRNEK özet.**', 'ÖRNEK 5 dakikalık tekrar.', 20),
    ('d0000000-0000-4000-8000-0000000000e6', 'd0000000-0000-4000-8000-0000000000d3', 2, 'ORNEK-FEN6-K2', 'ÖRNEK Gezegenler', 'ÖRNEK.F.2',
       '**ÖRNEK özet.**', 'ÖRNEK 5 dakikalık tekrar.', 20);

  insert into public.weekly_topics (academic_year_id, grade, subject_id, week_no, topic_id, seq) values
    ('2026-2027', 6, v_mat, 1, 'd0000000-0000-4000-8000-0000000000e1', 1),
    ('2026-2027', 6, v_fen, 1, 'd0000000-0000-4000-8000-0000000000e5', 1),
    ('2026-2027', 6, v_mat, 2, 'd0000000-0000-4000-8000-0000000000e2', 1),
    ('2026-2027', 6, v_fen, 2, 'd0000000-0000-4000-8000-0000000000e6', 1),
    ('2026-2027', 6, v_mat, 3, 'd0000000-0000-4000-8000-0000000000e3', 1),
    ('2026-2027', 6, v_mat, 5, 'd0000000-0000-4000-8000-0000000000e4', 1);

  insert into public.resources (topic_id, kind, title, url, provider, mode, est_minutes, requires_login, offline_ok, last_checked_at)
  select t.id, 'baglanti', 'ÖRNEK EBA kaynağı: ' || t.title, 'https://example.org/eba/' || t.code, 'EBA', 'ikisi', 15, true, false, now()
  from public.topics t where t.code like 'ORNEK-%';
  insert into public.resources (topic_id, kind, title, provider, mode, est_minutes, offline_ok)
  select t.id, 'ozet', 'ÖRNEK kısa özet: ' || t.title, 'Eğitim Köprüsü', 'kisa', 5, true
  from public.topics t where t.code like 'ORNEK-%';
end $$;

-- ---------------------------------------------------------------------
-- 8) Uygunluk saatleri (eşleşme ve ders kayıtları BİLEREK yok: seed/yerel/onayli_gonullu_ve_eslesme.sql)
-- ---------------------------------------------------------------------
insert into public.availability_slots (user_id, weekday, start_time, end_time)
select * from (values
  ('d0000000-0000-4000-8000-000000000011'::uuid, 1::smallint, time '16:00', time '18:00'),
  ('d0000000-0000-4000-8000-000000000011'::uuid, 3::smallint, time '16:00', time '18:00'),
  ('d0000000-0000-4000-8000-000000000021'::uuid, 1::smallint, time '15:00', time '19:00'),
  ('d0000000-0000-4000-8000-000000000021'::uuid, 3::smallint, time '17:00', time '20:00'),
  ('d0000000-0000-4000-8000-000000000022'::uuid, 2::smallint, time '16:00', time '19:00')
) v(user_id, weekday, start_time, end_time)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 9) Telafi planı (örnek müfredat varsa) — create_recovery_plan RPC'si yazılınca bu blok gereksiz olur
-- ---------------------------------------------------------------------
do $$
begin
  if exists (select 1 from public.topics where code = 'ORNEK-MAT6-K1')
     and not exists (select 1 from public.recovery_plans where id = 'd0000000-0000-4000-8000-0000000000b1') then
    insert into public.recovery_plans (id, student_id, academic_year_id, absence_start, absence_end, daily_goal)
    values ('d0000000-0000-4000-8000-0000000000b1', 'd0000000-0000-4000-8000-000000000011', '2026-2027', '2026-09-07', '2026-09-20', 2);
    insert into public.plan_items (plan_id, topic_id, seq, status, completed_at, completed_mode)
    select 'd0000000-0000-4000-8000-0000000000b1', t.id, row_number() over (order by w.week_no, t.code),
           case when t.code = 'ORNEK-MAT6-K1' then 'tamamlandi' else 'bekliyor' end,
           case when t.code = 'ORNEK-MAT6-K1' then now() - interval '1 day' end,
           case when t.code = 'ORNEK-MAT6-K1' then 'kisa' end
    from public.weekly_topics w
    join public.topics t on t.id = w.topic_id
    where w.grade = 6 and w.week_no in (1, 2);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 10) Soru örneği (yalnızca havuzdaki bir öğrenci sorusu; gönüllü cevaplı örnek yerel betikte)
-- ---------------------------------------------------------------------
insert into public.questions (id, student_id, subject_id, grade, status)
select 'd0000000-0000-4000-8000-000000000102', 'd0000000-0000-4000-8000-000000000012', (select id from public.subjects where code = 'MAT'), 7, 'havuzda'
on conflict do nothing;

insert into public.question_messages (id, question_id, sender_id, kind, body, created_at) values
  ('d0000000-0000-4000-8000-000000000113', 'd0000000-0000-4000-8000-000000000102', 'd0000000-0000-4000-8000-000000000012', 'soru',
     'ÖRNEK havuz sorusu: 24 ile 36''nın EBOB''u kaçtır?', now() - interval '1 day')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 11) Bildirimler
-- ---------------------------------------------------------------------
insert into public.notifications (user_id, type, title, body)
select * from (values
  ('d0000000-0000-4000-8000-000000000011'::uuid, 'plan_hazir', 'Telafi planın hazır.', null::text),
  ('d0000000-0000-4000-8000-000000000002'::uuid, 'plan_hazir', 'Çocuğunuzun telafi planı hazır.', 'Ayrıntıları görmek için uygulamayı açın.')
) v(user_id, type, title, body)
where not exists (select 1 from public.notifications);
