-- =====================================================================
-- 045 · ÇOCUK GÜVENLİĞİ ÖZELLİKLERİ (Google Play Families + hukuk gereksinimleri)
--   A) Gönüllü kısa adı "Ad S." (private.short_name)
--   B) "Gönüllüyü engelle" (volunteer_blocks)
--   C) Veli özellik anahtarları (student_features): soru-cevap, sesli cevap, görüntülü ders
-- =====================================================================
begin;
select plan(66);
select tests.make_fixture();

-- ====================== A) short_name (ayrıntılı: 071) ======================
select is(private.short_name('Ayşe', 'Kaya'), 'Ayşe K.', 'Ad + Soyad -> Ad S.');
select is(private.short_name('mehmet', 'inci'), 'mehmet İ.', 'Türkçe baş harf: i -> İ');
select is(private.short_name('Ali', null), null, 'soyad yoksa NULL');

-- ====================== B) Gönüllüyü engelle ======================
select tests.logout();
-- block_volunteer RPC'sinin (backend) yapacağı yazma: veli ogr_a1 için gon_x'i engeller
insert into public.volunteer_blocks (student_id, volunteer_id, match_id, blocked_by, blocked_by_role, reason_code)
values (tests.id('ogr_a1'), tests.id('gon_x'), tests.id('m1'), tests.id('veli_a'), 'veli', 'rahatsiz_edici');

select is((select count(*) from public.audit_log where action = 'gonullu_engellendi'
             and details ->> 'ogrenci' = tests.id('ogr_a1')::text and details ->> 'gonullu' = tests.id('gon_x')::text), 1::bigint,
  'engelleme denetim kaydına yazıldı (yöneticiye iz)');
select is((select count(*) from public.volunteer_blocks where reviewed_at is null), 1::bigint, 'engelleme yönetici kuyruğunda (incelenmemiş)');
select throws_ok($$ insert into public.volunteer_blocks (student_id, volunteer_id, blocked_by_role) values (tests.id('ogr_a1'), tests.id('gon_x'), 'veli') $$,
  '23505', null, 'aynı (öğrenci, gönüllü) çifti ikinci kez engellenemez');
select throws_ok($$ insert into public.volunteer_blocks (student_id, volunteer_id, blocked_by_role, reason_code) values (tests.id('ogr_a2'), tests.id('gon_x'), 'veli', 'serbest metin') $$,
  '23514', null, 'neden yalnızca tanımlı kodlardan biri olabilir (serbest metin yok)');
select throws_ok($$ insert into public.volunteer_blocks (student_id, volunteer_id, blocked_by_role) values (tests.id('ogr_a2'), tests.id('gon_x'), 'gonullu') $$,
  '23514', null, 'engelleyen yalnızca öğrenci veya veli olabilir');
select ok(private.is_blocked(tests.id('ogr_a1'), tests.id('gon_x')), 'private.is_blocked: engelli çift için true');
select ok(not private.is_blocked(tests.id('ogr_a2'), tests.id('gon_x')), 'private.is_blocked: başka öğrenci için false');

-- Kim görür?
select tests.login('veli_a');
select is(tests.cnt('select 1 from public.volunteer_blocks'), 1::bigint, 'engelleyen veli kaydı görür');
select tests.login('ogr_a1');
select is(tests.cnt('select 1 from public.volunteer_blocks'), 1::bigint, 'öğrenci kendi engelleme kaydını görür');
select tests.login('ogr_a2');
select is(tests.cnt('select 1 from public.volunteer_blocks'), 0::bigint, 'kardeş öğrenci göremez');
select tests.login('veli_b');
select is(tests.cnt('select 1 from public.volunteer_blocks'), 0::bigint, 'başka veli göremez');
select tests.login('gon_x');
select is(tests.cnt('select 1 from public.volunteer_blocks'), 0::bigint, 'ENGELLENEN gönüllü engellendiğini göremez');
select tests.login('gon_y');
select is(tests.cnt('select 1 from public.volunteer_blocks'), 0::bigint, 'başka gönüllü göremez');
select tests.login('admin');
select is(tests.cnt('select 1 from public.volunteer_blocks'), 0::bigint, 'yönetici aal1: göremez');
select tests.login_anon();
select throws_ok($$ select * from public.volunteer_blocks $$, '42501', null, 'anon: okunamaz');

