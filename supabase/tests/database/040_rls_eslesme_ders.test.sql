-- =====================================================================
-- 040 · RLS ROL MATRİSİ: eşleşme, görünümler, ders, plan, uygunluk,
--       bildirim, cihaz jetonu, şikâyet
-- Örnek veri: m1 = ogr_a1 <-> gon_x MAT AKTİF; m2 = ogr_b1 <-> gon_y FEN ÖNERİLMİŞ;
--             m3 = ogr_a2 <-> gon_x MAT BİTMİŞ. s1 = m1 üzerinde yarınki ders.
-- =====================================================================
begin;
select plan(157);
select tests.make_fixture();

-- ====================== matches ======================
select tests.login_anon();
select throws_ok($$ select * from public.matches $$, '42501', null, 'anon: eşleşmeler okunamaz');

select tests.login('ogr_a1');
select is(tests.visible('public.matches', array['m1','m2','m3']), 'm1', 'ogr_a1: kendi aktif eşleşmesi');
select tests.login('ogr_b1');
select is(tests.visible('public.matches', array['m1','m2','m3']), '', 'ogr_b1: veli kararı beklenen ÖNERİYİ göremez (karar velinin)');
select tests.login('ogr_a2');
select is(tests.visible('public.matches', array['m1','m2','m3']), 'm3', 'ogr_a2: kendi (bitmiş) eşleşmesi');
select tests.login('veli_a');
select is(tests.visible('public.matches', array['m1','m2','m3']), 'm1,m3', 'veli_a: çocuklarının eşleşmeleri');
select tests.login('veli_b');
select is(tests.visible('public.matches', array['m1','m2','m3']), 'm2', 'veli_b: çocuğuna yapılan öneriyi görür');
select tests.login('gon_x');
select is(tests.visible('public.matches', array['m1','m2','m3']), 'm1,m3', 'gon_x: kendi aktif + biten eşleşmesi');
select tests.login('gon_y');
select is(tests.visible('public.matches', array['m1','m2','m3']), '', 'gon_y: veli onayı olmayan ÖNERİYİ göremez');
select tests.login('gon_z');
select is(tests.visible('public.matches', array['m1','m2','m3']), '', 'onaysız gönüllü eşleşme göremez');
select tests.login('admin');
select is(tests.visible('public.matches', array['m1','m2','m3']), '', 'yönetici aal1: eşleşme göremez');
select tests.login('admin', 'aal2');
select is(tests.visible('public.matches', array['m1','m2','m3']), 'm1,m2,m3', 'yönetici aal2: hepsi');

select tests.login('veli_a');
select throws_ok($$ update public.matches set status = 'aktif' where id = tests.id('m3') $$, '42501', null, 'veli eşleşmeyi doğrudan değiştiremez (decide_match RPC)');
select throws_ok($$ insert into public.matches (student_id, volunteer_id, subject_id) values (tests.id('ogr_a1'), tests.id('gon_y'), 1) $$, '42501', null,
  'veli doğrudan eşleşme ekleyemez');
select tests.login('gon_x');
select throws_ok($$ update public.matches set status = 'bitti' where id = tests.id('m1') $$, '42501', null, 'gönüllü eşleşmeyi doğrudan bitiremez');
select tests.login('admin', 'aal2');
select throws_ok($$ update public.matches set status = 'aktif' where id = tests.id('m2') $$, '42501', null, 'yönetici de eşleşmeyi doğrudan değiştiremez (RPC + audit)');

-- Ders başına tek açık eşleşme + bütünlük (SQL oturumu)
select tests.logout();
select throws_ok(
  $$ insert into public.matches (student_id, volunteer_id, subject_id, status)
     values (tests.id('ogr_a1'), tests.id('gon_y'), (select id from public.subjects where code = 'MAT'), 'onerildi') $$,
  '23505', null, 'aynı öğrenci + ders için ikinci AÇIK eşleşme eklenemez');
select lives_ok(
  $$ insert into public.matches (student_id, volunteer_id, subject_id, status)
     values (tests.id('ogr_a1'), tests.id('gon_y'), (select id from public.subjects where code = 'FEN'), 'onerildi') $$,
  'aynı öğrenci için FARKLI ders eşleşmesi eklenebilir');
select lives_ok(
  $$ insert into public.matches (student_id, volunteer_id, subject_id, status, started_at, ended_at)
     values (tests.id('ogr_a2'), tests.id('gon_y'), (select id from public.subjects where code = 'MAT'), 'aktif', now(), null) $$,
  'bitmiş eşleşmeden sonra aynı ders için yeni açık eşleşme açılabilir');
