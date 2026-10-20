-- =====================================================================
-- 072 · AR-1 GERİ ÇEKİLİNCE HESAP ASKIYA ALINIR · PLAN GÖRÜNÜMÜ DARALTILDI · SAHİPSİZ SORU
-- O1/H-3: AR-1 geri çekilince (ve o çocuk için başka geçerli AR-1 yoksa) çocuk hesabı "beklemede",
--         açık eşleşmeler biter, planlı dersler iptal olur, denetim kaydı yazılır.
-- O2:     matched_student_plan_items yalnızca "sıradaki 3 bekleyen konu + tamamlanan sayısı" verir.
-- H-2:    atama kalkınca "cevaplandi" soru da havuza döner; atanmış durumlar atanan gönüllü ister.
-- =====================================================================
begin;
select plan(46);
select tests.make_fixture();

-- ====================== AR-1 geri çekme ======================
select tests.login('veli_a');
select is(tests.affected($$ update public.consents set withdrawn_at = now() where id = tests.id('c_veli_a') $$), 1::bigint, 'veli AR-1 rızasını geri çeker');
select tests.logout();

select is((select status from public.profiles where id = tests.id('ogr_a1')), 'beklemede', 'AR-1 geri çekilince çocuk hesabı "beklemede" olur (S3)');
select results_eq($$ select status, end_reason from public.matches where id = tests.id('m1') $$, $$ values ('bitti', 'riza_geri_cekildi') $$,
  'çocuğun açık eşleşmesi biter');
select is((select status from public.sessions where id = tests.id('s1')), 'iptal', 'planlı ders iptal edilir');
select is((select count(*) from public.audit_log where action = 'ar1_geri_cekildi' and entity_id = tests.id('ogr_a1')::text), 1::bigint, 'denetim kaydı yazıldı');
select is((select status from public.profiles where id = tests.id('ogr_a2')), 'aktif', 'kardeşin hesabı etkilenmez (rıza çocuk bazlıdır)');

select tests.login('ogr_a1');
select is(tests.cnt('select 1 from public.questions'), 0::bigint, 'askıdaki çocuk sorularına erişemez');
select is(tests.cnt('select 1 from public.recovery_plans'), 0::bigint, 'çocuk planına erişemez');
select is(tests.cnt('select 1 from public.profiles'), 1::bigint, 'çocuk yalnızca kendi profilini (durumunu görebilsin diye) okur');
select tests.login('gon_x');
select is(tests.visible('public.questions', array['q1']), '', 'gönüllü, hesabı beklemedeki çocuğun sorusunu (atanmış olsa bile) GÖRMEZ (S3)');
select is(tests.cnt('select 1 from public.matched_students'), 0::bigint, 'gönüllü matched_students içinde çocuğu görmez');
select ok(not private.can_answer_question(tests.id('q1')), 'can_answer_question: çocuk hesabı beklemedeyse atanmış gönüllü de cevaplayamaz');
select is(tests.visible('public.availability_slots', array['slot_a1']), '', 'gönüllü çocuğun uygunluğunu görmez');
select tests.login('veli_a');
select is(tests.visible('public.questions', array['q1','q4']), 'q1,q4', 'veli çocuğunun verisini görmeye devam eder (indirme/silme için)');
select is(tests.cnt($$ select 1 from public.profiles where id = tests.id('ogr_a1') $$), 1::bigint, 'veli çocuğun profilini görür');
select tests.logout();

-- Başka geçerli AR-1 varsa askıya ALINMAZ. (Dikkat: yukarıdaki v1 kaydı ZATEN geri çekilmişti; geri çekilmiş kaydın
-- tekrar güncellenmesi tetikleyiciyi çalıştırmaz. Bu yüzden iki YENİ geçerli kayıt açılır; app_version yalnızca ayırt etmek içindir.)
update public.profiles set status = 'aktif' where id = tests.id('ogr_a1');
insert into public.consents (user_id, student_id, type, doc_version, granted, app_version) values
  (tests.id('veli_a'), tests.id('ogr_a1'), 'acik_riza_dolayli_saglik', 'v2', true, 't1'),
  (tests.id('veli_a'), tests.id('ogr_a1'), 'acik_riza_dolayli_saglik', 'v2', true, 't2');
update public.consents set withdrawn_at = now() where student_id = tests.id('ogr_a1') and app_version = 't1';
select is((select status from public.profiles where id = tests.id('ogr_a1')), 'aktif', 'çocuk için başka geçerli AR-1 varken hesap askıya alınmaz');
update public.consents set withdrawn_at = now() where student_id = tests.id('ogr_a1') and app_version = 't2';
select is((select status from public.profiles where id = tests.id('ogr_a1')), 'beklemede', 'son geçerli AR-1 de geri çekilince askıya alınır');

