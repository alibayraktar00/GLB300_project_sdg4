-- =====================================================================
-- 001 · ŞEMA KORUMALARI
-- "Varsayılan ret" ilkesinin yapısal garantileri: her tabloda RLS açık,
-- anon hiçbir şeye erişemez, yardımcı fonksiyonlar doğru tanımlı,
-- bucket'lar özel. Yeni bir migration bu kuralları bozarsa BU test kırılır.
-- =====================================================================
begin;
select plan(32);

-- 1) RLS ------------------------------------------------------------
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity $$,
  'public şemasındaki HER tabloda RLS açık');

select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p')
       and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) $$,
  'her tablonun en az bir politikası var (politikasız tablo sessizce erişilemez kalır)');

select is_empty(
  $$ select policyname from pg_policies
     where schemaname = 'public' and roles <> '{authenticated}' and tablename <> 'legal_documents' $$,
  'public politikaları yalnızca authenticated rolüne yazılmış (tek istisna: legal_documents)');

select ok(
  (select count(*) from pg_policies where schemaname = 'public' and roles <> '{authenticated}') = 1
  and exists (select 1 from pg_policies
              where schemaname = 'public' and tablename = 'legal_documents' and cmd = 'SELECT'
                and roles = '{anon,authenticated}'),
  'anon''a açık tek politika: legal_documents SELECT (hukuki metinler kayıttan önce de görünür)');

select is_empty(
  $$ select tablename || '.' || policyname from pg_policies
     where schemaname = 'public' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
       and (qual = 'true' or with_check = 'true') $$,
  'yazma politikalarında koşulsuz "true" yok');

select is_empty(
  $$ select tablename || '.' || policyname from pg_policies where schemaname = 'public' and cmd = 'ALL' $$,
  'FOR ALL politikası kullanılmamış (her komut ayrı ve bilinçli yazılır)');

-- 2) anon ------------------------------------------------------------
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'v', 'p', 'm')
       and c.relname <> 'legal_documents'
       and (has_any_column_privilege('anon', c.oid, 'select')
         or has_any_column_privilege('anon', c.oid, 'insert')
         or has_any_column_privilege('anon', c.oid, 'update')
         or has_table_privilege('anon', c.oid, 'delete')
         or has_table_privilege('anon', c.oid, 'truncate')) $$,
  'anon rolü legal_documents dışında public şemasında HİÇBİR tablo/görünüme erişemez');

select ok(
  has_table_privilege('anon', 'public.legal_documents', 'select')
  and not has_any_column_privilege('anon', 'public.legal_documents', 'insert')
  and not has_any_column_privilege('anon', 'public.legal_documents', 'update')
  and not has_table_privilege('anon', 'public.legal_documents', 'delete'),
  'anon, legal_documents''ı yalnızca OKUYABİLİR');

select is_empty(
  $$ select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and has_function_privilege('anon', p.oid, 'execute') $$,
  'anon, public ve private şemalarındaki hiçbir fonksiyonu çalıştıramaz');

-- 3) authenticated yetkileri -----------------------------------------
select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'v', 'p')
       and (has_table_privilege('authenticated', c.oid, 'truncate')
         or has_table_privilege('authenticated', c.oid, 'references')
         or has_table_privilege('authenticated', c.oid, 'trigger')) $$,
  'authenticated: TRUNCATE / REFERENCES / TRIGGER yetkisi yok');

select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind in ('r', 'p') and has_table_privilege('authenticated', c.oid, 'delete')
       and c.relname not in ('availability_slots', 'push_subscriptions', 'volunteer_subjects') $$,
  'istemci yalnızca uygunluk, push aboneliği ve (başvuru aşamasında) gönüllü ders seçimini silebilir; başka kalıcı silme yok');

