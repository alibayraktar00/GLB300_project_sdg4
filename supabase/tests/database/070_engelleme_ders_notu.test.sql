-- =====================================================================
-- 070 · "GÖNÜLLÜYÜ ENGELLE" VERİTABANINDA TAM UYGULANIR + DERS NOTU KANALI
-- Güvenlik denetimi Y1: engelleme kaydı eklenince RPC'ye güvenmeden:
--   * açık eşleşme biter, * açık soru atamaları kalkar (soru havuza döner), * planlı dersler iptal olur,
--   * engelli gönüllü eşleşmeyi/dersi göremez, cevaplayamaz, ders notu yazamaz.
-- sessions_update_note_volunteer: yalnızca TAMAMLANMIŞ ve bitişinden ≤ 48 saat geçmiş, anonimleşmemiş,
-- engelsiz derste ve TEK SEFERLİK yazım.
-- =====================================================================
begin;
select plan(36);
select tests.make_fixture();

-- Tamamlanmış dersler (m1: gon_x <-> ogr_a1). Saatler İstanbul 10:00 (07:00 UTC) = 08:00-21:00 kuralına uyar.
insert into public.sessions (id, match_id, starts_at, duration_min, status) values
  (tests.id('s_yeni1'), tests.id('m1'), (date_trunc('day', now() at time zone 'utc') - interval '1 day' + interval '7 hours') at time zone 'utc', 40, 'tamamlandi'),
  (tests.id('s_yeni2'), tests.id('m1'), (date_trunc('day', now() at time zone 'utc') - interval '1 day' + interval '8 hours') at time zone 'utc', 20, 'tamamlandi'),
  (tests.id('s_yeni3'), tests.id('m1'), (date_trunc('day', now() at time zone 'utc') - interval '1 day' + interval '9 hours') at time zone 'utc', 20, 'tamamlandi'),
  (tests.id('s_eski'),  tests.id('m1'), (date_trunc('day', now() at time zone 'utc') - interval '4 days' + interval '7 hours') at time zone 'utc', 40, 'tamamlandi'),
  (tests.id('s_iptal'), tests.id('m1'), (date_trunc('day', now() at time zone 'utc') - interval '1 day' + interval '10 hours') at time zone 'utc', 20, 'gelinmedi');
update public.sessions set anonymized_at = now() where id = tests.id('s_yeni3');

-- ====================== Ders notu: yalnızca kısa süreli, tek seferlik ======================
select tests.login('gon_x');
select is(tests.affected($$ update public.sessions set volunteer_note = 'Kesirler iyi gitti' where id = tests.id('s_yeni1') $$), 1::bigint,
  'gönüllü, tamamlanan dersin notunu bitişten sonraki 48 saat içinde yazabilir');
select is(tests.affected($$ update public.sessions set volunteer_note = 'Sonradan eklenen' where id = tests.id('s_yeni1') $$), 0::bigint,
  'not TEK SEFERLİK yazılır: ikinci yazım/üzerine yazma reddedilir');
select is(tests.affected($$ update public.sessions set volunteer_note = 'Eski derse not' where id = tests.id('s_eski') $$), 0::bigint,
  'bitişinden 48 saat geçmiş derse not yazılamaz');
select is(tests.affected($$ update public.sessions set volunteer_note = 'Henüz yapılmadı' where id = tests.id('s1') $$), 0::bigint,
  'planlı (tamamlanmamış) derse not yazılamaz');
select is(tests.affected($$ update public.sessions set volunteer_note = 'Gelinmedi' where id = tests.id('s_iptal') $$), 0::bigint,
  '"gelinmedi" durumundaki derse not yazılamaz');
select is(tests.affected($$ update public.sessions set volunteer_note = 'Anonim' where id = tests.id('s_yeni3') $$), 0::bigint,
  'anonimleştirilmiş derse not yazılamaz');