select throws_ok(
  $$ insert into public.matches (student_id, subject_id, status) values (tests.id('ogr_b1'), 1, 'aktif') $$,
  '23514', null, 'gönüllüsüz eşleşme yalnızca "bitti" olabilir');
select is((select count(*) from public.audit_log where action = 'eslesme_olusturuldu' and entity_id in (
             select id::text from public.matches where student_id = tests.id('ogr_a1'))), 2::bigint,
  'eşleşme oluşturma denetim kaydına yazıldı (örnek veri + yeni FEN önerisi)');

-- ====================== Görünümler: gönüllünün gördükleri ======================
select tests.login('gon_x');
select is(tests.cnt('select 1 from public.matched_students'), 1::bigint, 'gon_x: yalnızca AKTİF eşleşmesindeki 1 öğrenci');
select results_eq(
  $$ select nickname, grade from public.matched_students $$,
  $$ values ('Mavi Kus'::text, 6::smallint) $$,
  'gon_x: öğrenci için yalnızca rumuz + sınıf görür');
select is(tests.cnt($$ select 1 from public.matched_students where student_id = tests.id('ogr_a2') $$), 0::bigint,
  'gon_x: BİTMİŞ eşleşmedeki öğrenciyi artık göremez');
select throws_ok($$ select username from public.matched_students $$, '42703', null, 'görünümde kullanıcı adı sütunu yok');
select throws_ok($$ select prefs from public.matched_students $$, '42703', null, 'görünümde tercihler (prefs) sütunu yok');
select throws_ok($$ select absence_start from public.matched_students $$, '42703', null, 'görünümde devamsızlık tarihi yok');
select tests.login('gon_y');
select is(tests.visible('public.matched_students', array['ogr_a1','ogr_b1','ogr_a2'], 'student_id'), 'ogr_a2',
  'gon_y: yalnızca AKTİF eşleşmesindeki ogr_a2''yi görür; ÖNERİLMİŞ eşleşmelerdeki (ogr_b1, ogr_a1) öğrenciyi GÖREMEZ');
select tests.login('gon_z');
select is(tests.cnt('select 1 from public.matched_students'), 0::bigint, 'onaysız gönüllü eşleşmiş öğrenci göremez');
select tests.login('gon_s');
select is(tests.cnt('select 1 from public.matched_students'), 0::bigint, 'askıdaki gönüllü eşleşmiş öğrenci göremez');
select tests.login('veli_a');
select is(tests.cnt('select 1 from public.matched_students'), 0::bigint, 'veli matched_students görünümünden bir şey görmez');
select tests.login('ogr_a1');
select is(tests.cnt('select 1 from public.matched_students'), 0::bigint, 'öğrenci matched_students görünümünden bir şey görmez');
select tests.login('admin', 'aal2');
select is(tests.cnt('select 1 from public.matched_students'), 0::bigint, 'görünüm çağırana göre filtrelenir (yönetici gönüllü değil)');
select tests.login_anon();
select throws_ok($$ select * from public.matched_students $$, '42501', null, 'anon: görünüm okunamaz');
select tests.login('gon_x');
select throws_ok($$ insert into public.matched_students (match_id) values (gen_random_uuid()) $$, '55000', null, 'görünüme yazılamaz (güncellenebilir görünüm değil)');


-- ====================== Görünümler: öğrenci ve velinin gördükleri ======================
select tests.login('ogr_a1');
select results_eq(
  $$ select volunteer_name from public.matched_volunteers_for_student $$,
  $$ values ('Gizliad S.'::text) $$,
  'öğrenci, gönüllüyü "Ad S." biçiminde görür (soyadın yalnızca baş harfi)');
select is(tests.cnt($$ select 1 from public.matched_volunteers_for_student where volunteer_name like '%oyad%' $$), 0::bigint,
  'öğrencinin gördüğü adda soyadın tamamı yok');
select tests.login('ogr_b1');
select is(tests.cnt('select 1 from public.matched_volunteers_for_student'), 0::bigint, 'ogr_b1: veli onayı bekleyen öneri öğrenciye gösterilmez');
select tests.login('ogr_a2');
select is(tests.cnt('select 1 from public.matched_volunteers_for_student'), 2::bigint, 'ogr_a2: biten eşleşmedeki gönüllüyü geçmiş olarak da görür (+ yeni aktif eşleşme)');
select tests.login('veli_a');
select is(tests.cnt('select 1 from public.matched_volunteers_for_guardian'), 4::bigint, 'veli_a: çocuklarının gönüllü kartları (m1, m3 + yeni iki eşleşme)');
select results_eq(
  $$ select volunteer_name, university, department from public.matched_volunteers_for_guardian where match_id = tests.id('m1') $$,
  $$ values ('Gizliad S.'::text, 'Test Universitesi'::text, 'Matematik'::text) $$,
  'veli: "Ad S." + üniversite + bölüm görür');
