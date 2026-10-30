-- =====================================================================
-- 084 · DERS BAĞLANTISI (migration 11): schedule_session, set_session_link, cancel_session, meeting_url CHECK
-- Fixture: m1 = ogr_a1 + gon_x (MAT, aktif); veli_a = ogr_a1'in velisi; gon_y eşleşmemiş onaylı gönüllü.
-- Zamanlar İstanbul saatine göre "bugün + N gün" olarak hesaplanır.
-- =====================================================================
begin;
select plan(44);
select tests.make_fixture();

-- ====================== meeting_url CHECK (doğrudan) ======================
select lives_ok($$ update public.sessions set meeting_url = 'https://meet.google.com/abc-defg-hij' where id = tests.id('s1') $$, 'Meet bağlantısı kabul');
select lives_ok($$ update public.sessions set meeting_url = 'https://us02web.zoom.us/j/12345678901?pwd=abcDEF123' where id = tests.id('s1') $$, 'Zoom bağlantısı kabul');
select lives_ok($$ update public.sessions set meeting_url = 'https://zoom.us/j/12345678901' where id = tests.id('s1') $$, 'alt alan adsız Zoom kabul');
select throws_ok($$ update public.sessions set meeting_url = 'https://evil.example.com/abc-defg-hij' where id = tests.id('s1') $$, '23514', null, 'başka site reddedilir');
select throws_ok($$ update public.sessions set meeting_url = 'http://meet.google.com/abc-defg-hij' where id = tests.id('s1') $$, '23514', null, 'https dışı reddedilir');
select throws_ok($$ update public.sessions set meeting_url = 'https://meet.google.com.evil.com/abc-defg-hij' where id = tests.id('s1') $$, '23514', null, 'alan adı sonekle uzatılmış (oltalama) reddedilir');
select throws_ok($$ update public.sessions set meeting_url = 'https://zoom.us.evil.com/j/123456789' where id = tests.id('s1') $$, '23514', null, 'zoom.us ile başlayan sahte alan adı reddedilir');
select throws_ok($$ update public.sessions set meeting_url = 'https://meet.google.com/abc-defg-hij@evil.com' where id = tests.id('s1') $$, '23514', null, 'kullanıcı bilgisi tuzağı (@) reddedilir');
select throws_ok($$ update public.sessions set meeting_url = 'javascript:alert(1)' where id = tests.id('s1') $$, '23514', null, 'javascript: reddedilir');
select throws_ok($$ update public.sessions set meeting_url = 'https://meet.google.com/abc-defg-hij ' || repeat('a', 300) where id = tests.id('s1') $$, '23514', null, 'çok uzun bağlantı reddedilir');
select lives_ok($$ update public.sessions set duration_min = 30 where id = tests.id('s1') $$, '30 dakikalık ders (rapordaki 30-40 dk) kabul');
select throws_ok($$ update public.sessions set duration_min = 25 where id = tests.id('s1') $$, '23514', null, '25 dakika reddedilir');

-- ====================== Yetki ======================
select tests.login_anon();
select throws_ok($$ select public.schedule_session(tests.id('m1'), now() + interval '3 days', 40::smallint, 'https://meet.google.com/abc-defg-hij') $$, '42501', null, 'anon ders planlayamaz');
select tests.logout();
select tests.login('veli_a');
select throws_ok($$ select public.schedule_session(tests.id('m1'), now() + interval '3 days', 40::smallint, 'https://meet.google.com/abc-defg-hij') $$,
  '42501', 'schedule_session: yalnızca onaylı gönüllü ders planlayabilir', 'veli ders planlayamaz');
select tests.logout();
select tests.login('gon_y');
select throws_ok($$ select public.schedule_session(tests.id('m1'), now() + interval '3 days', 40::smallint, 'https://meet.google.com/abc-defg-hij') $$,
  '42501', 'ESLESME_YOK: aktif eşleşme bulunamadı', 'eşleşmemiş gönüllü başkasının eşleşmesine ders planlayamaz');
select tests.logout();

-- ====================== Planlama: doğrulamalar ======================
select tests.login('gon_x');
select throws_ok($$ select public.schedule_session(tests.id('m1'), now() + interval '5 minutes', 40::smallint, 'https://meet.google.com/abc-defg-hij') $$,
  '22023', 'ZAMAN_GECERSIZ: ders en erken 15 dakika sonrasına, en geç 60 gün içine planlanabilir', 'çok yakın zaman');
