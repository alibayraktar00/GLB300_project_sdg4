-- =====================================================================
-- 075 · GÜVENLİK YENİDEN DENETİMİ BULGULARI (N1–N6)
-- N1: servis rolü volunteers'a yazabilsin (is_safe_name / short_name EXECUTE)
-- N2: engel kaydının kaynağı sunucuda doğrulanır (blocked_by, rol, match_id)
-- N3: engelden sonra cevaplanmış sorular KAPANIR; engelli gönüllünün mesajları incelemeye kadar gizli
-- N4: çocuğa bağlı rıza yalnızca HÂLÂ veli olanlarca okunur / geri çekilir; geçerli AR-1 = hâlâ veli olanın verdiği
-- N5: Storage kotası kullanıcı bazında kilitli (eşzamanlı yüklemeler)
-- N6: süresi dolmamış deleted_volunteer_links satırı servis rolüyle silinemez
-- =====================================================================
begin;
select plan(67);
select tests.make_fixture();

-- block_volunteer RPC'sinin yerini tutan, postgres sahipli SECURITY DEFINER sarmalayıcı: istemci volunteer_blocks'a
-- doğrudan yazamaz; RPC içinde de auth.uid() çağıranı verir. Talep edilen (sahte) blocked_by / rol parametreyle denenir.
create function tests.rpc_block(p_student uuid, p_volunteer uuid, p_match uuid, p_claimed_by uuid, p_claimed_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.volunteer_blocks (student_id, volunteer_id, match_id, blocked_by, blocked_by_role, reason_code)
  values (p_student, p_volunteer, p_match, p_claimed_by, p_claimed_role, 'uygunsuz_davranis');
end;
$$;
grant execute on function tests.rpc_block(uuid, uuid, uuid, uuid, text) to authenticated;
-- Önerilen block_volunteer biçimi: blocked_by ve blocked_by_role HİÇ yazılmaz; tetikleyici doldurur
create function tests.rpc_block_min(p_student uuid, p_volunteer uuid, p_match uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.volunteer_blocks (student_id, volunteer_id, match_id, reason_code)
  values (p_student, p_volunteer, p_match, 'rahatsiz_edici');
end;
$$;
grant execute on function tests.rpc_block_min(uuid, uuid, uuid) to authenticated;

-- ====================== N1: servis rolü volunteers'a yazabilir ======================
select tests.signup('g_sr', 'sr@ogr.uni.edu.tr', '{"role":"gonullu"}');
select tests.login_service();
select lives_ok($$ insert into public.volunteers (profile_id, given_name, family_name, university) values (tests.id('g_sr'), 'Servis', 'Rolu', 'Test Universitesi') $$,
  'N1: servis rolü gönüllü satırı ekleyebilir (CHECK içindeki is_safe_name için EXECUTE yetkisi var)');
select lives_ok($$ update public.volunteers set given_name = 'Ayse' where profile_id = tests.id('gon_z') $$,
  'N1: servis rolü gönüllü adını güncelleyebilir');
select throws_ok($$ insert into public.volunteers (profile_id, given_name, family_name, university) values (tests.id('gon_s'), 'Ali5', 'Kaya', 'Test Universitesi') on conflict do nothing $$,
  '23514', null, 'N1: servis rolü bile geçersiz ad (rakam) yazamaz: CHECK kısıtı yine çalışır');
select tests.logout();

-- ====================== N2: engel kaydının kaynağı sunucuda doğrulanır ======================
select tests.login('veli_b');   -- ogr_a2'nin velisi DEĞİL
select throws_ok($$ select tests.rpc_block(tests.id('ogr_a2'), tests.id('gon_x'), null, tests.id('veli_b'), 'veli') $$,
  '42501', 'volunteer_blocks: engeli yalnızca öğrencinin kendisi veya velisi ekleyebilir', 'N2: başka öğrencinin velisi engel ekleyemez');
select tests.login('ogr_b1');
select throws_ok($$ select tests.rpc_block(tests.id('ogr_a2'), tests.id('gon_x'), null, tests.id('ogr_b1'), 'ogrenci') $$,
  '42501', 'volunteer_blocks: engeli yalnızca öğrencinin kendisi veya velisi ekleyebilir', 'N2: başka öğrenci engel ekleyemez');
select tests.login('gon_y');
select throws_ok($$ select tests.rpc_block(tests.id('ogr_a2'), tests.id('gon_x'), null, tests.id('gon_y'), 'veli') $$,
  '42501', 'volunteer_blocks: engeli yalnızca öğrencinin kendisi veya velisi ekleyebilir', 'N2: rakip gönüllü engel ekleyemez (rolü "veli" diye beyan etse bile)');
select tests.login('admin', 'aal2');
select throws_ok($$ select tests.rpc_block(tests.id('ogr_a2'), tests.id('gon_x'), null, tests.id('admin'), 'veli') $$,
  '42501', null, 'N2: yönetici bu yoldan engel ekleyemez (yönetici SQL / servis yolunu kullanır)');
select tests.login('veli_a');
select throws_ok($$ select tests.rpc_block(tests.id('ogr_a1'), tests.id('gon_x'), tests.id('m2'), tests.id('veli_a'), 'veli') $$,
  '23514', 'volunteer_blocks: match_id bu öğrenci-gönüllü çiftine ait değil', 'N2: match_id başka çifte aitse reddedilir (m2 = ogr_b1 + gon_y)');
select throws_ok($$ select tests.rpc_block(tests.id('ogr_a1'), tests.id('gon_y'), tests.id('m1'), tests.id('veli_a'), 'veli') $$,
  '23514', 'volunteer_blocks: match_id bu öğrenci-gönüllü çiftine ait değil', 'N2: match_id gönüllü eşleşmiyorsa da reddedilir (m1 = ogr_a1 + gon_x)');
-- Geçerli: sahte beyanlar (blocked_by = başkası, rol = ogrenci) sunucuda ezilir
select lives_ok($$ select tests.rpc_block(tests.id('ogr_a2'), tests.id('gon_x'), tests.id('m3'), tests.id('veli_b'), 'ogrenci') $$,
  'N2: velisi olduğu çocuk için, kendi eşleşmesine ait match_id ile engel ekleyebilir');
select tests.login('ogr_a1');
select lives_ok($$ select tests.rpc_block(tests.id('ogr_a1'), tests.id('gon_s'), null, tests.id('veli_a'), 'veli') $$, 'N2: çocuk kendi adına engel ekleyebilir');
select tests.login('veli_a');
select lives_ok($$ select tests.rpc_block_min(tests.id('ogr_a2'), tests.id('gon_y'), null) $$, 'N2: RPC blocked_by / blocked_by_role YAZMADAN engel ekleyebilir (tetikleyici doldurur)');
select tests.logout();
select results_eq($$ select blocked_by, blocked_by_role from public.volunteer_blocks where student_id = tests.id('ogr_a2') and volunteer_id = tests.id('gon_y') $$,
  $$ select tests.id('veli_a'), 'veli'::text $$, 'N2: boş bırakılan blocked_by / rol çağırandan ve profilinden doldurulur');
select results_eq(
  $$ select blocked_by, blocked_by_role from public.volunteer_blocks where student_id = tests.id('ogr_a2') and volunteer_id = tests.id('gon_x') $$,
  $$ select tests.id('veli_a'), 'veli'::text $$,
  'N2: blocked_by çağıran (veli_a), rol profilden "veli" olur; istemcinin beyanı (veli_b / ogrenci) yok sayılır');
select results_eq(
  $$ select blocked_by, blocked_by_role from public.volunteer_blocks where student_id = tests.id('ogr_a1') and volunteer_id = tests.id('gon_s') $$,
  $$ select tests.id('ogr_a1'), 'ogrenci'::text $$,
  'N2: çocuk engel eklediğinde blocked_by çocuğun kendisi, rol "ogrenci" (beyan edilen veli_a / veli ezildi)');
-- Servis rolü / SQL yolu: blocked_by çocukla ilişkili olmalı
select tests.login_service();
select throws_ok($$ insert into public.volunteer_blocks (student_id, volunteer_id, blocked_by, blocked_by_role) values (tests.id('ogr_b1'), tests.id('gon_y'), tests.id('veli_a'), 'veli') $$,
  '42501', 'volunteer_blocks: blocked_by çocukla ilişkili değil (çocuğun kendisi ya da velisi olmalı)', 'N2: servis rolü başkasının velisi adına engel yazamaz (S1 sahte kayıt)');
select lives_ok($$ insert into public.volunteer_blocks (student_id, volunteer_id, blocked_by, blocked_by_role) values (tests.id('ogr_b1'), tests.id('gon_x'), tests.id('veli_b'), 'ogrenci') $$,
  'N2: servis rolü, çocuğun velisi adına engel yazabilir');
select tests.logout();
select is((select blocked_by_role from public.volunteer_blocks where student_id = tests.id('ogr_b1') and volunteer_id = tests.id('gon_x')), 'veli',
  'N2: servis yolunda da rol profilden / bağdan türetilir (beyan: ogrenci, gerçek: veli)');
select throws_ok($$ insert into public.volunteer_blocks (student_id, volunteer_id, match_id, blocked_by, blocked_by_role) values (tests.id('ogr_b1'), tests.id('gon_s'), tests.id('m1'), tests.id('veli_b'), 'veli') $$,
  '23514', null, 'N2: SQL yolunda da match_id çifte ait olmalı');
select lives_ok($$ insert into public.volunteer_blocks (student_id, volunteer_id, blocked_by_role) values (tests.id('ogr_b1'), tests.id('gon_z'), 'veli') $$,
  'N2: blocked_by boş (sistem / yönetici SQL yolu) kayıt reddedilmez; beyan edilen rol kalır');

-- ====================== N3: engelden sonra cevaplanmış sorular kapanır, mesajlar gizlenir ======================
-- Hazırlık: gon_x'in CEVAPLADIĞI bir soru (ogr_a1) + gon_x'in sesli cevabı (q1'de) ve kendi mesajı
insert into public.questions (id, student_id, subject_id, grade, status, assigned_volunteer_id, assigned_at, first_answered_at)
values (tests.id('q_cev'), tests.id('ogr_a1'), (select id from public.subjects where code = 'MAT'), 6, 'cevaplandi', tests.id('gon_x'), now() - interval '1 day', now() - interval '20 hours');
insert into public.question_messages (id, question_id, sender_id, kind, body) values
  (tests.id('msg_q_cev1'), tests.id('q_cev'), tests.id('ogr_a1'), 'soru', 'Cevaplanmis soru'),
  (tests.id('msg_q_cev2'), tests.id('q_cev'), tests.id('gon_x'), 'cevap', 'Gonullu x cevabi');
insert into storage.objects (bucket_id, name, owner_id)
values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('file_gx')::text || '.m4a', tests.id('gon_x')::text);
insert into public.attachments (id, message_id, storage_path, kind, mime, size_bytes, duration_sec) values
  (tests.id('att_gx'), tests.id('msg2'),
   tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('file_gx')::text || '.m4a', 'ses', 'audio/mp4', 40000, 12);
select tests.login('gon_x');
select is(tests.visible('public.question_messages', array['msg1', 'msg2']), 'msg1,msg2', 'N3 (kontrol): engelden ÖNCE gönüllü kendi mesajını görür');
select tests.login('gon_y');
select is(tests.visible('public.question_messages', array['msg1', 'msg2']), '', 'N3 (kontrol): gon_y atanmamış soruyu henüz görmez');
select tests.logout();

-- ENGEL: veli_a, gon_x'i ogr_a1 için engeller
select tests.login('veli_a');
select lives_ok($$ select tests.rpc_block(tests.id('ogr_a1'), tests.id('gon_x'), tests.id('m1'), tests.id('veli_a'), 'veli') $$, 'veli, gönüllüyü engeller');
select tests.logout();
select results_eq($$ select status, assigned_volunteer_id is null from public.questions where id = tests.id('q1') $$, $$ values ('havuzda', true) $$,
  'N3: gönüllünün CEVAPLAMADIĞI (atandi) sorusu havuza döner');
select results_eq($$ select status, assigned_volunteer_id = tests.id('gon_x'), closed_at is not null from public.questions where id = tests.id('q_cev') $$,
  $$ values ('kapandi', true, true) $$,
  'N3: gönüllünün CEVAPLADIĞI soru KAPANIR (havuza dönmez); atanan gönüllü tarihçe için kalır; closed_at damgalanır');
select is((select status from public.questions where id = tests.id('q4')), 'atandi', 'N3: başka öğrenci/gönüllü çifti etkilenmez (q4: ogr_a1 + gon_y)');

select tests.login('gon_y');   -- MAT 6 veren başka gönüllü: havuza düşen q1'i görür
select is(tests.visible('public.questions', array['q1', 'q_cev']), 'q1', 'N3: havuzdaki q1 başka gönüllüye görünür, kapanan soru görünmez');
select is(tests.visible('public.question_messages', array['msg1', 'msg2']), 'msg1',
  'N3: yeni gönüllü, engellenen gönüllünün mesajını (msg2) GÖRMEZ; çocuğun kendi sorusunu görür');
select is(tests.cnt($$ select 1 from public.attachments where id = tests.id('att_gx') $$), 0::bigint, 'N3: engellenen gönüllünün sesli eki de yeni gönüllüye görünmez');
select is(tests.cnt($$ select 1 from storage.objects where bucket_id = 'soru-ekleri' and name like '%' || tests.id('file_gx')::text || '%' $$), 0::bigint,
  'N3: ek Storage nesnesi olarak da yeni gönüllüye görünmez (zincir attachments -> question_messages)');
select tests.login('ogr_a1');
select is(tests.cnt($$ select 1 from storage.objects where bucket_id = 'soru-ekleri' and name like '%' || tests.id('file_gx')::text || '%' $$), 1::bigint,
  'N3 (kontrol): aynı ek, sorunun sahibi çocuğa Storage nesnesi olarak görünür');
select is(tests.visible('public.question_messages', array['msg1', 'msg2', 'msg_q_cev2']), 'msg1,msg2,msg_q_cev2', 'N3: çocuk, engellediği gönüllünün mesajlarını görmeye devam eder');
select tests.login('veli_a');
select is(tests.visible('public.question_messages', array['msg1', 'msg2', 'msg_q_cev2']), 'msg1,msg2,msg_q_cev2', 'N3: veli de görür');
select tests.login('admin', 'aal2');
select is(tests.visible('public.question_messages', array['msg1', 'msg2', 'msg_q_cev2']), 'msg1,msg2,msg_q_cev2', 'N3: yönetici (aal2) görür');
select tests.login('gon_x');
select is(tests.visible('public.question_messages', array['msg1', 'msg2', 'msg_q_cev2']), '', 'N3: engellenen gönüllü hiçbir şey göremez');

-- Yönetici incelemesinden sonra olağan kurallar: embargo kalkar
select tests.login('admin', 'aal2');
select is(tests.affected($$ update public.volunteer_blocks set reviewed_at = now() where student_id = tests.id('ogr_a1') and volunteer_id = tests.id('gon_x') $$), 1::bigint,
  'yönetici engeli inceler (reviewed_at)');
select tests.login('gon_y');
select is(tests.visible('public.question_messages', array['msg1', 'msg2']), 'msg1,msg2',
  'N3: yönetici incelemesinden sonra mesaj olağan kurallarla görünür (uygunsuzsa yönetici hidden_at ile gizler)');
select tests.logout();

-- ====================== N4: çocuğa bağlı rıza yalnızca hâlâ veli olanlarca ======================
select tests.signup('veli_c', 'veli.c@pgtap.test', '{"role":"veli"}');
insert into public.guardian_students (guardian_id, student_id, relation) values (tests.id('veli_c'), tests.id('ogr_a2'), 'baba');
insert into public.consents (id, user_id, student_id, type, doc_version, granted) values
  (tests.id('c_veli_c'), tests.id('veli_c'), tests.id('ogr_a2'), 'acik_riza_dolayli_saglik', 'v1', true);
-- veli_a ogr_a2 için de AR-1 vermiş olsun; sonra velilikten çıkarılır
insert into public.consents (id, user_id, student_id, type, doc_version, granted) values
  (tests.id('c_veli_a2'), tests.id('veli_a'), tests.id('ogr_a2'), 'acik_riza_dolayli_saglik', 'v1', true);
select tests.login('veli_a');
select is(tests.visible('public.consents', array['c_veli_a2']), 'c_veli_a2', 'N4 (kontrol): hâlâ veliyken kendi çocuk rızasını görür');
select tests.logout();
delete from public.guardian_students where guardian_id = tests.id('veli_a') and student_id = tests.id('ogr_a2');   -- velayet değişti
select is((select status from public.profiles where id = tests.id('ogr_a2')), 'aktif', 'N4: kalan velinin (veli_c) geçerli AR-1''i var: çocuk aktif kalır');
select tests.login('veli_a');
select is(tests.visible('public.consents', array['c_veli_a2', 'c_veli_c']), '', 'N4: ESKİ veli, çocuğa bağlı eski rıza satırını (çocuğun kimliğini) artık GÖREMEZ');
select is(tests.affected($$ update public.consents set withdrawn_at = now() where id = tests.id('c_veli_a2') $$), 0::bigint,
  'N4: ESKİ veli kendi eski rızasını geri çekemez (S3b: çocuğu askıya alamaz)');
select is(tests.visible('public.consents', array['c_veli_a']), 'c_veli_a', 'N4: ogr_a1 hâlâ onun çocuğu: o çocuğa bağlı rızayı görmeye devam eder');
select tests.login('veli_c');
select is(tests.visible('public.consents', array['c_veli_a2', 'c_veli_c']), 'c_veli_a2,c_veli_c', 'N4: çocuğun mevcut velisi her iki rıza satırını görür');
select tests.logout();
-- ESKİ velinin kaydı "geçerli" sayılmaz: veli_c kendi AR-1'ini geri çekince çocuk askıya alınır
update public.consents set withdrawn_at = now() where id = tests.id('c_veli_c');
select is((select status from public.profiles where id = tests.id('ogr_a2')), 'beklemede',
  'N4: kalan başka geçerli kayıt yalnızca ESKİ velinin verdiği rıza ise çocuk yine askıya alınır');
-- Çocuğa bağlı OLMAYAN rıza satırları sahibinindir
select tests.login('gon_x');
select is(tests.visible('public.consents', array['c_gon_x']), 'c_gon_x', 'N4: çocuğa bağlı olmayan rıza (gönüllü taahhüdü) sahibince okunur');
select is(tests.affected($$ update public.consents set withdrawn_at = now() where id = tests.id('c_gon_x') $$), 1::bigint, 'N4: çocuğa bağlı olmayan rıza sahibince geri çekilebilir');
select tests.logout();

-- Veli bağı silinince KALAN velilerin geçerli AR-1'i aranır (kalan velinin AR-1'i yoksa çocuk askıya alınır)
update public.profiles set status = 'aktif' where id = tests.id('ogr_a2');
delete from public.guardian_students where guardian_id = tests.id('veli_c') and student_id = tests.id('ogr_a2');
select is((select status from public.profiles where id = tests.id('ogr_a2')), 'beklemede', 'N4: son veli de ayrılınca çocuk beklemede');
-- ogr_b1: iki veli, yalnızca biri AR-1 vermiş; AR-1 sahibi ayrılır -> kalan veli AR-1 vermemiş -> askı
insert into public.guardian_students (guardian_id, student_id, relation) values (tests.id('veli_c'), tests.id('ogr_b1'), 'anne');
delete from public.guardian_students where guardian_id = tests.id('veli_b') and student_id = tests.id('ogr_b1');
select is((select status from public.profiles where id = tests.id('ogr_b1')), 'beklemede',
  'N4: AR-1''i veren veli ayrıldı, kalan veli (veli_c) AR-1 vermemiş: çocuk "beklemede" olur');
select is((select count(*) from public.audit_log where action = 'cocuk_riza_gecersiz' and entity_id = tests.id('ogr_b1')::text), 1::bigint,
  'N4: bu askı ayrı bir denetim kaydıyla (cocuk_riza_gecersiz) yazılır');
select results_eq($$ select status, end_reason from public.matches where id = tests.id('m2') $$, $$ values ('bitti', 'riza_geri_cekildi') $$,
  'N4: çocuğun açık / önerilmiş eşleşmesi biter');

-- Askıdaki veli rızasını geri çekebilir (bağı sürüyor): geri çekmek vermek kadar kolay
update public.profiles set status = 'aktif' where id = tests.id('ogr_a1');
update public.profiles set status = 'askida' where id = tests.id('veli_a');
select tests.login('veli_a');
select is(tests.affected($$ update public.consents set withdrawn_at = now() where id = tests.id('c_veli_a') $$), 1::bigint,
  'N4 (S3c): askıdaki ama bağı süren veli çocuğa bağlı rızasını geri çekebilir');
select tests.logout();
select is((select status from public.profiles where id = tests.id('ogr_a1')), 'beklemede', 'N4 (S3c): bu geri çekme çocuğu askıya alır (hizmetin dayanağı kalmadı)');

-- Geri çekme / geçersizlik SONRASI yeni rıza verilirse hesap KENDİLİĞİNDEN AÇILMAZ (hukuk acik-riza-veli §2/8: iki veli
-- anlaşamazsa yönetici bilinçli olarak açar; yeni rıza tek başına yeterli değildir)
update public.profiles set status = 'aktif' where id = tests.id('veli_a');
select tests.login('veli_a');
select lives_ok($$ insert into public.consents (user_id, student_id, type, doc_version, granted) values (tests.id('veli_a'), tests.id('ogr_a1'), 'acik_riza_dolayli_saglik', 'v2', true) $$,
  'veli, geri çekmeden sonra yeni AR-1 verebilir');
select tests.logout();
select is((select status from public.profiles where id = tests.id('ogr_a1')), 'beklemede', 'yeni AR-1 verilse bile çocuk hesabı KENDİLİĞİNDEN açılmaz (yönetici / RPC bilinçli açar)');
select results_eq($$ select status, end_reason from public.matches where id = tests.id('m1') $$, $$ values ('bitti', 'engellendi') $$,
  'biten eşleşme yeni rızayla yeniden açılmaz');
-- Aynısı velilikten çıkarma sonrası askıda geçerli: kalan veli (veli_c) AR-1 verse bile ogr_b1 beklemede kalır
insert into public.consents (user_id, student_id, type, doc_version, granted) values (tests.id('veli_c'), tests.id('ogr_b1'), 'acik_riza_dolayli_saglik', 'v2', true);
select is((select status from public.profiles where id = tests.id('ogr_b1')), 'beklemede', 'kalan veli yeni AR-1 verse de velilik değişiminde askıya alınan çocuk kendiliğinden açılmaz');
select results_eq($$ select status, end_reason from public.matches where id = tests.id('m2') $$, $$ values ('bitti', 'riza_geri_cekildi') $$, 'ogr_b1 eşleşmesi biten olarak kalır');
select is((select count(*) from public.audit_log where action in ('ar1_geri_cekildi', 'cocuk_riza_gecersiz') and entity_id = tests.id('ogr_b1')::text), 1::bigint,
  'ogr_b1 için yalnızca ilk askı denetim kaydı var; yeni rıza ikinci kayıt ya da etkinleştirme üretmez');

-- ====================== N5: Storage kotası kullanıcı bazında kilitli ======================
select tests.login('gon_z');
select ok(private.storage_kota_uygun('gonullu-belgeleri'), 'kota fonksiyonu çalışır (yükleme hakkı var)');
select tests.logout();
select ok((select count(*) from pg_locks where locktype = 'advisory' and pid = pg_backend_pid() and granted) >= 1,
  'N5: kota denetimi işlem boyunca tutulan bir advisory kilit alır (aynı kullanıcının eşzamanlı yüklemeleri sıraya girer)');
select ok(pg_get_functiondef('private.storage_kota_uygun(text)'::regprocedure) ~* 'pg_advisory_xact_lock',
  'N5: kota fonksiyonu pg_advisory_xact_lock kullanır');
select is((select provolatile::text from pg_proc where oid = 'private.storage_kota_uygun(text)'::regprocedure), 'v', 'N5: kota fonksiyonu VOLATILE kalır');

-- ====================== N6: süresi dolmamış bağlantı kaydı silinemez ======================
insert into public.deleted_volunteer_links (former_profile_id, entity, entity_id, expires_at) values
  (gen_random_uuid(), 'matches', tests.id('n6_gecerli'), now() + interval '300 days'),
  (gen_random_uuid(), 'matches', tests.id('n6_dolmus'),  now() - interval '1 day');
select tests.login_service();
select throws_ok($$ delete from public.deleted_volunteer_links where entity_id = tests.id('n6_gecerli') $$,
  '42501', null, 'N6: servis rolü SÜRESİ DOLMAMIŞ bağlantı kaydını silemez');
select throws_ok($$ delete from public.deleted_volunteer_links where expires_at > now() $$, '42501', null, 'N6: toplu silme de reddedilir (S12)');
select is(tests.affected($$ delete from public.deleted_volunteer_links where entity_id = tests.id('n6_dolmus') $$), 1::bigint,
  'N6: servis rolü SÜRESİ DOLMUŞ kaydı silebilir (cleanup)');
select tests.logout();
select is((select count(*) from public.deleted_volunteer_links where entity_id = tests.id('n6_gecerli')), 1::bigint, 'N6: süresi dolmamış kayıt yerinde');
select lives_ok($$ delete from public.deleted_volunteer_links where entity_id = tests.id('n6_gecerli') $$,
  'N6: postgres (yönetici SQL''i, ör. veri sahibi talebi) süresi dolmamış kaydı silebilir');

select * from finish();
rollback;