select is_empty(
  $$ select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname in (
       'profiles', 'students', 'guardian_students', 'questions', 'question_messages', 'attachments',
       'moderation_flags', 'matches', 'sessions', 'session_events', 'recovery_plans', 'plan_items',
       'notifications', 'audit_log', 'training_attempts', 'training_questions', 'training_answer_keys',
       'student_features', 'volunteer_blocks', 'legal_documents',
       'subjects', 'topics', 'resources', 'weekly_topics')
       and has_any_column_privilege('authenticated', c.oid, 'insert') $$,
  'RPC ile yazılan tablolara istemci doğrudan INSERT yapamaz');

select is_empty(
  $$ select 'profiles.' || a.attname from pg_attribute a
     where a.attrelid = 'public.profiles'::regclass and a.attnum > 0 and not a.attisdropped
       and has_column_privilege('authenticated', a.attrelid, a.attnum, 'update')
       and a.attname <> 'display_name' $$,
  'profiles: istemci yalnızca display_name güncelleyebilir (role/status dahil diğerleri kapalı)');

select is_empty(
  $$ select 'audit_log' where has_table_privilege('service_role', 'public.audit_log', 'update')
                           or has_table_privilege('service_role', 'public.audit_log', 'delete') $$,
  'audit_log: servis rolü bile güncelleyemez/silemez');

-- 4) Yardımcı fonksiyonlar -------------------------------------------
select is_empty(
  $$ select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and p.prosecdef
       and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=""%' $$,
  'tüm SECURITY DEFINER fonksiyonlarında search_path boş ("") olarak sabit');

select is_empty(
  $$ select f.fn from (values ('is_admin'), ('is_guardian_of'), ('is_matched_volunteer'), ('can_access_question')) f(fn)
     where not exists (
       select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'private' and p.proname = f.fn and p.prosecdef and p.provolatile = 's') $$,
  'is_admin, is_guardian_of, is_matched_volunteer, can_access_question: SECURITY DEFINER + STABLE');

select is_empty(
  $$ select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private' and p.proname in ('write_audit', 'grant_admin', 'revoke_admin', 'handle_new_user', 'assert_seed_allowed', 'seed_engel_nedeni', 'suspend_student', 'cancel_future_sessions')
       and (has_function_privilege('authenticated', p.oid, 'execute')
         or has_function_privilege('service_role', p.oid, 'execute')) $$,
  'write_audit, grant_admin, revoke_admin, assert_seed_allowed, suspend_student vb. istemci ve servis rolüne kapalı');

-- Fonksiyon İZİN LİSTESİ (Ö-5/D1): authenticated yalnızca RLS / görünüm / CHECK'in çağırdığı bu 18 private fonksiyonu
-- ve 2 Web Push RPC'sini (public) çalıştırabilir. Yeni bir fonksiyon eklenip PUBLIC / authenticated'a açılırsa bu test
-- kırılır ve bilinçli güncelleme ister. (regprocedure çıktısı arama yoluna göre "public." ekini taşıyabilir; ikisi de yazıldı.)
select is_empty(
  $$ select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and has_function_privilege('authenticated', p.oid, 'execute')
       and p.oid::regprocedure::text <> all (array[
         'private.active_role()', 'private.is_admin()', 'private.is_guardian_of(uuid)', 'private.is_approved_volunteer()',
         'private.is_matched_volunteer(uuid)', 'private.is_blocked_for_me(uuid)', 'private.can_access_question(uuid)', 'private.can_answer_question(uuid)',
         'private.volunteer_application_open()', 'private.consent_allowed(text,uuid)', 'private.can_upload_question_object(text)',
         'private.can_upload_volunteer_document(text)', 'private.short_name(text,text)', 'private.is_safe_name(text)',
         'private.storage_kota_uygun(text)', 'private.has_guardian_link(uuid)', 'private.message_hidden_from_me(uuid,uuid)',
         'private.embargoed_volunteers()',
         'register_push_subscription(text,text,text,text)', 'public.register_push_subscription(text,text,text,text)',
         'remove_push_subscription(text)', 'public.remove_push_subscription(text)']) $$,
  'authenticated: izin listesi dışında hiçbir public/private fonksiyonunu çalıştıramaz');