select throws_ok($$ select public.schedule_session(tests.id('m1'), now() + interval '90 days', 40::smallint, 'https://meet.google.com/abc-defg-hij') $$,
  '22023', 'ZAMAN_GECERSIZ: ders en erken 15 dakika sonrasına, en geç 60 gün içine planlanabilir', '60 günden uzak');
select throws_ok($$ select public.schedule_session(tests.id('m1'), (((now() at time zone 'Europe/Istanbul')::date + 3) + time '07:00') at time zone 'Europe/Istanbul', 40::smallint, 'https://meet.google.com/abc-defg-hij') $$,
  '22023', 'SAAT_DISI: ders 08:00-21:00 (İstanbul saati) arasında bitmeli', '08:00 öncesi başlayamaz');
select throws_ok($$ select public.schedule_session(tests.id('m1'), (((now() at time zone 'Europe/Istanbul')::date + 3) + time '20:30') at time zone 'Europe/Istanbul', 40::smallint, 'https://meet.google.com/abc-defg-hij') $$,
  '22023', 'SAAT_DISI: ders 08:00-21:00 (İstanbul saati) arasında bitmeli', '21:00 sonrasına sarkamaz');
select throws_ok($$ select public.schedule_session(tests.id('m1'), (((now() at time zone 'Europe/Istanbul')::date + 3) + time '14:00') at time zone 'Europe/Istanbul', 25::smallint, 'https://meet.google.com/abc-defg-hij') $$,
  '22023', 'SURE_GECERSIZ: ders süresi 20, 30 ya da 40 dakika olmalı', 'geçersiz süre');
select throws_ok($$ select public.schedule_session(tests.id('m1'), (((now() at time zone 'Europe/Istanbul')::date + 3) + time '14:00') at time zone 'Europe/Istanbul', 30::smallint, '  ') $$,
  '22023', 'BAGLANTI_GEREKLI: Google Meet ya da Zoom bağlantısı gerekli', 'bağlantı şart');
select throws_ok($$ select public.schedule_session(tests.id('m1'), (((now() at time zone 'Europe/Istanbul')::date + 3) + time '14:00') at time zone 'Europe/Istanbul', 30::smallint, 'https://evil.example.com/x') $$,
  '22023', 'BAGLANTI_GECERSIZ: yalnızca Google Meet ya da Zoom bağlantısı kabul edilir', 'Meet/Zoom dışı bağlantı reddedilir');
select tests.logout();
select is((select count(*)::int from public.sessions where match_id = tests.id('m1')), 1, 'başarısız denemeler ders oluşturmadı (yalnızca fixture dersi var)');

-- ====================== Planlama: başarılı ve çakışma ======================
select tests.login('gon_x');
select lives_ok($$ select public.schedule_session(tests.id('m1'), (((now() at time zone 'Europe/Istanbul')::date + 3) + time '14:00') at time zone 'Europe/Istanbul', 30::smallint, 'https://meet.google.com/aaa-bbbb-ccc') $$,
  'gönüllü ders planladı');
select throws_ok($$ select public.schedule_session(tests.id('m1'), (((now() at time zone 'Europe/Istanbul')::date + 3) + time '14:20') at time zone 'Europe/Istanbul', 30::smallint, 'https://meet.google.com/ddd-eeee-fff') $$,
  '22023', 'CAKISMA: bu saatte başka bir ders var', 'çakışan ders planlanamaz');
select lives_ok($$ select public.schedule_session(tests.id('m1'), (((now() at time zone 'Europe/Istanbul')::date + 3) + time '14:30') at time zone 'Europe/Istanbul', 30::smallint, 'https://us02web.zoom.us/j/12345678901') $$,
  'hemen ardından başlayan ders çakışma sayılmaz');
select tests.logout();
select is((select booked_by from public.sessions where meeting_url = 'https://meet.google.com/aaa-bbbb-ccc'), tests.id('gon_x'), 'planlayan kaydedildi');
select is((select duration_min::int from public.sessions where meeting_url = 'https://meet.google.com/aaa-bbbb-ccc'), 30, '30 dakika kaydedildi');
select is((select status from public.sessions where meeting_url = 'https://meet.google.com/aaa-bbbb-ccc'), 'planlandi', 'durum: planlandı');

