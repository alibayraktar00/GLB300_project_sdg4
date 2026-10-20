-- =====================================================================
-- 060 · STORAGE POLİTİKALARI (storage.objects) — yol bazlı erişim
--   soru-ekleri        {student_id}/{question_id}/{uuid}.jpg|m4a|aac|webm
--   gonullu-belgeleri  {volunteer_id}/{uuid}.pdf|jpg
-- Not: Gerçek yüklemede Storage API owner_id'yi JWT'den kendisi yazar; burada
-- doğrudan INSERT ile aynı politika kontrolü simüle edilir.
-- =====================================================================
begin;
select plan(55);
select tests.make_fixture();

-- Önceden var olan nesneler (SQL oturumu = servis tarafı)
insert into public.attachments (id, message_id, storage_path, kind, mime, size_bytes) values
  (tests.id('att_hid'), tests.id('msg3'),
   tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('hid')::text || '.jpg', 'foto', 'image/jpeg', 1000);
insert into storage.objects (bucket_id, name, owner_id) values
  ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('file1')::text || '.jpg',  tests.id('ogr_a1')::text),
  ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('orphan')::text || '.jpg', tests.id('ogr_a1')::text),
  ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('hid')::text || '.jpg',    null),
  ('gonullu-belgeleri', tests.id('gon_z')::text || '/' || tests.id('docfile_z')::text || '.pdf', tests.id('gon_z')::text),
  ('gonullu-belgeleri', tests.id('gon_x')::text || '/' || tests.id('docfile_x')::text || '.pdf', tests.id('gon_x')::text);

-- ====================== soru-ekleri: YÜKLEME ======================
select tests.login_anon();
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('soru-ekleri', 'a/b/c.jpg') $$, '42501', null, 'anon yükleyemez');

select tests.login('ogr_a1');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('yeni1')::text || '.jpg', tests.id('ogr_a1')::text)
     returning id $$,
  'öğrenci kendi klasörüne yükler (INSERT ... RETURNING dahil)');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('henuz_yok')::text || '/' || tests.id('yeni2')::text || '.jpg', tests.id('ogr_a1')::text) $$,
  'öğrenci henüz oluşmamış soru kimliği için de yükleyebilir (ask_question yolu sonra doğrular)');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('soru-ekleri', tests.id('ogr_b1')::text || '/' || tests.id('q2')::text || '/' || tests.id('yeni3')::text || '.jpg') $$,
  '42501', null, 'öğrenci BAŞKA öğrencinin klasörüne yükleyemez');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q2')::text || '/' || tests.id('yeni4')::text || '.jpg') $$,
  '42501', null, 'öğrenci başkasına ait sorunun yoluna (q2) yükleyemez');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('yeni5')::text || '.exe') $$,
  '42501', null, 'izinli olmayan uzantı reddedilir');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('yeni6')::text || '.jpg') $$,
  '42501', null, 'yol {öğrenci}/{soru}/{dosya} biçiminde olmalı (iki parçalı yol reddedilir)');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/../' || tests.id('yeni7')::text || '.jpg') $$,
  '42501', null, 'yol gezinme (../) reddedilir');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('soru-ekleri', upper(tests.id('ogr_a1')::text) || '/' || tests.id('q1')::text || '/' || tests.id('yeni8')::text || '.jpg') $$,
  '42501', null, 'büyük harfli (kanonik olmayan) kimlik reddedilir');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('gonullu-belgeleri', tests.id('ogr_a1')::text || '/' || tests.id('yeni9')::text || '.pdf') $$,
  '42501', null, 'öğrenci gönüllü belgeleri bucket''ına yükleyemez');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('baska-bucket', tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('y10')::text || '.jpg') $$,
  '42501', null, 'tanımsız bucket''a yazma politikası yok');

select tests.login('veli_a');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('v1')::text || '.jpg') $$,
  '42501', null, 'veli çocuğunun sorusuna dosya yükleyemez');
select tests.login('ogr_b1');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('v2')::text || '.jpg') $$,
  '42501', null, 'başka öğrenci yükleyemez');

