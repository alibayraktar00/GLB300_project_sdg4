-- =====================================================================
-- 030 · RLS ROL MATRİSİ: sorular, mesajlar, ekler, moderasyon
-- Örnek veri (tests.make_fixture):
--   q1: ogr_a1 MAT 6, gon_x'e atanmış        q2: ogr_b1 MAT 6, HAVUZDA
--   q3: ogr_a2 FEN 7, HAVUZDA                q4: ogr_a1 FEN 6, gon_y'ye atanmış
--   msg1 (q1 soru) msg2 (q1 cevap) msg3 (q1 takip, GİZLENMİŞ) msg4 (q2) msg5 (q3) msg6 (q4)
--   gon_x: MAT 6-7, ogr_a1 ile MAT aktif   gon_y: MAT 6 + FEN 6   gon_z: onaysız   gon_s: askıda
-- =====================================================================
begin;
select plan(81);
select tests.make_fixture();

-- ====================== questions: kim hangi soruyu görür ======================
select tests.login_anon();
select throws_ok($$ select * from public.questions $$, '42501', null, 'anon: sorular okunamaz');
select throws_ok($$ select * from public.question_messages $$, '42501', null, 'anon: mesajlar okunamaz');
select throws_ok($$ select * from public.attachments $$, '42501', null, 'anon: ekler okunamaz');

select tests.login('ogr_a1');
select is(tests.visible('public.questions', array['q1','q2','q3','q4']), 'q1,q4', 'ogr_a1: yalnızca KENDİ soruları');
select tests.login('ogr_a2');
select is(tests.visible('public.questions', array['q1','q2','q3','q4']), 'q3', 'ogr_a2: kardeşinin sorularını göremez');
select tests.login('ogr_b1');
select is(tests.visible('public.questions', array['q1','q2','q3','q4']), 'q2', 'ogr_b1: yalnızca kendi sorusu');

select tests.login('veli_a');
select is(tests.visible('public.questions', array['q1','q2','q3','q4']), 'q1,q3,q4', 'veli_a: iki çocuğunun soruları; başka çocuğunki YOK');
select tests.login('veli_b');
select is(tests.visible('public.questions', array['q1','q2','q3','q4']), 'q2', 'veli_b: yalnızca kendi çocuğunun sorusu');

select tests.login('gon_x');
select is(tests.visible('public.questions', array['q1','q2','q3','q4']), 'q1,q2',
  'gon_x: kendisine atanan q1 + dersini/sınıfını verdiği HAVUZ sorusu q2; FEN havuz sorusu (q3) ve başkasına atanan (q4) YOK');
select tests.login('gon_y');
select is(tests.visible('public.questions', array['q1','q2','q3','q4']), 'q2,q4',
  'gon_y: havuz sorusu q2 (MAT 6) + kendisine atanan q4; FEN 7 (q3) YOK; yalnızca ÖNERİLMİŞ eşleşme erişim vermez (q1 YOK)');
select tests.login('gon_z');
select is(tests.visible('public.questions', array['q1','q2','q3','q4']), '', 'onaysız gönüllü hiçbir soru göremez (havuz dahil)');
select tests.login('gon_s');
select is(tests.visible('public.questions', array['q1','q2','q3','q4']), '', 'askıdaki gönüllü hiçbir soru göremez');

select tests.login('admin');
select is(tests.visible('public.questions', array['q1','q2','q3','q4']), '', 'yönetici aal1: soru göremez');
select tests.login('admin', 'aal2');
select is(tests.visible('public.questions', array['q1','q2','q3','q4']), 'q1,q2,q3,q4', 'yönetici aal2: tüm sorular');
select tests.login('veli_a', 'aal2');
select is(tests.visible('public.questions', array['q2']), '', 'veli aal2 oturumu bile yönetici yetkisi vermez (rol kontrolü)');

