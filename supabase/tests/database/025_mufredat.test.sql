-- =====================================================================
-- 025 · MÜFREDAT TABLOLARI: okuma kuralları ve veri bütünlüğü kısıtları
-- =====================================================================
begin;
select plan(40);
select tests.make_fixture();

-- ====================== Erişim ======================
select tests.login_anon();
select throws_ok($$ select * from public.subjects $$, '42501', null, 'anon: dersler okunamaz');
select throws_ok($$ select * from public.topics $$, '42501', null, 'anon: konular okunamaz');
select throws_ok($$ select * from public.resources $$, '42501', null, 'anon: kaynaklar okunamaz');

select tests.login('ogr_a1');
select is(tests.cnt('select 1 from public.subjects'), 2::bigint, 'öğrenci dersleri okur (MAT, FEN)');
select is(tests.visible('public.topics', array['t_mat6', 't_fen6']), 't_fen6,t_mat6', 'öğrenci konuları okur');
select is(tests.cnt($$ select 1 from public.resources where title like 'PGTAP%' $$), 1::bigint, 'öğrenci yalnızca AKTİF kaynakları görür');
select tests.login('veli_a');
select is(tests.cnt($$ select 1 from public.resources where title like 'PGTAP%' $$), 1::bigint, 'veli yalnızca aktif kaynakları görür');
select tests.login('gon_z');
select is(tests.visible('public.topics', array['t_mat6']), 't_mat6', 'başvuru aşamasındaki gönüllü de müfredatı okur');
select tests.login('admin');
select is(tests.cnt($$ select 1 from public.resources where title like 'PGTAP%' $$), 1::bigint, 'yönetici aal1: pasif kaynağı göremez');
select tests.login('admin', 'aal2');
select is(tests.cnt($$ select 1 from public.resources where title like 'PGTAP%' $$), 2::bigint, 'yönetici aal2: pasif kaynağı da görür');

-- İstemci müfredata yazamaz
select tests.login('admin', 'aal2');
select throws_ok($$ insert into public.subjects (code, name) values ('TAR', 'Tarih') $$, '42501', null,
  'yönetici bile istemciden ders ekleyemez (içerik migration ile yüklenir)');
select throws_ok($$ update public.topics set title = 'Hack' where id = tests.id('t_mat6') $$, '42501', null, 'konu güncellenemez');
select throws_ok($$ delete from public.resources where title like 'PGTAP%' $$, '42501', null, 'kaynak silinemez');
select tests.login('gon_x');
select throws_ok($$ insert into public.weekly_topics (academic_year_id, grade, subject_id, week_no, topic_id) values ('2098-2099', 6, 1, 1, tests.id('t_mat6')) $$, '42501', null,
  'gönüllü haftalık konu ekleyemez');

-- ====================== Bütünlük (SQL oturumu) ======================
select tests.logout();
-- Önce yılın programı: haftalık konu, grade_programs'ın gösterdiği sürümden gelmek ZORUNDA
select lives_ok(
  $$ insert into public.grade_programs (academic_year_id, grade, subject_id, curriculum_version_id)
     values ('2098-2099', 6, (select id from public.subjects where code = 'MAT'), tests.id('cv_mat6')) $$,
  'sınıf programı: uyumlu sürümle eklenir');
select throws_ok(
  $$ insert into public.grade_programs (academic_year_id, grade, subject_id, curriculum_version_id)
     values ('2098-2099', 7, (select id from public.subjects where code = 'MAT'), tests.id('cv_mat6')) $$,
  '23503', null, 'sınıf programı: sürümün sınıfı ile uyuşmayan satır reddedilir (bileşik FK)');
select throws_ok(
  $$ insert into public.grade_programs (academic_year_id, grade, subject_id, curriculum_version_id)
     values ('2098-2099', 6, (select id from public.subjects where code = 'FEN'), tests.id('cv_mat6')) $$,
  '23503', null, 'sınıf programı: sürümün dersi ile uyuşmayan satır reddedilir (bileşik FK)');