select tests.login('gon_x');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('cevap1')::text || '.m4a', tests.id('gon_x')::text) $$,
  'atanmış gönüllü, sorusuna sesli cevap yükleyebilir');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q4')::text || '/' || tests.id('cevap2')::text || '.m4a') $$,
  '42501', null, 'gönüllü başkasına atanmış soruya yükleyemez');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('soru-ekleri', tests.id('ogr_b1')::text || '/' || tests.id('q2')::text || '/' || tests.id('cevap3')::text || '.m4a') $$,
  '42501', null, 'gönüllü HAVUZ sorusuna önce üstlenmeden (claim_question) yükleyemez');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('soru-ekleri', tests.id('ogr_b1')::text || '/' || tests.id('q1')::text || '/' || tests.id('cevap4')::text || '.m4a') $$,
  '42501', null, 'gönüllü, soru ile uyuşmayan öğrenci klasörüne yükleyemez');
select tests.login('gon_y');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q4')::text || '/' || tests.id('cevap5')::text || '.m4a') $$,
  'başka bir atanmış gönüllü kendi sorusuna yükleyebilir');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('cevap6')::text || '.m4a') $$,
  '42501', null, 'eşleşmemiş gönüllü başkasının sorusuna yükleyemez');
select tests.login('gon_z');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('cevap7')::text || '.m4a') $$,
  '42501', null, 'onaysız gönüllü yükleyemez');
select tests.login('admin', 'aal2');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('adm1')::text || '.jpg') $$,
  '42501', null, 'yönetici soru eki yükleyemez');

-- ====================== soru-ekleri: OKUMA ======================
select tests.login_anon();
select is(tests.cnt($$ select 1 from storage.objects where bucket_id = 'soru-ekleri' $$), 0::bigint, 'anon hiçbir nesneyi göremez');

select tests.login('ogr_a1');
select is(tests.cnt($$ select 1 from storage.objects where name like '%' || tests.id('file1')::text || '.jpg' $$), 1::bigint, 'öğrenci eki olan nesnesini görür');
select is(tests.cnt($$ select 1 from storage.objects where name like '%' || tests.id('orphan')::text || '.jpg' $$), 1::bigint,
  'öğrenci, kendi yüklediği (henüz eke bağlanmamış) nesneyi görür');
select is(tests.cnt($$ select 1 from storage.objects where name like '%' || tests.id('hid')::text || '.jpg' $$), 0::bigint,
  'GİZLENMİŞ mesajın ekine (yükleyen kayıtlı değilse) erişilemez');
select tests.login('veli_a');
select is(tests.cnt($$ select 1 from storage.objects where name like '%' || tests.id('file1')::text || '.jpg' $$), 1::bigint, 'veli çocuğunun ekini görür');
select is(tests.cnt($$ select 1 from storage.objects where name like '%' || tests.id('orphan')::text || '.jpg' $$), 0::bigint, 'veli eke bağlanmamış nesneyi görmez');
select is(tests.cnt($$ select 1 from storage.objects where name like '%' || tests.id('hid')::text || '.jpg' $$), 0::bigint, 'veli gizlenmiş mesajın ekini görmez');
select tests.login('veli_b');
select is(tests.cnt($$ select 1 from storage.objects where bucket_id = 'soru-ekleri' $$), 0::bigint, 'başka veli çocuğun hiçbir dosyasını göremez');
select tests.login('ogr_b1');
select is(tests.cnt($$ select 1 from storage.objects where bucket_id = 'soru-ekleri' and name like tests.id('ogr_a1')::text || '/%' $$), 0::bigint,
  'başka öğrenci bu öğrencinin dosyalarını göremez');
select tests.login('gon_x');
select is(tests.cnt($$ select 1 from storage.objects where name like '%' || tests.id('file1')::text || '.jpg' $$), 1::bigint, 'atanmış gönüllü soru ekini görür');
select is(tests.cnt($$ select 1 from storage.objects where name like '%' || tests.id('hid')::text || '.jpg' $$), 0::bigint, 'gönüllü gizlenmiş mesajın ekini görmez');
select tests.login('gon_y');
select is(tests.cnt($$ select 1 from storage.objects where name like '%' || tests.id('file1')::text || '.jpg' $$), 0::bigint, 'eşleşmemiş gönüllü eki göremez');
select tests.login('admin');
select is(tests.cnt($$ select 1 from storage.objects where bucket_id = 'soru-ekleri' and name like tests.id('ogr_a1')::text || '/%' $$), 0::bigint, 'yönetici aal1 dosya göremez');
select tests.login('admin', 'aal2');
select is(tests.cnt($$ select 1 from storage.objects where bucket_id = 'soru-ekleri' and name like tests.id('ogr_a1')::text || '/%'
                       and name ~ ('(' || tests.id('file1')::text || '|' || tests.id('orphan')::text || '|' || tests.id('hid')::text || ')') $$), 3::bigint,
  'yönetici aal2 tüm soru eklerini (gizlenmiş dahil) görür');

