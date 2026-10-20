-- =====================================================================
-- 077 · BEKLEYEN RIZA GÖRÜNÜMÜ (yeni hukuki metin sürümünde yeniden onay) · ÇEREZ POLİTİKASI BELGESİ
-- Hukuk: gönüllü taahhüdü ve davranış kuralları v0.2 oldu; gönüllülerden yeniden onay alınacak.
-- public.my_pending_consents: çağıranın, en güncel YAYIMLANMIŞ sürümü onaylamadığı rızalar (zorlama backend'de).
-- legal_documents: doc_type = 'cerez' (rıza türü DEĞİL: consents'a yazılmaz).
-- =====================================================================
begin;
select plan(44);
select tests.make_fixture();

-- ====================== Çerez politikası: belge var, rıza türü yok ======================
select lives_ok($$ insert into public.legal_documents (doc_type, version, sha256, published_at, body_md)
                   values ('cerez', 'v0.1', md5('cerez-v0.1') || md5('cerez-v0.1-x'), now(), 'Çerez ve Cihaz Belleği Politikası (test)') $$,
  'legal_documents: doc_type = cerez eklenebilir');
select tests.login_anon();
select is(tests.cnt($$ select 1 from public.legal_documents where doc_type = 'cerez' and version = 'v0.1' $$), 1::bigint, 'anon (giriş yapmamış ziyaretçi) çerez politikasını okuyabilir');
select tests.logout();
select throws_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('veli_a'), 'cerez', 'v0.1', true) $$,
  '23503', null, 'çerez bir RIZA türü değildir: consents tablosuna yazılamaz');
select is((select count(*) from public.consent_types where code = 'cerez'), 0::bigint, 'consent_types içinde cerez yok (rıza bandı gerekmez: yalnızca bilgilendirme)');

-- ====================== Hazırlık: gönüllü metinleri ======================
-- Fixture: her rıza türü için v1, v2, v9 (hepsi dün yayımlandı, aynı zamanda). Eşitlikte sürüm adı büyük olan "en güncel": v9.
-- Tek tür için gerçek bir yeni sürüm yayımlamak: v0.2 (bugün).
select tests.login('gon_x');
select is((select string_agg(consent_type, ',' order by consent_type) from public.my_pending_consents),
  'aydinlatma_gonullu,gonullu_davranis_kurallari,gonullu_taahhut,kullanim_kosullari',
  'gönüllü gon_x: onaylamadığı / eski sürümde kalan 4 rıza listelenir');
select results_eq($$ select reason, last_accepted_version, current_version from public.my_pending_consents where consent_type = 'gonullu_taahhut' $$,
  $$ values ('yeni_surum', 'v1', 'v9') $$, 'taahhüt: v1''i onaylamış ama en güncel v9: "yeni_surum" (YENİDEN ONAY)');
select results_eq($$ select reason, last_accepted_version from public.my_pending_consents where consent_type = 'gonullu_davranis_kurallari' $$,
  $$ values ('hic_onaylanmadi', null::text) $$, 'davranış kuralları: hiç onaylanmamış: "hic_onaylanmadi"');
select ok((select bool_and(student_id is null) from public.my_pending_consents), 'gönüllü için çocuğa bağlı satır yok');
-- gon_x en güncel sürümleri onaylar
select lives_ok($$ insert into public.consents (user_id, type, doc_version, granted) values
    (tests.id('gon_x'), 'aydinlatma_gonullu', 'v9', true), (tests.id('gon_x'), 'kullanim_kosullari', 'v9', true),
    (tests.id('gon_x'), 'gonullu_davranis_kurallari', 'v9', true), (tests.id('gon_x'), 'gonullu_taahhut', 'v9', true) $$,
  'gönüllü en güncel sürümleri onaylar');
select is(tests.cnt($$ select 1 from public.my_pending_consents $$), 0::bigint, 'hepsi güncel: bekleyen rıza yok');
select tests.logout();

-- ====================== Yeni sürüm yayımlanır (v0.2): yeniden onay gerekir ======================
insert into public.legal_documents (doc_type, version, sha256, published_at, body_md)
select t, 'v0.2', md5(t || 'v0.2') || md5('v0.2' || t), now(), 'Yeni sürüm (test)'
from unnest(array['gonullu_taahhut', 'gonullu_davranis_kurallari']) t;
-- Gelecek tarihli (henüz yayımlanmamış) sürüm sayılmaz
insert into public.legal_documents (doc_type, version, sha256, published_at, body_md)
values ('gonullu_taahhut', 'v0.3', md5('t-v0.3') || md5('v0.3-t'), now() + interval '1 day', 'Henüz yayında değil');
select tests.login('gon_x');
select is((select string_agg(consent_type, ',' order by consent_type) from public.my_pending_consents),
  'gonullu_davranis_kurallari,gonullu_taahhut', 'v0.2 yayımlanınca yalnızca o iki tür yeniden onay bekler');
