-- =====================================================================
-- 020 · RLS ROL MATRİSİ: profiles, students, guardian_students
-- Roller: anon, öğrenci, veli (kendi ve başka veli), eşleşmiş / eşleşmemiş /
-- onaysız / askıdaki gönüllü, yönetici (aal1 ve aal2), servis rolü.
-- =====================================================================
begin;
select plan(60);
select tests.make_fixture();

-- ====================== profiles ======================
select tests.login_anon();
select throws_ok($$ select * from public.profiles $$, '42501', null, 'anon: profiles okunamaz');

select tests.login('veli_a');
select is(tests.cnt('select 1 from public.profiles'), 3::bigint, 'veli_a: kendi profili + 2 çocuğunun profili');
select is(tests.cnt($$ select 1 from public.profiles where id = tests.id('ogr_b1') $$), 0::bigint,
  'veli_a: BAŞKA velinin çocuğunun profilini göremez');
select is(tests.cnt($$ select 1 from public.profiles where id = tests.id('gon_x') $$), 0::bigint,
  'veli_a: gönüllü profilini doğrudan göremez');

select tests.login('ogr_a1');
select is(tests.cnt('select 1 from public.profiles'), 1::bigint, 'öğrenci: yalnızca kendi profili');

select tests.login('gon_x');
select is(tests.cnt('select 1 from public.profiles'), 1::bigint,
  'eşleşmiş gönüllü: profiles''ta yalnızca kendi satırı (öğrenciyi görünümden görür)');
select is(tests.cnt($$ select 1 from public.profiles where id = tests.id('ogr_a1') $$), 0::bigint,
  'eşleşmiş gönüllü: öğrencinin profil satırını doğrudan okuyamaz');

select tests.login('admin');
select is(tests.cnt($$ select 1 from public.profiles where id = any (tests.fixture_user_ids()) $$), 1::bigint,
  'yönetici aal1: yalnızca kendi profili (MFA yok = yönetici sayılmaz)');
select tests.login('admin', 'aal2');
select is(tests.cnt($$ select 1 from public.profiles where id = any (tests.fixture_user_ids()) $$), 10::bigint,
  'yönetici aal2: tüm profiller');

select tests.login('veli_a');
select is(tests.affected($$ update public.profiles set display_name = 'Yeni Ad' where id = tests.id('veli_a') $$), 1::bigint,
  'veli kendi görünen adını güncelleyebilir');
select is(tests.affected($$ update public.profiles set display_name = 'Gok Kus' where id = tests.id('ogr_a1') $$), 1::bigint,
  'veli çocuğunun RUMUZUNU değiştirebilir (öğrenci değiştiremez: bkz. 071)');
select is(tests.affected($$ update public.profiles set display_name = 'Hack' where id = tests.id('ogr_b1') $$), 0::bigint,
  'veli başka velinin çocuğunun rumuzunu değiştiremez');
select throws_ok($$ update public.profiles set role = 'yonetici' where id = tests.id('veli_a') $$, '42501', null,
  'veli kendi rolünü yükseltemez (sütun yetkisi yok)');
select throws_ok($$ update public.profiles set status = 'aktif' where id = tests.id('veli_a') $$, '42501', null,
  'veli kendi durumunu değiştiremez');
select throws_ok($$ insert into public.profiles (id, role, display_name) values (gen_random_uuid(), 'yonetici', 'x') $$, '42501', null,
  'istemci profil satırı ekleyemez');
select throws_ok($$ delete from public.profiles where id = tests.id('veli_a') $$, '42501', null,
  'istemci profil silemez');

select tests.login('ogr_a1');
select throws_ok($$ update public.profiles set role = 'yonetici' where id = tests.id('ogr_a1') $$, '42501', null,
  'öğrenci kendi rolünü yükseltemez');

select tests.login('gon_z');
select throws_ok($$ update public.profiles set role = 'yonetici', status = 'aktif' where id = tests.id('gon_z') $$, '42501', null,
  'gönüllü kendi rolünü/durumunu değiştiremez');

-- İkinci savunma hattı: biri yanlışlıkla sütun yetkisi verse bile tetikleyici engeller
select tests.logout();
grant update (role, status) on public.profiles to authenticated;
select tests.login('veli_a');
select throws_ok($$ update public.profiles set role = 'yonetici' where id = tests.id('veli_a') $$, '42501',
  'profiles.role yalnızca private.grant_admin / revoke_admin ile değiştirilebilir', 'tetikleyici: sütun yetkisi sızsa bile role değişmez');