select throws_ok($$ update public.sessions set volunteer_note = 'x', status = 'tamamlandi' where id = tests.id('s_yeni2') $$, '42501', null,
  'gönüllü notla birlikte başka sütunu (status) değiştiremez');
select tests.login('gon_y');
select is(tests.affected($$ update public.sessions set volunteer_note = 'Hack' where id = tests.id('s_yeni2') $$), 0::bigint, 'başka gönüllü not yazamaz');
select tests.login('veli_a');
select is(tests.affected($$ update public.sessions set volunteer_note = 'Hack' where id = tests.id('s_yeni2') $$), 0::bigint, 'veli not yazamaz');
select tests.logout();

select is((select count(*) from public.audit_log where action = 'ders_notu_yazildi' and entity_id = tests.id('s_yeni1')::text), 1::bigint,
  'ders notu yazımı denetim kaydına işlendi');
select is((select details ->> 'uzunluk' from public.audit_log where action = 'ders_notu_yazildi' and entity_id = tests.id('s_yeni1')::text), '18',
  'denetim kaydı yalnızca not uzunluğunu içerir (metnin kendisi kişisel veri olabilir)');

-- ====================== Engelleme: veritabanı tarafı tam uygulanır ======================
-- Öncesi: gon_x'e ayrıca ogr_b1'in havuz sorusu (q2) atanmış (başka öğrenci: engelden etkilenmemeli)
update public.questions set status = 'atandi', assigned_volunteer_id = tests.id('gon_x'), assigned_at = now() where id = tests.id('q2');

-- block_volunteer RPC'sinin yazacağı TEK satır: yalnızca engel kaydı (başka hiçbir temizlik yapılmıyor)
insert into public.volunteer_blocks (student_id, volunteer_id, match_id, blocked_by, blocked_by_role, reason_code)
values (tests.id('ogr_a1'), tests.id('gon_x'), tests.id('m1'), tests.id('veli_a'), 'veli', 'uygunsuz_davranis');

select results_eq(
  $$ select status, ended_at is not null, end_reason from public.matches where id = tests.id('m1') $$,
  $$ values ('bitti', true, 'engellendi') $$,
  'engel kaydı eklenince açık eşleşme tetikleyiciyle BİTİRİLİR');
select results_eq(
  $$ select status, cancel_reason, cancelled_at is not null from public.sessions where id = tests.id('s1') $$,
  $$ values ('iptal', 'engellendi', true) $$,
  'engel sonrası gelecekteki planlı ders İPTAL edilir');
select is((select status from public.sessions where id = tests.id('s_yeni2')), 'tamamlandi', 'geçmiş (tamamlanmış) dersler iptal edilmez');
select results_eq(
  $$ select status, assigned_volunteer_id is null, escalated_at is not null from public.questions where id = tests.id('q1') $$,
  $$ values ('havuzda', true, true) $$,
  'engellenen gönüllüye atanmış açık soru atamadan çıkarılır ve HAVUZA döner');
select is((select assigned_volunteer_id from public.questions where id = tests.id('q2')), tests.id('gon_x'),
  'engel yalnızca o öğrenci içindir: başka öğrencinin sorusundaki atama kalır');
select is((select status from public.matches where id = tests.id('m3')), 'bitti', 'başka eşleşmeler değişmez');

-- Gönüllünün görünümü
select tests.login('gon_x');
select is(tests.visible('public.matches', array['m1','m3']), 'm3', 'engelli gönüllü, engellendiği öğrencinin eşleşme satırını GÖRMEZ');
select is(tests.visible('public.sessions', array['s1','s_yeni1','s_yeni2']), '', 'engelli gönüllü o eşleşmenin derslerini (oda adı dahil) GÖRMEZ');
select is(tests.visible('public.questions', array['q1']), '', 'engelli gönüllü, o öğrencinin sorusunu havuzda bile göremez');
select ok(not private.can_answer_question(tests.id('q1')), 'can_answer_question: engelli gönüllü cevaplayamaz');
select is(tests.affected($$ update public.sessions set volunteer_note = 'Beni neden engelledin? Bana buradan yaz.' where id = tests.id('s_yeni2') $$), 0::bigint,
  'engelli gönüllü, çocuğun gördüğü ders notu alanına YAZAMAZ (S1 saldırısı)');
