-- =====================================================================
-- 074 · STORAGE KOTALARI · HESAP SİLME ZİNCİRİ · DURUM TETİKLEYİCİLERİ · KÜÇÜK DÜZELTMELER
-- O3/Ö-3: kullanıcı başına yükleme sınırı (soru-ekleri: 24 saatte 30 nesne, gonullu-belgeleri: toplam 5)
-- Ö-1/Ö-2: eşleşme bitince planlı dersler iptal; son veli ayrılınca çocuk "beklemede";
--          silinen gönüllünün kimlik bağlantısı yalnızca yöneticiye görünür (SK-16)
-- Ö-6:     durum tetikleyicileri "UPDATE OF" kullanmaz (başka tetikleyici NEW'i değiştirirse kaçırırdı)
-- =====================================================================
begin;
select plan(53);
select tests.make_fixture();

-- ====================== Storage kotası ======================
select tests.login('gon_z');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     select 'gonullu-belgeleri', tests.id('gon_z')::text || '/' || tests.id('kota_belge' || g)::text || '.pdf', tests.id('gon_z')::text from generate_series(1, 5) g $$,
  'başvuru aşamasındaki gönüllü en çok 5 belge nesnesi yükleyebilir');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('gonullu-belgeleri', tests.id('gon_z')::text || '/' || tests.id('kota_belge6')::text || '.pdf', tests.id('gon_z')::text) $$,
  '42501', null, '6. belge nesnesi reddedilir (S5: tablo sınırı gibi Storage sınırı da var)');
select tests.logout();
select tests.signup('g_toplu', 'toplu@ogr.uni.edu.tr', '{"role":"gonullu"}');
insert into public.volunteers (profile_id, given_name, family_name, university) values (tests.id('g_toplu'), 'Toplu', 'Yukleme', 'Test Universitesi');
select tests.login('g_toplu');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     select 'gonullu-belgeleri', tests.id('g_toplu')::text || '/' || tests.id('toplu' || g)::text || '.pdf', tests.id('g_toplu')::text from generate_series(1, 30) g $$,
  '42501', null, 'TEK SORGUDA 30 nesne yükleme denemesi de reddedilir (kota satır satır, sorgu içinde de sayılır)');

select tests.login('ogr_a1');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     select 'soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('kq' || g)::text || '/' || tests.id('kf' || g)::text || '.jpg', tests.id('ogr_a1')::text from generate_series(1, 30) g $$,
  'öğrenci 24 saatte 30 nesneye kadar yükleyebilir');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('kq99')::text || '/' || tests.id('kf99')::text || '.jpg', tests.id('ogr_a1')::text) $$,
  '42501', null, '31. nesne reddedilir (24 saatlik sınır)');
-- Tek sorguda toplu yükleme, kotası BOŞ bir kullanıcıyla denenir (dolu kota her halükârda reddettirirdi):
-- kota satır satır sayılmazsa (ör. politikada (select ...) sarmalı) 200 nesnenin hepsi geçerdi.
select tests.login('ogr_a2');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     select 'soru-ekleri', tests.id('ogr_a2')::text || '/' || tests.id('kq9' || g)::text || '/' || tests.id('kf9' || g)::text || '.jpg', tests.id('ogr_a2')::text from generate_series(1, 200) g $$,
  '42501', null, 'öğrenci (boş kotayla) tek sorguda 200 nesne yükleyemez (S5)');
select tests.logout();
select is((select count(*) from storage.objects where owner_id = tests.id('ogr_a2')::text), 0::bigint, 'reddedilen toplu yüklemeden hiçbir nesne kalmaz');
update storage.objects set created_at = now() - interval '2 days' where owner_id = tests.id('ogr_a1')::text and name like '%' || tests.id('kq1')::text || '/%';
select tests.login('ogr_a1');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('kq98')::text || '/' || tests.id('kf98')::text || '.jpg', tests.id('ogr_a1')::text) $$,
  '24 saatten eski nesneler sayılmaz: bir tanesi eskiyince yeni yükleme yapılabilir');
select tests.login('gon_x');
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('gx_ek1')::text || '.webm', tests.id('gon_x')::text) $$,
  'kota yükleyen BAŞINA: öğrencinin dolu kotası gönüllüyü etkilemez');
select tests.logout();
select ok(pg_get_functiondef('private.limit_volunteer_documents'::regproc) ~* 'for update',
  'limit_volunteer_documents eşzamanlı eklemeleri sıraya sokmak için gönüllü satırını kilitler');
