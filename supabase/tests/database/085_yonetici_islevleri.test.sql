-- =====================================================================
-- 085 · YÖNETİCİ İŞLEVLERİ (migration 12): review_volunteer, propose_match, decide_match
-- Fixture: gon_z başvuruda; ogr_b1 (6. sınıf, veli_b) MAT için eşleşmemiş; gon_x MAT 6-7 onaylı.
-- =====================================================================
begin;
select plan(22);
select tests.make_fixture();

-- ====================== review_volunteer: yetki ======================
select tests.login('veli_a');
select throws_ok($$ select public.review_volunteer(tests.id('gon_z'), 'onayla', null) $$, '42501', null, 'veli gönüllü onaylayamaz');
select tests.logout();
select tests.login('admin');   -- MFA'sız oturum
select throws_ok($$ select public.review_volunteer(tests.id('gon_z'), 'onayla', null) $$, '42501', null, 'aal2 olmayan yönetici onaylayamaz');
select tests.logout();

-- ====================== review_volunteer: kararlar ======================
select tests.login('admin', 'aal2');
select throws_ok($$ select public.review_volunteer(tests.id('gon_z'), 'sil', null) $$, '22023', null, 'bilinmeyen karar reddedilir');
select throws_ok($$ select public.review_volunteer(tests.id('gon_z'), 'reddet', 'serbest metin') $$, '22023', null, 'ret gerekçesi koddur; serbest metin reddedilir');
select throws_ok($$ select public.review_volunteer(tests.id('gon_x'), 'reddet', 'diger') $$, '22023', null, 'onaylı gönüllü reddedilemez');
select lives_ok($$ select public.review_volunteer(tests.id('gon_z'), 'onayla', null) $$, 'başvuru onaylandı');
select tests.logout();
select is((select status from public.volunteers where profile_id = tests.id('gon_z')), 'onayli', 'durum onaylı oldu');
select isnt((select approved_at from public.volunteers where profile_id = tests.id('gon_z')), null, 'onay zamanı yazıldı');
select ok(exists (select 1 from public.audit_log where action = 'review_volunteer'), 'karar denetim kaydına düştü');

select tests.login('admin', 'aal2');
select lives_ok($$ select public.review_volunteer(tests.id('gon_z'), 'askiya_al', null) $$, 'onaylı gönüllü askıya alındı');
select throws_ok($$ select public.review_volunteer(tests.id('gon_z'), 'reddet', 'diger') $$, '22023', null, 'askıdaki gönüllü reddedilemez');
select tests.logout();

-- ====================== propose_match ======================
select tests.login('veli_b');
select throws_ok($$ select public.propose_match(tests.id('ogr_b1'), tests.id('gon_x'), (select id from public.subjects where code = 'MAT')) $$, '42501', null, 'veli eşleşme öneremez');
select tests.logout();

select tests.login('admin', 'aal2');
select throws_ok($$ select public.propose_match(tests.id('ogr_b1'), tests.id('gon_s'), (select id from public.subjects where code = 'MAT')) $$,
  '22023', 'GONULLU_UYGUN_DEGIL: onaylı ve aktif gönüllü bulunamadı', 'askıdaki gönüllüyle eşleşme önerilemez');
select throws_ok($$ select public.propose_match(tests.id('ogr_b1'), tests.id('gon_x'), (select id from public.subjects where code = 'FEN')) $$,
  '22023', 'DERS_UYGUN_DEGIL: gönüllü bu ders ve sınıfı vermiyor', 'gönüllünün vermediği ders reddedilir');
select throws_ok($$ select public.propose_match(tests.id('ogr_b1'), tests.id('gon_y'), (select id from public.subjects where code = 'FEN')) $$,
  '22023', 'ESLESME_VAR: bu öğrencinin bu derste açık eşleşmesi var', 'aynı derste ikinci açık eşleşme reddedilir');
select lives_ok($$ select public.propose_match(tests.id('ogr_b1'), tests.id('gon_x'), (select id from public.subjects where code = 'MAT')) $$, 'eşleşme önerildi');
select tests.logout();

-- ====================== decide_match ======================
select tests.login('veli_a');
select throws_ok($$ select public.decide_match((select id from public.matches where student_id = tests.id('ogr_b1') and status = 'onerildi' and subject_id = (select id from public.subjects where code = 'MAT')), true) $$,
  '42501', null, 'başka çocuğun velisi karar veremez');
select tests.logout();

select tests.login('veli_b');
select lives_ok($$ select public.decide_match((select id from public.matches where student_id = tests.id('ogr_b1') and status = 'onerildi' and subject_id = (select id from public.subjects where code = 'MAT')), true) $$, 'veli eşleşmeyi onayladı');
select tests.logout();
select is((select status from public.matches where student_id = tests.id('ogr_b1') and volunteer_id = tests.id('gon_x')), 'aktif', 'eşleşme aktif oldu');

select tests.login('veli_b');
select throws_ok($$ select public.decide_match((select id from public.matches where student_id = tests.id('ogr_b1') and volunteer_id = tests.id('gon_x')), false) $$,
  '42501', null, 'karar verilmiş eşleşmeye yeniden karar verilemez');
-- m2: FEN önerisi reddedilir
select lives_ok($$ select public.decide_match(tests.id('m2'), false) $$, 'veli öneriyi reddetti');
select tests.logout();
select is((select end_reason from public.matches where id = tests.id('m2')), 'veli_reddetti', 'ret nedeni kodu yazıldı');

select * from finish();
rollback;