-- Havuz: soruyu görmek öğrenci kimliğini AÇMAZ
select tests.login('gon_x');
select is(tests.cnt($$ select 1 from public.students where profile_id = (select student_id from public.questions where id = tests.id('q2')) $$), 0::bigint,
  'havuz sorusunu gören gönüllü, öğrencinin kaydını ÇÖZEMEZ');
select is(tests.cnt($$ select 1 from public.profiles where id = (select student_id from public.questions where id = tests.id('q2')) $$), 0::bigint,
  'havuz sorusunu gören gönüllü, öğrencinin profilini (rumuz) ÇÖZEMEZ');
select is(tests.cnt($$ select 1 from public.matched_students where student_id = (select student_id from public.questions where id = tests.id('q2')) $$), 0::bigint,
  'havuz sorusu sahibi, eşleşmiş öğrenci görünümünde YOKTUR');

-- ====================== question_messages ======================
select tests.login('ogr_a1');
select is(tests.visible('public.question_messages', array['msg1','msg2','msg3','msg4','msg5','msg6']), 'msg1,msg2,msg6',
  'ogr_a1: kendi mesajları; GİZLENMİŞ msg3 görünmez');
select tests.login('ogr_b1');
select is(tests.visible('public.question_messages', array['msg1','msg2','msg3','msg4','msg5','msg6']), 'msg4', 'ogr_b1: yalnızca kendi sorusunun mesajı');
select tests.login('veli_a');
select is(tests.visible('public.question_messages', array['msg1','msg2','msg3','msg4','msg5','msg6']), 'msg1,msg2,msg5,msg6',
  'veli_a: çocuklarının mesajları (gizlenmiş hariç); başka çocuğunki YOK');
select tests.login('veli_b');
select is(tests.visible('public.question_messages', array['msg1','msg2','msg3','msg4','msg5','msg6']), 'msg4', 'veli_b: yalnızca kendi çocuğunun mesajı');
select tests.login('gon_x');
select is(tests.visible('public.question_messages', array['msg1','msg2','msg3','msg4','msg5','msg6']), 'msg1,msg2,msg4',
  'gon_x: atandığı q1''in mesajları + havuz sorusu q2''nin mesajı');
select tests.login('gon_y');
select is(tests.visible('public.question_messages', array['msg1','msg2','msg3','msg4','msg5','msg6']), 'msg4,msg6', 'gon_y: havuz + atandığı soru');
select tests.login('gon_z');
select is(tests.visible('public.question_messages', array['msg1','msg2','msg3','msg4','msg5','msg6']), '', 'onaysız gönüllü mesaj göremez');
select tests.login('admin');
select is(tests.visible('public.question_messages', array['msg1','msg2','msg3','msg4','msg5','msg6']), '', 'yönetici aal1: mesaj göremez');
select tests.login('admin', 'aal2');
select is(tests.visible('public.question_messages', array['msg1','msg2','msg3','msg4','msg5','msg6']), 'msg1,msg2,msg3,msg4,msg5,msg6',
  'yönetici aal2: gizlenmiş mesaj dahil hepsi');

-- ====================== attachments ======================
select tests.login('ogr_a1');
select is(tests.visible('public.attachments', array['att1']), 'att1', 'ogr_a1: kendi ekini görür');
select tests.login('ogr_a2');
select is(tests.visible('public.attachments', array['att1']), '', 'ogr_a2: kardeşinin ekini göremez');
select tests.login('veli_a');
select is(tests.visible('public.attachments', array['att1']), 'att1', 'veli_a: çocuğunun ekini görür');
select tests.login('veli_b');
select is(tests.visible('public.attachments', array['att1']), '', 'veli_b: başka çocuğun ekini göremez');
select tests.login('gon_x');
select is(tests.visible('public.attachments', array['att1']), 'att1', 'atanmış gönüllü soru ekini görür');
select tests.login('gon_y');
select is(tests.visible('public.attachments', array['att1']), '', 'eşleşmemiş gönüllü ekini göremez');
select tests.login('admin', 'aal2');
select is(tests.visible('public.attachments', array['att1']), 'att1', 'yönetici aal2: eki görür');
select tests.login('admin');
select is(tests.visible('public.attachments', array['att1']), '', 'yönetici aal1: eki göremez');

