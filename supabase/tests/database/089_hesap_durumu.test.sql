-- =====================================================================
-- 089 · HESAP DURUMU (migration 18): set_account_status
-- =====================================================================
begin;
select plan(11);
select tests.make_fixture();

select tests.login('veli_a');
select throws_ok($$ select public.set_account_status(tests.id('gon_x'), 'askida') $$, '42501', null, 'veli hesap durumu değiştiremez');
select tests.logout();

select tests.login('admin');
select throws_ok($$ select public.set_account_status(tests.id('gon_x'), 'askida') $$, '42501', null, 'MFA''sız yönetici değiştiremez');
select tests.logout();

select tests.login('admin', 'aal2');
select throws_ok($$ select public.set_account_status(tests.id('gon_x'), 'beklemede') $$, '22023', null, 'yalnızca aktif/askıda kabul edilir');
select throws_ok($$ select public.set_account_status(tests.id('admin'), 'askida') $$, '22023', 'KENDI_HESABI: kendi hesabın değiştirilemez', 'kendi hesabını askıya alamaz');
select throws_ok($$ select public.set_account_status('00000000-0000-4000-8000-000000000000', 'askida') $$, '22023', null, 'olmayan hesap');
select lives_ok($$ select public.set_account_status(tests.id('gon_x'), 'askida') $$, 'gönüllü askıya alındı');
select is((select status from public.profiles where id = tests.id('gon_x')), 'askida', 'durum askıda');
select ok(exists (select 1 from public.audit_log where action = 'profil_durum_degisti' and entity_id = tests.id('gon_x')::text), 'denetim kaydına düştü');
select lives_ok($$ select public.set_account_status(tests.id('gon_x'), 'aktif') $$, 'yeniden etkinleştirildi');
select is((select status from public.profiles where id = tests.id('gon_x')), 'aktif', 'durum aktif');
select tests.logout();

select tests.login('gon_x');
select throws_ok($$ select public.set_account_status(tests.id('gon_y'), 'askida') $$, '42501', null, 'gönüllü başkasını askıya alamaz');
select tests.logout();

select * from finish();
rollback;