select is(tests.cnt($$ select 1 from public.matched_volunteers_for_guardian where match_id = tests.id('m2') $$), 0::bigint,
  'veli_a: başka velinin çocuğunun gönüllü kartını göremez');
select tests.login('veli_b');
select is(tests.cnt('select 1 from public.matched_volunteers_for_guardian'), 1::bigint, 'veli_b: ÖNERİ aşamasında gönüllü kartını görür (onay kararı için)');
select tests.login('gon_x');
select is(tests.cnt('select 1 from public.matched_volunteers_for_guardian'), 0::bigint, 'gönüllü veli görünümünden bir şey görmez');
select is(tests.cnt('select 1 from public.matched_volunteers_for_student'), 0::bigint, 'gönüllü öğrenci görünümünden bir şey görmez');
select tests.login('ogr_a1');
select throws_ok($$ select university from public.matched_volunteers_for_student $$, '42703', null, 'öğrenci görünümünde üniversite sütunu yok');
select throws_ok($$ select full_name from public.matched_volunteers_for_guardian $$, '42703', null, 'veli görünümünde gerçek ad (full_name) sütunu yok');
select is(tests.cnt('select 1 from public.volunteers'), 0::bigint, 'öğrenci volunteers tablosundan (full_name) bir şey okuyamaz');
select tests.login_anon();
select throws_ok($$ select * from public.matched_volunteers_for_student $$, '42501', null, 'anon: öğrenci görünümü okunamaz');

-- ====================== Telafi planı: devamsızlık tarihleri gönüllüden GİZLİ ======================
select tests.login('ogr_a1');
select is(tests.visible('public.recovery_plans', array['plan1']), 'plan1', 'öğrenci kendi planını görür');
select is(tests.visible('public.plan_items', array['pi1','pi2']), 'pi1,pi2', 'öğrenci plan maddelerini görür');
select tests.login('veli_a');
select is(tests.visible('public.recovery_plans', array['plan1']), 'plan1', 'veli çocuğunun planını (tarihleriyle) görür');
select tests.login('veli_b');
select is(tests.visible('public.recovery_plans', array['plan1']), '', 'başka veli planı göremez');
select tests.login('ogr_b1');
select is(tests.visible('public.recovery_plans', array['plan1']), '', 'başka öğrenci planı göremez');
select tests.login('gon_x');
select is(tests.cnt('select 1 from public.recovery_plans'), 0::bigint, 'EŞLEŞMİŞ gönüllü recovery_plans tablosunu OKUYAMAZ (devamsızlık tarihleri)');
select is(tests.cnt('select 1 from public.plan_items'), 0::bigint, 'eşleşmiş gönüllü plan_items tablosunu doğrudan okuyamaz');
select is(tests.cnt($$ select 1 from public.recovery_plans where absence_start is not null $$), 0::bigint, 'gönüllü devamsızlık tarihi içeren satır bulamaz');
select results_eq(
  $$ select upcoming_rank::int, completed_count, topic_id from public.matched_student_plan_items $$,
  $$ values (1, 0::bigint, tests.id('t_mat6')) $$,
  'gönüllü, yalnızca eşleştiği dersin (MAT) sıradaki konusunu görür; FEN maddesi YOK (ayrıntı: 072)');
select is(tests.cnt('select 1 from public.matched_student_plan_items where student_id = tests.id(''ogr_a2'')'), 0::bigint,
  'gönüllü, eşleşmesi bitmiş öğrencinin planını görmez');
select tests.login('gon_y');
select is(tests.cnt('select 1 from public.matched_student_plan_items'), 0::bigint, 'eşleşmemiş gönüllü plan konularını da göremez');
select tests.login('veli_a');
select is(tests.cnt('select 1 from public.matched_student_plan_items'), 0::bigint, 'veli bu görünümden bir şey görmez (planı doğrudan okur)');
select tests.login('ogr_a1');
select throws_ok($$ insert into public.recovery_plans (student_id, academic_year_id, absence_start, absence_end, daily_goal) values (tests.id('ogr_a1'), '2098-2099', '2098-09-07', '2098-09-20', 2) $$,
  '42501', null, 'öğrenci doğrudan plan ekleyemez (create_recovery_plan RPC)');