select lives_ok(
  $$ insert into public.weekly_topics (academic_year_id, grade, subject_id, week_no, topic_id)
     values ('2098-2099', 6, (select id from public.subjects where code = 'MAT'), 1, tests.id('t_mat6')) $$,
  'haftalık konu: ders+sınıf konuyla uyumluysa eklenir');
select throws_ok(
  $$ insert into public.weekly_topics (academic_year_id, grade, subject_id, week_no, topic_id)
     values ('2098-2099', 7, (select id from public.subjects where code = 'MAT'), 2, tests.id('t_mat6')) $$,
  '23514', 'weekly_topics: konunun dersi/sınıfı satırla uyuşmuyor (konu: ders 1, sınıf 6)', 'haftalık konu: konunun sınıfı satırla uyuşmuyorsa reddedilir');
select throws_ok(
  $$ insert into public.weekly_topics (academic_year_id, grade, subject_id, week_no, topic_id)
     values ('2098-2099', 6, (select id from public.subjects where code = 'FEN'), 2, tests.id('t_mat6')) $$,
  '23514', 'weekly_topics: konunun dersi/sınıfı satırla uyuşmuyor (konu: ders 1, sınıf 6)', 'haftalık konu: konunun dersi satırla uyuşmuyorsa reddedilir');
select throws_ok(
  $$ insert into public.weekly_topics (academic_year_id, grade, subject_id, week_no, topic_id)
     values ('2098-2099', 6, (select id from public.subjects where code = 'MAT'), 3, tests.id('t_mat6')) $$,
  '23514', 'weekly_topics: 2098-2099 yılı 3 . hafta tatil olarak işaretli, konu atanamaz', 'haftalık konu: tatil haftasına konu atanamaz');
select throws_ok(
  $$ insert into public.weekly_topics (academic_year_id, grade, subject_id, week_no, topic_id)
     values ('2098-2099', 6, (select id from public.subjects where code = 'MAT'), 40, tests.id('t_mat6')) $$,
  '23503', null, 'haftalık konu: olmayan haftaya eklenemez (FK)');

-- Konu, yılın programının gösterdiği sürümden gelmeli (C önerisi)
insert into public.curriculum_versions (id, code, name, subject_id, grade) values
  (tests.id('cv_mat6b'), 'PGTAP-MAT-6B', 'PGTAP Matematik 6 (eski program)', (select id from public.subjects where code = 'MAT'), 6);
insert into public.units (id, curriculum_version_id, seq, title) values (tests.id('u_mat6b'), tests.id('cv_mat6b'), 1, 'PGTAP eski unite');
insert into public.topics (id, unit_id, seq, code, title) values (tests.id('t_mat6b'), tests.id('u_mat6b'), 1, 'PGTAP-MAT6B-K1', 'PGTAP eski program konusu');
select throws_ok(
  $$ insert into public.weekly_topics (academic_year_id, grade, subject_id, week_no, topic_id)
     values ('2098-2099', 6, (select id from public.subjects where code = 'MAT'), 2, tests.id('t_mat6b')) $$,
  '23514', 'weekly_topics: konu, 2098-2099 yılı için grade_programs''ta tanımlı program sürümünden gelmiyor (veya program tanımsız)',
  'haftalık konu: aynı ders+sınıfın BAŞKA program sürümünden gelen konu reddedilir');
select throws_ok(
  $$ insert into public.weekly_topics (academic_year_id, grade, subject_id, week_no, topic_id)
     values ('2098-2099', 6, (select id from public.subjects where code = 'FEN'), 2, tests.id('t_fen6')) $$,
  '23514', 'weekly_topics: konu, 2098-2099 yılı için grade_programs''ta tanımlı program sürümünden gelmiyor (veya program tanımsız)',
  'haftalık konu: o yıl için grade_programs satırı olmayan ders+sınıfa konu atanamaz');

-- Kaynak kısıtları
select throws_ok(
  $$ insert into public.resources (topic_id, kind, title, url) values (tests.id('t_mat6'), 'baglanti', 'http kaynak', 'http://example.org/x') $$,
  '23514', null, 'kaynak: yalnızca https bağlantısı kabul edilir');
