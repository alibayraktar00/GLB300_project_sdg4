-- =====================================================================
-- 021 · RLS ROL MATRİSİ: gönüllü başvurusu, belgeler, ders seçimi,
--       eğitim quiz'i ve rıza kayıtları
-- =====================================================================
begin;
select plan(111);
select tests.make_fixture();

-- ====================== volunteers ======================
select tests.login_anon();
select throws_ok($$ select * from public.volunteers $$, '42501', null, 'anon: volunteers okunamaz');

select tests.login('gon_z');
select is(tests.cnt('select 1 from public.volunteers'), 1::bigint, 'gönüllü yalnızca kendi başvurusunu görür');
select tests.login('veli_a');
select is(tests.cnt('select 1 from public.volunteers'), 0::bigint, 'veli: gönüllü tablosunu göremez (tam ad sızmaz)');
select tests.login('ogr_a1');
select is(tests.cnt('select 1 from public.volunteers'), 0::bigint,
  'öğrenci: EŞLEŞMİŞ gönüllüsünün satırını da doğrudan okuyamaz (yalnızca matched_volunteers_for_student görünümü)');
select tests.login('admin');
select is(tests.cnt($$ select 1 from public.volunteers where profile_id = any (tests.fixture_user_ids()) $$), 0::bigint, 'yönetici aal1: göremez');
select tests.login('admin', 'aal2');
select is(tests.cnt($$ select 1 from public.volunteers where profile_id = any (tests.fixture_user_ids()) $$), 4::bigint, 'yönetici aal2: tüm başvurular');

select tests.login('gon_z');
select is(tests.affected($$ update public.volunteers set university = 'Yeni Universite' where profile_id = tests.id('gon_z') $$), 1::bigint,
  'gönüllü kendi bilgilerini güncelleyebilir');
select throws_ok($$ update public.volunteers set status = 'onayli' where profile_id = tests.id('gon_z') $$, '42501', null,
  'gönüllü kendini ONAYLAYAMAZ (status sütun yetkisi yok)');
select throws_ok($$ update public.volunteers set max_students = 10 where profile_id = tests.id('gon_z') $$, '42501', null,
  'gönüllü öğrenci kotasını değiştiremez');
select throws_ok($$ update public.volunteers set approved_at = now(), approved_by = tests.id('gon_z') where profile_id = tests.id('gon_z') $$, '42501', null,
  'gönüllü kendi onay alanlarını yazamaz');
select throws_ok($$ update public.volunteers set training_passed_at = now() where profile_id = tests.id('gon_z') $$, '42501', null,
  'gönüllü eğitimi geçti işareti koyamaz');
select is(tests.affected($$ update public.volunteers set university = 'Hack' where profile_id = tests.id('gon_x') $$), 0::bigint,
  'gönüllü başkasının başvurusunu güncelleyemez');
select throws_ok($$ delete from public.volunteers where profile_id = tests.id('gon_z') $$, '42501', null, 'gönüllü başvurusunu silemez');

select tests.login('gon_s');
select is(tests.affected($$ update public.volunteers set university = 'Askida Guncelleme' where profile_id = tests.id('gon_s') $$), 0::bigint,
  'askıdaki gönüllü güncelleme yapamaz');

-- İkinci savunma hattı: sütun yetkisi sızsa bile tetikleyici engeller
select tests.logout();
grant update (status, max_students) on public.volunteers to authenticated;
select tests.login('gon_z');
select throws_ok($$ update public.volunteers set status = 'onayli' where profile_id = tests.id('gon_z') $$, '42501',
  'Gönüllü durum/onay alanları istemciden değiştirilemez', 'tetikleyici: sütun yetkisi sızsa bile gönüllü kendini onaylayamaz');
select tests.logout();
revoke update (status, max_students) on public.volunteers from authenticated;

-- Yeni gönüllü başvurusu açma
select tests.signup('g_new', 'yeni@ogr.uni.edu.tr', '{"role":"gonullu","display_name":"Yeni"}');
select tests.login('g_new');
select lives_ok($$ insert into public.volunteers (profile_id, given_name, family_name, university) values (tests.id('g_new'), 'Yeni', 'Kisi', 'Test Uni') $$,
  'yeni gönüllü başvurusunu açabilir');
select is((select status from public.volunteers where profile_id = tests.id('g_new')), 'basvuru',
  'yeni başvurunun durumu her zaman "basvuru"');
