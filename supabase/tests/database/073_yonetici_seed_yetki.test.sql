-- =====================================================================
-- 073 · YÖNETİCİ SERTLEŞTİRME · SEED KİLİDİ · FONKSİYON VARSAYILAN YETKİLERİ · ASKIDAKİ KULLANICI
-- D4: is_admin() son 12 saatte TOTP doğrulaması (amr) ister; grant_admin doğrulanmış e-posta + MFA ister,
--     askıdaki hesabı sessizce aktif yapmaz; rol değişikliği yalnızca grant_admin/revoke_admin ile.
-- O4: seed kilidi (örnek olmayan kullanıcı ya da app.ortam='uzak' ise seed durur).
-- Ö-5/D1/S4: yeni fonksiyon = PUBLIC/anon/authenticated erişimi YOK.
-- D5/S7: askıdaki kullanıcı cihaz jetonu ekleyemez, kendi yüklediği nesneyi okuyamaz.
-- =====================================================================
begin;
select plan(51);
select tests.make_fixture();

-- ====================== is_admin(): son 12 saatte TOTP ======================
select tests.login('admin', 'aal2', 3600);
select ok(private.is_admin(), '1 saat önce TOTP doğrulanmış aal2 oturum -> yönetici');
select tests.login('admin', 'aal2', 43000);
select ok(private.is_admin(), '12 saatten az (43000 sn) önce TOTP -> yönetici');
select tests.login('admin', 'aal2', 43300);
select ok(not private.is_admin(), '12 saatten eski TOTP doğrulaması -> yönetici DEĞİL (yeniden doğrulama gerekir)');
select is(tests.cnt($$ select 1 from public.students where profile_id = any (tests.fixture_user_ids()) $$), 0::bigint, 'eski TOTP ile öğrenci verisi görünmez');
select tests.login_claims('admin', '{"aal":"aal2"}');
select ok(not private.is_admin(), 'aal2 ama amr dizisi hiç yok -> yönetici değil');
select tests.login_claims('admin', jsonb_build_object('aal', 'aal2', 'amr',
  jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', extract(epoch from now())::bigint))));
select ok(not private.is_admin(), 'aal2 iddiası ama amr içinde TOTP yok (yalnızca parola) -> yönetici değil');
select tests.login_claims('admin', jsonb_build_object('aal', 'aal2', 'amr',
  jsonb_build_array(jsonb_build_object('method', 'totp', 'timestamp', 'gecen hafta'))));
select ok(not private.is_admin(), 'sayısal olmayan TOTP zaman damgası hata VERMEZ, yönetici de saymaz');
select tests.login_claims('admin', jsonb_build_object('aal', 'aal2', 'amr', jsonb_build_array('totp')));
select ok(not private.is_admin(), 'biçimi bozuk amr dizisi hata VERMEZ, yönetici saymaz');
select tests.login_claims('admin', jsonb_build_object('aal', 'aal2', 'amr', 'totp'));
select ok(not private.is_admin(), 'amr dizi değilse hata VERMEZ, yönetici saymaz');
select tests.login('veli_a', 'aal2', 10);
select ok(not private.is_admin(), 'veli + taze TOTP -> yönetici değil (rol şart)');

-- ====================== grant_admin / revoke_admin ======================
select tests.logout();
select tests.signup('adm2', 'adm2@pgtap.test', '{"role":"veli","display_name":"Yeni Yonetici"}');
select throws_ok($$ select private.grant_admin('adm2@pgtap.test') $$, '23514', 'grant_admin: doğrulanmış TOTP (MFA) faktörü yok',
  'MFA faktörü olmayan hesap yönetici yapılamaz');
insert into auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at) values (tests.id('f1'), tests.id('adm2'), 'totp', 'unverified', now(), now());
select throws_ok($$ select private.grant_admin('adm2@pgtap.test') $$, '23514', 'grant_admin: doğrulanmış TOTP (MFA) faktörü yok',
  'doğrulanmamış (unverified) faktör yetmez');
update auth.mfa_factors set status = 'verified', factor_type = 'phone' where id = tests.id('f1');
select throws_ok($$ select private.grant_admin('adm2@pgtap.test') $$, '23514', 'grant_admin: doğrulanmış TOTP (MFA) faktörü yok',
  'TOTP dışındaki faktör (telefon) yetmez');
update auth.mfa_factors set factor_type = 'totp' where id = tests.id('f1');
update auth.users set email_confirmed_at = null where id = tests.id('adm2');
select throws_ok($$ select private.grant_admin('adm2@pgtap.test') $$, '23514', 'grant_admin: e-posta doğrulanmamış', 'e-postası doğrulanmamış hesap yönetici yapılamaz');
update auth.users set email_confirmed_at = now() where id = tests.id('adm2');
update public.profiles set status = 'askida' where id = tests.id('adm2');
select throws_ok($$ select private.grant_admin('adm2@pgtap.test') $$, '23514', 'grant_admin: hesap aktif değil (durum: askida); önce hesabı inceleyin',
  'askıdaki hesap yönetici yapılamaz (sessizce aktifleştirilmez)');
select is((select role || '/' || status from public.profiles where id = tests.id('adm2')), 'veli/askida', 'reddedilen girişim hiçbir şeyi değiştirmedi');
update public.profiles set status = 'aktif' where id = tests.id('adm2');
select lives_ok($$ select private.grant_admin('adm2@pgtap.test') $$, 'e-postası ve TOTP faktörü doğrulanmış, aktif hesap yönetici yapılabilir');
select is((select role from public.profiles where id = tests.id('adm2')), 'yonetici', 'rol verildi');
select is((select count(*) from public.audit_log where action = 'profil_rol_degisti' and entity_id = tests.id('adm2')::text), 1::bigint, 'rol değişikliği denetim kaydına yazıldı');

-- Rol yalnızca bu fonksiyonlarla değişir (SQL oturumu bile doğrudan değiştiremez)
select throws_ok($$ update public.profiles set role = 'yonetici' where id = tests.id('veli_b') $$, '42501', 'profiles.role yalnızca private.grant_admin / revoke_admin ile değiştirilebilir',
  'doğrudan UPDATE ile rol yükseltilemez (SQL oturumu dahil)');
select throws_ok($$ update public.profiles set role = 'veli' where id = tests.id('adm2') $$, '42501', null, 'doğrudan UPDATE ile rol düşürülemez de');
select set_config('app.rol_degisikligi_hedef', tests.id('veli_a')::text, true);
select throws_ok($$ update public.profiles set role = 'yonetici' where id = tests.id('veli_b') $$, '42501', null,
  'işlem bayrağı başka bir kullanıcı için kurulmuşsa bu kullanıcının rolü değişmez');
select set_config('app.rol_degisikligi_hedef', '', true);
select lives_ok($$ select private.revoke_admin('adm2@pgtap.test') $$, 'revoke_admin yöneticiyi veliye düşürür');
select is((select role from public.profiles where id = tests.id('adm2')), 'veli', 'rol düşürüldü');
select tests.login('veli_a');
select throws_ok($$ select private.revoke_admin('adm2@pgtap.test') $$, '42501', null, 'revoke_admin istemciden çağrılamaz');

-- ====================== Yeni fonksiyon = varsayılan olarak kapalı (S4) ======================
select tests.logout();
create function public.ornek_yeni_rpc() returns text language sql security definer set search_path = '' as $$ select 'calisti'::text $$;
create function private.ornek_yeni_yardimci() returns text language sql security definer set search_path = '' as $$ select 'calisti'::text $$;
select ok(not has_function_privilege('anon', 'public.ornek_yeni_rpc()', 'execute'), 'yeni public fonksiyonu anon''a KAPALI (PUBLIC yetkisi yok)');
select ok(not has_function_privilege('authenticated', 'public.ornek_yeni_rpc()', 'execute'), 'yeni public fonksiyonu authenticated''a da KAPALI (backend açıkça GRANT eder)');
select ok(not has_function_privilege('service_role', 'public.ornek_yeni_rpc()', 'execute'), 'yeni public fonksiyonu service_role''e de kapalı');
select ok(not has_function_privilege('authenticated', 'private.ornek_yeni_yardimci()', 'execute'), 'yeni private fonksiyonu authenticated''a kapalı');
create function extensions.ornek_eklenti_fonksiyonu() returns int language sql immutable as $$ select 1 $$;
select ok(has_function_privilege('authenticated', 'extensions.ornek_eklenti_fonksiyonu()', 'execute'),
  '"extensions" şemasındaki (eklenti) fonksiyonlar çalışmaya devam eder (varsayılan yetki iptali eklentileri bozmaz)');

-- ====================== Askıdaki kullanıcı (D5) ======================
update public.profiles set status = 'askida' where id in (tests.id('ogr_a1'), tests.id('veli_a'), tests.id('gon_z'));
insert into storage.objects (bucket_id, name, owner_id) values
  ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('askida_dosya')::text || '.jpg', tests.id('ogr_a1')::text),
  ('gonullu-belgeleri', tests.id('gon_z')::text || '/' || tests.id('askida_belge')::text || '.pdf', tests.id('gon_z')::text);
