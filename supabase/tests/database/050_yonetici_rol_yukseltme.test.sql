-- =====================================================================
-- 050 · YÖNETİCİ (aal1 / aal2), DENETİM KAYDI VE ROL YÜKSELTME DENEMELERİ
-- =====================================================================
begin;
select plan(52);
select tests.make_fixture();

-- ====================== is_admin(): yalnızca yonetici + aktif + aal2 ======================
select tests.login('admin', 'aal2');
select ok(private.is_admin(), 'yönetici + aal2 -> is_admin() = true');
select tests.login('admin', 'aal1');
select ok(not private.is_admin(), 'yönetici + aal1 -> false (MFA zorunlu)');
select tests.login_claims('admin', jsonb_build_object('aal', 'aal1', 'amr', tests.amr('aal2')));
select ok(not private.is_admin(), 'aal1 iddiası + taze TOTP kaydı (amr) -> false: aal2 şartı amr den bağımsız denetlenir');
select tests.logout();
select set_config('request.jwt.claims', jsonb_build_object('sub', tests.id('admin'), 'role', 'authenticated')::text, true);
set local role authenticated;
select ok(not private.is_admin(), 'aal talebi hiç yoksa -> false');
select tests.logout();
select set_config('request.jwt.claims', jsonb_build_object('sub', tests.id('admin'), 'role', 'authenticated', 'aal', 'AAL2')::text, true);
set local role authenticated;
select ok(not private.is_admin(), 'biçimi bozuk aal değeri ("AAL2") kabul edilmez');
select tests.logout();
select set_config('request.jwt.claims', jsonb_build_object('sub', tests.id('admin'), 'role', 'authenticated', 'aal', 'aal1',
  'user_metadata', jsonb_build_object('aal', 'aal2', 'role', 'yonetici'),
  'app_metadata', jsonb_build_object('aal', 'aal2', 'role', 'yonetici'))::text, true);
set local role authenticated;
select ok(not private.is_admin(), 'user_metadata / app_metadata içindeki sahte aal2 ve rol YOK SAYILIR');
select tests.login('veli_a', 'aal2');
select ok(not private.is_admin(), 'veli + aal2 -> false (rol yoksa MFA yetmez)');
select tests.login('gon_x', 'aal2');
select ok(not private.is_admin(), 'gönüllü + aal2 -> false');
select tests.login_uuid(gen_random_uuid(), 'aal2');
select ok(not private.is_admin(), 'profili olmayan kimlik + aal2 -> false');
select tests.logout();
update public.profiles set status = 'askida' where id = tests.id('admin');
select tests.login('admin', 'aal2');
select ok(not private.is_admin(), 'askıdaki yönetici -> false');
select is(tests.cnt($$ select 1 from public.students where profile_id = any (tests.fixture_user_ids()) $$), 0::bigint,
  'askıdaki yönetici aal2 ile bile öğrenci verisini göremez');
select tests.logout();
update public.profiles set status = 'aktif' where id = tests.id('admin');

-- Yardımcılar yalnızca ÇAĞIRANIN durumunu söyler
select tests.login('veli_b');
select ok(not private.is_guardian_of(tests.id('ogr_a1')), 'veli_b için is_guardian_of(ogr_a1) false');
select ok(private.is_guardian_of(tests.id('ogr_b1')), 'veli_b için is_guardian_of(ogr_b1) true');
select ok(not private.is_matched_volunteer(tests.id('ogr_a1')), 'veli için is_matched_volunteer false');
select tests.login('gon_x');
select ok(private.is_matched_volunteer(tests.id('ogr_a1')), 'gon_x için is_matched_volunteer(ogr_a1) true');
select ok(not private.is_matched_volunteer(tests.id('ogr_a2')), 'gon_x için bitmiş eşleşme -> false');
select ok(not private.is_matched_volunteer(tests.id('ogr_b1')), 'gon_x için eşleşmemiş öğrenci -> false');
select tests.login('gon_y');
select ok(not private.is_matched_volunteer(tests.id('ogr_b1')), 'gon_y için yalnızca ÖNERİLMİŞ eşleşme -> false');
select ok(private.can_access_question(tests.id('q2')), 'gon_y havuz sorusuna erişebilir');
select ok(not private.can_access_question(tests.id('q1')), 'gon_y q1''e erişemez');
select ok(not private.can_access_question(gen_random_uuid()), 'olmayan soru -> false');
-- Fonksiyon düzeyinde (politikadaki ön süzgeçten bağımsız) kesin kural
select tests.login('gon_x');
select ok(private.can_access_question(tests.id('q2')), 'gon_x: MAT 6 havuz sorusu (dersini veriyor) -> true');
select ok(not private.can_access_question(tests.id('q3')), 'gon_x: FEN 7 havuz sorusu (dersini VERMİYOR) -> false (fonksiyon düzeyinde)');
select tests.login('gon_z');
select ok(not private.can_access_question(tests.id('q2')), 'onaysız gönüllü havuz sorusu -> false');