select throws_ok($$ insert into public.volunteers (profile_id, given_name, family_name, university, status) values (tests.id('g_new'), 'Xx', 'Yy', 'Uni', 'onayli') $$, '42501', null,
  'başvuru açarken status gönderilemez (kendini onaylı açamaz)');
select tests.login('veli_a');
select throws_ok($$ insert into public.volunteers (profile_id, given_name, family_name, university) values (tests.id('veli_a'), 'Veli', 'Gonullu', 'Uni') $$, '23514', null,
  'veli gönüllü satırı açamaz (rol kontrolü tetikleyicisi)');
select tests.login('gon_y');
select throws_ok($$ insert into public.volunteers (profile_id, given_name, family_name, university) values (tests.id('g_new'), 'Baska', 'Kisi', 'Uni') $$, '42501', null,
  'gönüllü başkası adına başvuru açamaz');

-- ====================== volunteer_documents ======================
select tests.login_anon();
select throws_ok($$ select * from public.volunteer_documents $$, '42501', null, 'anon: belgeler okunamaz');

select tests.login('gon_z');
select lives_ok(
  $$ insert into public.volunteer_documents (volunteer_id, storage_path)
     values (tests.id('gon_z'), tests.id('gon_z')::text || '/' || tests.id('yeni_belge')::text || '.jpg') $$,
  'başvuru aşamasındaki gönüllü belge kaydı ekleyebilir');
select is(tests.cnt('select 1 from public.volunteer_documents'), 2::bigint, 'gönüllü yalnızca kendi belgelerini görür');
select throws_ok(
  $$ insert into public.volunteer_documents (volunteer_id, storage_path)
     values (tests.id('gon_z'), tests.id('gon_x')::text || '/' || tests.id('baska')::text || '.pdf') $$,
  '23514', null, 'belge yolu başka gönüllünün klasörünü gösteremez (CHECK)');
select throws_ok(
  $$ insert into public.volunteer_documents (volunteer_id, storage_path)
     values (tests.id('gon_x'), tests.id('gon_x')::text || '/' || tests.id('baska2')::text || '.pdf') $$,
  '42501', null, 'başkası adına belge eklenemez (RLS)');
select throws_ok(
  $$ insert into public.volunteer_documents (volunteer_id, storage_path)
     values (tests.id('gon_z'), tests.id('gon_z')::text || '/dosya.exe') $$,
  '23514', null, 'belge yolu biçimi/uzantısı denetlenir');
select throws_ok($$ update public.volunteer_documents set purged_at = now() where volunteer_id = tests.id('gon_z') $$, '42501', null,
  'gönüllü belge kaydını güncelleyemez (silme/işaretleme yalnızca sistemden)');
select throws_ok($$ delete from public.volunteer_documents where volunteer_id = tests.id('gon_z') $$, '42501', null,
  'gönüllü belge kaydını silemez');
select lives_ok(
  $$ insert into public.volunteer_documents (volunteer_id, storage_path) select tests.id('gon_z'),
       tests.id('gon_z')::text || '/' || tests.id('b' || g)::text || '.pdf' from generate_series(1, 3) g $$,
  'belge sayısı 5''e kadar eklenebilir');
select throws_ok(
  $$ insert into public.volunteer_documents (volunteer_id, storage_path)
     values (tests.id('gon_z'), tests.id('gon_z')::text || '/' || tests.id('b99')::text || '.pdf') $$,
  '23514', 'En çok 5 belge yüklenebilir', '6. belge reddedilir (depolama kötüye kullanımı sınırı)');

select tests.login('gon_x');
select is(tests.cnt('select 1 from public.volunteer_documents'), 1::bigint, 'onaylı gönüllü yalnızca kendi belgesini görür');
select throws_ok(
  $$ insert into public.volunteer_documents (volunteer_id, storage_path)
     values (tests.id('gon_x'), tests.id('gon_x')::text || '/' || tests.id('yeni_x')::text || '.pdf') $$,
  '42501', null, 'onaylanmış gönüllü artık belge ekleyemez (başvuru kilitli)');
select tests.login('veli_a');
select is(tests.cnt('select 1 from public.volunteer_documents'), 0::bigint, 'veli belgeleri göremez');
select tests.login('ogr_a1');
select is(tests.cnt('select 1 from public.volunteer_documents'), 0::bigint, 'öğrenci belgeleri göremez');
select tests.login('admin');
select is(tests.cnt($$ select 1 from public.volunteer_documents where volunteer_id = any (tests.fixture_user_ids()) $$), 0::bigint,
  'yönetici aal1: belgeleri göremez');