select throws_ok(
  $$ insert into public.resources (topic_id, kind, title, url) values (tests.id('t_mat6'), 'baglanti', 'js kaynak', 'javascript:alert(1)') $$,
  '23514', null, 'kaynak: javascript: gibi şemalar reddedilir');
select throws_ok(
  $$ insert into public.resources (topic_id, kind, title) values (tests.id('t_mat6'), 'baglanti', 'urlsiz') $$,
  '23514', null, 'kaynak: "baglanti" türü URL ister');
select throws_ok(
  $$ insert into public.resources (topic_id, kind, title, url, storage_path) values (tests.id('t_mat6'), 'pdf', 'ikisi', 'https://example.org/a.pdf', 'x/y.pdf') $$,
  '23514', null, 'kaynak: URL ve storage_path birlikte olamaz');
select throws_ok(
  $$ insert into public.resources (topic_id, kind, title, url) values (tests.id('t_mat6'), 'baglanti', 'PGTAP aktif kaynak', 'https://example.org/z') $$,
  '23505', null, 'kaynak: aynı konuda aynı başlık tekrarlanamaz');

-- Müfredat anahtarları
select throws_ok(
  $$ insert into public.topics (unit_id, seq, code, title) values (tests.id('u_mat6'), 2, 'PGTAP-MAT6-K1', 'Ayni kod') $$,
  '23505', null, 'konu kodu benzersizdir (CSV yeniden yüklemede anahtar)');
select throws_ok($$ insert into public.subjects (code, name) values ('mat', 'Kucuk harf') $$, '23514', null, 'ders kodu BÜYÜK harf olmalı');
select throws_ok($$ insert into public.academic_years (id, starts_on, ends_on) values ('2027', '2027-09-01', '2028-06-01') $$, '23514', null,
  'öğretim yılı kimliği "2026-2027" biçiminde olmalı');
select throws_ok($$ insert into public.academic_years (id, starts_on, ends_on) values ('2097-2098', '2098-06-01', '2097-09-01') $$, '23514', null,
  'öğretim yılı bitişi başlangıçtan sonra olmalı');
select throws_ok(
  $$ insert into public.academic_weeks (academic_year_id, week_no, starts_on, ends_on) values ('2098-2099', 1, '2098-10-01', '2098-10-07') $$,
  '23505', null, 'aynı yılda aynı hafta numarası tekrarlanamaz');

-- ====================== Telafi planı kısıtları ======================
select throws_ok(
  $$ insert into public.recovery_plans (student_id, academic_year_id, absence_start, absence_end, daily_goal)
     values (tests.id('ogr_a1'), '2098-2099', '2098-09-07', '2098-09-20', 4) $$,
  '23514', null, 'plan: günlük hedef 1-3 arasında olmalı');
select throws_ok(
  $$ insert into public.recovery_plans (student_id, academic_year_id, absence_start, absence_end, daily_goal)
     values (tests.id('ogr_a1'), '2098-2099', '2098-09-20', '2098-09-07', 2) $$,
  '23514', null, 'plan: bitiş tarihi başlangıçtan önce olamaz');
select throws_ok(
  $$ insert into public.plan_items (plan_id, topic_id, seq) values (tests.id('plan1'), tests.id('t_mat6'), 3) $$,
  '23505', null, 'plan: aynı konu bir planda iki kez yer alamaz');
select throws_ok($$ update public.plan_items set status = 'tamamlandi' where id = tests.id('pi1') $$, '23514', null,
  'plan maddesi: tamamlandı için tamamlanma zamanı ve modu zorunlu');
select lives_ok($$ update public.plan_items set status = 'tamamlandi', completed_at = now(), completed_mode = 'kisa' where id = tests.id('pi1') $$,
  'plan maddesi: tutarlı tamamlama kabul edilir');
select throws_ok($$ update public.plan_items set completed_mode = 'uzun' where id = tests.id('pi1') $$, '23514', null,
  'plan maddesi: tamamlama modu yalnızca kisa/tam');

select * from finish();
rollback;