-- "Vermiyorum" kaydı geçerli rıza sayılmaz
insert into public.consents (user_id, student_id, type, doc_version, granted) values (tests.id('veli_b'), tests.id('ogr_b1'), 'acik_riza_dolayli_saglik', 'v2', false);
update public.consents set withdrawn_at = now() where id = tests.id('c_veli_b');
select is((select status from public.profiles where id = tests.id('ogr_b1')), 'beklemede', '"granted=false" kaydı geçerli AR-1 sayılmaz: askıya alınır');

-- Diğer rıza türleri hesabı askıya almaz
select is((select status from public.profiles where id = tests.id('ogr_a2')), 'aktif', 'ogr_a2 aktif');
insert into public.consents (user_id, type, doc_version, granted) values (tests.id('veli_a'), 'aydinlatma_veli', 'v1', true);
update public.consents set withdrawn_at = now() where user_id = tests.id('veli_a') and type = 'aydinlatma_veli';
select is((select status from public.profiles where id = tests.id('ogr_a2')), 'aktif', 'aydınlatma teyidi geri çekilince çocuk hesabı etkilenmez');
-- Çocuk bazlı AMA bayrağı olmayan (isteğe bağlı) bir rıza türü: geri çekilince hesap askıya alınmaz
insert into public.consent_types (code, audiences, student_scoped, withdrawal_suspends_student, description)
values ('test_ogrenci_bazli_istege_bagli', '{veli}', true, false, 'Yalnızca test: çocuk bazlı ama hizmetin dayanağı olmayan rıza');
insert into public.legal_documents (doc_type, version, sha256, published_at, body_md)
values ('test_ogrenci_bazli_istege_bagli', 'v1', repeat('a', 64), now() - interval '1 day', 'test');
insert into public.consents (user_id, student_id, type, doc_version, granted)
values (tests.id('veli_a'), tests.id('ogr_a2'), 'test_ogrenci_bazli_istege_bagli', 'v1', true);
update public.consents set withdrawn_at = now() where student_id = tests.id('ogr_a2') and type = 'test_ogrenci_bazli_istege_bagli';
select is((select status from public.profiles where id = tests.id('ogr_a2')), 'aktif',
  'çocuk bazlı ama withdrawal_suspends_student = false olan rızanın geri çekilmesi hesabı askıya ALMAZ');
select is((select withdrawal_suspends_student from public.consent_types where code = 'acik_riza_dolayli_saglik'), true,
  'askıya alma davranışı rıza TÜRÜNÜN özelliğidir (consent_types.withdrawal_suspends_student)');
select is((select count(*) from public.consent_types where withdrawal_suspends_student), 1::bigint, 'yalnızca AR-1 türü hesabı askıya aldırır');

-- Çocuğun DİĞER velisi geri çekince aynı sonuç
update public.profiles set status = 'aktif' where id = tests.id('ogr_b1');
insert into public.consents (id, user_id, student_id, type, doc_version, granted) values (tests.id('c_b1_yeni'), tests.id('veli_b'), tests.id('ogr_b1'), 'acik_riza_dolayli_saglik', 'v9', true);
insert into public.guardian_students (guardian_id, student_id) values (tests.id('veli_a'), tests.id('ogr_b1'));
select tests.login('veli_a');
select is(tests.affected($$ update public.consents set withdrawn_at = now() where id = tests.id('c_b1_yeni') $$), 1::bigint, 'çocuğun diğer velisi rızayı geri çekebilir');
select tests.logout();
select is((select status from public.profiles where id = tests.id('ogr_b1')), 'beklemede', 'diğer velinin geri çekmesi de çocuk hesabını askıya alır');

-- ====================== Plan görünümü: sıradaki 3 konu + tamamlanan sayısı ======================
insert into public.topics (id, unit_id, seq, code, title)
select tests.id('t_m' || g), tests.id('u_mat6'), g, 'PGTAP-MAT6-K' || g, 'PGTAP konu ' || g from generate_series(2, 6) g;
insert into public.plan_items (id, plan_id, topic_id, seq)
select tests.id('pi_m' || g), tests.id('plan1'), tests.id('t_m' || g), 1 + g from generate_series(2, 6) g;
update public.profiles set status = 'aktif' where id = tests.id('ogr_a1');
update public.matches set status = 'aktif', ended_at = null, end_reason = null where id = tests.id('m1');
update public.plan_items set status = 'tamamlandi', completed_at = now(), completed_mode = 'kisa' where id = tests.id('pi1');

select tests.login('gon_x');
select is(tests.cnt('select 1 from public.matched_student_plan_items'), 3::bigint, 'gönüllü en çok SIRADAKİ 3 bekleyen konuyu görür');
select results_eq(
  $$ select upcoming_rank::int, topic_id from public.matched_student_plan_items order by upcoming_rank $$,
  $$ values (1, tests.id('t_m2')), (2, tests.id('t_m3')), (3, tests.id('t_m4')) $$,
  'sıradaki konular bekleyen maddelerin sırasıyla (mutlak sıra numarası verilmeden) gelir');