select tests.login('admin', 'aal2');
select is(tests.cnt($$ select 1 from public.volunteer_documents where volunteer_id = any (tests.fixture_user_ids()) $$), 6::bigint,
  'yönetici aal2: tüm belgeleri görür');

-- ====================== volunteer_subjects ======================
select tests.login('gon_z');
select lives_ok($$ insert into public.volunteer_subjects (volunteer_id, subject_id, grade) values (tests.id('gon_z'), (select id from public.subjects where code = 'MAT'), 6) $$,
  'başvuru aşamasında gönüllü ders/sınıf ekleyebilir');
select is(tests.affected($$ delete from public.volunteer_subjects where volunteer_id = tests.id('gon_z') $$), 1::bigint,
  'başvuru aşamasında kendi ders seçimini silebilir');
select throws_ok($$ insert into public.volunteer_subjects (volunteer_id, subject_id, grade) values (tests.id('gon_x'), (select id from public.subjects where code = 'FEN'), 6) $$, '42501', null,
  'gönüllü başkası adına ders ekleyemez');
select tests.login('gon_x');
select throws_ok($$ insert into public.volunteer_subjects (volunteer_id, subject_id, grade) values (tests.id('gon_x'), (select id from public.subjects where code = 'FEN'), 8) $$, '42501', null,
  'ONAYLI gönüllü kendi havuz erişimini genişletemez (ders ekleyemez)');
select is(tests.affected($$ delete from public.volunteer_subjects where volunteer_id = tests.id('gon_x') $$), 0::bigint,
  'onaylı gönüllü ders seçimini silemez');
select is(tests.cnt('select 1 from public.volunteer_subjects'), 2::bigint, 'gönüllü yalnızca kendi derslerini görür');
select tests.login('veli_a');
select is(tests.cnt('select 1 from public.volunteer_subjects'), 0::bigint, 'veli ders tablosunu göremez');

-- ====================== eğitim quiz'i ======================
select tests.login_anon();
select throws_ok($$ select * from public.training_questions $$, '42501', null, 'anon: quiz sorularını okuyamaz');
select tests.login('gon_z');
select is(tests.cnt($$ select 1 from public.training_questions where id = tests.id('tq1') $$), 1::bigint, 'gönüllü quiz sorularını okur');
select is(tests.cnt('select 1 from public.training_answer_keys'), 0::bigint, 'gönüllü DOĞRU CEVAP anahtarını göremez');
select is(tests.cnt($$ select 1 from public.training_attempts where volunteer_id = tests.id('gon_z') $$), 1::bigint, 'gönüllü kendi denemesini görür');
select is(tests.cnt($$ select 1 from public.training_attempts where volunteer_id = tests.id('gon_x') $$), 0::bigint, 'gönüllü başkasının puanını göremez');
select throws_ok($$ insert into public.training_attempts (volunteer_id, score, passed) values (tests.id('gon_z'), 100, true) $$, '42501', null,
  'gönüllü kendine puan yazamaz (puanlama RPC''de)');
select throws_ok($$ update public.training_attempts set score = 100, passed = true where volunteer_id = tests.id('gon_z') $$, '42501', null,
  'gönüllü puanını değiştiremez');
select tests.login('gon_s');
select is(tests.cnt($$ select 1 from public.training_questions where id = tests.id('tq1') $$), 0::bigint, 'askıdaki gönüllü quiz sorusu göremez');
select tests.login('veli_a');
select is(tests.cnt($$ select 1 from public.training_questions where id = tests.id('tq1') $$), 0::bigint, 'veli quiz sorularını göremez');
select tests.login('ogr_a1');
select is(tests.cnt($$ select 1 from public.training_questions where id = tests.id('tq1') $$), 0::bigint, 'öğrenci quiz sorularını göremez');
select tests.login('admin', 'aal2');
select is(tests.cnt($$ select 1 from public.training_answer_keys where question_id = tests.id('tq1') $$), 1::bigint, 'yönetici aal2: cevap anahtarını görür');
select tests.login('admin');
select is(tests.cnt($$ select 1 from public.training_answer_keys where question_id = tests.id('tq1') $$), 0::bigint, 'yönetici aal1: cevap anahtarını göremez');
select hasnt_column('public', 'training_questions', 'correct_option', 'cevap anahtarı training_questions tablosunda DEĞİL (select * ile sızamaz)');