select is((select provolatile::text from pg_proc where oid = 'private.storage_kota_uygun(text)'::regprocedure), 'v',
  'kota fonksiyonu VOLATILE (aynı sorgudaki önceki satırları da sayar)');

-- ====================== Eşleşme bitince planlı dersler iptal ======================
insert into public.sessions (id, match_id, starts_at, duration_min, status)
values (tests.id('s_gecmis_planli'), tests.id('m1'), (date_trunc('day', now() at time zone 'utc') - interval '1 day' + interval '7 hours') at time zone 'utc', 40, 'planlandi'),
       (tests.id('s_gelecek2'), tests.id('m1'), (date_trunc('day', now() at time zone 'utc') + interval '3 days 7 hours') at time zone 'utc', 40, 'planlandi');
update public.matches set status = 'bitti', ended_at = now(), end_reason = 'yonetici_sonlandirdi' where id = tests.id('m1');
select is((select status from public.sessions where id = tests.id('s1')), 'iptal', 'eşleşme bitince yarınki planlı ders iptal edilir');
select is((select status from public.sessions where id = tests.id('s_gelecek2')), 'iptal', 'ileri tarihli planlı ders de iptal edilir');
select is((select cancel_reason from public.sessions where id = tests.id('s_gelecek2')), 'eslesme_bitti', 'iptal gerekçesi kodludur');
select is((select status from public.sessions where id = tests.id('s_gecmis_planli')), 'planlandi', 'başlangıcı geçmişte kalan ders dokunulmadan kalır (tamamlandi/gelinmedi işaretlemesi cron''un)');

-- ====================== Son veli ayrılınca çocuk "beklemede" ======================
insert into public.guardian_students (guardian_id, student_id) values (tests.id('veli_b'), tests.id('ogr_a2'));
-- Kalan velinin o çocuk için GEÇERLİ bir AR-1'i var (aksi halde çocuk askıya alınırdı: bkz. 075, N4)
insert into public.consents (user_id, student_id, type, doc_version, granted) values (tests.id('veli_b'), tests.id('ogr_a2'), 'acik_riza_dolayli_saglik', 'v1', true);
delete from public.guardian_students where guardian_id = tests.id('veli_a') and student_id = tests.id('ogr_a2');
select is((select status from public.profiles where id = tests.id('ogr_a2')), 'aktif', 'çocuğun hâlâ bir velisi varken hesabı aktif kalır');
delete from public.guardian_students where guardian_id = tests.id('veli_b') and student_id = tests.id('ogr_a2');
select is((select status from public.profiles where id = tests.id('ogr_a2')), 'beklemede', 'SON veli ayrılınca çocuk hesabı "beklemede" olur');
delete from public.guardian_students where guardian_id = tests.id('veli_b') and student_id = tests.id('ogr_b1');
select is((select status from public.profiles where id = tests.id('ogr_b1')), 'beklemede', 'tek velisi olan çocuk: velisi ayrılınca beklemede');
select results_eq($$ select status, end_reason from public.matches where student_id = tests.id('ogr_b1') $$, $$ values ('bitti', 'velisiz_kaldi') $$,
  'velisiz kalan çocuğun açık/önerilmiş eşleşmesi biter');
-- Veli hesabı (auth.users) silinirken de aynı sonuç; çocuk ve veli birlikte silinirse hata yok
select lives_ok($$ delete from auth.users where id = tests.id('veli_b') $$, 'veli hesabı silinebilir');
delete from public.question_messages where sender_id = tests.id('ogr_a1');   -- (aynı işlemde eklenmiş satır FK yeniden doğrulaması: bkz. 026)
delete from public.consents where student_id = tests.id('ogr_a1') or user_id = tests.id('veli_a');   -- (aynı neden)
select lives_ok($$ delete from auth.users where id in (tests.id('veli_a'), tests.id('ogr_a1')) $$, 'veli ve çocuk aynı sorguda silinebilir (sıra sorunu yok)');

-- ====================== Silinen gönüllünün kimlik bağlantısı (SK-16) ======================
select columns_are('public', 'deleted_volunteer_links',
  array['id', 'former_profile_id', 'entity', 'entity_id', 'name_digest', 'deleted_at', 'expires_at'],
  'bağlantı tablosu yalnızca eski kimlik, varlık referansı ve tuzlu özet tutar (ad/e-posta yok)');
