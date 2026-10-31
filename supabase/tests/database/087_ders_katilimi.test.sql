-- =====================================================================
-- 087 · DERS KATILIMI (migration 16): mark_session ve özetteki katılım oranı
-- Fixture: m1 = ogr_a1 + gon_x (aktif). Geçmiş dersler bu testte eklenir.
-- =====================================================================
begin;
select plan(11);
select tests.make_fixture();

insert into public.sessions (id, match_id, starts_at, duration_min, status, booked_by) values
  (tests.id('p1'), tests.id('m1'), (((now() at time zone 'Europe/Istanbul')::date - 4) + time '14:00') at time zone 'Europe/Istanbul', 30, 'planlandi', tests.id('gon_x')),
  (tests.id('p2'), tests.id('m1'), (((now() at time zone 'Europe/Istanbul')::date - 3) + time '14:00') at time zone 'Europe/Istanbul', 30, 'planlandi', tests.id('gon_x')),
  (tests.id('p3'), tests.id('m1'), (((now() at time zone 'Europe/Istanbul')::date - 2) + time '14:00') at time zone 'Europe/Istanbul', 30, 'planlandi', tests.id('gon_x')),
  (tests.id('p4'), tests.id('m1'), (((now() at time zone 'Europe/Istanbul')::date - 1) + time '14:00') at time zone 'Europe/Istanbul', 30, 'planlandi', tests.id('gon_x'));

select tests.login('ogr_a1');
select throws_ok($$ select public.mark_session(tests.id('p1'), 'tamamlandi') $$, '42501', null, 'öğrenci ders işaretleyemez');
select tests.logout();

select tests.login('gon_y');
select throws_ok($$ select public.mark_session(tests.id('p1'), 'tamamlandi') $$, '42501', 'DERS_YOK: işaretlenebilecek (bitmiş) ders bulunamadı', 'başkasının dersi işaretlenemez');
select tests.logout();

select tests.login('gon_x');
select throws_ok($$ select public.mark_session(tests.id('s1'), 'tamamlandi') $$, '42501', null, 'henüz bitmemiş ders işaretlenemez');
select throws_ok($$ select public.mark_session(tests.id('p1'), 'iptal') $$, '22023', null, 'geçersiz durum reddedilir');
select lives_ok($$ select public.mark_session(tests.id('p1'), 'tamamlandi') $$, 'ders yapıldı olarak işaretlendi');
select lives_ok($$ select public.mark_session(tests.id('p2'), 'tamamlandi') $$, 'ikinci ders yapıldı');
select lives_ok($$ select public.mark_session(tests.id('p3'), 'tamamlandi') $$, 'üçüncü ders yapıldı');
select lives_ok($$ select public.mark_session(tests.id('p4'), 'gelinmedi') $$, 'dördüncü ders: öğrenci gelmedi');
select tests.logout();

select tests.login('admin', 'aal2');
select is((select (public.get_feedback_summary() -> 'attendance' ->> 'attended')::int), 3, 'katılan ders sayısı');
select is((select (public.get_feedback_summary() -> 'attendance' ->> 'attendance_pct')::numeric), 75.0, 'katılım oranı %75');
select tests.logout();

select tests.login('veli_a');
select throws_ok($$ select public.mark_session(tests.id('p1'), 'gelinmedi') $$, '42501', null, 'veli ders işaretleyemez');
select tests.logout();

select * from finish();
rollback;
