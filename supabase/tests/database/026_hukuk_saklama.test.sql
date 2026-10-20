-- =====================================================================
-- 026 · HUKUK GEREKSİNİMLERİ: hukuki metin sürümleri, rıza kanıtının hesap
--       silinince kalması, saklama zaman damgaları, silme zincirleri
-- (docs/hukuk/saklama-ve-imha.md SK-03...SK-15)
-- =====================================================================
begin;
select plan(52);
select tests.make_fixture();

-- ====================== legal_documents ======================
insert into public.legal_documents (doc_type, version, sha256, published_at, url)
values ('aydinlatma_veli', 'v-gelecek', repeat('e', 64), now() + interval '7 days', 'https://example.org/gelecek');

select tests.login_anon();
select is(tests.cnt($$ select 1 from public.legal_documents where doc_type = 'aydinlatma_veli' and version in ('v1', 'v2', 'v9') $$), 3::bigint,
  'anon: yayımlanmış hukuki metin sürümlerini okuyabilir (kayıttan önce gösterilir)');
select is(tests.cnt($$ select 1 from public.legal_documents where version = 'v-gelecek' $$), 0::bigint,
  'anon: yayın tarihi gelmemiş sürümü GÖRMEZ');
select throws_ok($$ insert into public.legal_documents (doc_type, version, sha256, published_at, url) values ('x_belge', 'v1', repeat('a', 64), now(), 'https://example.org') $$,
  '42501', null, 'anon: hukuki metin ekleyemez');
select tests.login('veli_a');
select is(tests.cnt($$ select 1 from public.legal_documents where doc_type = 'aydinlatma_veli' and version in ('v1', 'v2', 'v9') $$), 3::bigint, 'veli: hukuki metinleri okur');
select throws_ok($$ insert into public.legal_documents (doc_type, version, sha256, published_at, url) values ('x_belge', 'v1', repeat('a', 64), now(), 'https://example.org') $$,
  '42501', null, 'authenticated: hukuki metin ekleyemez (yalnızca migration)');
select throws_ok($$ update public.legal_documents set sha256 = repeat('0', 64) $$, '42501', null, 'authenticated: hukuki metni güncelleyemez');
select throws_ok($$ delete from public.legal_documents $$, '42501', null, 'authenticated: hukuki metni silemez');

select tests.logout();
select throws_ok($$ update public.legal_documents set sha256 = repeat('0', 64) where doc_type = 'aydinlatma_veli' and version = 'v1' $$,
  '42501', 'Yayımlanmış hukuki metin değiştirilemez; yeni sürüm ekleyin', 'yayımlanmış metnin özet değeri SQL ile bile değiştirilemez (kanıt bütünlüğü)');
select lives_ok($$ update public.legal_documents set url = 'https://example.org/yeni-adres' where doc_type = 'aydinlatma_veli' and version = 'v1' $$,
  'yalnızca bağlantı (url) taşınabilir');
select throws_ok($$ insert into public.legal_documents (doc_type, version, sha256, published_at, url) values ('x_belge', 'v1', 'abc', now(), 'https://example.org') $$,
  '23514', null, 'özet değeri 64 haneli küçük harf hex olmalı');
select throws_ok($$ insert into public.legal_documents (doc_type, version, sha256, published_at) values ('x_belge', 'v1', repeat('a', 64), now()) $$,
  '23514', null, 'bağlantı veya metin (en az biri) zorunlu');
select throws_ok($$ delete from public.legal_documents where doc_type = 'acik_riza_dolayli_saglik' and version = 'v1' $$,
  '23503', null, 'rıza kaydı bağlı metin sürümü silinemez (FK)');

select tests.login('veli_a');
select throws_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('veli_a'), 'aydinlatma_veli', 'v-gelecek', true) $$,
  '23503', null, 'yayın tarihi gelmemiş sürüm için rıza açılamaz');