insert into public.question_messages (id, question_id, sender_id, kind, body) values (tests.id('msg_gx'), tests.id('q3'), tests.id('gon_x'), 'cevap', 'Cevap metni');
insert into public.volunteer_blocks (student_id, volunteer_id, blocked_by, blocked_by_role) values (tests.id('ogr_b1'), tests.id('gon_x'), tests.id('ogr_b1'), 'ogrenci');
select set_config('app.kimlik_tuzu', 'deneme-tuzu', true);
select lives_ok($$ delete from auth.users where id = tests.id('gon_x') $$, 'gönüllü hesabı silinebilir');
select ok((select count(*) from public.deleted_volunteer_links where former_profile_id = tests.id('gon_x') and entity = 'matches') >= 1, 'eşleşme bağlantıları saklandı');
select is((select count(*) from public.deleted_volunteer_links where former_profile_id = tests.id('gon_x') and entity = 'question_messages' and entity_id = tests.id('msg_gx')), 1::bigint,
  'gönüllünün mesajı ile eski kimliği arasındaki bağlantı saklandı');
select is((select count(*) from public.question_messages where id = tests.id('msg_gx') and sender_id is null), 1::bigint, 'mesajın göndereni NULL (mesaj "Ayrılan gönüllü" olarak kalır)');
select ok((select bool_and(name_digest ~ '^[0-9a-f]{64}$') from public.deleted_volunteer_links where former_profile_id = tests.id('gon_x')), 'tuz tanımlıyken tuzlu özet (64 hex) yazılır');
select ok((select bool_and(expires_at between now() + interval '729 days' and now() + interval '731 days') from public.deleted_volunteer_links where former_profile_id = tests.id('gon_x')),
  'bağlantı 2 yıl sonra silinmek üzere işaretlenir');
select is((select count(*) from public.volunteer_blocks where student_id = tests.id('ogr_b1') and volunteer_id is null), 1::bigint,
  'engel kaydı gönüllü silinince kalır, gönüllü bağı NULL olur');
select set_config('app.kimlik_tuzu', '', true);
select lives_ok($$ delete from auth.users where id = tests.id('gon_y') $$, 'tuz yokken de silme çalışır');
select is((select count(*) from public.deleted_volunteer_links where former_profile_id = tests.id('gon_y') and name_digest is not null), 0::bigint, 'tuz yoksa özet NULL kalır (silme engellenmez)');