-- ====================== consents ======================
select tests.login_anon();
select throws_ok($$ select * from public.consents $$, '42501', null, 'anon: rıza kayıtları okunamaz');
select throws_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (gen_random_uuid(), 'aydinlatma_veli', 'v1', true) $$, '42501', null,
  'anon: rıza ekleyemez');

-- Başka veli, çocuğun rızasını GÖREMEZ ve geri ÇEKEMEZ (henüz bağlı değil)
select tests.login('veli_b');
select is(tests.cnt($$ select 1 from public.consents where student_id = tests.id('ogr_a1') $$), 0::bigint,
  'veli_b: başka velinin çocuğuna ait rızayı göremez');
select is(tests.affected($$ update public.consents set withdrawn_at = now() where id = tests.id('c_veli_a') $$), 0::bigint,
  'veli_b: başka velinin çocuğuna ait rızayı geri çekemez');

select tests.login('veli_a');
select is(tests.cnt('select 1 from public.consents'), 1::bigint, 'veli yalnızca kendi rızalarını görür');

-- Geçerli kayıtlar
select lives_ok($$ insert into public.consents (user_id, type, doc_version, granted, channel, app_version)
                   values (tests.id('veli_a'), 'aydinlatma_veli', 'v1', true, 'android', '0.1.0') $$,
  'veli aydınlatma teyidi ekleyebilir');
select is((select doc_sha256 from public.consents where user_id = tests.id('veli_a') and type = 'aydinlatma_veli'),
          (select sha256 from public.legal_documents where doc_type = 'aydinlatma_veli' and version = 'v1'),
  'metnin özet değeri (sha256) sunucu tarafından legal_documents''tan kopyalandı');
select lives_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('veli_a'), 'aydinlatma_veli', 'v1', true) $$,
  'aynı sürüm için yeniden kayıt açılabilir (geçerlilik en yeni granted=true kaydıyla belirlenir)');
select lives_ok($$ insert into public.consents (user_id, student_id, type, doc_version, granted) values (tests.id('veli_a'), tests.id('ogr_a2'), 'acik_riza_dolayli_saglik', 'v1', false) $$,
  'veli "açık rıza vermiyorum" seçimini de kaydedebilir (granted=false)');
select lives_ok($$ insert into public.consents (user_id, student_id, type, doc_version, granted) values (tests.id('veli_a'), tests.id('ogr_a2'), 'acik_riza_dolayli_saglik', 'v2', true) $$,
  'red sonrası yeni sürümle/kayıtla açık rıza verilebilir');
select lives_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('veli_a'), 'kullanim_kosullari', 'v1', true) $$,
  'veli kullanım koşullarını kabul edebilir');

-- Reddedilen kayıtlar
select throws_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('veli_a'), 'acik_riza_dolayli_saglik', 'v1', true) $$, '42501', null,
  'çocuk-bazlı açık rıza student_id OLMADAN verilemez');
select throws_ok($$ insert into public.consents (user_id, student_id, type, doc_version, granted) values (tests.id('veli_a'), tests.id('ogr_b1'), 'acik_riza_dolayli_saglik', 'v1', true) $$, '42501', null,
  'veli BAŞKASININ çocuğu için rıza veremez');
select throws_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('veli_a'), 'gonullu_taahhut', 'v1', true) $$, '42501', null,
  'veli gönüllü taahhüdü veremez (tür-rol uyuşmazlığı)');
select throws_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('veli_a'), 'cocuk_bilgilendirme', 'v1', true) $$, '42501', null,
  'veli, çocuğa yönelik "Anladım" kaydını açamaz');
select throws_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('veli_a'), 'olmayan_tur', 'v1', true) $$, '23503', null,
  'tanımsız rıza türü reddedilir (yayımlanmış belgesi yok)');
select throws_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('veli_b'), 'aydinlatma_veli', 'v1', true) $$, '42501', null,
  'veli başkası adına rıza veremez');
select throws_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('veli_a'), 'aydinlatma_veli', 'v77', true) $$, '23503', null,
  'yayımlanmamış / olmayan belge sürümü için rıza açılamaz');