select results_eq($$ select consent_type, reason, last_accepted_version, current_version from public.my_pending_consents order by consent_type $$,
  $$ values ('gonullu_davranis_kurallari', 'yeni_surum', 'v9', 'v0.2'), ('gonullu_taahhut', 'yeni_surum', 'v9', 'v0.2') $$,
  'en güncel sürüm v0.2 (gelecek tarihli v0.3 sayılmaz); son onaylanan v9');
select throws_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('gon_x'), 'gonullu_taahhut', 'v0.3', true) $$,
  '23503', null, 'yayımlanmamış (gelecek tarihli) sürüm onaylanamaz');
select lives_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('gon_x'), 'gonullu_taahhut', 'v0.2', true) $$, 'gönüllü taahhüt v0.2''yi onaylar');
select is((select string_agg(consent_type, ',') from public.my_pending_consents), 'gonullu_davranis_kurallari', 'taahhüt güncel; yalnızca davranış kuralları bekliyor');
-- Geri çekme / reddetme tekrar bekletir
select is(tests.affected($$ update public.consents set withdrawn_at = now() where user_id = tests.id('gon_x') and type = 'gonullu_taahhut' and doc_version = 'v0.2' $$), 1::bigint, 'gönüllü taahhüt onayını geri çeker');
select results_eq($$ select reason from public.my_pending_consents where consent_type = 'gonullu_taahhut' $$, $$ values ('geri_cekildi_veya_reddedildi') $$,
  'geri çekilen onay yeniden bekleyen olarak görünür (neden: geri_cekildi_veya_reddedildi)');
select lives_ok($$ insert into public.consents (user_id, type, doc_version, granted) values (tests.id('gon_x'), 'gonullu_davranis_kurallari', 'v0.2', false) $$, 'gönüllü "vermiyorum" kaydı yazar');
select results_eq($$ select reason from public.my_pending_consents where consent_type = 'gonullu_davranis_kurallari' $$, $$ values ('geri_cekildi_veya_reddedildi') $$,
  '"vermiyorum" kaydı onay sayılmaz: yine bekleyen');
select tests.logout();

-- ====================== Başkasının listesi görünmez; hiç onaylamamış gönüllü ======================
select tests.login('gon_y');
select is(tests.cnt($$ select 1 from public.my_pending_consents $$), 4::bigint, 'gon_y (hiç onaylamamış): 4 rıza bekliyor');
select is((select count(*) from public.my_pending_consents where reason <> 'hic_onaylanmadi'), 0::bigint, 'hepsi "hic_onaylanmadi"');
select results_eq($$ select current_version from public.my_pending_consents where consent_type = 'gonullu_taahhut' $$, $$ values ('v0.2') $$, 'gon_y için de en güncel sürüm v0.2');
select tests.login('gon_z');   -- başvuru aşamasındaki gönüllü de aynı kuralı görür
select is(tests.cnt($$ select 1 from public.my_pending_consents $$), 4::bigint, 'başvuru aşamasındaki gönüllü de bekleyen rızaları görür');
select tests.logout();

-- ====================== Veli: kullanıcı bazlı + çocuk başına AR-1 ======================
select tests.login('veli_a');
select is(tests.cnt($$ select 1 from public.my_pending_consents $$), 4::bigint, 'veli_a: aydınlatma + kullanım koşulları + iki çocuk için AR-1 = 4 satır');
select is((select string_agg(consent_type, ',' order by consent_type) from public.my_pending_consents where student_id is null), 'aydinlatma_veli,kullanim_kosullari',
  'çocuğa bağlı olmayan veli rızaları');
select is((select string_agg(student_id::text, ',' order by student_id) from public.my_pending_consents where student_id is not null),
  (select string_agg(x::text, ',' order by x) from unnest(array[tests.id('ogr_a1'), tests.id('ogr_a2')]) x), 'AR-1 her çocuk için ayrı listelenir');
select results_eq($$ select reason, last_accepted_version, current_version from public.my_pending_consents where student_id = tests.id('ogr_a1') $$,
  $$ values ('yeni_surum', 'v1', 'v9') $$, 'ogr_a1: AR-1 v1 verilmiş, en güncel v9: yeniden onay');
select results_eq($$ select reason from public.my_pending_consents where student_id = tests.id('ogr_a2') $$, $$ values ('hic_onaylanmadi') $$, 'ogr_a2: AR-1 hiç verilmemiş');
select tests.login('veli_b');
select is((select count(*) from public.my_pending_consents where student_id is not null), 1::bigint, 'veli_b yalnızca KENDİ çocuğu (ogr_b1) için AR-1 satırı görür');
select is((select student_id from public.my_pending_consents where student_id is not null), tests.id('ogr_b1'), 'başka velinin çocuğu (ogr_a1 / ogr_a2) listelenmez');
select tests.logout();