-- ====================== moderation_flags / audit_log ======================
select tests.login('gon_x');
select is(tests.cnt($$ select 1 from public.moderation_flags where entity_id = tests.id('msg2') $$), 0::bigint,
  'filtreye takılan mesajın yazarı bayrağı/özgün metni göremez');
select tests.login('ogr_a1');
select is(tests.cnt($$ select 1 from public.moderation_flags $$), 0::bigint, 'öğrenci moderasyon bayraklarını göremez');
select tests.login('veli_a');
select is(tests.cnt($$ select 1 from public.moderation_flags $$), 0::bigint, 'veli moderasyon bayraklarını göremez');
select tests.login('admin');
select is(tests.cnt($$ select 1 from public.moderation_flags where entity_id = tests.id('msg2') $$), 0::bigint, 'yönetici aal1: bayrakları göremez');
select tests.login('admin', 'aal2');
select is(tests.cnt($$ select 1 from public.moderation_flags where entity_id = tests.id('msg2') and original_body = 'ORIJINAL METIN' $$), 1::bigint,
  'yönetici aal2: bayrağı ve özgün metni görür');
select throws_ok($$ insert into public.moderation_flags (entity, entity_id, reasons) values ('mesaj', tests.id('msg1'), array['x']) $$, '42501', null,
  'yönetici bile bayrak EKLEYEMEZ (yalnızca sistem)');

-- ====================== DEĞİŞTİRİLEMEZLİK: mesajlar ======================
select tests.login('ogr_a1');
select throws_ok($$ update public.question_messages set body = 'degisti' where id = tests.id('msg1') $$, '42501', null,
  'öğrenci KENDİ mesajını değiştiremez');
select throws_ok($$ delete from public.question_messages where id = tests.id('msg1') $$, '42501', null,
  'öğrenci KENDİ mesajını silemez');
select is(tests.affected($$ update public.question_messages set hidden_at = now() where id = tests.id('msg1') $$), 0::bigint,
  'öğrenci mesajı gizleyemez (RLS: yalnızca yönetici)');
select throws_ok($$ insert into public.question_messages (question_id, sender_id, kind, body) values (tests.id('q1'), tests.id('ogr_a1'), 'takip', 'dogrudan ekleme') $$, '42501', null,
  'öğrenci doğrudan mesaj ekleyemez (yalnızca RPC: filtre + sınırlar)');
select throws_ok($$ insert into public.questions (student_id, subject_id, grade) values (tests.id('ogr_a1'), 1, 6) $$, '42501', null,
  'öğrenci doğrudan soru ekleyemez (yalnızca ask_question RPC)');
select throws_ok($$ update public.questions set status = 'kapandi' where id = tests.id('q1') $$, '42501', null,
  'öğrenci soru durumunu doğrudan değiştiremez (close_question RPC)');
select throws_ok($$ delete from public.questions where id = tests.id('q1') $$, '42501', null, 'öğrenci soru silemez');
select throws_ok($$ insert into public.attachments (message_id, storage_path, kind, mime, size_bytes) values (tests.id('msg1'), 'x', 'foto', 'image/jpeg', 10) $$, '42501', null,
  'öğrenci doğrudan ek ekleyemez');
select throws_ok($$ delete from public.attachments where id = tests.id('att1') $$, '42501', null, 'öğrenci ek silemez');

select tests.login('gon_x');
select throws_ok($$ update public.question_messages set body = 'degisti' where id = tests.id('msg2') $$, '42501', null,
  'gönüllü KENDİ cevabını değiştiremez');
