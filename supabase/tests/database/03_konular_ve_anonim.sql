-- Konular: giriş yapmış aktif kullanıcılar 12 üniteyi okur. Anonim kullanıcı hiçbir tabloyu okuyamaz.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

-- Aktif seed kullanıcılarının her biri 12 konuyu görür.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
select is((select count(*)::int from public.topics), 12, 'aktif veli 12 konuyu okur');
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
select is((select count(*)::int from public.topics), 12, 'aktif öğrenci 12 konuyu okur');
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333"}', true);
select is((select count(*)::int from public.topics), 12, 'aktif gönüllü 12 konuyu okur');

-- Anonim: anon rolünün bu tablolarda hiç yetkisi yok, okuma 42501 ile reddedilir.
reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok('select * from public.profiles', '42501', null, 'anonim profiles okuyamaz');
select throws_ok('select * from public.students', '42501', null, 'anonim students okuyamaz');
select throws_ok('select * from public.tutors',   '42501', null, 'anonim tutors okuyamaz');
select throws_ok('select * from public.topics',   '42501', null, 'anonim topics okuyamaz');

select * from finish();
rollback;
