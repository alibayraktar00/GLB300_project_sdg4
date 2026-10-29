-- =====================================================================
-- 080 · TELAFİ PLANI İŞLEVLERİ: create_recovery_plan, get_today_tasks, complete_plan_item
-- Fixture: ogr_a1 (6. sınıf, aktif plan1 var), 2098-2099 yılı, hafta 1-2 normal, hafta 3 TATİL.
-- =====================================================================
begin;
select plan(37);
select tests.make_fixture();

-- Bu testin kendi haftalık konuları (fixture'da weekly_topics yok)
insert into public.units (id, curriculum_version_id, seq, title) values
  (tests.id('u_mat6b'), tests.id('cv_mat6'), 2, 'PGTAP unite 2'),
  (tests.id('u_fen6b'), tests.id('cv_fen6'), 2, 'PGTAP unite 2');
insert into public.topics (id, unit_id, seq, code, title) values
  (tests.id('t_mat6b'), tests.id('u_mat6b'), 1, 'PGTAP-MAT6-K2', 'PGTAP oran'),
  (tests.id('t_fen6b'), tests.id('u_fen6b'), 1, 'PGTAP-FEN6-K2', 'PGTAP doku');
insert into public.grade_programs (academic_year_id, grade, subject_id, curriculum_version_id) values
  ('2098-2099', 6, (select id from public.subjects where code = 'MAT'), tests.id('cv_mat6')),
  ('2098-2099', 6, (select id from public.subjects where code = 'FEN'), tests.id('cv_fen6'));
insert into public.weekly_topics (academic_year_id, grade, subject_id, week_no, topic_id, seq) values
  ('2098-2099', 6, (select id from public.subjects where code = 'MAT'), 1, tests.id('t_mat6'),  1),
  ('2098-2099', 6, (select id from public.subjects where code = 'FEN'), 1, tests.id('t_fen6'),  1),
  ('2098-2099', 6, (select id from public.subjects where code = 'MAT'), 1, tests.id('t_mat6b'), 2),
  ('2098-2099', 6, (select id from public.subjects where code = 'FEN'), 2, tests.id('t_fen6b'), 1),
  ('2098-2099', 6, (select id from public.subjects where code = 'MAT'), 2, tests.id('t_mat6'),  2);   -- yinelenen konu (bir kez gelmeli)

-- ====================== Yetki ======================
select tests.login_anon();
select throws_ok($$ select public.create_recovery_plan(6::smallint, array['MAT'], '2098-09-07', '2098-09-20', 2::smallint) $$,
  '42501', null, 'anon plan oluşturamaz (işlev yetkisi yok)');
select tests.logout();

select tests.login('veli_a');
select throws_ok($$ select public.create_recovery_plan(6::smallint, array['MAT'], '2098-09-07', '2098-09-20', 2::smallint) $$,
  '42501', 'create_recovery_plan: yalnızca aktif öğrenci plan oluşturabilir', 'veli plan oluşturamaz');
select tests.logout();

select tests.login('gon_x');
select throws_ok($$ select public.create_recovery_plan(6::smallint, array['MAT'], '2098-09-07', '2098-09-20', 2::smallint) $$,
  '42501', 'create_recovery_plan: yalnızca aktif öğrenci plan oluşturabilir', 'gönüllü plan oluşturamaz');
select tests.logout();

-- ====================== Girdi doğrulaması ======================
select tests.login('ogr_a1');
select throws_ok($$ select public.create_recovery_plan(7::smallint, array['MAT'], '2098-09-07', '2098-09-20', 2::smallint) $$,
  '22023', 'SINIF_UYUMSUZ: plan sınıfı kayıtlı sınıfla aynı olmalı', 'kayıtlı olmayan sınıf için plan çıkarılamaz');
select throws_ok($$ select public.create_recovery_plan(6::smallint, array['MAT'], '2098-09-20', '2098-09-07', 2::smallint) $$,
  '22023', 'TARIH_SIRA: bitiş tarihi başlangıçtan önce olamaz', 'bitiş başlangıçtan önce');
select throws_ok($$ select public.create_recovery_plan(6::smallint, array['MAT'], '2098-09-07', '2099-09-30', 2::smallint) $$,
  '22023', 'TARIH_UZUN: tarih aralığı en çok bir yıl olabilir', 'bir yıldan uzun aralık');
select throws_ok($$ select public.create_recovery_plan(6::smallint, array['MAT'], '2090-09-07', '2090-09-20', 2::smallint) $$,
  '22023', 'TARIH_YIL: tarihler tanımlı bir öğretim yılı içinde olmalı', 'tanımlı olmayan öğretim yılı');
select throws_ok($$ select public.create_recovery_plan(6::smallint, array['MAT'], '2099-06-01', '2099-07-30', 2::smallint) $$,
  '22023', 'TARIH_YIL: tarihler tanımlı bir öğretim yılı içinde olmalı', 'aralık öğretim yılı sınırını aşıyor');
select throws_ok($$ select public.create_recovery_plan(6::smallint, array['MAT'], '2098-09-07', '2098-09-20', 4::smallint) $$,
  '22023', 'HEDEF_GECERSIZ: günlük konu sayısı 1-3 olmalı', 'günlük hedef 1-3 dışında');
select throws_ok($$ select public.create_recovery_plan(6::smallint, array[]::text[], '2098-09-07', '2098-09-20', 2::smallint) $$,
  '22023', 'DERS_GECERSIZ: en az bir ders seçilmeli', 'ders seçilmedi');
select throws_ok($$ select public.create_recovery_plan(6::smallint, array['TAR'], '2098-09-07', '2098-09-20', 2::smallint) $$,
  '22023', 'DERS_GECERSIZ: bilinmeyen ders kodu', 'bilinmeyen ders');

-- ====================== Konu yoksa: hiçbir şey değişmez ======================
select throws_ok($$ select public.create_recovery_plan(6::smallint, array['MAT'], '2098-09-21', '2098-09-27', 2::smallint) $$,
  '22023', 'KONU_YOK: seçilen tarihler ve derslerde konu bilgisi bulunamadı',
  'yalnızca tatil haftası: konu yok (tatil haftasına konu atanamaz, şema da engeller)');
select tests.logout();
select is((select status from public.recovery_plans where id = tests.id('plan1')), 'aktif',
  'KONU_YOK hatasında eski aktif plan ARŞİVLENMEZ (işlem geri alındı)');
select is((select count(*)::int from public.recovery_plans where student_id = tests.id('ogr_a1')), 1,
  'KONU_YOK hatasında yeni plan satırı da kalmaz');

-- ====================== Başarılı oluşturma ======================
select tests.login('ogr_a1');
create temp table pt_plan (id uuid);
grant all on pt_plan to authenticated;
insert into pt_plan select public.create_recovery_plan(6::smallint, array['MAT', 'FEN'], '2098-09-07', '2098-09-20', 2::smallint);
select ok((select id is not null from pt_plan), 'plan oluşturuldu ve kimliği döndü');
select tests.logout();

select is((select status from public.recovery_plans where id = tests.id('plan1')), 'arsiv', 'eski aktif plan arşive alındı');
select ok((select closed_at is not null from public.recovery_plans where id = tests.id('plan1')), 'arşivlenen planın closed_at değeri damgalandı (saklama SK-03)');
select is((select count(*)::int from public.recovery_plans where student_id = tests.id('ogr_a1') and status = 'aktif'), 1,
  'öğrenci başına tam bir aktif plan');
select is((select daily_goal::int from public.recovery_plans where id = (select id from pt_plan)), 2, 'günlük hedef kaydedildi');
select is((select academic_year_id from public.recovery_plans where id = (select id from pt_plan)), '2098-2099', 'öğretim yılı başlangıç tarihinden bulundu');

select is(
  (select array_agg(t.code order by i.seq)
   from public.plan_items i join public.topics t on t.id = i.topic_id
   where i.plan_id = (select id from pt_plan)),
  array['PGTAP-MAT6-K1', 'PGTAP-FEN6-K1', 'PGTAP-MAT6-K2', 'PGTAP-FEN6-K2'],
  'sıra: hafta, hafta içi sıra, MAT/FEN dönüşümlü; yinelenen konu bir kez');
select is((select array_agg(i.seq order by i.seq) from public.plan_items i where i.plan_id = (select id from pt_plan)),
  array[1, 2, 3, 4], 'seq 1..N kesintisiz');
select is((select count(*)::int from public.plan_items where plan_id = (select id from pt_plan) and status <> 'bekliyor'), 0,
  'tüm maddeler "bekliyor" başlar');

-- ====================== Ders ve tarih süzgeçleri ======================
select tests.login('ogr_a1');
create temp table pt_plan2 (id uuid);
grant all on pt_plan2 to authenticated;
insert into pt_plan2 select public.create_recovery_plan(6::smallint, array['MAT'], '2098-09-07', '2098-09-20', 1::smallint);
select tests.logout();
select is(
  (select array_agg(t.code order by i.seq)
   from public.plan_items i join public.topics t on t.id = i.topic_id where i.plan_id = (select id from pt_plan2)),
  array['PGTAP-MAT6-K1', 'PGTAP-MAT6-K2'], 'yalnızca MAT seçilince yalnızca MAT konuları');
select is((select status from public.recovery_plans where id = (select id from pt_plan)), 'arsiv', 'yeni plan açılınca öncekisi arşive alınır');

select tests.login('ogr_a1');
create temp table pt_plan3 (id uuid);
grant all on pt_plan3 to authenticated;
insert into pt_plan3 select public.create_recovery_plan(6::smallint, array['MAT', 'FEN'], '2098-09-14', '2098-09-14', 3::smallint);
select tests.logout();
select is(
  (select array_agg(t.code order by i.seq)
   from public.plan_items i join public.topics t on t.id = i.topic_id where i.plan_id = (select id from pt_plan3)),
  array['PGTAP-FEN6-K2', 'PGTAP-MAT6-K1'],
  'tek günlük aralık yalnızca o günü içeren haftanın konularını alır (hafta 2: FEN K2, yinelenen MAT K1 hafta 2 sırasıyla)');

-- ====================== get_today_tasks ======================
select tests.login('ogr_a1');
select is((public.get_today_tasks() ->> 'daily_goal')::int, 3, 'get_today_tasks: günlük hedef');
select is(jsonb_array_length(public.get_today_tasks() -> 'tasks'), 2, 'get_today_tasks: kalan görev sayısı kadar (2 madde var, hedef 3)');
select is(public.get_today_tasks() -> 'tasks' -> 0 ->> 'title', 'PGTAP doku', 'get_today_tasks: sıradaki görev ilk');
select tests.logout();
select tests.login('veli_a');
select is(public.get_today_tasks(), null, 'veli için get_today_tasks null döner');
select tests.logout();

-- ====================== complete_plan_item ======================
select tests.login('ogr_b1');
select throws_ok(format($$ select public.complete_plan_item(%L, 'kisa') $$, (select id from public.plan_items where plan_id = (select id from pt_plan3) order by seq limit 1)),
  '22023', 'GOREV_YOK: görev bulunamadı ya da zaten tamamlandı', 'başka öğrencinin görevi tamamlanamaz');
select tests.logout();

select tests.login('ogr_a1');
select throws_ok(format($$ select public.complete_plan_item(%L, 'orta') $$, (select id from public.plan_items where plan_id = (select id from pt_plan3) order by seq limit 1)),
  '22023', 'MOD_GECERSIZ: mod kisa ya da tam olmalı', 'geçersiz mod');
select lives_ok(format($$ select public.complete_plan_item(%L, 'kisa') $$, (select id from public.plan_items where plan_id = (select id from pt_plan3) order by seq limit 1)),
  'ilk görev kısa modda tamamlandı');
select throws_ok(format($$ select public.complete_plan_item(%L, 'tam') $$, (select id from public.plan_items where plan_id = (select id from pt_plan3) order by seq limit 1)),
  '22023', 'GOREV_YOK: görev bulunamadı ya da zaten tamamlandı', 'aynı görev ikinci kez tamamlanamaz');
select lives_ok(format($$ select public.complete_plan_item(%L, 'tam') $$, (select id from public.plan_items where plan_id = (select id from pt_plan3) order by seq desc limit 1)),
  'ikinci (son) görev tam modda tamamlandı');
select tests.logout();

select is((select completed_mode from public.plan_items where plan_id = (select id from pt_plan3) order by seq limit 1), 'kisa', 'tamamlanma modu kaydedildi');
select is((select status from public.recovery_plans where id = (select id from pt_plan3)), 'tamamlandi', 'tüm görevler bitince plan tamamlandi olur');

select * from finish();
rollback;