-- İki veli: biri güncel AR-1'i verince ikisinin listesinden de kalkar; verenin velilikten çıkması tekrar bekletir
select tests.signup('veli_c', 'veli.c@pgtap.test', '{"role":"veli"}');
insert into public.guardian_students (guardian_id, student_id, relation) values (tests.id('veli_c'), tests.id('ogr_a1'), 'baba');
insert into public.consents (user_id, student_id, type, doc_version, granted) values (tests.id('veli_c'), tests.id('ogr_a1'), 'acik_riza_dolayli_saglik', 'v1', true);   -- veli_c eski sürümde
select tests.login('veli_c');
select results_eq($$ select reason, current_version from public.my_pending_consents where student_id = tests.id('ogr_a1') $$, $$ values ('yeni_surum', 'v9') $$,
  'veli_c: kendi eski AR-1''i var, en güncel v9 bekliyor');
select tests.login('veli_a');
select lives_ok($$ insert into public.consents (user_id, student_id, type, doc_version, granted) values (tests.id('veli_a'), tests.id('ogr_a1'), 'acik_riza_dolayli_saglik', 'v9', true) $$,
  'veli_a ogr_a1 için en güncel AR-1''i verir');
select is((select count(*) from public.my_pending_consents where student_id = tests.id('ogr_a1')), 0::bigint, 'veli_a: ogr_a1 artık bekleyen değil');
select tests.login('veli_c');
select is((select count(*) from public.my_pending_consents where student_id = tests.id('ogr_a1')), 0::bigint, 'veli_c: çocuğun HÂLÂ velisi olan birinin geçerli AR-1''i yeterli (ikisinden de kalkar)');
select tests.logout();
update public.profiles set status = 'aktif' where id = tests.id('ogr_a1');
delete from public.guardian_students where guardian_id = tests.id('veli_a') and student_id = tests.id('ogr_a1');   -- geçerli v9 AR-1'in sahibi velilikten çıkarıldı
select tests.login('veli_c');
select results_eq($$ select reason, current_version from public.my_pending_consents where student_id = tests.id('ogr_a1') $$, $$ values ('yeni_surum', 'v9') $$,
  'AR-1''i veren veli velilikten çıkarıldı: kalan velinin listesinde yeniden bekliyor (eski kayıt sayılmaz)');
select tests.logout();
select is((select status from public.profiles where id = tests.id('ogr_a1')), 'aktif',
  'kalan velinin (veli_c) v1 AR-1''i hâlâ geçerli kayıt: hesap askıya alınmaz; yeni sürüm yalnızca "yeniden onay" listesine düşer (hesap kilidi değil, zorlama backend''de)');

-- ====================== Öğrenci, yönetici, anon, askıdaki kullanıcı ======================
select tests.login('ogr_a2');
select is((select string_agg(consent_type, ',' order by consent_type) from public.my_pending_consents), 'cocuk_bilgilendirme,cocuk_guvenlik_hatirlatma',
  'öğrenci yalnızca çocuğa yönelik "Anladım" metinlerini görür (veli / gönüllü / AR-1 yok)');
select tests.login('admin', 'aal2');
select is(tests.cnt($$ select 1 from public.my_pending_consents $$), 0::bigint, 'yönetici için rıza yok (hiçbir rıza türünün hedef kitlesi değil)');
select tests.login('gon_s');   -- hesabı askıda
select is(tests.cnt($$ select 1 from public.my_pending_consents $$), 0::bigint, 'askıdaki kullanıcı satır görmez (uygulamaya zaten giremez)');
select tests.login_anon();
select throws_ok($$ select * from public.my_pending_consents $$, '42501', null, 'anon: bekleyen rıza görünümü okunamaz');
select tests.logout();

-- ====================== Etkin olmayan tür ve görünüm güvenliği ======================
update public.consent_types set is_active = false where code = 'aydinlatma_gonullu';
select tests.login('gon_y');
select is(tests.cnt($$ select 1 from public.my_pending_consents where consent_type = 'aydinlatma_gonullu' $$), 0::bigint, 'etkin olmayan (is_active = false) rıza türü listelenmez');
select tests.logout();
select is((select reloptions::text from pg_class where oid = 'public.my_pending_consents'::regclass), '{security_barrier=true}', 'görünüm security_barrier ile tanımlı');
select ok(not has_table_privilege('anon', 'public.my_pending_consents', 'select') and has_table_privilege('authenticated', 'public.my_pending_consents', 'select'),
  'yalnızca authenticated okuyabilir');
select ok(not has_any_column_privilege('authenticated', 'public.my_pending_consents', 'insert, update'), 'görünüme yazılamaz');

select * from finish();
rollback;
