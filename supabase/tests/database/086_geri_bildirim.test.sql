-- =====================================================================
-- 086 · GERİ BİLDİRİM (migration 13): submit_feedback, get_feedback_summary, session_feedback RLS
-- Fixture: m1 = ogr_a1 + gon_x (aktif); veli_a ogr_a1'in velisi. Geçmiş ders "sp" bu testte eklenir.
-- =====================================================================
begin;
select plan(16);
select tests.make_fixture();

insert into public.sessions (id, match_id, starts_at, duration_min, status, booked_by)
values (tests.id('sp'), tests.id('m1'),
        (((now() at time zone 'Europe/Istanbul')::date - 3) + time '14:00') at time zone 'Europe/Istanbul', 30, 'tamamlandi', tests.id('gon_x'));

-- ====================== Yetki ve doğrulama ======================
select tests.login_anon();
select throws_ok($$ select public.submit_feedback(tests.id('sp'), 5::smallint, true) $$, '42501', null, 'anon geri bildirim veremez');
select tests.logout();

select tests.login('ogr_a1');
select throws_ok($$ select public.submit_feedback(tests.id('sp'), 6::smallint, true) $$, '22023', null, 'puan 1-5 dışında reddedilir');
select throws_ok($$ select public.submit_feedback(tests.id('s1'), 5::smallint, true) $$, '42501', 'DERS_YOK: geri bildirim verilebilecek ders bulunamadı', 'henüz yapılmamış derse geri bildirim verilemez');
select lives_ok($$ select public.submit_feedback(tests.id('sp'), 5::smallint, true) $$, 'öğrenci geri bildirim verdi');
select throws_ok($$ select public.submit_feedback(tests.id('sp'), 4::smallint, true) $$, '22023', 'ZATEN_VAR: bu ders için geri bildirim verildi', 'aynı ders için ikinci cevap reddedilir');
select tests.logout();

select tests.login('ogr_b1');
select throws_ok($$ select public.submit_feedback(tests.id('sp'), 5::smallint, true) $$, '42501', null, 'dersin tarafı olmayan öğrenci cevap veremez');
select tests.logout();

select tests.login('veli_b');
select throws_ok($$ select public.submit_feedback(tests.id('sp'), 5::smallint, true) $$, '42501', null, 'başka çocuğun velisi cevap veremez');
select tests.logout();

select tests.login('veli_a');
select lives_ok($$ select public.submit_feedback(tests.id('sp'), 4::smallint, false) $$, 'veli geri bildirim verdi');
select tests.logout();

select tests.login('gon_x');
select lives_ok($$ select public.submit_feedback(tests.id('sp'), 3::smallint, true) $$, 'gönüllü geri bildirim verdi');
select is((select count(*)::int from public.session_feedback), 1, 'gönüllü yalnızca kendi cevabını görür');
select tests.logout();

-- ====================== Doğrudan yazma kapalı ======================
select tests.login('ogr_a1');
select throws_ok($$ insert into public.session_feedback (session_id, respondent_id, role, rating, would_continue)
                    values (tests.id('sp'), tests.id('ogr_a1'), 'ogrenci', 5, true) $$, '42501', null, 'tabloya doğrudan yazılamaz');
select is((select count(*)::int from public.session_feedback), 1, 'öğrenci yalnızca kendi cevabını görür');
select tests.logout();

-- ====================== Özet ======================
select tests.login('veli_a');
select throws_ok($$ select public.get_feedback_summary() $$, '42501', null, 'veli özeti göremez');
select tests.logout();

select tests.login('admin', 'aal2');
select is((select public.get_feedback_summary() -> 'by_role' -> 'ogrenci' ->> 'avg_rating')::numeric, 5.00, 'öğrenci ortalaması');
select is((select public.get_feedback_summary() -> 'by_role' -> 'veli' ->> 'continue_pct')::numeric, 0.0, 'velinin devam oranı');
select is((select (public.get_feedback_summary() ->> 'completed_sessions')::int >= 1), true, 'biten ders sayısı');
select tests.logout();

select * from finish();
rollback;