-- Servis rolü RLS'yi atlar ama volunteers CHECK kısıtları is_safe_name'i çağırır (N1): yalnızca o açıktır.
select is_empty(
  $$ select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and has_function_privilege('service_role', p.oid, 'execute')
       and p.oid::regprocedure::text <> all (array['private.is_safe_name(text)']) $$,
  'service_role: yalnızca is_safe_name çalıştırabilir (volunteers CHECK kısıtları); başka public/private fonksiyon yok');
select ok(has_function_privilege('service_role', 'private.is_safe_name(text)', 'execute'),
  'service_role: is_safe_name EXECUTE yetkisine sahip (volunteers CHECK kısıtları çalışsın)');
select is_empty(
  $$ select p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('public'::name, p.oid, 'execute')) $$,
  'public şemasındaki (RPC) fonksiyonlara anon / PUBLIC EXECUTE yetkisi yok');

select is_empty(
  $$ select 'public.' || p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute') $$,
  'public şemasında anon''un çalıştırabildiği SECURITY DEFINER fonksiyon yok');

-- 5) Görünümler -------------------------------------------------------
select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
      and 'security_barrier=true' = any (c.reloptions)),
  5::bigint,
  'beş görünümün hepsi security_barrier=true ile tanımlı');

select is(
  (select string_agg(c.relname::text, ',' order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'),
  'matched_student_plan_items,matched_students,matched_volunteers_for_guardian,matched_volunteers_for_student,my_pending_consents',
  'public şemasında yalnızca bu beş görünüm var (yenisi eklenirse bu test bilinçli güncellenmeli)');

select columns_are('public', 'matched_students',
  array['match_id', 'subject_id', 'student_id', 'nickname', 'grade', 'voice_enabled', 'video_enabled'],
  'matched_students: rumuz + sınıf (+ veli özellik anahtarları); kullanıcı adı, tercihler, tarih YOK');

select columns_are('public', 'matched_student_plan_items',
  array['match_id', 'student_id', 'topic_id', 'upcoming_rank', 'completed_count'],
  'matched_student_plan_items: yalnızca sıradaki 3 bekleyen konu + tamamlanan SAYISI; seq, plan_id, tarih, hedef YOK');

select columns_are('public', 'matched_volunteers_for_student',
  array['match_id', 'student_id', 'subject_id', 'match_status', 'volunteer_id', 'volunteer_name'],
  'öğrenci görünümü: yalnızca "Ad S." kısa adı (üniversite/bölüm/tam ad YOK)');

select columns_are('public', 'matched_volunteers_for_guardian',
  array['match_id', 'student_id', 'subject_id', 'match_status', 'volunteer_id', 'volunteer_name',
        'university', 'department', 'teaches'],
  'veli görünümü: "Ad S." + üniversite + bölüm + dersler (tam ad YOK)');

-- 6) Storage ----------------------------------------------------------
select is(
  (select count(*) from storage.buckets where id in ('soru-ekleri', 'gonullu-belgeleri') and not public),
  2::bigint, 'iki bucket de ÖZEL (public=false)');

select results_eq(
  $$ select id, file_size_limit, allowed_mime_types from storage.buckets
     where id in ('soru-ekleri', 'gonullu-belgeleri') order by id $$,
  $$ values ('gonullu-belgeleri'::text, 5242880::bigint, array['application/pdf', 'image/jpeg']::text[]),
            ('soru-ekleri'::text,       3145728::bigint, array['image/jpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/webm']::text[]) $$,
  'bucket boyut sınırları (5 MB / 3 MB) ve izinli MIME türleri');

select is_empty(
  $$ select policyname from pg_policies
     where schemaname = 'storage' and tablename = 'objects' and cmd in ('UPDATE', 'DELETE', 'ALL') $$,
  'storage.objects: istemci için UPDATE/DELETE politikası yok (dosyalar değiştirilemez/silinemez)');

select is_empty(
  $$ select policyname from pg_policies
     where schemaname = 'storage' and tablename = 'objects' and roles <> '{authenticated}' $$,
  'storage.objects politikaları yalnızca authenticated için');

select * from finish();
rollback;
