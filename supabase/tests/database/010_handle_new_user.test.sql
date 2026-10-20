-- =====================================================================
-- 010 · KAYIT KURALLARI  (handle_new_user ve e-posta tetikleyicileri)
-- Kural: kendi kendine kayıtta yalnızca veli ve gonullu; gönüllü e-postası
-- .edu.tr; ogrenci yalnızca app_metadata (servis rolü) ile; yonetici yalnızca SQL ile.
-- =====================================================================
begin;
select plan(29);

select has_trigger('auth', 'users', 'on_auth_user_created', 'auth.users üzerinde kayıt tetikleyicisi var');
select has_trigger('auth', 'users', 'on_auth_user_email_changed', 'auth.users üzerinde e-posta değişikliği tetikleyicisi var');

-- --- Geçerli kayıtlar ------------------------------------------------
select tests.signup('v1', 'veli1@pgtap.test', '{"role":"veli","display_name":"Ayse"}');
select results_eq(
  $$ select role, display_name, status from public.profiles where id = tests.id('v1') $$,
  $$ values ('veli'::text, 'Ayse'::text, 'aktif'::text) $$,
  'veli kaydı: profil oluşur (rol veli, durum aktif, görünen ad korunur)');

select tests.signup('g1', 'g1@ogr.uni.edu.tr', '{"role":"gonullu","display_name":"Mehmet"}');
select is((select role from public.profiles where id = tests.id('g1')), 'gonullu',
  'gönüllü kaydı: .edu.tr e-postasıyla kabul edilir');

select tests.signup('g2', 'AYSE.K@OGR.UNI.EDU.TR', '{"role":"gonullu"}');
select is((select role from public.profiles where id = tests.id('g2')), 'gonullu',
  'gönüllü e-postası büyük/küçük harf duyarsız doğrulanır');

-- --- Gönüllü e-posta kuralı ----------------------------------------------
select throws_ok($$ select tests.signup('x1', 'gonullu@gmail.com', '{"role":"gonullu"}') $$, '23514', null,
  'gönüllü: gmail adresiyle kayıt reddedilir');
select throws_ok($$ select tests.signup('x2', 'gonullu@edu.tr', '{"role":"gonullu"}') $$, '23514', null,
  'gönüllü: alt alan adı olmayan "edu.tr" reddedilir');
select throws_ok($$ select tests.signup('x3', 'gonullu@evil-edu.tr', '{"role":"gonullu"}') $$, '23514', null,
  'gönüllü: "evil-edu.tr" gibi benzer alan adı reddedilir');
select throws_ok($$ select tests.signup('x4', 'gonullu@uni.edu.tr.evil.com', '{"role":"gonullu"}') $$, '23514', null,
  'gönüllü: ".edu.tr" ile BİTMEYEN adres reddedilir');
select throws_ok($$ select tests.signup('x5', '@uni.edu.tr', '{"role":"gonullu"}') $$, '23514', null,
  'gönüllü: yerel kısmı olmayan adres reddedilir');

-- --- Yasak roller ----------------------------------------------------------
select throws_ok($$ select tests.signup('x6', 'ogr@pgtap.test', '{"role":"ogrenci"}') $$, '42501', null,
  'öğrenci rolü user_metadata (istemci) ile alınamaz');
select throws_ok($$ select tests.signup('x7', 'adm@pgtap.test', '{"role":"yonetici"}') $$, '42501', null,
  'yonetici rolü user_metadata (istemci) ile alınamaz');
select throws_ok($$ select tests.signup('x8', 'bos@pgtap.test', '{}') $$, '42501', null,
  'rol belirtilmemiş kayıt reddedilir (sessizce veli yapılmaz)');
select throws_ok($$ select tests.signup('x9', 'buyuk@pgtap.test', '{"role":"VELI"}') $$, '42501', null,
  'bilinmeyen/biçimsiz rol değeri reddedilir');
select throws_ok($$ select tests.signup('x10', 'adm2@pgtap.test', '{}', '{"role":"yonetici"}') $$, '42501', null,
  'yonetici rolü app_metadata ile de verilemez (yalnızca SQL)');
