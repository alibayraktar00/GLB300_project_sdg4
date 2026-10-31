-- =====================================================================
-- 088 · GÖNÜLLÜYÜ ENGELLE (migration 17): block_volunteer
-- Fixture: m1 = ogr_a1 + gon_x (MAT, aktif; s1 planlı ders); veli_a ogr_a1'in velisi; veli_b başka çocuğun velisi.
-- =====================================================================
begin;
select plan(13);
select tests.make_fixture();

select tests.login_anon();
select throws_ok($$ select public.block_volunteer(tests.id('ogr_a1'), tests.id('gon_x'), 'rahatsiz_edici') $$, '42501', null, 'anon engelleyemez');
select tests.logout();

select tests.login('gon_x');
select throws_ok($$ select public.block_volunteer(tests.id('ogr_a1'), tests.id('gon_x'), 'tercih_etmiyorum') $$, '42501', null, 'gönüllü engelleme yapamaz');
select tests.logout();

select tests.login('veli_b');
select throws_ok($$ select public.block_volunteer(tests.id('ogr_a1'), tests.id('gon_x'), 'rahatsiz_edici') $$, '42501', null, 'başka çocuğun velisi engelleyemez');
select tests.logout();

select tests.login('ogr_a1');
select throws_ok($$ select public.block_volunteer(tests.id('ogr_a1'), tests.id('gon_x'), 'serbest metin') $$, '22023', null, 'neden listeden seçilmeli');
select throws_ok($$ select public.block_volunteer(tests.id('ogr_a1'), tests.id('gon_z'), 'rahatsiz_edici') $$, '22023', null, 'eşleşmediği gönüllü engellenemez');
select throws_ok($$ select public.block_volunteer(tests.id('ogr_a2'), tests.id('gon_x'), 'rahatsiz_edici') $$, '42501', null, 'öğrenci başkası için engelleyemez');
select tests.logout();

select tests.login('veli_a');
select lives_ok($$ select public.block_volunteer(tests.id('ogr_a1'), tests.id('gon_x'), 'platform_disi_iletisim') $$, 'veli çocuğu adına engelledi');
select lives_ok($$ select public.block_volunteer(tests.id('ogr_a1'), tests.id('gon_x'), 'platform_disi_iletisim') $$, 'ikinci çağrı sessizce yok sayılır (tek kayıt)');
select tests.logout();

select is((select count(*)::int from public.volunteer_blocks where student_id = tests.id('ogr_a1') and volunteer_id = tests.id('gon_x')), 1, 'tek engel kaydı var');
select is((select blocked_by_role from public.volunteer_blocks where student_id = tests.id('ogr_a1')), 'veli', 'engelleyen rol veli');
select is((select status from public.matches where id = tests.id('m1')), 'bitti', 'eşleşme bitti');
select is((select status from public.sessions where id = tests.id('s1')), 'iptal', 'planlı ders iptal edildi');

select tests.login('gon_x');
select throws_ok($$ select public.schedule_session(tests.id('m1'), now() + interval '3 days', 40::smallint, 'https://meet.google.com/abc-defg-hij') $$, '42501', null, 'engellenen gönüllü ders planlayamaz');
select tests.logout();

select * from finish();
rollback;