-- İstemci doğrudan yazamaz
select tests.login('veli_a');
select throws_ok($$ insert into public.volunteer_blocks (student_id, volunteer_id, blocked_by, blocked_by_role) values (tests.id('ogr_a2'), tests.id('gon_y'), tests.id('veli_a'), 'veli') $$,
  '42501', null, 'veli doğrudan engelleme kaydı ekleyemez (block_volunteer RPC)');
select throws_ok($$ delete from public.volunteer_blocks $$, '42501', null, 'veli engellemeyi silemez');
select throws_ok($$ update public.volunteer_blocks set blocked_by_role = 'ogrenci' $$, '42501', null, 'veli engelleme kaydını değiştiremez');
select is(tests.affected($$ update public.volunteer_blocks set reviewed_at = now() $$), 0::bigint, 'veli "incelendi" işaretleyemez (yalnızca yönetici)');
select tests.login('ogr_a1');
select throws_ok($$ insert into public.volunteer_blocks (student_id, volunteer_id, blocked_by, blocked_by_role) values (tests.id('ogr_a1'), tests.id('gon_y'), tests.id('ogr_a1'), 'ogrenci') $$,
  '42501', null, 'öğrenci doğrudan engelleme kaydı ekleyemez');

-- Yönetici incelemesi
select tests.login('admin', 'aal2');
select is(tests.cnt('select 1 from public.volunteer_blocks'), 1::bigint, 'yönetici aal2: engellemeleri görür');
select is(tests.affected($$ update public.volunteer_blocks set reviewed_at = '2000-01-01' $$), 1::bigint, 'yönetici aal2: "incelendi" işaretler');
select is((select reviewed_by from public.volunteer_blocks), tests.id('admin'), 'inceleyen yönetici sunucuda damgalanır');
select cmp_ok((select reviewed_at from public.volunteer_blocks), '>', '2020-01-01'::timestamptz, 'inceleme zamanını sunucu belirler');
select throws_ok($$ update public.volunteer_blocks set blocked_by_role = 'ogrenci' $$, '42501', null, 'yönetici engelleme kaydının içeriğini değiştiremez');
select tests.login('admin');
select is(tests.affected($$ update public.volunteer_blocks set reviewed_at = null $$), 0::bigint, 'yönetici aal1: değiştiremez');

-- Engelin etkisi: erişim kapanır
select tests.login('gon_x');
select is(tests.visible('public.questions', array['q1','q2','q3','q4']), 'q2',
  'engellenen gönüllü, kendisine ATANMIŞ olsa bile o öğrencinin sorusunu göremez; diğer öğrencilerin havuz sorusunu görmeye devam eder');
select is(tests.visible('public.question_messages', array['msg1','msg2','msg4']), 'msg4', 'engellenen gönüllü o öğrencinin mesajlarını göremez');
select is(tests.visible('public.attachments', array['att1']), '', 'engellenen gönüllü o öğrencinin ekini göremez');
select is(tests.cnt('select 1 from public.matched_students'), 0::bigint, 'engellenen gönüllü artık o öğrenciyi eşleşmiş öğrenci olarak göremez');
select is(tests.visible('public.sessions', array['s1']), '', 'engelli gönüllü o eşleşmenin derslerini (oda adı dahil) artık GÖRMEZ');
select is(tests.cnt('select 1 from public.matched_student_plan_items'), 0::bigint, 'engellenen gönüllü plan konularını da göremez');

-- Engelin etkisi: veritabanı yeni eşleşme/atamayı reddeder
select tests.logout();
update public.matches set status = 'bitti', ended_at = now(), end_reason = 'engellendi' where id = tests.id('m1');
select throws_ok(
  $$ insert into public.matches (student_id, volunteer_id, subject_id, status)
     values (tests.id('ogr_a1'), tests.id('gon_x'), (select id from public.subjects where code = 'MAT'), 'onerildi') $$,
  '42501', 'ENGELLI: bu gönüllü bu öğrenci için engellenmiş', 'engelli çift için yeni eşleşme önerilemez');