-- Değiştirme ve silme yok
select tests.login('ogr_a1');
select is(tests.affected($$ delete from storage.objects where bucket_id = 'soru-ekleri' and name like '%' || tests.id('file1')::text || '.jpg' $$), 0::bigint,
  'öğrenci kendi yüklediği dosyayı SİLEMEZ');
select is(tests.affected($$ update storage.objects set name = name || 'x' where bucket_id = 'soru-ekleri' and name like '%' || tests.id('file1')::text || '.jpg' $$), 0::bigint,
  'dosya adı/üzerine yazma (upsert) yapılamaz');
select tests.login('gon_x');
select is(tests.affected($$ delete from storage.objects where bucket_id = 'soru-ekleri' $$), 0::bigint, 'gönüllü dosya silemez');
select tests.login('admin', 'aal2');
select is(tests.affected($$ delete from storage.objects where bucket_id = 'soru-ekleri' $$), 0::bigint, 'yönetici istemciden dosya silemez (servis rolü / cleanup)');

-- ====================== gonullu-belgeleri ======================
select tests.login('gon_z');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('gonullu-belgeleri', tests.id('gon_z')::text || '/' || tests.id('belge1')::text || '.pdf', tests.id('gon_z')::text) returning id $$,
  'başvuru aşamasındaki gönüllü kendi klasörüne PDF yükler');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('gonullu-belgeleri', tests.id('gon_z')::text || '/' || tests.id('belge2')::text || '.jpg', tests.id('gon_z')::text) $$,
  'JPG yükleyebilir');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('gonullu-belgeleri', tests.id('gon_z')::text || '/' || tests.id('belge3')::text || '.exe') $$,
  '42501', null, 'izinsiz uzantı reddedilir');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('gonullu-belgeleri', tests.id('gon_x')::text || '/' || tests.id('belge4')::text || '.pdf') $$,
  '42501', null, 'başka gönüllünün klasörüne yüklenemez');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('gonullu-belgeleri', tests.id('gon_z')::text || '/alt/' || tests.id('belge5')::text || '.pdf') $$,
  '42501', null, 'alt klasörlü yol reddedilir');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('soru-ekleri', tests.id('gon_z')::text || '/' || tests.id('belge6')::text || '.pdf') $$,
  '42501', null, 'gönüllü belgesi soru-ekleri bucket''ına yüklenemez');
select is(tests.cnt($$ select 1 from storage.objects where bucket_id = 'gonullu-belgeleri' $$), 3::bigint, 'gönüllü yalnızca kendi belgelerini görür (3 nesne)');
select is(tests.cnt($$ select 1 from storage.objects where name like tests.id('gon_x')::text || '/%' $$), 0::bigint, 'başka gönüllünün belgesini göremez');
select is(tests.affected($$ delete from storage.objects where bucket_id = 'gonullu-belgeleri' $$), 0::bigint, 'gönüllü belgesini silemez');

select tests.login('gon_x');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('gonullu-belgeleri', tests.id('gon_x')::text || '/' || tests.id('belge7')::text || '.pdf') $$,
  '42501', null, 'ONAYLANMIŞ gönüllü artık belge yükleyemez (başvuru kilitli)');
select is(tests.cnt($$ select 1 from storage.objects where bucket_id = 'gonullu-belgeleri' $$), 1::bigint, 'onaylı gönüllü yalnızca kendi belgesini görür');
select tests.login('veli_a');
select is(tests.cnt($$ select 1 from storage.objects where bucket_id = 'gonullu-belgeleri' $$), 0::bigint, 'veli gönüllü belgesi göremez');
select tests.login('ogr_a1');
select is(tests.cnt($$ select 1 from storage.objects where bucket_id = 'gonullu-belgeleri' $$), 0::bigint, 'öğrenci gönüllü belgesi göremez');
select tests.login('admin');
select is(tests.cnt($$ select 1 from storage.objects where bucket_id = 'gonullu-belgeleri' $$), 0::bigint, 'yönetici aal1 belge göremez');
select tests.login('admin', 'aal2');
select ok(tests.cnt($$ select 1 from storage.objects where bucket_id = 'gonullu-belgeleri' $$) >= 2, 'yönetici aal2 belgeleri görür');
select tests.login_anon();
select is(tests.cnt($$ select 1 from storage.objects where bucket_id = 'gonullu-belgeleri' $$), 0::bigint, 'anon belge göremez');

select * from finish();
rollback;
