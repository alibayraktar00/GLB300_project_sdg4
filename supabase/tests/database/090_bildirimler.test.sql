-- =====================================================================
-- 090 · BİLDİRİMLER (migration 19): olayların ürettiği uygulama içi bildirimler
-- Fixture: m1 = ogr_a1 + gon_x (aktif); veli_a ogr_a1 velisi; q1 gon_x'e atanmış; s1 planlı ders.
-- =====================================================================
begin;
select plan(11);
select tests.make_fixture();
delete from public.notifications;   -- fixture sırasında üretilenleri temizle

-- Cevap -> öğrenci ve veli
select tests.login('gon_x');
select lives_ok($$ select public.post_message(tests.id('q1'), 'Önce iki taraftan 5 çıkar.', array[]::text[]) $$, 'gönüllü cevap yazdı');
select tests.logout();
select is((select count(*)::int from public.notifications where user_id = tests.id('ogr_a1') and type = 'yeni_cevap'), 1, 'öğrenciye yeni_cevap bildirimi');
select is((select count(*)::int from public.notifications where user_id = tests.id('veli_a') and type = 'yeni_cevap'), 1, 'veliye yeni_cevap bildirimi');
select is((select title from public.notifications where user_id = tests.id('ogr_a1') and type = 'yeni_cevap'), 'Sorun cevaplandı', 'başlık genel (kişisel veri yok)');
select is((select data ->> 'path' from public.notifications where user_id = tests.id('ogr_a1') and type = 'yeni_cevap'), '/ogrenci/sorular/' || tests.id('q1')::text, 'yol soru sayfasına gider');

-- Takip sorusu -> gönüllü
select tests.login('ogr_a1');
select lives_ok($$ select public.post_message(tests.id('q1'), 'Neden 15?', array[]::text[]) $$, 'öğrenci takip sorusu yazdı');
select tests.logout();
select is((select count(*)::int from public.notifications where user_id = tests.id('gon_x') and type = 'yeni_takip'), 1, 'gönüllüye yeni_takip bildirimi');

-- Ders iptali -> öğrenci, veli, gönüllü
select tests.login('veli_a');
select lives_ok($$ select public.cancel_session(tests.id('s1'), 'zaman_uygun_degil') $$, 'veli dersi iptal etti');
select tests.logout();
select is((select count(*)::int from public.notifications where type = 'ders_iptal' and user_id in (tests.id('ogr_a1'), tests.id('veli_a'), tests.id('gon_x'))), 3, 'üç tarafa da iptal bildirimi');

-- Okuma: yalnızca kendi bildirimleri; istemci ekleyemez
select tests.login('ogr_a1');
select ok((select bool_and(user_id = tests.id('ogr_a1')) from public.notifications), 'öğrenci yalnızca kendi bildirimlerini görür');
select throws_ok($$ insert into public.notifications (user_id, type, title) values (tests.id('ogr_a1'), 'sahte', 'Sahte bildirim') $$, '42501', null, 'istemci bildirim ekleyemez');
select tests.logout();

select * from finish();
rollback;