select throws_ok($$ insert into public.consents (user_id, type, doc_version) values (tests.id('veli_a'), 'aydinlatma_veli', 'v1') $$, '23502', null,
  'granted zorunludur (varsayılanı yok: seçim açıkça yapılmalı)');
select throws_ok($$ insert into public.consents (user_id, type, doc_version, granted, doc_sha256) values (tests.id('veli_a'), 'aydinlatma_veli', 'v2', true, repeat('a', 64)) $$, '42501', null,
  'özet değeri (doc_sha256) istemciden yazılamaz');
select throws_ok($$ insert into public.consents (user_id, type, doc_version, granted, accepted_at) values (tests.id('veli_a'), 'aydinlatma_veli', 'v9', true, '2000-01-01') $$, '42501', null,
  'kabul zamanı istemciden yazılamaz (sunucu zamanı)');
select throws_ok($$ insert into public.consents (user_id, type, doc_version, granted, subject_hash) values (tests.id('veli_a'), 'aydinlatma_veli', 'v9', true, repeat('b', 64)) $$, '42501', null,
  'subject_hash istemciden yazılamaz (tuzu yalnızca backend bilir)');
select throws_ok($$ delete from public.consents where user_id = tests.id('veli_a') $$, '42501', null, 'rıza kaydı silinemez');
select throws_ok($$ update public.consents set doc_version = 'v0' where user_id = tests.id('veli_a') $$, '42501', null,
  'rıza kaydının sürümü değiştirilemez');
select throws_ok($$ update public.consents set granted = false where id = tests.id('c_veli_a') $$, '42501', null,
  'verilmiş rıza "granted" alanıyla geri çevrilemez (geri çekme withdrawn_at ile)');

-- Geri çekme
select is(tests.affected($$ update public.consents set withdrawn_at = '2000-01-01' where id = tests.id('c_veli_a') $$), 1::bigint,
  'veli rızasını geri çekebilir');
select cmp_ok((select withdrawn_at from public.consents where id = tests.id('c_veli_a')), '>', '2020-01-01'::timestamptz,
  'geri çekme zamanını sunucu belirler (istemcinin yazdığı eski tarih yok sayılır)');
select is((select withdrawn_by from public.consents where id = tests.id('c_veli_a')), tests.id('veli_a'),
  'geri çeken kişi (withdrawn_by) sunucuda damgalanır');
select throws_ok($$ update public.consents set withdrawn_at = now() + interval '1 day' where id = tests.id('c_veli_a') $$, '42501', null,
  'geri çekilmiş rıza yeniden değiştirilemez');
select throws_ok($$ update public.consents set withdrawn_at = now() where student_id = tests.id('ogr_a2') and not granted $$, '23514', null,
  '"vermiyorum" kaydı geri çekilemez (zaten rıza yok)');
select is(tests.affected($$ update public.consents set withdrawn_at = now() where id = tests.id('c_veli_b') $$), 0::bigint,
  'veli başkasının rızasını geri çekemez');

-- Çocuğun DİĞER velisi de görür ve geri çekebilir
select tests.logout();
insert into public.guardian_students (guardian_id, student_id, relation) values (tests.id('veli_b'), tests.id('ogr_a2'), 'baba');
select tests.login('veli_b');
select is(tests.cnt($$ select 1 from public.consents where student_id = tests.id('ogr_a2') and granted $$), 1::bigint,
  'çocuğun diğer velisi, çocuğa ait rızayı görür');
select is(tests.affected($$ update public.consents set withdrawn_at = now() where student_id = tests.id('ogr_a2') and granted $$), 1::bigint,
  'çocuğun diğer velisi rızayı geri çekebilir');
select is((select withdrawn_by from public.consents where student_id = tests.id('ogr_a2') and granted), tests.id('veli_b'),
  'geri çeken diğer veli kayda yazılır');
select is(tests.cnt($$ select 1 from public.consents where user_id = tests.id('veli_a') and student_id is null $$), 0::bigint,
  'diğer veli, ilk velinin çocuğa bağlı OLMAYAN kayıtlarını (kendi aydınlatma teyidi) görmez');

-- Öğrenci: kendi "Anladım" kayıtları (AR-1 geri çekilince çocuk hesabı askıya alınmıştı; yeniden aktifleştirildi)
select tests.logout();
update public.profiles set status = 'aktif' where id = tests.id('ogr_a1');
select tests.login('ogr_a1');
select lives_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('ogr_a1'), 'cocuk_bilgilendirme', 'v1', true) $$,
  'öğrenci çocuk bilgilendirmesini "Anladım" ile kaydedebilir');