select is(tests.cnt('select 1 from public.matched_students'), 0::bigint, 'engelli gönüllü artık eşleşmiş öğrenci görünümünde yok');

-- Son savunma hattı: RPC/tetikleyici yarım kalsa bile (atama ve eşleşme zorla geri getirilirse) şema yetkiyi keser
select tests.logout();
drop trigger questions_engel_kontrol on public.questions;
drop trigger matches_engel_kontrol on public.matches;
update public.questions set assigned_volunteer_id = tests.id('gon_x'), status = 'atandi' where id = tests.id('q1');
update public.matches set status = 'aktif', ended_at = null, end_reason = null where id = tests.id('m1');
select tests.login('gon_x');
select ok(not private.can_answer_question(tests.id('q1')), 'atama zorla geri getirilse bile can_answer_question engelli çift için false');
select ok(not private.can_access_question(tests.id('q1')), 'can_access_question engelli çift için false');
select ok(not private.is_matched_volunteer(tests.id('ogr_a1')), 'is_matched_volunteer engelli çift için false');
select is(tests.visible('public.matches', array['m1']), '', 'matches_select_volunteer: engelli çiftin (aktif görünse bile) eşleşme satırı görünmez');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('engelli_ek')::text || '.webm', tests.id('gon_x')::text) $$,
  '42501', null, 'engelli gönüllü atanmış gibi görünse bile çocuğun klasörüne dosya yükleyemez (S10)');

-- Çocuk ve veli etkilenmez
select tests.login('ogr_a1');
select is(tests.visible('public.questions', array['q1']), 'q1', 'çocuk kendi sorusunu görmeye devam eder');
select is(tests.cnt($$ select 1 from public.volunteer_blocks $$), 1::bigint, 'çocuk engelleme kaydını görür');
select tests.login('veli_a');
select is(tests.visible('public.questions', array['q1']), 'q1', 'veli çocuğunun sorusunu görmeye devam eder');
select tests.login('ogr_b1');
select is(tests.visible('public.questions', array['q2']), 'q2', 'başka öğrenci etkilenmez');

-- Engel kaydı olmadan hiçbir şey değişmez (karşı deney)
select tests.logout();
select is((select count(*) from public.volunteer_blocks where student_id = tests.id('ogr_a2')), 0::bigint, 'ogr_a2 için engel yok');
select is((select status from public.matches where id = tests.id('m3')), 'bitti', 'ogr_a2 eşleşmesi (zaten bitmiş) değişmedi');

-- İkinci engelleme (aynı çift) idempotent olmalı; tetikleyici hata vermez
select throws_ok($$ insert into public.volunteer_blocks (student_id, volunteer_id, blocked_by_role) values (tests.id('ogr_a1'), tests.id('gon_x'), 'ogrenci') $$,
  '23505', null, 'aynı çift ikinci kez engellenemez (RPC ON CONFLICT DO NOTHING kullanmalı)');

-- Engelsiz çiftte de eşleşme bitince gelecekteki planlı dersler iptal olur (ortak tetikleyici)
insert into public.sessions (id, match_id, starts_at, duration_min)
values (tests.id('s_m2'), tests.id('m2'), (date_trunc('day', now() at time zone 'utc') + interval '2 days 7 hours') at time zone 'utc', 40);
update public.matches set status = 'bitti', ended_at = now(), end_reason = 'yonetici_sonlandirdi' where id = tests.id('m2');
select results_eq(
  $$ select status, cancel_reason from public.sessions where id = tests.id('s_m2') $$,
  $$ values ('iptal', 'eslesme_bitti') $$,
  'eşleşme bitince (engel olmasa da) gelecekteki planlı ders iptal olur');

select * from finish();
rollback;