select throws_ok($$ update public.profiles set status = 'beklemede' where id = tests.id('veli_a') $$, '42501',
  'profiles.status istemciden değiştirilemez', 'tetikleyici: sütun yetkisi sızsa bile status değişmez');
select tests.logout();
revoke update (role, status) on public.profiles from authenticated;

-- Servis rolü durumu değiştirebilir (askıya alma), rolü DEĞİŞTİREMEZ
select tests.login_service();
select is(tests.affected($$ update public.profiles set status = 'askida' where id = tests.id('veli_b') $$), 1::bigint,
  'servis rolü hesabı askıya alabilir');
select throws_ok($$ update public.profiles set role = 'yonetici' where id = tests.id('veli_b') $$, '42501', null,
  'servis rolü bile rolü yükseltemez (yonetici yalnızca SQL ile)');
select tests.logout();
select is((select count(*) from public.audit_log where action = 'profil_durum_degisti' and entity_id = tests.id('veli_b')::text),
  1::bigint, 'durum değişikliği audit_log''a yazıldı');

-- Askıdaki kullanıcı: yalnızca kendi profilini görür, çocuğunun verisini göremez
select tests.login('veli_b');
select is(tests.cnt('select 1 from public.profiles'), 1::bigint, 'askıdaki veli yalnızca kendi profilini görür');
select is(tests.cnt('select 1 from public.students'), 0::bigint, 'askıdaki veli çocuğunun öğrenci kaydını göremez');
select is(tests.cnt('select 1 from public.matched_volunteers_for_guardian'), 0::bigint, 'askıdaki veli gönüllü kartını göremez');
select is(tests.affected($$ update public.profiles set display_name = 'Askida' where id = tests.id('veli_b') $$), 0::bigint,
  'askıdaki kullanıcı profilini güncelleyemez');

-- ====================== students ======================
select tests.login_anon();
select throws_ok($$ select * from public.students $$, '42501', null, 'anon: students okunamaz');

select tests.login('veli_a');
select is(tests.cnt('select 1 from public.students'), 2::bigint, 'veli_a: yalnızca kendi 2 çocuğu');
select is(tests.cnt($$ select 1 from public.students where profile_id = tests.id('ogr_b1') $$), 0::bigint,
  'veli_a: BAŞKA velinin çocuğunu GÖREMEZ');

select tests.login('ogr_a1');
select is(tests.cnt('select 1 from public.students'), 1::bigint, 'öğrenci: yalnızca kendisi');
select is(tests.cnt($$ select 1 from public.students where profile_id = tests.id('ogr_a2') $$), 0::bigint,
  'öğrenci: kardeşini bile göremez');

select tests.login('gon_x');
select is(tests.cnt('select 1 from public.students'), 0::bigint, 'EŞLEŞMİŞ gönüllü students tablosunu doğrudan okuyamaz');
select tests.login('gon_y');
select is(tests.cnt('select 1 from public.students'), 0::bigint, 'eşleşmemiş gönüllü öğrenci göremez');
select tests.login('gon_z');
select is(tests.cnt('select 1 from public.students'), 0::bigint, 'onaysız gönüllü öğrenci göremez');

select tests.login('admin');
select is(tests.cnt($$ select 1 from public.students where profile_id = any (tests.fixture_user_ids()) $$), 0::bigint,
  'yönetici aal1: öğrenci göremez');
select tests.login('admin', 'aal2');
select is(tests.cnt($$ select 1 from public.students where profile_id = any (tests.fixture_user_ids()) $$), 3::bigint,
  'yönetici aal2: tüm öğrenciler');

select tests.login('veli_a');
select is(tests.affected($$ update public.students set grade = 7 where profile_id = tests.id('ogr_a1') $$), 1::bigint,
  'veli çocuğunun sınıfını güncelleyebilir');
select is(tests.affected($$ update public.students set grade = 7 where profile_id = tests.id('ogr_b1') $$), 0::bigint,
  'veli başka çocuğun sınıfını güncelleyemez');
select throws_ok($$ update public.students set username = 'degistir' where profile_id = tests.id('ogr_a1') $$, '42501', null,
  'kullanıcı adı istemciden değiştirilemez');