select lives_ok($$ insert into public.consents (user_id, student_id, type, doc_version, granted) values (tests.id('ogr_a1'), tests.id('ogr_a1'), 'cocuk_guvenlik_hatirlatma', 'v1', true) $$,
  'öğrenci güvenlik hatırlatmasını kendi student_id''siyle kaydedebilir');
select throws_ok($$ insert into public.consents (user_id, student_id, type, doc_version, granted) values (tests.id('ogr_a1'), tests.id('ogr_a2'), 'cocuk_bilgilendirme', 'v1', true) $$, '42501', null,
  'öğrenci kardeşi adına kayıt açamaz');
select throws_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('ogr_a1'), 'aydinlatma_veli', 'v1', true) $$, '42501', null,
  'öğrenci veli aydınlatma teyidi veremez');
select throws_ok($$ insert into public.consents (user_id, student_id, type, doc_version, granted) values (tests.id('ogr_a1'), tests.id('ogr_a1'), 'acik_riza_dolayli_saglik', 'v1', true) $$, '42501', null,
  'öğrenci kendi adına açık rıza veremez (yasal temsilci veli verir)');
select tests.login('veli_a');
select is(tests.cnt($$ select 1 from public.consents where type = 'cocuk_guvenlik_hatirlatma' $$), 1::bigint,
  'veli, çocuğun güvenlik hatırlatması kaydını görür');

-- Gönüllü
select tests.login('gon_x');
select is(tests.cnt('select 1 from public.consents'), 1::bigint, 'gönüllü yalnızca kendi rızalarını görür');
select lives_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('gon_x'), 'gonullu_davranis_kurallari', 'v1', true) $$,
  'gönüllü davranış kurallarını kabul edebilir');
select lives_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('gon_x'), 'kullanim_kosullari', 'v1', true) $$,
  'gönüllü kullanım koşullarını kabul edebilir');
select throws_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('gon_x'), 'acik_riza_dolayli_saglik', 'v1', true) $$, '42501', null,
  'gönüllü veli açık rızası veremez');
select tests.login('gon_s');
select throws_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('gon_s'), 'aydinlatma_gonullu', 'v1', true) $$, '42501', null,
  'askıdaki kullanıcı yeni rıza kaydı açamaz');

select tests.login('admin');
select is(tests.cnt($$ select 1 from public.consents where doc_sha256 is not null and (user_id = any (tests.fixture_user_ids())) $$), 0::bigint,
  'yönetici aal1: rızaları göremez');
select tests.login('admin', 'aal2');
select ok(tests.cnt($$ select 1 from public.consents where user_id = any (tests.fixture_user_ids()) $$) >= 10, 'yönetici aal2: rızaları görür');

-- Rıza türleri
select tests.login('veli_a');
select ok(tests.cnt('select 1 from public.consent_types') >= 8, 'giriş yapmış herkes rıza türlerini okur');
select throws_ok($$ insert into public.consent_types (code, audiences, description) values ('yeni_tur', '{veli}', 'x') $$, '42501', null,
  'istemci rıza türü ekleyemez (yalnızca migration)');
select tests.logout();
select lives_ok($$ insert into public.consent_types (code, audiences, description) values ('acik_riza_arastirma', '{veli}', 'AR-3 araştırma rızası') $$,
  'yeni rıza türü = tek INSERT (şema değişikliği gerekmez)');
select lives_ok($$ insert into public.legal_documents (doc_type, version, sha256, published_at, url)
                   values ('acik_riza_arastirma', 'v1', repeat('c', 64), now() - interval '1 hour', 'https://example.org/ar3') $$,
  'yeni tür için belge sürümü eklenir');
select tests.login('veli_a');
select lives_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('veli_a'), 'acik_riza_arastirma', 'v1', true) $$,
  'yeni tür hemen kullanılabilir');
select tests.logout();
select lives_ok($$ update public.consent_types set is_active = false where code = 'acik_riza_arastirma' $$, 'rıza türü devre dışı bırakılabilir');
select tests.login('veli_a');
select throws_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('veli_a'), 'acik_riza_arastirma', 'v1', true) $$, '42501', null,
  'devre dışı rıza türü verilemez');

select * from finish();
rollback;
