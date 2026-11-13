-- Kayıt tetikleyicisi (private.handle_new_user): auth.users'a eklenen kullanıcı için profil oluşturur.
-- GoTrue'nun kayıtta yaptığı gibi doğrudan auth.users'a ekleriz; meta veri istemciden gelen kısımdır.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

-- Veli kaydı: profil 'aktif' olarak oluşur.
select lives_ok($$
  insert into auth.users (id, email, raw_user_meta_data) values
    ('a0000000-0000-0000-0000-000000000001', 'yeni-veli@example.com', '{"role":"veli","display_name":"Yeni Veli"}')
$$, 'veli kayıt olabilir');
select is((select role || '/' || status || '/' || display_name from public.profiles
           where id = 'a0000000-0000-0000-0000-000000000001'),
  'veli/aktif/Yeni Veli', 'veli profili aktif olarak oluşur');

-- Gönüllü kaydı: doğrulanana kadar 'beklemede'.
select lives_ok($$
  insert into auth.users (id, email, raw_user_meta_data) values
    ('a0000000-0000-0000-0000-000000000002', 'yeni-gonullu@example.com', '{"role":"gonullu","display_name":"Yeni Gönüllü"}')
$$, 'gönüllü kayıt olabilir');
select is((select role || '/' || status from public.profiles where id = 'a0000000-0000-0000-0000-000000000002'),
  'gonullu/beklemede', 'gönüllü profili beklemede olarak oluşur');

-- Reddedilenler: öğrenci, bilinmeyen rol, rol yok, boş ad. Hata kaydı tamamen geri alır.
select throws_ok($$
  insert into auth.users (id, email, raw_user_meta_data) values
    ('a0000000-0000-0000-0000-000000000003', 'ogrenci@example.com', '{"role":"ogrenci","display_name":"Öğrenci"}')
$$, '22023', null, 'öğrenci kendi başına kayıt olamaz');
select throws_ok($$
  insert into auth.users (id, email, raw_user_meta_data) values
    ('a0000000-0000-0000-0000-000000000004', 'admin@example.com', '{"role":"admin","display_name":"Admin"}')
$$, '22023', null, 'bilinmeyen rol reddedilir');
select throws_ok($$
  insert into auth.users (id, email, raw_user_meta_data) values
    ('a0000000-0000-0000-0000-000000000005', 'rolsuz@example.com', '{"display_name":"Rolsüz"}')
$$, '22023', null, 'rol gönderilmezse reddedilir');
select throws_ok($$
  insert into auth.users (id, email, raw_user_meta_data) values
    ('a0000000-0000-0000-0000-000000000006', 'adsiz@example.com', '{"role":"veli","display_name":"  "}')
$$, '22023', null, 'boş display_name reddedilir');
select is((select count(*)::int from auth.users where id in (
    'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004',
    'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000006')),
  0, 'reddedilen kayıtlar auth.users''a da yazılmaz');

-- Sunucunun oluşturduğu kullanıcı (ör. velinin eklediği öğrenci): tetikleyici atlar, profil oluşturmaz.
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000007', 'sunucu-ogrenci@example.com',
   '{"profile_created_by_server":true}', '{"role":"ogrenci"}');
select is((select count(*)::int from public.profiles where id = 'a0000000-0000-0000-0000-000000000007'),
  0, 'sunucunun oluşturduğu kullanıcı için tetikleyici profil açmaz');

select * from finish();
rollback;