select is((select distinct completed_count from public.matched_student_plan_items), 1::bigint, 'tamamlanan KONU SAYISI verilir (hangileri olduğu değil)');
select is(tests.cnt($$ select 1 from public.matched_student_plan_items where topic_id = tests.id('t_mat6') $$), 0::bigint,
  'tamamlanmış konu görünümde YOK (plan başlangıcı geri hesaplanamaz)');
select is(tests.cnt($$ select 1 from public.matched_student_plan_items where topic_id = tests.id('t_fen6') $$), 0::bigint, 'eşleşilmeyen dersin (FEN) konusu görünmez');
select throws_ok($$ select seq from public.matched_student_plan_items $$, '42703', null, 'görünümde mutlak sıra (seq) sütunu yok');
select throws_ok($$ select plan_id from public.matched_student_plan_items $$, '42703', null, 'görünümde plan kimliği (plan_id) sütunu yok');
select throws_ok($$ select item_status from public.matched_student_plan_items $$, '42703', null, 'görünümde madde durumu sütunu yok (hepsi bekleyen)');
select tests.logout();
update public.plan_items set status = 'tamamlandi', completed_at = now(), completed_mode = 'tam' where id = tests.id('pi_m2');
select tests.login('gon_x');
select results_eq(
  $$ select upcoming_rank::int, topic_id from public.matched_student_plan_items order by upcoming_rank $$,
  $$ values (1, tests.id('t_m3')), (2, tests.id('t_m4')), (3, tests.id('t_m5')) $$,
  'bir konu daha bitince liste kayar');
select is((select distinct completed_count from public.matched_student_plan_items), 2::bigint, 'tamamlanan sayısı artar');
select tests.logout();
update public.plan_items set status = 'tamamlandi', completed_at = now(), completed_mode = 'kisa' where plan_id = tests.id('plan1') and status = 'bekliyor' and topic_id <> tests.id('t_fen6');
select tests.login('gon_x');
select is(tests.cnt('select 1 from public.matched_student_plan_items'), 0::bigint, 'bekleyen konu kalmayınca görünüm boş');
select tests.login('gon_y');
select is(tests.cnt('select 1 from public.matched_student_plan_items'), 0::bigint, 'eşleşmemiş gönüllü hiçbir şey görmez');
select tests.login('veli_a');
select is(tests.cnt('select 1 from public.matched_student_plan_items'), 0::bigint, 'veli görünümden bir şey görmez');
select tests.logout();

-- ====================== Sahipsiz soru ======================
update public.questions set status = 'cevaplandi' where id = tests.id('q1');
update public.questions set assigned_volunteer_id = null where id = tests.id('q1');
select results_eq($$ select status, assigned_volunteer_id is null, escalated_at is not null from public.questions where id = tests.id('q1') $$,
  $$ values ('havuzda', true, true) $$, 'atama kalkınca "cevaplandi" soru da HAVUZA döner (H-2)');
select throws_ok($$ insert into public.questions (student_id, subject_id, grade, status) values (tests.id('ogr_a2'), 1, 7, 'cevaplandi') $$, '23514',
  'new row for relation "questions" violates check constraint "questions_atanan_gonullu_chk"', '"cevaplandi" soru atanan gönüllü olmadan açılamaz');
select throws_ok($$ insert into public.questions (student_id, subject_id, grade, status) values (tests.id('ogr_a2'), 1, 7, 'atandi') $$, '23514',
  'new row for relation "questions" violates check constraint "questions_atanan_gonullu_chk"', '"atandi" soru atanan gönüllü olmadan açılamaz');
select lives_ok($$ insert into public.questions (student_id, subject_id, grade, status) values (tests.id('ogr_a2'), 1, 7, 'acik') $$, '"acik" soru atamasız olabilir');
select lives_ok($$ insert into public.questions (student_id, subject_id, grade, status) values (tests.id('ogr_a2'), 1, 7, 'havuzda') $$, '"havuzda" soru atamasız olabilir');
select lives_ok($$ insert into public.questions (student_id, subject_id, grade, status, closed_at) values (tests.id('ogr_a2'), 1, 7, 'kapandi', now()) $$, '"kapandi" soru atamasız olabilir');
select throws_ok($$ update public.questions set status = 'atandi' where id = tests.id('q3') $$, '23514',
  'new row for relation "questions" violates check constraint "questions_atanan_gonullu_chk"', 'atama olmadan "atandi" durumuna geçilemez');

-- Gönüllü hesabı silinince "cevaplandi" soru da havuza döner
update public.questions set status = 'cevaplandi' where id = tests.id('q4');
delete from auth.users where id = tests.id('gon_y');
select results_eq($$ select status, assigned_volunteer_id is null from public.questions where id = tests.id('q4') $$, $$ values ('havuzda', true) $$,
  'atanmış gönüllünün hesabı silinince "cevaplandi" soru havuza döner (CHECK ihlali olmadan)');

select * from finish();
rollback;