select throws_ok($$ update public.plan_items set status = 'atlandi' where id = tests.id('pi1') $$, '42501', null, 'öğrenci plan maddesini doğrudan güncelleyemez (complete_plan_item RPC)');
select tests.login('admin', 'aal2');
select is(tests.visible('public.recovery_plans', array['plan1']), 'plan1', 'yönetici aal2: planı görür');
select tests.login('admin');
select is(tests.visible('public.recovery_plans', array['plan1']), '', 'yönetici aal1: planı göremez');
-- ====================== sessions / session_events ======================
select tests.login('ogr_a1');
select is(tests.visible('public.sessions', array['s1']), 's1', 'öğrenci kendi dersini görür');
select tests.login('veli_a');
select is(tests.visible('public.sessions', array['s1']), 's1', 'veli çocuğunun dersini görür');
select tests.login('gon_x');
select is(tests.visible('public.sessions', array['s1']), 's1', 'eşleşmiş gönüllü dersi görür');
select tests.login('ogr_b1');
select is(tests.visible('public.sessions', array['s1']), '', 'başka öğrenci dersi göremez');
select tests.login('veli_b');
select is(tests.visible('public.sessions', array['s1']), '', 'başka veli dersi göremez');
select tests.login('gon_y');
select is(tests.visible('public.sessions', array['s1']), '', 'eşleşmemiş gönüllü dersi göremez');
select tests.login('admin', 'aal2');
select is(tests.visible('public.sessions', array['s1']), 's1', 'yönetici aal2 dersi görür');
select tests.login('admin');
select is(tests.visible('public.sessions', array['s1']), '', 'yönetici aal1 dersi göremez');
select tests.login_anon();
select throws_ok($$ select * from public.sessions $$, '42501', null, 'anon: ders okunamaz');

select tests.login('veli_a');
select is(tests.cnt($$ select 1 from public.session_events where session_id = tests.id('s1') $$), 1::bigint, 'veli katılım kayıtlarını görür');
select tests.login('ogr_b1');
select is(tests.cnt($$ select 1 from public.session_events where session_id = tests.id('s1') $$), 0::bigint, 'başka öğrenci katılım kaydı göremez');
select tests.login('gon_x');
select throws_ok($$ insert into public.session_events (session_id, user_id, event) values (tests.id('s1'), tests.id('gon_x'), 'ayrildi') $$, '42501', null,
  'katılım kaydı doğrudan eklenemez (log_session_event RPC / jitsi-token)');
select throws_ok($$ insert into public.sessions (match_id, starts_at, duration_min) values (tests.id('m1'), now() + interval '3 days', 40) $$, '42501', null,
  'gönüllü doğrudan ders ekleyemez (book_session RPC)');
select throws_ok($$ update public.sessions set starts_at = starts_at + interval '1 day' where id = tests.id('s1') $$, '42501', null,
  'gönüllü ders saatini değiştiremez');
select throws_ok($$ update public.sessions set status = 'tamamlandi' where id = tests.id('s1') $$, '42501', null, 'gönüllü ders durumunu doğrudan değiştiremez');
select throws_ok($$ delete from public.sessions where id = tests.id('s1') $$, '42501', null, 'ders silinemez');

-- Gönüllü ders notu (ayrıntılı kurallar: 070_engelleme_ders_notu.test.sql): yalnızca tamamlanmış, taze, tek seferlik
select tests.logout();
insert into public.sessions (id, match_id, starts_at, duration_min, status)
values (tests.id('s_bitmis'), tests.id('m1'), (date_trunc('day', now() at time zone 'utc') - interval '1 day' + interval '7 hours') at time zone 'utc', 40, 'tamamlandi');
select tests.login('gon_x');
select is(tests.affected($$ update public.sessions set volunteer_note = 'Kesirler iyi gecti' where id = tests.id('s_bitmis') $$), 1::bigint,
  'eşleşmiş gönüllü, tamamlanan dersinin notunu yazabilir');
select is(tests.affected($$ update public.sessions set volunteer_note = 'Planli derse not' where id = tests.id('s1') $$), 0::bigint,
  'planlı (yapılmamış) derse not yazamaz');
select tests.login('gon_y');
select is(tests.affected($$ update public.sessions set volunteer_note = 'Hack' where id = tests.id('s_bitmis') $$), 0::bigint, 'başka gönüllü not yazamaz');
select tests.login('veli_a');
select is(tests.affected($$ update public.sessions set volunteer_note = 'Hack' where id = tests.id('s_bitmis') $$), 0::bigint, 'veli ders notunu yazamaz');
select tests.login('ogr_a1');
select is(tests.affected($$ update public.sessions set volunteer_note = 'Hack' where id = tests.id('s_bitmis') $$), 0::bigint, 'öğrenci ders notunu yazamaz');

