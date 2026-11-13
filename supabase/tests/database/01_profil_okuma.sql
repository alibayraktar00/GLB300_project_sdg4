-- Profil ve öğrenci kaydı okuma yetkileri (RLS).
-- Seed: veli 1111…, onun çocuğu (öğrenci) 2222…, gönüllü 3333…
-- "Başka bir aile" testi için işlem içinde ikinci bir veli + çocuk eklenir; sonda rollback ile silinir.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

-- Başka aile: veli 4444…, çocuğu 5555… (postgres olarak, RLS'siz eklenir).
insert into auth.users (id, email) values
  ('44444444-4444-4444-4444-444444444444', 'baska-veli@example.com'),
  ('55555555-5555-5555-5555-555555555555', 'baska-ogrenci@example.com');
insert into public.profiles (id, role, display_name) values
  ('44444444-4444-4444-4444-444444444444', 'veli',    'Başka Veli'),
  ('55555555-5555-5555-5555-555555555555', 'ogrenci', 'Başka Öğrenci');
insert into public.students (profile_id, parent_id) values
  ('55555555-5555-5555-5555-555555555555', '44444444-4444-4444-4444-444444444444');

-- Bundan sonra istemci gibi davran: authenticated rolü + JWT'deki kullanıcı kimliği.
set local role authenticated;

-- Veli (1111…)
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
select is((select count(*)::int from public.profiles where id = '22222222-2222-2222-2222-222222222222'),
  1, 'veli kendi çocuğunun profilini okur');
select is((select count(*)::int from public.students where profile_id = '22222222-2222-2222-2222-222222222222'),
  1, 'veli kendi çocuğunun students kaydını okur');
select is((select count(*)::int from public.profiles where id in (
    '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555')),
  0, 'veli gönüllünün, başka velinin ve başka çocuğun profilini okuyamaz');
select is((select count(*)::int from public.students where profile_id = '55555555-5555-5555-5555-555555555555'),
  0, 'veli başka çocuğun students kaydını okuyamaz');

-- Öğrenci (2222…): tabloda yalnızca kendi profili görünür.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
select is((select array_agg(id)::text from public.profiles),
  '{22222222-2222-2222-2222-222222222222}', 'öğrenci yalnızca kendi profilini okur');
select is((select count(*)::int from public.students where profile_id <> '22222222-2222-2222-2222-222222222222'),
  0, 'öğrenci başka öğrencinin kaydını okuyamaz');

-- Gönüllü (3333…): tabloda yalnızca kendi profili görünür.
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333"}', true);
select is((select array_agg(id)::text from public.profiles),
  '{33333333-3333-3333-3333-333333333333}', 'gönüllü yalnızca kendi profilini okur');
select is((select count(*)::int from public.students), 0, 'gönüllü students tablosunda hiçbir şey okuyamaz');
select is((select count(*)::int from public.tutors where profile_id <> '33333333-3333-3333-3333-333333333333'),
  0, 'gönüllü başka gönüllünün kaydını okuyamaz');

select * from finish();
rollback;