select throws_ok($$ delete from public.question_messages where id = tests.id('msg2') $$, '42501', null, 'gönüllü cevabını silemez');
select throws_ok($$ insert into public.question_messages (question_id, sender_id, kind, body) values (tests.id('q1'), tests.id('gon_x'), 'cevap', 'dogrudan') $$, '42501', null,
  'gönüllü doğrudan cevap ekleyemez (post_message RPC)');
select throws_ok($$ update public.questions set status = 'cevaplandi', assigned_volunteer_id = tests.id('gon_x') where id = tests.id('q2') $$, '42501', null,
  'gönüllü havuz sorusunu doğrudan üstlenemez (claim_question RPC)');
select is(tests.affected($$ update public.question_messages set hidden_at = now() where id = tests.id('msg2') $$), 0::bigint,
  'gönüllü mesaj gizleyemez');

select tests.login('veli_a');
select throws_ok($$ update public.question_messages set body = 'degisti' where id = tests.id('msg1') $$, '42501', null, 'veli mesaj değiştiremez');
select throws_ok($$ delete from public.question_messages where id = tests.id('msg1') $$, '42501', null, 'veli mesaj silemez');
select is(tests.affected($$ update public.question_messages set hidden_at = now() where id = tests.id('msg1') $$), 0::bigint, 'veli mesaj gizleyemez');

-- Yönetici gizleme
select tests.login('admin');
select is(tests.affected($$ update public.question_messages set hidden_at = now() where id = tests.id('msg1') $$), 0::bigint,
  'yönetici aal1: mesaj gizleyemez');
select tests.login('admin', 'aal2');
select throws_ok($$ update public.question_messages set body = 'sansur' where id = tests.id('msg1') $$, '42501', null,
  'yönetici aal2 bile mesaj METNİNİ değiştiremez (yalnızca gizleyebilir)');
select is(tests.affected($$ update public.question_messages set hidden_at = '2000-01-01' where id = tests.id('msg1') $$), 1::bigint,
  'yönetici aal2: mesajı gizleyebilir');
select cmp_ok((select hidden_at from public.question_messages where id = tests.id('msg1')), '>', '2020-01-01'::timestamptz,
  'gizleme zamanını sunucu belirler');
select is((select hidden_by from public.question_messages where id = tests.id('msg1')), tests.id('admin'),
  'gizleyen yönetici sunucuda damgalanır (hidden_by)');
select is((select count(*) from public.audit_log where action = 'mesaj_gizlendi' and entity_id = tests.id('msg1')::text and actor_id = tests.id('admin')), 1::bigint,
  'gizleme denetim kaydına yazıldı');
select tests.login('ogr_a1');
select is(tests.visible('public.question_messages', array['msg1','msg2']), 'msg2', 'gizlenen mesaj öğrenciden de kaybolur');
select is(tests.visible('public.attachments', array['att1']), '', 'gizlenen mesajın eki de kaybolur');
select tests.login('veli_a');
select is(tests.visible('public.question_messages', array['msg1','msg2']), 'msg2', 'gizlenen mesaj veliden de kaybolur');

-- İkinci savunma hattı: SQL oturumu (postgres) bile mesaj içeriğini değiştiremez
select tests.logout();
select throws_ok($$ update public.question_messages set body = 'degisti' where id = tests.id('msg2') $$, '42501', 'Mesajlar değiştirilemez',
  'tetikleyici: SQL oturumu bile mesaj metnini değiştiremez');
select throws_ok($$ update public.question_messages set sender_id = tests.id('veli_a') where id = tests.id('msg2') $$, '42501', null,
  'tetikleyici: mesajın göndereni değiştirilemez');
select throws_ok($$ update public.question_messages set hidden_by = tests.id('veli_a') where id = tests.id('msg2') $$, '42501', null,
  'tetikleyici: hidden_by doğrudan yazılamaz');