-- Profil BEFORE DELETE tetikleyicisi tek başına çalışır: volunteers satırı olmayan gönüllü profilinin mesajı da
-- (RI tetikleyicilerinin sırası garanti olmadığı için bağlantı volunteers'a değil profile bağlıdır).
select tests.signup('g_bos', 'bos@ogr.uni.edu.tr', '{"role":"gonullu"}');
insert into public.question_messages (id, question_id, sender_id, kind, body) values (tests.id('msg_gbos'), tests.id('q3'), tests.id('g_bos'), 'cevap', 'Yetim mesaj');
select lives_ok($$ delete from auth.users where id = tests.id('g_bos') $$, 'volunteers satırı olmayan gönüllü profili de silinebilir');
select is((select count(*) from public.deleted_volunteer_links where former_profile_id = tests.id('g_bos') and entity = 'question_messages' and entity_id = tests.id('msg_gbos')), 1::bigint,
  'profil silinirken mesaj bağlantısı (volunteers satırı olmasa da) saklanır');

select tests.login('admin', 'aal2');
select ok(tests.cnt($$ select 1 from public.deleted_volunteer_links $$) >= 3, 'yönetici aal2 bağlantı tablosunu okur');
select tests.login('admin');
select is(tests.cnt($$ select 1 from public.deleted_volunteer_links $$), 0::bigint, 'yönetici aal1 okuyamaz');
select tests.login('ogr_a2');
select is(tests.cnt($$ select 1 from public.deleted_volunteer_links $$), 0::bigint, 'öğrenci okuyamaz');
select tests.login('gon_z');
select is(tests.cnt($$ select 1 from public.deleted_volunteer_links $$), 0::bigint, 'başka gönüllü okuyamaz');
select throws_ok($$ insert into public.deleted_volunteer_links (former_profile_id, entity, entity_id) values (gen_random_uuid(), 'matches', gen_random_uuid()) $$, '42501', null, 'istemci ekleyemez');
select throws_ok($$ delete from public.deleted_volunteer_links $$, '42501', null, 'istemci silemez');
select tests.login_anon();
select throws_ok($$ select * from public.deleted_volunteer_links $$, '42501', null, 'anon okuyamaz');
select tests.login_service();
select lives_ok($$ delete from public.deleted_volunteer_links where expires_at < now() $$, 'servis rolü süresi dolanları silebilir (cleanup)');
select throws_ok($$ update public.deleted_volunteer_links set entity_id = gen_random_uuid() $$, '42501', null, 'servis rolü kayıtları değiştiremez');
select tests.logout();

-- ====================== Durum tetikleyicileri "UPDATE OF" kullanmaz (Ö-6) ======================
select is_empty(
  $$ select tgname::text from pg_trigger
     where not tgisinternal
       and tgname = any (array['profiles_audit', 'volunteers_audit', 'matches_audit', 'question_messages_audit', 'reports_audit',
                               'volunteer_blocks_audit', 'student_features_audit', 'recovery_plans_closed_at', 'questions_closed_at',
                               'reports_closed_at', 'volunteers_karar_damgala', 'volunteers_karar_belgeler', 'matches_kisi_silinince',
                               'questions_atama_kalkinca', 'consents_askiya_al'])
       and pg_get_triggerdef(oid) ~ 'UPDATE OF' $$,
  'denetim / damga / zincirleme tetikleyicilerinden hiçbiri "UPDATE OF" ile sınırlı değil');
select is((select count(*) from pg_trigger where not tgisinternal and tgname = any (array['profiles_audit', 'volunteers_audit', 'matches_audit',
     'question_messages_audit', 'reports_audit', 'volunteer_blocks_audit', 'student_features_audit', 'recovery_plans_closed_at',
     'questions_closed_at', 'reports_closed_at', 'volunteers_karar_damgala', 'volunteers_karar_belgeler', 'matches_kisi_silinince',
     'questions_atama_kalkinca', 'consents_askiya_al'])), 15::bigint, 'denetlenen 15 tetikleyicinin hepsi mevcut');

-- ====================== Küçük düzeltmeler ======================
-- decided_at: açık duruma dönünce sıfırlanır
update public.volunteers set status = 'onayli', approved_at = now() where profile_id = tests.id('gon_z');
select ok((select decided_at is not null from public.volunteers where profile_id = tests.id('gon_z')), 'onayda decided_at dolu');
update public.volunteers set status = 'inceleme' where profile_id = tests.id('gon_z');
select ok((select decided_at is null from public.volunteers where profile_id = tests.id('gon_z')), 'açık duruma ("inceleme") dönünce decided_at SIFIRLANIR');
update public.volunteers set status = 'onayli' where profile_id = tests.id('gon_z');
update public.volunteers set status = 'askida' where profile_id = tests.id('gon_z');
select ok((select decided_at is not null from public.volunteers where profile_id = tests.id('gon_z')), '"askida" bir karar durumudur: decided_at korunur');

-- öğrenci başına tek AKTİF plan
insert into public.recovery_plans (id, student_id, academic_year_id, absence_start, absence_end, daily_goal)
values (tests.id('plan_a2'), tests.id('ogr_a2'), '2098-2099', '2098-09-07', '2098-09-20', 1);
select throws_ok($$ insert into public.recovery_plans (student_id, academic_year_id, absence_start, absence_end, daily_goal)
                    values (tests.id('ogr_a2'), '2098-2099', '2098-09-14', '2098-09-27', 2) $$, '23505',
  'duplicate key value violates unique constraint "recovery_plans_tek_aktif"', 'öğrenci başına tek AKTİF plan');
update public.recovery_plans set status = 'arsiv' where id = tests.id('plan_a2');
select lives_ok($$ insert into public.recovery_plans (student_id, academic_year_id, absence_start, absence_end, daily_goal)
                   values (tests.id('ogr_a2'), '2098-2099', '2098-09-14', '2098-09-27', 2) $$, 'eski plan arşivlenince yeni aktif plan açılabilir');

-- last_activity_at geriye gitmez
select is((select last_activity_at >= created_at from public.questions where id = tests.id('q2')), true, 'q2 son etkinliği oluşturma anından geride değil');
insert into public.question_messages (question_id, sender_id, kind, body, created_at) values (tests.id('q2'), tests.id('ogr_b1'), 'takip', 'eski tarihli mesaj', now() - interval '10 days');
select is((select last_activity_at > now() - interval '1 day' from public.questions where id = tests.id('q2')), true, 'eski tarihli mesaj last_activity_at değerini GERİ ALMAZ (greatest)');

-- indeksler
select has_index('public', 'push_subscriptions', 'push_subscriptions_updated_idx', 'push_subscriptions(updated_at): 60 günlük temizlik için (SK-17)');
select has_index('public', 'notifications', 'notifications_created_idx', 'notifications(created_at): 90 günlük temizlik için');

select * from finish();
rollback;