-- Saat penceresi 08:00-21:00 (Europe/Istanbul) ve yinelenen randevu (SQL oturumu)
select tests.logout();
select throws_ok(
  $$ insert into public.sessions (match_id, starts_at, duration_min) values (tests.id('m1'), '2099-01-10 19:30:00+00', 40) $$,
  '23514', 'new row for relation "sessions" violates check constraint "sessions_saat_araligi_chk"',
  'ders 21:00''dan sonra bitemez (22:30 İstanbul)');
select throws_ok(
  $$ insert into public.sessions (match_id, starts_at, duration_min) values (tests.id('m1'), '2099-01-10 04:30:00+00', 20) $$,
  '23514', null, 'ders 08:00''den önce başlayamaz (07:30 İstanbul)');
select throws_ok(
  $$ insert into public.sessions (match_id, starts_at, duration_min) values (tests.id('m1'), '2099-01-10 17:30:00+00', 40) $$,
  '23514', null, '20:30 + 40 dk = 21:10 → reddedilir');
select lives_ok(
  $$ insert into public.sessions (match_id, starts_at, duration_min) values (tests.id('m1'), '2099-01-10 17:20:00+00', 40) $$,
  '20:20 + 40 dk = 21:00 tam sınırda kabul edilir');
select lives_ok(
  $$ insert into public.sessions (match_id, starts_at, duration_min) values (tests.id('m1'), '2099-01-10 05:00:00+00', 20) $$,
  '08:00 başlangıç kabul edilir');
select throws_ok(
  $$ insert into public.sessions (match_id, starts_at, duration_min) values (tests.id('m1'), '2099-01-10 05:00:00+00', 20) $$,
  '23505', null, 'aynı eşleşmede aynı saate ikinci planlı ders eklenemez');
select throws_ok(
  $$ insert into public.sessions (match_id, starts_at, duration_min) values (tests.id('m1'), '2099-01-11 08:00:00+00', 25) $$,
  '23514', null, 'ders süresi yalnızca 20, 30 veya 40 dk (25 reddedilir)');
select throws_ok(
  $$ insert into public.sessions (match_id, starts_at, duration_min, status) values (tests.id('m1'), '2099-01-12 08:00:00+00', 20, 'iptal') $$,
  '23514', null, 'iptal edilen derste iptal zamanı zorunlu');

-- ====================== availability_slots ======================
select tests.login_anon();
select throws_ok($$ select * from public.availability_slots $$, '42501', null, 'anon: uygunluk okunamaz');
select tests.login('ogr_a1');
select is(tests.visible('public.availability_slots', array['slot_a1','slot_b1','slot_x','slot_z']), 'slot_a1', 'öğrenci yalnızca kendi uygunluğunu görür');
select lives_ok($$ insert into public.availability_slots (user_id, weekday, start_time, end_time) values (tests.id('ogr_a1'), 3, '10:00', '12:00') $$,
  'öğrenci kendi uygunluğunu ekleyebilir');
select throws_ok($$ insert into public.availability_slots (user_id, weekday, start_time, end_time) values (tests.id('ogr_b1'), 3, '10:00', '12:00') $$, '42501', null,
  'öğrenci başkası adına uygunluk ekleyemez');
select throws_ok($$ insert into public.availability_slots (user_id, weekday, start_time, end_time) values (tests.id('ogr_a1'), 4, '07:00', '09:00') $$, '23514', null,
  'uygunluk 08:00''den önce başlayamaz');
select throws_ok($$ insert into public.availability_slots (user_id, weekday, start_time, end_time) values (tests.id('ogr_a1'), 4, '20:00', '21:30') $$, '23514', null,
  'uygunluk 21:00''dan sonra bitemez');
select throws_ok($$ insert into public.availability_slots (user_id, weekday, start_time, end_time) values (tests.id('ogr_a1'), 4, '12:00', '11:00') $$, '23514', null,
  'bitiş başlangıçtan önce olamaz');
select throws_ok($$ insert into public.availability_slots (user_id, weekday, start_time, end_time) values (tests.id('ogr_a1'), 9, '10:00', '11:00') $$, '23514', null,
  'gün numarası 1-7 olmalı');
select is(tests.affected($$ update public.availability_slots set end_time = '19:00' where id = tests.id('slot_a1') $$), 1::bigint, 'öğrenci kendi uygunluğunu güncelleyebilir');
select is(tests.affected($$ update public.availability_slots set end_time = '19:00' where id = tests.id('slot_b1') $$), 0::bigint, 'başkasının uygunluğunu güncelleyemez');
select is(tests.affected($$ delete from public.availability_slots where id = tests.id('slot_b1') $$), 0::bigint, 'başkasının uygunluğunu silemez');
select is(tests.affected($$ delete from public.availability_slots where id = tests.id('slot_a1') $$), 1::bigint, 'kendi uygunluğunu silebilir');