select throws_ok($$ insert into public.question_messages (question_id, sender_id, kind, body) values (tests.id('q1'), tests.id('ogr_a1'), 'soru', 'ikinci soru mesaji') $$, '23505', null,
  'bir soruda yalnızca bir "soru" mesajı olabilir');

-- Ek bütünlüğü
select throws_ok($$ insert into public.attachments (message_id, storage_path, kind, mime, size_bytes)
  values (tests.id('msg6'), tests.id('ogr_a1')::text || '/' || tests.id('q4')::text || '/' || tests.id('f2')::text || '.jpg', 'foto', 'image/jpeg', 3000000) $$,
  '23514', null, 'fotoğraf eki 2 MB''ı aşamaz');
select throws_ok($$ insert into public.attachments (message_id, storage_path, kind, mime, size_bytes)
  values (tests.id('msg6'), tests.id('ogr_a1')::text || '/' || tests.id('q4')::text || '/' || tests.id('f3')::text || '.jpg', 'foto', 'image/png', 1000) $$,
  '23514', null, 'fotoğraf yalnızca JPEG olabilir');
select throws_ok($$ insert into public.attachments (message_id, storage_path, kind, mime, size_bytes, duration_sec)
  values (tests.id('msg6'), tests.id('ogr_a1')::text || '/' || tests.id('q4')::text || '/' || tests.id('f4')::text || '.m4a', 'ses', 'audio/mp4', 1000, 121) $$,
  '23514', null, 'ses eki 120 saniyeyi aşamaz');
select lives_ok($$ insert into public.attachments (message_id, storage_path, kind, mime, size_bytes, duration_sec)
  values (tests.id('msg6'), tests.id('ogr_a1')::text || '/' || tests.id('q4')::text || '/' || tests.id('f5')::text || '.m4a', 'ses', 'audio/mp4', 2000000, 90) $$,
  'geçerli ses eki (≤3 MB, ≤120 sn) eklenir');
select throws_ok($$ insert into public.attachments (message_id, storage_path, kind, mime, size_bytes)
  values (tests.id('msg6'), '../../etc/passwd', 'foto', 'image/jpeg', 1000) $$,
  '23514', null, 'ek yolu {öğrenci}/{soru}/{uuid}.uzantı biçiminde olmalı');

-- Askı ve onay durumunun etkisi
update public.volunteers set status = 'askida' where profile_id = tests.id('gon_x');
select tests.login('gon_x');
select is(tests.visible('public.questions', array['q1','q2']), '', 'gönüllü durumu "askida" olunca atandığı soruya ve havuza erişimi kapanır');
select tests.logout();
update public.volunteers set status = 'onayli' where profile_id = tests.id('gon_x');
update public.profiles set status = 'askida' where id = tests.id('ogr_a1');
select tests.login('ogr_a1');
select is(tests.visible('public.questions', array['q1','q4']), '', 'askıdaki öğrenci kendi sorularına bile erişemez');
select tests.login('veli_a');
select is(tests.visible('public.questions', array['q1','q4']), 'q1,q4', 'çocuğun askıya alınması velinin erişimini kapatmaz');
select tests.logout();
update public.profiles set status = 'askida' where id = tests.id('veli_a');
select tests.login('veli_a');
select is(tests.visible('public.questions', array['q1','q3']), '', 'askıdaki veli çocuklarının sorularına erişemez');

-- Bitmiş eşleşme + atamanın kalkması: gönüllü erişimini kaybeder
select tests.logout();
update public.profiles set status = 'aktif' where id in (tests.id('veli_a'), tests.id('ogr_a1'));
update public.matches set status = 'bitti', ended_at = now(), end_reason = 'amac_tamamlandi' where id = tests.id('m1');
update public.questions set assigned_volunteer_id = null, status = 'kapandi' where id = tests.id('q1');
select tests.login('gon_x');
select is(tests.visible('public.questions', array['q1']), '', 'eşleşme bitip atama kalkınca gönüllü o öğrencinin sorusunu göremez');

select * from finish();
rollback;
