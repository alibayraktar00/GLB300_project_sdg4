-- =====================================================================
-- YALNIZCA YEREL GELİŞTİRME / DEMO: örnek gönüllüleri ONAYLAR ve eşleşme / ders / cevaplı soru ekler.
--
-- Bu dosya config.toml [db.seed].sql_paths içinde DEĞİLDİR: `db reset` ile çalışmaz, uzak projeye hiçbir yolla
-- gönderilmez. seed.sql'den SONRA, elle çalıştırılır (yerel Studio SQL düzenleyicisi veya psql).
--
-- Neden ayrı? Güvenlik yeniden denetimi O4: seed.sql işaretsiz boş bir uzak veritabanında bile çalışabildiği için,
-- orada bilinen parolalı ("Test1234!") ONAYLI gönüllü ve çocuk verisine erişen eşleşme oluşturmamalıdır.
-- Bu betik seed kilidini kendisi de çağırır: uzak işaretli (app.ortam = 'uzak') ya da gerçek kullanıcılı veritabanında DURUR.
--
-- Oluşturulanlar:
--   gonullu1 (Zeynep K.)  ONAYLI, MAT 6-7  ->  Mavi Kuş ile AKTİF eşleşme, yarınki ders, cevaplanmış örnek soru
--   gonullu2 (Can Ö.)     ONAYLI, FEN 6    ->  Mavi Kuş için ÖNERİLMİŞ eşleşme (veli kararı bekliyor)
--   gonullu3 (Deniz A.)   "basvuru" kalır
-- =====================================================================
select private.assert_seed_allowed();

-- 1) Onay (yönetici RPC'sinin yazacağı alanlar; karar damgası ve belge süreleri tetikleyicilerle otomatik)
update public.volunteers
   set status = 'onayli', approved_at = now() - interval '20 days', training_passed_at = now() - interval '21 days'
 where profile_id = 'd0000000-0000-4000-8000-000000000021' and status = 'basvuru';
update public.volunteers
   set status = 'onayli', approved_at = now() - interval '15 days', training_passed_at = now() - interval '16 days'
 where profile_id = 'd0000000-0000-4000-8000-000000000022' and status = 'basvuru';

-- 2) Eşleşmeler
insert into public.matches (id, student_id, volunteer_id, subject_id, status, proposed_by, guardian_decision_at, started_at)
select 'd0000000-0000-4000-8000-0000000000f1', 'd0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000021',
       (select id from public.subjects where code = 'MAT'), 'aktif',
       null, now() - interval '10 days', now() - interval '10 days'
on conflict do nothing;
insert into public.matches (id, student_id, volunteer_id, subject_id, status, proposed_by)
select 'd0000000-0000-4000-8000-0000000000f2', 'd0000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000022',
       (select id from public.subjects where code = 'FEN'), 'onerildi',
       null
on conflict do nothing;

-- 3) Yarınki ders: 10:00 İstanbul (07:00 UTC); 08:00-21:00 kuralına uyar
insert into public.sessions (id, match_id, starts_at, duration_min, booked_by)
values ('d0000000-0000-4000-8000-0000000000f3', 'd0000000-0000-4000-8000-0000000000f1',
        (date_trunc('day', now() at time zone 'utc') + interval '31 hours') at time zone 'utc', 40,
        'd0000000-0000-4000-8000-000000000002')
on conflict do nothing;

-- 4) Gönüllünün cevapladığı örnek soru
insert into public.questions (id, student_id, subject_id, grade, status, assigned_volunteer_id, assigned_at, first_answered_at)
select 'd0000000-0000-4000-8000-000000000101', 'd0000000-0000-4000-8000-000000000011', (select id from public.subjects where code = 'MAT'), 6,
       'cevaplandi', 'd0000000-0000-4000-8000-000000000021', now() - interval '2 days', now() - interval '2 days' + interval '3 hours'
on conflict do nothing;
insert into public.question_messages (id, question_id, sender_id, kind, body, created_at) values
  ('d0000000-0000-4000-8000-000000000111', 'd0000000-0000-4000-8000-000000000101', 'd0000000-0000-4000-8000-000000000011', 'soru',
     'ÖRNEK soru: 3/4 + 1/8 nasıl toplanır?', now() - interval '2 days'),
  ('d0000000-0000-4000-8000-000000000112', 'd0000000-0000-4000-8000-000000000101', 'd0000000-0000-4000-8000-000000000021', 'cevap',
     'ÖRNEK cevap: Paydaları eşitle: 3/4 = 6/8. Sonra 6/8 + 1/8 = 7/8.', now() - interval '2 days' + interval '3 hours')
on conflict do nothing;

-- 5) Bildirimler
insert into public.notifications (user_id, type, title, body)
select * from (values
  ('d0000000-0000-4000-8000-000000000011'::uuid, 'yeni_cevap', 'Sorunuza yeni bir cevap var.', null::text),
  ('d0000000-0000-4000-8000-000000000002'::uuid, 'eslesme_onerildi', 'Çocuğunuz için bir gönüllü önerildi.', 'Karar vermek için uygulamayı açın.')
) v(user_id, type, title, body)
where not exists (select 1 from public.notifications where type in ('yeni_cevap', 'eslesme_onerildi'));