-- ====================== Hesap silinince rıza KANITI kalır ======================
select tests.logout();
update public.consents set subject_hash = repeat('d', 64) where id = tests.id('c_veli_a');
insert into public.consents (user_id, student_id, type, doc_version, granted)
values (tests.id('veli_a'), tests.id('ogr_a1'), 'acik_riza_dolayli_saglik', 'v2', true);   -- aynı çocuk için ikinci kayıt: silmede çakışma olmamalı

-- TEST NOTU: Postgres, AYNI transaction'da eklenmiş satırlar için FK'yi yeniden doğrular. Örnek veri bu testin
-- transaction'ında eklendiğinden, silinen öğrencinin kendi mesaj satırlarını (sender_id SET NULL) önceden temizliyoruz;
-- gerçek hesap silmede satırlar eski transaction'lardan geldiği için bu adıma gerek yoktur.
delete from public.question_messages where sender_id = tests.id('ogr_a1');
select lives_ok($$ delete from auth.users where id = tests.id('ogr_a1') $$, 'öğrenci hesabı (auth.users) silinebilir');
select results_eq(
  $$ select user_id is not null, student_id is null, subject_hash from public.consents where id = tests.id('c_veli_a') $$,
  $$ values (true, true, repeat('d', 64)) $$,
  'öğrenci silinince rıza kaydı KALIR: student_id boşalır, kanıt (tür, sürüm, özet, subject_hash) korunur');
select is((select count(*) from public.consents where type = 'acik_riza_dolayli_saglik' and student_id is null and user_id = tests.id('veli_a')),
  2::bigint, 'aynı çocuğa ait birden çok rıza kaydı silmede çakışmadan anonimleşir');

select lives_ok($$ delete from auth.users where id = tests.id('veli_a') $$, 'veli hesabı silinebilir');
select results_eq(
  $$ select user_id is null, student_id is null, doc_sha256 is not null, subject_hash from public.consents where id = tests.id('c_veli_a') $$,
  $$ values (true, true, true, repeat('d', 64)) $$,
  'veli silinince de rıza kaydı KALIR: user_id boşalır; özet değeri ve subject_hash korunur');
select ok((select count(*) from public.consents where user_id is null) >= 2, 'anonimleşen rıza kayıtları tabloda duruyor');
select tests.login('admin', 'aal2');
select ok(tests.cnt($$ select 1 from public.consents where user_id is null $$) >= 2, 'yönetici aal2: kişisiz rıza kanıtlarını görür');
select tests.login('veli_b');
select is(tests.cnt($$ select 1 from public.consents where user_id is null $$), 0::bigint, 'başka veli kişisiz kanıt satırlarını GÖREMEZ');
select tests.logout();

-- ====================== Öğrenci silinince: ders / eşleşme / soru ======================
select is((select count(*) from public.sessions where id = tests.id('s1')), 0::bigint,
  'öğrenci silinince dersleri ve katılım kayıtları da silinir (SK-08/09)');
select is((select count(*) from public.session_events where session_id = tests.id('s1')), 0::bigint, 'katılım kayıtları silindi');
select results_eq(
  $$ select student_id is null, status, ended_at is not null, anonymized_at is not null, end_reason
     from public.matches where id = tests.id('m1') $$,
  $$ values (true, 'bitti', true, true, 'ogrenci_hesabi_silindi') $$,
  'öğrencinin aktif eşleşmesi SİLİNMEZ: bitirilir ve anonimleşir (SK-14)');
select is((select volunteer_id from public.matches where id = tests.id('m1')), tests.id('gon_x'),
  'anonim eşleşme gönüllü bağını korur (gönüllü güvenlik geçmişi)');
select is((select count(*) from public.questions where id in (tests.id('q1'), tests.id('q4'))), 0::bigint,
  'öğrencinin soruları ve mesajları silindi');
select is((select count(*) from public.recovery_plans where id = tests.id('plan1')), 0::bigint, 'öğrencinin telafi planı silindi');
select is((select count(*) from public.student_features where student_id = tests.id('ogr_a1')), 0::bigint, 'öğrencinin özellik anahtarları silindi');