select throws_ok(
  $$ update public.questions set assigned_volunteer_id = tests.id('gon_x'), status = 'atandi' where id = tests.id('q4') $$,
  '42501', null, 'engelli gönüllüye soru atanamaz / havuzdan üstlenilemez');
select throws_ok(
  $$ insert into public.questions (student_id, subject_id, grade, status, assigned_volunteer_id)
     values (tests.id('ogr_a1'), 1, 6, 'atandi', tests.id('gon_x')) $$,
  '42501', null, 'yeni soru engelli gönüllüye atanarak açılamaz');
select lives_ok(
  $$ update public.questions set assigned_volunteer_id = tests.id('gon_x'), status = 'atandi' where id = tests.id('q3') $$,
  'engel yalnızca o öğrenci için geçerli: gönüllü başka öğrencinin sorusuna atanabilir');

-- ====================== C) Veli özellik anahtarları ======================
select is((select count(*) from public.student_features where student_id in (tests.id('ogr_a1'), tests.id('ogr_a2'), tests.id('ogr_b1'))), 3::bigint,
  'her öğrenci için özellik anahtarı satırı otomatik açılır');
select is((select qa_enabled and voice_enabled and video_enabled from public.student_features where student_id = tests.id('ogr_a1')), true,
  'varsayılan: hepsi açık');

select tests.login_anon();
select throws_ok($$ select * from public.student_features $$, '42501', null, 'anon: okunamaz');
select tests.login('ogr_a1');
select is(tests.visible('public.student_features', array['ogr_a1','ogr_a2','ogr_b1'], 'student_id'), 'ogr_a1', 'öğrenci yalnızca kendi anahtarlarını görür');
select is(tests.affected($$ update public.student_features set video_enabled = true where student_id = tests.id('ogr_a1') $$), 0::bigint,
  'ÖĞRENCİ kendi kısıtını değiştiremez (yalnızca veli)');
select tests.login('veli_a');
select is(tests.visible('public.student_features', array['ogr_a1','ogr_a2','ogr_b1'], 'student_id'), 'ogr_a1,ogr_a2', 'veli_a: çocuklarının anahtarları');
select is(tests.affected($$ update public.student_features set voice_enabled = false where student_id = tests.id('ogr_a1') $$), 1::bigint,
  'veli çocuğunun sesli cevap anahtarını kapatabilir');
select is((select updated_by from public.student_features where student_id = tests.id('ogr_a1')), tests.id('veli_a'), 'değiştiren veli sunucuda damgalanır');
select is(tests.affected($$ update public.student_features set voice_enabled = false where student_id = tests.id('ogr_b1') $$), 0::bigint,
  'veli başka çocuğun anahtarını değiştiremez');
select throws_ok($$ update public.student_features set student_id = tests.id('ogr_b1') where student_id = tests.id('ogr_a1') $$, '42501', null,
  'anahtar satırı başka öğrenciye taşınamaz');
select throws_ok($$ update public.student_features set updated_by = tests.id('veli_b') where student_id = tests.id('ogr_a1') $$, '42501', null,
  'updated_by istemciden yazılamaz');
select throws_ok($$ insert into public.student_features (student_id) values (tests.id('ogr_a1')) $$, '42501', null, 'istemci anahtar satırı ekleyemez');
select throws_ok($$ delete from public.student_features $$, '42501', null, 'istemci anahtar satırı silemez');
select tests.logout();
select is((select count(*) from public.audit_log where action = 'ozellik_degisti' and entity_id = tests.id('ogr_a1')::text
             and details = '{"soru_cevap":true,"sesli_cevap":false,"goruntulu_ders":true}'::jsonb and actor_id = tests.id('veli_a')), 1::bigint,
  'anahtar değişikliği denetim kaydına yazıldı');
select tests.login('veli_b');
select is(tests.affected($$ update public.student_features set voice_enabled = true where student_id = tests.id('ogr_a1') $$), 0::bigint,
  'başka veli çocuğun anahtarını değiştiremez');