select tests.login('veli_a');
select lives_ok($$ insert into public.availability_slots (user_id, weekday, start_time, end_time) values (tests.id('ogr_a2'), 2, '15:00', '16:00') $$,
  'veli çocuğu için uygunluk ekleyebilir');
select throws_ok($$ insert into public.availability_slots (user_id, weekday, start_time, end_time) values (tests.id('ogr_b1'), 2, '15:00', '16:00') $$, '42501', null,
  'veli başka çocuk için uygunluk ekleyemez');
select throws_ok($$ insert into public.availability_slots (user_id, weekday, start_time, end_time) values (tests.id('gon_x'), 2, '15:00', '16:00') $$, '42501', null,
  'veli gönüllü adına uygunluk ekleyemez');
select is(tests.visible('public.availability_slots', array['slot_a1','slot_b1','slot_x','slot_z']), '', 'veli, gönüllünün veya başka çocuğun uygunluğunu göremez (slot_a1 az önce silindi)');
select tests.logout();
insert into public.availability_slots (id, user_id, weekday, start_time, end_time) values (tests.id('slot_a1'), tests.id('ogr_a1'), 1, '16:00', '18:00');
select tests.login('veli_a');
select is(tests.visible('public.availability_slots', array['slot_a1','slot_b1','slot_x','slot_z']), 'slot_a1', 'veli çocuğunun uygunluğunu görür');
select tests.login('veli_b');
select is(tests.affected($$ update public.availability_slots set end_time = '19:00' where id = tests.id('slot_a1') $$), 0::bigint, 'başka veli uygunluğu güncelleyemez');

select tests.login('gon_x');
select is(tests.visible('public.availability_slots', array['slot_a1','slot_b1','slot_x','slot_z']), 'slot_a1,slot_x',
  'eşleşmiş gönüllü: kendi + eşleşmiş öğrencisinin uygunluğu');
select lives_ok($$ insert into public.availability_slots (user_id, weekday, start_time, end_time) values (tests.id('gon_x'), 5, '18:00', '20:00') $$, 'gönüllü kendi uygunluğunu ekleyebilir');
select is(tests.affected($$ update public.availability_slots set end_time = '19:00' where id = tests.id('slot_a1') $$), 0::bigint,
  'gönüllü öğrencinin uygunluğunu DEĞİŞTİREMEZ (yalnızca okur)');
select tests.login('gon_y');
select is(tests.visible('public.availability_slots', array['slot_a1','slot_b1','slot_x','slot_z']), '', 'eşleşmemiş gönüllü öğrenci uygunluğunu göremez');
select tests.login('gon_s');
select throws_ok($$ insert into public.availability_slots (user_id, weekday, start_time, end_time) values (tests.id('gon_s'), 5, '18:00', '20:00') $$, '42501', null,
  'askıdaki gönüllü uygunluk ekleyemez');
select tests.login('gon_z');
select lives_ok($$ insert into public.availability_slots (user_id, weekday, start_time, end_time) values (tests.id('gon_z'), 5, '18:00', '20:00') $$,
  'başvuru aşamasındaki gönüllü uygunluğunu girebilir');
select tests.login('admin', 'aal2');
select ok(tests.cnt($$ select 1 from public.availability_slots where user_id = any (tests.fixture_user_ids()) $$) >= 4, 'yönetici aal2: uygunlukları görür');
select tests.login('admin');
select is(tests.cnt($$ select 1 from public.availability_slots where user_id = any (tests.fixture_user_ids()) $$), 0::bigint, 'yönetici aal1: göremez');

-- ====================== reports ======================
select tests.login_anon();
select throws_ok($$ select * from public.reports $$, '42501', null, 'anon: bildirimler okunamaz');
select tests.login('ogr_a1');
select lives_ok($$ insert into public.reports (reporter_id, target_type, target_id, category) values (tests.id('ogr_a1'), 'mesaj', tests.id('msg2'), 'kisisel_bilgi_istendi') $$,
  'öğrenci bildirim açabilir');
select throws_ok($$ insert into public.reports (reporter_id, target_type, target_id, category) values (tests.id('veli_a'), 'mesaj', tests.id('msg2'), 'diger') $$, '42501', null,
  'başkası adına bildirim açılamaz');