-- ====================== Gönüllü silinince ======================
select tests.logout();
update public.questions set status = 'atandi', assigned_volunteer_id = tests.id('gon_y'), assigned_at = now() where id = tests.id('q2');

select lives_ok($$ delete from auth.users where id = tests.id('gon_x') $$, 'gönüllü hesabı (eşleşmesi olsa bile) silinebilir');
select results_eq(
  $$ select volunteer_id is null, status, end_reason from public.matches where id = tests.id('m3') $$,
  $$ values (true, 'bitti', 'amac_tamamlandi') $$,
  'gönüllü silinince biten eşleşme kayıt olarak kalır, gerekçesi korunur');
select is((select end_reason from public.matches where id = tests.id('m1')), 'ogrenci_hesabi_silindi',
  'öğrenci hesabı nedeniyle bitmiş eşleşmenin gerekçesi, sonradan gönüllü silinince ÜZERİNE YAZILMAZ');
select lives_ok($$ delete from auth.users where id = tests.id('gon_y') $$, 'atanmış açık sorusu olan gönüllü de silinebilir');
select results_eq(
  $$ select status, assigned_volunteer_id is null, escalated_at is not null from public.questions where id = tests.id('q2') $$,
  $$ values ('havuzda', true, true) $$,
  'gönüllü silinince sahipsiz kalan açık soru HAVUZA döner');
select results_eq(
  $$ select volunteer_id is null, status, end_reason from public.matches where id = tests.id('m2') $$,
  $$ values (true, 'bitti', 'gonullu_hesabi_silindi') $$,
  'gönüllü silinince önerilmiş eşleşme de bitirilir');
select is((select count(*) from public.question_messages where id = tests.id('msg4')), 1::bigint,
  'öğrencinin mesajı gönüllü silinince KALIR');

-- ====================== Saklama zaman damgaları ======================
-- profiles.last_seen_at
select is((select last_seen_at is not null from public.profiles where id = tests.id('veli_b')), true, 'profiles.last_seen_at dolu (varsayılan now())');
select tests.login('veli_b');
select throws_ok($$ update public.profiles set last_seen_at = now() where id = tests.id('veli_b') $$, '42501', null,
  'last_seen_at istemciden yazılamaz (backend günceller)');
select tests.logout();

-- recovery_plans.closed_at
insert into public.recovery_plans (id, student_id, academic_year_id, absence_start, absence_end, daily_goal)
values (tests.id('plan_b'), tests.id('ogr_b1'), '2098-2099', '2098-09-07', '2098-09-20', 1);
select is((select closed_at is null from public.recovery_plans where id = tests.id('plan_b')), true, 'aktif plan: closed_at boş');
update public.recovery_plans set status = 'tamamlandi' where id = tests.id('plan_b');
select is((select closed_at is not null from public.recovery_plans where id = tests.id('plan_b')), true, 'plan tamamlanınca closed_at damgalanır (SK-03)');
update public.recovery_plans set status = 'aktif' where id = tests.id('plan_b');
select is((select closed_at is null from public.recovery_plans where id = tests.id('plan_b')), true, 'plan yeniden açılınca closed_at boşalır');
update public.recovery_plans set status = 'arsiv' where id = tests.id('plan_b');
select is((select closed_at is not null from public.recovery_plans where id = tests.id('plan_b')), true, 'arşivlenince de closed_at damgalanır');

-- questions.closed_at ve last_activity_at
update public.questions set status = 'kapandi' where id = tests.id('q2');
select is((select closed_at is not null from public.questions where id = tests.id('q2')), true, 'soru kapanınca closed_at damgalanır (SK-05)');
insert into public.question_messages (question_id, sender_id, kind, body, created_at)
values (tests.id('q2'), tests.id('ogr_b1'), 'takip', 'sonradan gelen mesaj', now() + interval '2 hours');
select is((select last_activity_at from public.questions where id = tests.id('q2')), now() + interval '2 hours',
  'yeni mesaj sorunun last_activity_at değerini günceller');