-- ====================== audit_log ======================
select tests.logout();
update public.profiles set status = 'askida' where id = tests.id('veli_b');
select tests.login_anon();
select throws_ok($$ select * from public.audit_log $$, '42501', null, 'anon: denetim kaydı okunamaz');
select tests.login('veli_a');
select is(tests.cnt('select 1 from public.audit_log'), 0::bigint, 'veli denetim kaydını göremez');
select tests.login('gon_x');
select is(tests.cnt('select 1 from public.audit_log'), 0::bigint, 'gönüllü denetim kaydını göremez');
select tests.login('admin');
select is(tests.cnt('select 1 from public.audit_log'), 0::bigint, 'yönetici aal1: denetim kaydını göremez');
select tests.login('admin', 'aal2');
select ok(tests.cnt($$ select 1 from public.audit_log where action = 'profil_durum_degisti' and entity_id = tests.id('veli_b')::text $$) = 1,
  'yönetici aal2: denetim kaydını okur (askıya alma izi)');
select throws_ok($$ insert into public.audit_log (action, entity) values ('sahte_kayit', 'x') $$, '42501', null, 'yönetici bile denetim kaydı ekleyemez (yalnızca sistem)');
select throws_ok($$ update public.audit_log set action = 'degisti' $$, '42501', null, 'denetim kaydı güncellenemez');
select throws_ok($$ delete from public.audit_log $$, '42501', null, 'denetim kaydı silinemez');
select tests.login_service();
select lives_ok($$ insert into public.audit_log (action, entity, entity_id) values ('edge_function_islemi', 'test', 'x') $$, 'servis rolü denetim kaydı ekleyebilir');
select throws_ok($$ update public.audit_log set action = 'degisti' $$, '42501', null, 'servis rolü denetim kaydını güncelleyemez');
select throws_ok($$ delete from public.audit_log $$, '42501', null, 'servis rolü denetim kaydını silemez');
select tests.logout();

-- ====================== Rol yükseltme / yetki aşımı denemeleri ======================
-- NOT: Testler 'postgres' (süper kullanıcı) oturumundan 'SET ROLE' ile rol taklit eder. Bu yüzden
-- 'SET ROLE service_role' gibi denemeler burada anlamlı bir sınama DEĞİLDİR (süper kullanıcı her role geçebilir);
-- gerçekte istemci SQL çalıştıramaz, yalnızca PostgREST/RPC üzerinden konuşur. Burada sınananlar: tablo,
-- şema, fonksiyon ve DDL yetkileri.
select tests.login('veli_a');
select throws_ok($$ select private.grant_admin('veli.a@pgtap.test') $$, '42501', null, 'veli private.grant_admin çağıramaz');
select throws_ok($$ select private.write_audit('sahte', 'x') $$, '42501', null, 'veli private.write_audit çağıramaz (sahte denetim kaydı)');
select throws_ok($$ select private.handle_new_user() $$, '42501', null, 'veli handle_new_user çağıramaz');
select throws_ok($$ select * from auth.users $$, '42501', null, 'authenticated auth.users''ı okuyamaz');
select throws_ok($$ update auth.users set raw_app_meta_data = '{"role":"yonetici"}' $$, '42501', null, 'authenticated auth.users''ı değiştiremez');
select throws_ok($$ create table public.hack (id int) $$, '42501', null, 'authenticated public şemasında tablo oluşturamaz');
select throws_ok($$ alter table public.profiles disable trigger profiles_koru $$, '42501', null, 'authenticated tetikleyiciyi devre dışı bırakamaz');
select throws_ok($$ alter table public.profiles disable row level security $$, '42501', null, 'authenticated RLS''i kapatamaz');
select throws_ok($$ drop policy profiles_select_own on public.profiles $$, '42501', null, 'authenticated politika silemez');
select throws_ok($$ truncate public.questions $$, '42501', null, 'authenticated TRUNCATE yapamaz');
select tests.login_anon();
select throws_ok($$ select private.is_admin() $$, '42501', null, 'anon private yardımcılarını çağıramaz');
select throws_ok($$ select * from private.is_admin() $$, '42501', null, 'anon private şemasına erişemez');
select tests.login_service();
select throws_ok($$ select private.grant_admin('veli.a@pgtap.test') $$, '42501', null, 'servis rolü bile private.grant_admin çağıramaz (yonetici yalnızca SQL ile)');
select throws_ok($$ select private.write_audit('sahte', 'x') $$, '42501', null, 'servis rolü write_audit çağıramaz');
select tests.logout();

-- grant_admin: yalnızca SQL oturumu, temiz veli hesabı
select throws_ok($$ select private.grant_admin('yok@pgtap.test') $$, 'P0002', null, 'olmayan kullanıcı için grant_admin hata verir');
select throws_ok($$ select private.grant_admin('veli.a@pgtap.test') $$, '23514', null, 'bağlı çocuğu olan veli hesabı yönetici yapılamaz');
select throws_ok($$ select private.grant_admin('yonetici@pgtap.test') $$, '23514', null, 'zaten yönetici olan hesap için grant_admin reddedilir (yalnızca veli)');

select * from finish();
rollback;