select throws_ok($$ insert into auth.users (id, email, is_anonymous) values (tests.id('anon1'), null, true) $$, '42501', null,
  'anonim oturum (rolsüz, e-postasız) kullanıcı oluşturamaz');
select throws_ok($$ select tests.signup('x12', null, '{"role":"veli"}') $$, '23514', null,
  'e-postasız veli kaydı reddedilir');

-- --- Öğrenci: yalnızca servis rolünün yazabildiği app_metadata ile ---------------
select tests.signup('o1', 'o1@ogrenci.pgtap.test', '{"display_name":"Mavi Kus"}', '{"role":"ogrenci"}');
select results_eq(
  $$ select role, display_name from public.profiles where id = tests.id('o1') $$,
  $$ values ('ogrenci'::text, 'Mavi Kus'::text) $$,
  'öğrenci: app_metadata (servis rolü) ile oluşturulur, rumuz korunur');

select tests.signup('o2', 'o2@ogrenci.pgtap.test', '{"role":"veli"}', '{"role":"ogrenci"}');
select is((select role from public.profiles where id = tests.id('o2')), 'ogrenci',
  'app_metadata, user_metadata''dan önceliklidir (istemci rolü geçersiz kılamaz)');

-- --- Görünen ad temizliği -------------------------------------------------------
select tests.signup('d1', 'd1@pgtap.test', '{"role":"veli","display_name":"ali@gmail.com"}');
select is((select display_name from public.profiles where id = tests.id('d1')), 'Veli',
  'e-posta benzeri görünen ad varsayılana çevrilir');

select tests.signup('d2', 'd2@ogr.uni.edu.tr', '{"role":"gonullu","display_name":"   "}');
select is((select display_name from public.profiles where id = tests.id('d2')), 'Gönüllü',
  'boş görünen ad varsayılana çevrilir');

select tests.signup('d3', 'd3@pgtap.test', jsonb_build_object('role', 'veli', 'display_name', repeat('a', 80)));
select is((select char_length(display_name) from public.profiles where id = tests.id('d3')), 40,
  'uzun görünen ad 40 karaktere kırpılır');

-- --- E-posta değişikliği -----------------------------------------------------------
select throws_ok($$ update auth.users set email = 'g1@gmail.com' where id = tests.id('g1') $$, '23514', null,
  'gönüllü, e-postasını .edu.tr dışına çeviremez');
select lives_ok($$ update auth.users set email = 'g1.yeni@ogr.baska.edu.tr' where id = tests.id('g1') $$,
  'gönüllü, başka bir .edu.tr adresine geçebilir');
select lives_ok($$ update auth.users set email = 'veli1.yeni@gmail.com' where id = tests.id('v1') $$,
  'veli için e-posta alan adı kısıtı yok');

-- --- Yönetici: yalnızca SQL ile --------------------------------------------------------
select tests.signup('a1', 'yonetici-adayi@pgtap.test', '{"role":"veli","display_name":"Yonetici"}');
insert into auth.mfa_factors (id, user_id, factor_type, status, created_at, updated_at) values (tests.id('f_a1'), tests.id('a1'), 'totp', 'verified', now(), now());
select lives_ok($$ select private.grant_admin('yonetici-adayi@pgtap.test') $$, 'private.grant_admin SQL oturumunda çalışır (doğrulanmış e-posta + TOTP faktörü ile)');
select is((select role from public.profiles where id = tests.id('a1')), 'yonetici', 'yonetici rolü verildi');
select is(
  (select count(*) from public.audit_log where action = 'profil_rol_degisti' and entity_id = tests.id('a1')::text
     and details = '{"eski":"veli","yeni":"yonetici"}'::jsonb),
  1::bigint, 'rol değişikliği audit_log''a yazıldı');

select throws_ok($$ select private.grant_admin('g1.yeni@ogr.baska.edu.tr') $$, '23514', null,
  'gönüllü hesabı yönetici yapılamaz');

select * from finish();
rollback;