select tests.login('ogr_a1');
select throws_ok($$ select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/askida-ogrenci-aaaaaaaaaa', repeat('A', 87), repeat('a', 22)) $$, '42501',
  'register_push_subscription: hesap aktif değil', 'askıdaki öğrenci push aboneliği ekleyemez (S7: push almaya devam edemez)');
select is(tests.cnt($$ select 1 from storage.objects where bucket_id = 'soru-ekleri' $$), 0::bigint, 'askıdaki öğrenci kendi yüklediği nesneyi artık okuyamaz');
select tests.login('veli_a');
select is(public.remove_push_subscription('https://fcm.googleapis.com/fcm/send/veli-a-aaaaaaaaaaaaaaaaaaaaaaaa'), true, 'askıdaki veli push aboneliğini SİLEBİLİR (çıkış)');
select tests.login('gon_z');
select is(tests.cnt($$ select 1 from storage.objects where bucket_id = 'gonullu-belgeleri' $$), 0::bigint, 'askıdaki gönüllü kendi belge nesnesini okuyamaz');
select tests.logout();
update public.profiles set status = 'aktif' where id in (tests.id('ogr_a1'), tests.id('veli_a'), tests.id('gon_z'));
select tests.login('ogr_a1');
select is(tests.cnt($$ select 1 from storage.objects where bucket_id = 'soru-ekleri' $$), 1::bigint, 'hesap yeniden aktif olunca sahip nesnesini yine okur');
select lives_ok($$ select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/aktif-ogrenci-aaaaaaaaaa', repeat('A', 87), repeat('a', 22)) $$, 'aktif öğrenci push aboneliği ekler');


-- ====================== Seed kilidi ======================
-- Saf mantık (private.seed_engel_nedeni): mevcut e-posta listesi ve app.ortam ayarına bakar; NULL = seed çalışabilir.
select tests.logout();
select is(private.seed_engel_nedeni(array[]::text[]), null, 'boş veritabanında seed çalışabilir');
select is(private.seed_engel_nedeni(array['veli1@ornek.test', 'yonetici@ornek.test', 'gonullu1@ornek-universite.edu.tr', 'mavikus@ogrenci.ornek.test']), null,
  'yalnızca seed''in kendi (tam eşleşen) adresleri varken çalışabilir');
select isnt(private.seed_engel_nedeni(array['veli1@ornek.test', 'gercek.kisi@ornek.test']), null,
  'seed listesinde olmayan, "@ornek.test" ile biten adres bile seed''i durdurur (S8)');
select isnt(private.seed_engel_nedeni(array['x@alt.ornek-universite.edu.tr']), null, 'alt alan adlı adres (eski regex ile geçebilen) artık geçmez');
select isnt(private.seed_engel_nedeni(array['VELI1@ORNEK.TEST ', 'ali@gmail.com']), null, 'gerçek adresler durdurur');
select is(private.seed_engel_nedeni(array['VELI1@ORNEK.TEST']), null, 'büyük/küçük harf farkı seed adresini bozmaz');
select set_config('app.ortam', 'uzak', true);
select is(private.seed_engel_nedeni(array[]::text[]), 'seed.sql uzak projede çalıştırılamaz: app.ortam = uzak',
  'app.ortam = uzak işaretli projede seed BOŞ veritabanında bile durur');
select throws_ok($$ select private.assert_seed_allowed() $$, 'P0001', 'seed.sql uzak projede çalıştırılamaz: app.ortam = uzak', 'assert_seed_allowed hatayı fırlatır');
select set_config('app.ortam', 'yerel', true);
select is(private.seed_engel_nedeni(array[]::text[]), null, 'app.ortam = yerel ise izinli');
select set_config('app.ortam', '', true);
-- Uçtan uca: bu veritabanında test kullanıcıları (seed dışı adresler) var
select throws_ok($$ select private.assert_seed_allowed() $$, 'P0001', null, 'gerçek kullanıcı (burada: test kullanıcıları) varken assert_seed_allowed durur');
select tests.login_anon();
select throws_ok($$ select private.assert_seed_allowed() $$, '42501', null, 'anon seed kilidini çağıramaz');
select tests.login('veli_a');
select throws_ok($$ select private.seed_engel_nedeni(array[]::text[]) $$, '42501', null, 'istemci seed kilidi mantığını çağıramaz');
select tests.logout();

-- Seed ÇALIŞTIRILMIŞSA (npm run test:seed / yerel db reset) seed.sql'in bıraktığı durum: onaylı gönüllü, eşleşme ve yönetici YOK (O4).
-- Seed çalışmadıysa bu sorgular doğal olarak 0 döner. Onay ve eşleşme yalnızca seed/yerel/ betiklerindedir.
select is((select count(*) from public.volunteers v join auth.users u on u.id = v.profile_id
            where u.email like '%@ornek-universite.edu.tr' and v.status <> 'basvuru'), 0::bigint,
  'seed: örnek gönüllülerin hiçbiri onaylı değil (bilinen parolalı onaylı gönüllü uzak projeye sızamaz)');
select is((select count(*) from public.matches m join auth.users u on u.id = m.volunteer_id where u.email like '%@ornek-universite.edu.tr'), 0::bigint,
  'seed: örnek gönüllülerin eşleşmesi yok (çocuk verisine erişen hesap yok)');
select is((select count(*) from public.profiles p join auth.users u on u.id = p.id where u.email like '%@ornek.test' and p.role = 'yonetici'), 0::bigint,
  'seed: yönetici rolünde örnek hesap yok');

select * from finish();
rollback;