select throws_ok($$ insert into public.reports (reporter_id, target_type, target_id, category, status) values (tests.id('ogr_a1'), 'mesaj', tests.id('msg2'), 'diger', 'kapandi') $$, '42501', null,
  'bildirim açarken durum alanı yazılamaz');
select throws_ok($$ insert into public.reports (reporter_id, target_type, target_id, category) values (tests.id('ogr_a1'), 'mesaj', tests.id('msg2'), 'olmayan_kategori') $$, '23514', null,
  'bildirim kategorisi tanımlı listeden olmalı');
select is(tests.cnt('select 1 from public.reports'), 1::bigint, 'öğrenci yalnızca kendi bildirimlerini görür');
select is(tests.affected($$ update public.reports set status = 'kapandi' where reporter_id = tests.id('ogr_a1') $$), 0::bigint,
  'bildirimi açan kişi bildirimin durumunu değiştiremez');
select tests.login('veli_a');
select is(tests.visible('public.reports', array['r_veli_a','r_gon_x']), 'r_veli_a', 'veli yalnızca kendi bildirimini görür');
select tests.login('gon_x');
select is(tests.visible('public.reports', array['r_veli_a','r_gon_x']), 'r_gon_x', 'gönüllü yalnızca kendi bildirimini görür');
select tests.login('gon_s');
select throws_ok($$ insert into public.reports (reporter_id, target_type, target_id, category) values (tests.id('gon_s'), 'mesaj', tests.id('msg2'), 'diger') $$, '42501', null,
  'askıdaki kullanıcı bildirim açamaz');
select tests.login('admin');
select is(tests.cnt($$ select 1 from public.reports where id in (tests.id('r_veli_a'), tests.id('r_gon_x')) $$), 0::bigint, 'yönetici aal1: bildirim göremez');
select is(tests.affected($$ update public.reports set status = 'inceleniyor' $$), 0::bigint, 'yönetici aal1: bildirim güncelleyemez');
select tests.login('admin', 'aal2');
select is(tests.cnt($$ select 1 from public.reports where id in (tests.id('r_veli_a'), tests.id('r_gon_x')) $$), 2::bigint, 'yönetici aal2: tüm bildirimler');
select is(tests.affected($$ update public.reports set status = 'inceleniyor', action_taken = 'incelemeye alindi' where id = tests.id('r_veli_a') $$), 1::bigint,
  'yönetici aal2: bildirimi işleyebilir');
select throws_ok($$ update public.reports set handled_by = tests.id('veli_a') where id = tests.id('r_veli_a') $$, '42501', null,
  'yönetici handled_by alanını elle yazamaz (sunucu damgalar)');
select throws_ok($$ update public.reports set description = 'degisti' where id = tests.id('r_veli_a') $$, '42501', null,
  'yönetici bildirimin açıklamasını değiştiremez');
select tests.logout();
select is((select handled_by from public.reports where id = tests.id('r_veli_a')), tests.id('admin'),
  'işleyen yönetici sunucuda damgalanır (handled_by)');
select is((select handled_at is not null from public.reports where id = tests.id('r_veli_a')), true, 'işleme zamanı sunucuda damgalanır');
select is((select count(*) from public.audit_log where action = 'bildirim_durumu_degisti' and entity_id = tests.id('r_veli_a')::text), 1::bigint,
  'bildirim durum değişikliği denetim kaydına yazıldı');

-- ====================== notifications ======================
select tests.login('veli_a');
select is(tests.visible('public.notifications', array['n_veli_a','n_ogr_a1','n_gon_x','n_admin']), 'n_veli_a', 'veli yalnızca kendi bildirimlerini görür');
select is(tests.affected($$ update public.notifications set read_at = now() where id = tests.id('n_veli_a') $$), 1::bigint, 'kendi bildirimini okundu işaretler');
select is(tests.affected($$ update public.notifications set read_at = now() where id = tests.id('n_ogr_a1') $$), 0::bigint, 'başkasının bildirimini işaretleyemez');
select throws_ok($$ update public.notifications set title = 'Hack' where id = tests.id('n_veli_a') $$, '42501', null, 'bildirim başlığı değiştirilemez');
select throws_ok($$ insert into public.notifications (user_id, type, title) values (tests.id('veli_a'), 'yeni_cevap', 'sahte') $$, '42501', null,
  'istemci bildirim üretemez (yalnızca sistem)');