select is(tests.visible('public.student_features', array['ogr_a1','ogr_a2','ogr_b1'], 'student_id'), 'ogr_b1', 'veli_b yalnızca kendi çocuğununkini görür');
select tests.login('gon_y');
select is(tests.cnt('select 1 from public.student_features'), 0::bigint, 'gönüllü anahtar tablosunu doğrudan okuyamaz');
select tests.login('admin', 'aal2');
select is(tests.visible('public.student_features', array['ogr_a1','ogr_a2','ogr_b1'], 'student_id'), 'ogr_a1,ogr_a2,ogr_b1', 'yönetici aal2 okur');
select is(tests.affected($$ update public.student_features set voice_enabled = true where student_id = tests.id('ogr_a1') $$), 0::bigint, 'yönetici anahtarı değiştiremez (yalnızca veli)');

-- Eşleşmiş gönüllü yalnızca durumu görünümden öğrenir
select tests.logout();
update public.matches set status = 'aktif', started_at = now(), ended_at = null, end_reason = null where id = tests.id('m3');
select tests.login('gon_x');
select results_eq(
  $$ select voice_enabled, video_enabled from public.matched_students where student_id = tests.id('ogr_a2') $$,
  $$ values (true, true) $$,
  'eşleşmiş gönüllü, öğrencinin sesli/görüntülü ders durumunu görünümden görür');

-- Kapalı özellik VERİTABANINDA zorlanır
select tests.logout();
update public.student_features set qa_enabled = false where student_id = tests.id('ogr_b1');
select throws_ok($$ insert into public.questions (student_id, subject_id, grade) values (tests.id('ogr_b1'), 1, 6) $$, '42501', 'OZELLIK_KAPALI: soru-cevap bu öğrenci için veli tarafından kapatıldı',
  'soru-cevap kapalıyken yeni soru açılamaz');
select throws_ok($$ insert into public.question_messages (question_id, sender_id, kind, body) values (tests.id('q2'), tests.id('ogr_b1'), 'takip', 'yeni mesaj') $$, '42501', null,
  'soru-cevap kapalıyken mevcut soruya mesaj eklenemez');
update public.student_features set qa_enabled = true where student_id = tests.id('ogr_b1');
select lives_ok($$ insert into public.question_messages (question_id, sender_id, kind, body) values (tests.id('q2'), tests.id('ogr_b1'), 'takip', 'yeni mesaj') $$,
  'anahtar yeniden açılınca mesaj eklenebilir');

select throws_ok($$ insert into public.attachments (message_id, storage_path, kind, mime, size_bytes, duration_sec)
  values (tests.id('msg1'), tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('ses1')::text || '.m4a', 'ses', 'audio/mp4', 1000, 30) $$,
  '42501', 'OZELLIK_KAPALI: sesli cevaplar bu öğrenci için veli tarafından kapatıldı', 'sesli cevaplar kapalıyken ses eki eklenemez');
select lives_ok($$ insert into public.attachments (message_id, storage_path, kind, mime, size_bytes)
  values (tests.id('msg1'), tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('foto2')::text || '.jpg', 'foto', 'image/jpeg', 1000) $$,
  'sesli cevaplar kapalıyken FOTOĞRAF eki eklenebilir');

update public.student_features set video_enabled = false where student_id = tests.id('ogr_a1');
select throws_ok($$ insert into public.sessions (match_id, starts_at, duration_min) values (tests.id('m1'), '2099-02-10 08:00:00+00', 20) $$, '42501',
  'OZELLIK_KAPALI: görüntülü ders bu öğrenci için veli tarafından kapatıldı', 'görüntülü ders kapalıyken ders planlanamaz');
update public.student_features set video_enabled = true where student_id = tests.id('ogr_a1');
select lives_ok($$ insert into public.sessions (match_id, starts_at, duration_min) values (tests.id('m1'), '2099-02-10 08:00:00+00', 20) $$,
  'anahtar yeniden açılınca ders planlanabilir');

select * from finish();
rollback;
