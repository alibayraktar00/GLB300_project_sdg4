-- Kimse kendi rolünü, hesap durumunu veya student_id_verified alanını güncelleyemez.
-- Bu sütunlarda authenticated rolünün UPDATE yetkisi yok, bu yüzden 42501 (permission denied) beklenir.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

set local role authenticated;

-- Her seed kullanıcısı kendi rolünü ve durumunu değiştirmeyi dener.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
select throws_ok($$ update public.profiles set role = 'gonullu' where id = auth.uid() $$, '42501', null, 'veli rolünü değiştiremez');
select throws_ok($$ update public.profiles set status = 'aktif' where id = auth.uid() $$, '42501', null, 'veli durumunu değiştiremez');

select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
select throws_ok($$ update public.profiles set role = 'veli' where id = auth.uid() $$, '42501', null, 'öğrenci rolünü değiştiremez');
select throws_ok($$ update public.profiles set status = 'aktif' where id = auth.uid() $$, '42501', null, 'öğrenci durumunu değiştiremez');

select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333"}', true);
select throws_ok($$ update public.profiles set role = 'veli' where id = auth.uid() $$, '42501', null, 'gönüllü rolünü değiştiremez');
select throws_ok($$ update public.tutors set student_id_verified = true where profile_id = auth.uid() $$, '42501', null,
  'gönüllü student_id_verified alanını değiştiremez');

-- Değerler gerçekten değişmedi mi? (postgres olarak, RLS'siz kontrol)
reset role;
select is((select student_id_verified from public.tutors where profile_id = '33333333-3333-3333-3333-333333333333'),
  false, 'student_id_verified hâlâ false');

select * from finish();
rollback;