-- reports.closed_at
update public.reports set status = 'kapandi' where id = tests.id('r_gon_x');
select is((select closed_at is not null from public.reports where id = tests.id('r_gon_x')), true, 'bildirim kapanınca closed_at damgalanır (SK-11)');

-- Yeni saklama sütunları mevcut
select ok(
  (select count(*) from information_schema.columns
    where table_schema = 'public' and (table_name, column_name) in (
      ('attachments', 'purged_at'), ('moderation_flags', 'original_body_purged_at'),
      ('reports', 'anonymized_at'), ('sessions', 'anonymized_at'), ('matches', 'anonymized_at'),
      ('volunteers', 'decided_at'), ('volunteers', 'left_at'), ('recovery_plans', 'closed_at'),
      ('questions', 'closed_at'), ('questions', 'last_activity_at'), ('profiles', 'last_seen_at'),
      ('reports', 'closed_at'), ('volunteer_documents', 'reviewed_by'))) = 13,
  'saklama için istenen zaman damgası sütunlarının hepsi mevcut');

-- ====================== Gönüllü belgesi: 60 gün / 30 gün ======================
select is((select purge_after = uploaded_at + interval '60 days' from public.volunteer_documents where id = tests.id('doc_z')), true,
  'karar verilmemiş başvuruda belge: yüklemeden 60 gün sonra silinir');
update public.volunteers set status = 'onayli', approved_at = now() where profile_id = tests.id('gon_z');
select is((select decided_at is not null from public.volunteers where profile_id = tests.id('gon_z')), true, 'onay kararı decided_at''e damgalanır');
select is((select purge_after = (select decided_at from public.volunteers where profile_id = tests.id('gon_z')) + interval '30 days'
             and reviewed_at is not null
           from public.volunteer_documents where id = tests.id('doc_z')), true,
  'karar sonrası belge: karardan 30 gün sonra silinir, reviewed_at damgalanır');
insert into public.volunteer_documents (volunteer_id, storage_path)
values (tests.id('gon_z'), tests.id('gon_z')::text || '/' || tests.id('sonradan')::text || '.pdf');
select is((select purge_after = (select decided_at from public.volunteers where profile_id = tests.id('gon_z')) + interval '30 days'
           from public.volunteer_documents where storage_path like '%' || tests.id('sonradan')::text || '.pdf'), true,
  'karardan sonra yüklenen belge de karardan 30 gün sonra silinir');
-- Reddedilen başvuru
select tests.signup('g_red', 'red@ogr.uni.edu.tr', '{"role":"gonullu"}');
insert into public.volunteers (profile_id, given_name, family_name, university) values (tests.id('g_red'), 'Reddedilen', 'Kisi', 'Test Uni');
insert into public.volunteer_documents (volunteer_id, storage_path)
values (tests.id('g_red'), tests.id('g_red')::text || '/' || tests.id('red_belge')::text || '.jpg');
update public.volunteers set status = 'reddedildi', reject_reason = 'belge okunamadi' where profile_id = tests.id('g_red');
select is((select purge_after <= now() + interval '30 days' + interval '1 minute' and purge_after > now() + interval '29 days'
           from public.volunteer_documents where storage_path like '%' || tests.id('red_belge')::text || '.jpg'), true,
  'ret kararından sonra belge 30 gün içinde silinmek üzere işaretlenir');

-- İstemci purge_after / decided_at yazamaz
select tests.login('g_red');
select throws_ok($$ insert into public.volunteer_documents (volunteer_id, storage_path, purge_after)
                    values (tests.id('g_red'), tests.id('g_red')::text || '/' || tests.id('x1')::text || '.pdf', now() + interval '10 years') $$,
  '42501', null, 'istemci belge saklama süresini (purge_after) yazamaz');
select throws_ok($$ update public.volunteers set decided_at = null where profile_id = tests.id('g_red') $$, '42501', null,
  'istemci decided_at değiştiremez');
select tests.logout();

select * from finish();
rollback;