select lives_ok($$ update public.students set prefs = '{"yazi_boyutu": 2}' where profile_id = tests.id('ogr_a1') $$,
  'veli çocuğunun tercihlerini güncelleyebilir');

select tests.login('ogr_a1');
select lives_ok($$ update public.students set prefs = '{"yuksek_kontrast": true}' where profile_id = tests.id('ogr_a1') $$,
  'öğrenci kendi tercihlerini güncelleyebilir');
select throws_ok($$ update public.students set grade = 8 where profile_id = tests.id('ogr_a1') $$, '42501', 'Sınıfı yalnızca veli değiştirebilir',
  'öğrenci kendi sınıfını DEĞİŞTİREMEZ (yalnızca veli)');
select is(tests.affected($$ update public.students set prefs = '{}' where profile_id = tests.id('ogr_a2') $$), 0::bigint,
  'öğrenci kardeşinin tercihlerini güncelleyemez');
select throws_ok($$ update public.students set prefs = jsonb_build_object('x', repeat('a', 3000)) where profile_id = tests.id('ogr_a1') $$,
  '23514', null, 'tercihler 2 KB sınırını aşamaz');
select throws_ok($$ insert into public.students (profile_id, grade, username) values (tests.id('ogr_a1'), 6, 'baska') $$, '42501', null,
  'istemci students satırı ekleyemez');
select throws_ok($$ delete from public.students where profile_id = tests.id('ogr_a1') $$, '42501', null,
  'istemci students satırı silemez');

select tests.login('veli_b');
select is(tests.affected($$ update public.students set prefs = '{}' where profile_id = tests.id('ogr_a1') $$), 0::bigint,
  'başka veli tercihleri güncelleyemez');

-- Bütünlük tetikleyicileri (SQL oturumu)
select tests.logout();
select throws_ok($$ insert into public.students (profile_id, grade, username) values (tests.id('veli_a'), 6, 'veli_ogrenci') $$, '23514', null,
  'veli profiline students satırı eklenemez (rol kontrolü)');
select throws_ok($$ insert into public.guardian_students (guardian_id, student_id) values (tests.id('gon_x'), tests.id('ogr_a1')) $$, '23514', null,
  'gönüllü, çocuğa "veli" olarak bağlanamaz (rol kontrolü)');
select lives_ok($$ insert into public.guardian_students (guardian_id, student_id) values (tests.id('veli_b'), tests.id('ogr_a1')) $$,
  'ikinci veli bağlanabilir');
select throws_ok($$ insert into public.guardian_students (guardian_id, student_id)
                    values (tests.signup('veli_c', 'c@pgtap.test', '{"role":"veli"}'), tests.id('ogr_a1')) $$, '23514', null,
  'bir çocuğa en çok iki veli bağlanabilir');

-- ====================== guardian_students ======================
select tests.login_anon();
select throws_ok($$ select * from public.guardian_students $$, '42501', null, 'anon: guardian_students okunamaz');
select tests.login('veli_a');
select is(tests.cnt('select 1 from public.guardian_students'), 2::bigint, 'veli_a: yalnızca kendi bağlantıları');
select tests.login('ogr_a1');
select is(tests.cnt('select 1 from public.guardian_students'), 0::bigint, 'öğrenci veli bağlantı tablosunu okuyamaz');
select tests.login('gon_x');
select is(tests.cnt('select 1 from public.guardian_students'), 0::bigint, 'gönüllü veli bağlantı tablosunu okuyamaz');
select tests.login('admin');
select is(tests.cnt('select 1 from public.guardian_students'), 0::bigint, 'yönetici aal1: veli bağlantılarını göremez');
select tests.login('admin', 'aal2');
select ok(tests.cnt($$ select 1 from public.guardian_students where student_id = any (tests.fixture_user_ids()) $$) >= 4,
  'yönetici aal2: veli bağlantılarını görür');
select tests.login('veli_a');
select throws_ok($$ insert into public.guardian_students (guardian_id, student_id) values (tests.id('veli_a'), tests.id('ogr_b1')) $$, '42501', null,
  'veli kendini başkasının çocuğuna BAĞLAYAMAZ');
select throws_ok($$ delete from public.guardian_students where guardian_id = tests.id('veli_a') $$, '42501', null,
  'veli bağlantıyı istemciden silemez');

select * from finish();
rollback;