select throws_ok($$ delete from public.notifications where id = tests.id('n_veli_a') $$, '42501', null, 'bildirim silinemez');
select tests.login('ogr_a1');
select is(tests.visible('public.notifications', array['n_veli_a','n_ogr_a1','n_gon_x','n_admin']), 'n_ogr_a1', 'öğrenci yalnızca kendi bildirimini görür');
select tests.login('admin');
select is(tests.visible('public.notifications', array['n_veli_a','n_ogr_a1','n_gon_x','n_admin']), 'n_admin', 'yönetici aal1 de kendi bildirimini görür (başkasınınkini değil)');
select tests.login('admin', 'aal2');
select is(tests.visible('public.notifications', array['n_veli_a','n_ogr_a1','n_gon_x','n_admin']), 'n_admin', 'yönetici aal2 de yalnızca KENDİ bildirimlerini görür');
select tests.login_anon();
select throws_ok($$ select * from public.notifications $$, '42501', null, 'anon: bildirim okunamaz');

-- ====================== push_subscriptions (Web Push) ======================
-- Ekleme / güncelleme yalnızca register_push_subscription RPC'siyle (ayrıntılı testler: 076). Burada tablo erişimi sınanır.
select tests.login('veli_a');
select is(tests.visible('public.push_subscriptions', array['ps_veli_a','ps_gon_x']), 'ps_veli_a', 'kullanıcı yalnızca kendi push aboneliğini görür');
select throws_ok($$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (tests.id('veli_a'), 'https://fcm.googleapis.com/fcm/send/dogrudan-ekleme-aaaaaaaaaa', repeat('A', 87), repeat('a', 22)) $$, '42501', null,
  'istemci tabloya doğrudan abonelik ekleyemez (yalnızca RPC)');
select throws_ok($$ update public.push_subscriptions set endpoint = 'https://fcm.googleapis.com/fcm/send/baska-aaaaaaaaaaaaaaaaaaaaaaaa' where id = tests.id('ps_veli_a') $$, '42501', null,
  'istemci aboneliği doğrudan güncelleyemez (endpoint / anahtar değiştirilemez)');
select is(tests.affected($$ delete from public.push_subscriptions where id = tests.id('ps_gon_x') $$), 0::bigint, 'başkasının aboneliğini silemez');
select is(tests.affected($$ delete from public.push_subscriptions where id = tests.id('ps_veli_a') $$), 1::bigint, 'kendi aboneliğini silebilir (çıkış)');
select tests.login_anon();
select throws_ok($$ select * from public.push_subscriptions $$, '42501', null, 'anon: push abonelikleri okunamaz');

-- ====================== security_barrier GERÇEKTEN çalışıyor mu? (Ö-9) ======================
-- "Sızdıran" bir filtre fonksiyonu kullanıcı sorgusuna eklenir; fonksiyon çağrıldığı her değeri tests.sizan
-- tablosuna YAZAR (VOLATILE, ucuz: cost 1). Kullanıcı filtresi, görünümün pahalı filtresiyle (is_matched_volunteer,
-- cost 100) AYNI taramada (matches) çalışır:
--   * bariyer VARSA planlayıcı kullanıcı filtresini görünümün filtrelerinden SONRA çalıştırır: fonksiyon yalnızca
--     görünümün izin verdiği satırlar için çağrılır;
--   * bariyer YOKSA ucuz fonksiyon pahalı filtreden ÖNCE değerlendirilir ve gizli satırın kimliği de tabloya düşer.
-- Gizli satır: gon_y ile AKTİF eşleşmesi olan ama hesabı askıdaki çocuk (ucuz koşulları geçer, is_matched_volunteer'a takılır).
select tests.logout();
insert into public.matches (id, student_id, volunteer_id, subject_id, status, started_at)
values (tests.id('m_gizli'), tests.id('ogr_b1'), tests.id('gon_y'), (select id from public.subjects where code = 'MAT'), 'aktif', now());
update public.profiles set status = 'askida' where id = tests.id('ogr_b1');
create table tests.sizan (deger uuid);
grant all on tests.sizan to public;
create function tests.sizdiran(p_id uuid) returns boolean language plpgsql volatile cost 1 as $$
begin insert into tests.sizan values (p_id); return true; end $$;
grant execute on function tests.sizdiran(uuid) to public;
select tests.login('gon_y');
select is(tests.cnt($$ select 1 from public.matched_students where tests.sizdiran(match_id) $$), 1::bigint,
  'gon_y: sızdıran filtre ile de yalnızca görünümün izin verdiği TEK satırı elde eder');
select tests.logout();
select is((select count(*) from tests.sizan where deger = tests.id('m_gizli')), 0::bigint,
  'sızdıran fonksiyon, görünümün GİZLEDİĞİ eşleşme için HİÇ çağrılmadı (security_barrier)');
select ok((select count(*) from tests.sizan) >= 1, 'karşı deney: fonksiyon izin verilen satır için çağrıldı');

select * from finish();
rollback;