-- ====================== Görünürlük ======================
select tests.login('ogr_a1');
select is((select count(*)::int from public.sessions where meeting_url = 'https://meet.google.com/aaa-bbbb-ccc'), 1, 'öğrenci kendi dersinin bağlantısını görür');
select tests.logout();
select tests.login('veli_a');
select is((select count(*)::int from public.sessions where meeting_url = 'https://meet.google.com/aaa-bbbb-ccc'), 1, 'veli çocuğunun dersinin bağlantısını görür (derse katılabilir)');
select tests.logout();
select tests.login('ogr_b1');
select is((select count(*)::int from public.sessions where meeting_url = 'https://meet.google.com/aaa-bbbb-ccc'), 0, 'başka öğrenci bağlantıyı göremez');
select tests.logout();

-- ====================== Bağlantıyı değiştirme ======================
select tests.login('ogr_a1');
select throws_ok($$ select public.set_session_link((select id from public.sessions where meeting_url = 'https://meet.google.com/aaa-bbbb-ccc'), 'https://meet.google.com/xxx-yyyy-zzz') $$,
  '42501', 'set_session_link: yalnızca onaylı gönüllü', 'öğrenci bağlantıyı değiştiremez');
select tests.logout();
select tests.login('gon_y');
select throws_ok($$ select public.set_session_link((select id from public.sessions where meeting_url = 'https://meet.google.com/aaa-bbbb-ccc'), 'https://meet.google.com/xxx-yyyy-zzz') $$,
  '22023', 'DERS_YOK: planlı ders bulunamadı', 'başka gönüllü değiştiremez');
select tests.logout();
select tests.login('gon_x');
select throws_ok($$ select public.set_session_link((select id from public.sessions where meeting_url = 'https://meet.google.com/aaa-bbbb-ccc'), 'https://evil.example.com/x') $$,
  '22023', 'BAGLANTI_GECERSIZ: yalnızca Google Meet ya da Zoom bağlantısı kabul edilir', 'geçersiz yeni bağlantı reddedilir');
select lives_ok($$ select public.set_session_link((select id from public.sessions where meeting_url = 'https://meet.google.com/aaa-bbbb-ccc'), 'https://meet.google.com/xxx-yyyy-zzz') $$,
  'gönüllü kendi dersinin bağlantısını değiştirdi');
select tests.logout();
select is((select count(*)::int from public.sessions where meeting_url = 'https://meet.google.com/xxx-yyyy-zzz'), 1, 'yeni bağlantı kaydedildi');

-- ====================== İptal ======================
select tests.login('ogr_b1');
select throws_ok($$ select public.cancel_session((select id from public.sessions where meeting_url = 'https://meet.google.com/xxx-yyyy-zzz'), 'diger') $$,
  '42501', 'DERS_YOK: planlı ders bulunamadı', 'başka öğrenci iptal edemez');
select tests.logout();
select tests.login('veli_a');
select throws_ok($$ select public.cancel_session((select id from public.sessions where meeting_url = 'https://meet.google.com/xxx-yyyy-zzz'), 'hasta') $$,
  '22023', 'GEREKCE_GECERSIZ: iptal gerekçesi listeden seçilmeli', 'serbest gerekçe (sağlık bilgisi vb.) yazılamaz');
select lives_ok($$ select public.cancel_session((select id from public.sessions where meeting_url = 'https://meet.google.com/xxx-yyyy-zzz'), 'zaman_uygun_degil') $$,
  'veli çocuğunun dersini iptal etti');
select throws_ok($$ select public.cancel_session((select id from public.sessions where meeting_url = 'https://meet.google.com/xxx-yyyy-zzz'), 'diger') $$,
  '42501', 'DERS_YOK: planlı ders bulunamadı', 'iptal edilmiş ders ikinci kez iptal edilemez');
select tests.logout();
select is((select status || ':' || cancel_reason from public.sessions where meeting_url = 'https://meet.google.com/xxx-yyyy-zzz'), 'iptal:zaman_uygun_degil', 'iptal durumu ve gerekçe kodu');
select is((select cancelled_by from public.sessions where meeting_url = 'https://meet.google.com/xxx-yyyy-zzz'), tests.id('veli_a'), 'iptal eden kaydedildi');

-- ====================== Kapalı özellik ======================
update public.student_features set video_enabled = false where student_id = tests.id('ogr_a1');
select tests.login('gon_x');
select throws_ok($$ select public.schedule_session(tests.id('m1'), (((now() at time zone 'Europe/Istanbul')::date + 4) + time '14:00') at time zone 'Europe/Istanbul', 30::smallint, 'https://meet.google.com/aaa-bbbb-ccc') $$,
  '42501', 'OZELLIK_KAPALI: görüntülü ders bu öğrenci için veli tarafından kapatıldı', 'veli görüntülü dersi kapattıysa ders planlanamaz');
select tests.logout();

select * from finish();
rollback;
