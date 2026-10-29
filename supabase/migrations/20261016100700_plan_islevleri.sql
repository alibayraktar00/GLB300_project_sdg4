-- =====================================================================
-- 07 · TELAFİ PLANI İŞLEVLERİ
--   create_recovery_plan : öğrenci için plan üretir (hafta kesişimi -> haftalık konular -> sıralı plan maddeleri)
--   get_today_tasks      : aktif planın sıradaki günlük görevleri
--   complete_plan_item   : bir görevi tamamlar (kısa / tam mod); biten plan 'tamamlandi' olur
--
-- İlkeler (docs/plan.md 4.1, 6; docs/veri-modeli.md):
--   - İş kuralları sunucuda: istemci doğrulaması yalnızca kullanıcı deneyimi içindir.
--   - SECURITY DEFINER + search_path = '' ; çağıran kimliği auth.uid() ile belirlenir, parametreyle KİMLİK ALINMAZ.
--   - Yalnızca AKTİF ÖĞRENCİ kendi planını yönetir (veli adına plan sonraki sürümde).
--   - Derslere ara verme NEDENİ alınmaz ve saklanmaz (veri minimizasyonu).
--   - Hata kodları ileti başında sabit ön ekle verilir (istemci eşler): KONU_YOK, TARIH_YIL, SINIF_UYUMSUZ ...
-- =====================================================================

create or replace function public.create_recovery_plan(
  p_grade         smallint,
  p_subject_codes text[],
  p_absence_start date,
  p_absence_end   date,
  p_daily_goal    smallint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid          uuid := (select auth.uid());
  v_student_grade smallint;
  v_year         text;
  v_year_end     date;
  v_codes        text[];
  v_subject_ids  smallint[];
  v_plan         uuid;
  v_items        integer;
begin
  if v_uid is null or (select private.active_role()) is distinct from 'ogrenci' then
    raise exception 'create_recovery_plan: yalnızca aktif öğrenci plan oluşturabilir' using errcode = '42501';
  end if;

  -- Girdi doğrulaması (istemcideki kuralların sunucu karşılığı)
  if p_absence_start is null or p_absence_end is null or p_absence_end < p_absence_start then
    raise exception 'TARIH_SIRA: bitiş tarihi başlangıçtan önce olamaz' using errcode = '22023';
  end if;
  if p_absence_end - p_absence_start + 1 > 366 then
    raise exception 'TARIH_UZUN: tarih aralığı en çok bir yıl olabilir' using errcode = '22023';
  end if;
  if p_daily_goal is null or p_daily_goal not between 1 and 3 then
    raise exception 'HEDEF_GECERSIZ: günlük konu sayısı 1-3 olmalı' using errcode = '22023';
  end if;
  if p_subject_codes is null or cardinality(p_subject_codes) = 0 or cardinality(p_subject_codes) > 10 then
    raise exception 'DERS_GECERSIZ: en az bir ders seçilmeli' using errcode = '22023';
  end if;

  -- Sınıf: öğrencinin kayıtlı sınıfıyla aynı olmalı (başkasının programıyla plan çıkarılmaz).
  select s.grade into v_student_grade from public.students s where s.profile_id = v_uid;
  if v_student_grade is distinct from p_grade then
    raise exception 'SINIF_UYUMSUZ: plan sınıfı kayıtlı sınıfla aynı olmalı' using errcode = '22023';
  end if;

  -- Öğretim yılı: başlangıç tarihini içeren yıl; aralık yıl sınırını aşamaz.
  select y.id, y.ends_on into v_year, v_year_end
  from public.academic_years y
  where p_absence_start between y.starts_on and y.ends_on;
  if v_year is null or p_absence_end > v_year_end then
    raise exception 'TARIH_YIL: tarihler tanımlı bir öğretim yılı içinde olmalı' using errcode = '22023';
  end if;

  -- Dersler: tekrarsız ve bilinen kodlar; seçim sırası korunur (haftalık konular bu sırayla dönüşümlü dizilir).
  select coalesce(array_agg(c order by o), '{}') into v_codes
  from (select distinct on (c) c, o from unnest(p_subject_codes) with ordinality as t(c, o) order by c, o) d;
  select array_agg(sub.id order by array_position(v_codes, sub.code)) into v_subject_ids
  from public.subjects sub
  where sub.code = any (v_codes);
  if v_subject_ids is null or cardinality(v_subject_ids) <> cardinality(v_codes) then
    raise exception 'DERS_GECERSIZ: bilinmeyen ders kodu' using errcode = '22023';
  end if;

  -- Aynı işlemde: eski aktif plan arşive alınır (öğrenci başına tek aktif plan), yeni plan açılır.
  update public.recovery_plans set status = 'arsiv'
  where student_id = v_uid and status = 'aktif';

  insert into public.recovery_plans (student_id, academic_year_id, absence_start, absence_end, daily_goal)
  values (v_uid, v_year, p_absence_start, p_absence_end, p_daily_goal)
  returning id into v_plan;

  -- Hafta kesişimi -> haftalık konular. Tatil haftaları atlanır; aynı konu bir kez; sıra: hafta, hafta içi sıra,
  -- ders sırası (MAT/FEN dönüşümlü).
  with picked as (
    select wt.topic_id, wt.week_no, wt.seq, array_position(v_subject_ids, wt.subject_id) as subject_order
    from public.weekly_topics wt
    join public.academic_weeks w
      on w.academic_year_id = wt.academic_year_id and w.week_no = wt.week_no
    where wt.academic_year_id = v_year
      and wt.grade = p_grade
      and wt.subject_id = any (v_subject_ids)
      and not w.is_break
      and w.starts_on <= p_absence_end
      and w.ends_on >= p_absence_start
  ), ranked as (
    select topic_id,
           row_number() over (order by week_no, seq, subject_order) as rn,
           row_number() over (partition by topic_id order by week_no, seq, subject_order) as dup
    from picked
  )
  insert into public.plan_items (plan_id, topic_id, seq)
  select v_plan, r.topic_id, (row_number() over (order by r.rn))::integer
  from ranked r
  where r.dup = 1;

  get diagnostics v_items = row_count;
  if v_items = 0 then
    -- İşlev hata ile biter: eski planın arşivlenmesi ve yeni plan satırı da geri alınır.
    raise exception 'KONU_YOK: seçilen tarihler ve derslerde konu bilgisi bulunamadı' using errcode = '22023';
  end if;

  return v_plan;
end;
$$;

-- ---------------------------------------------------------------------
-- get_today_tasks: aktif planın sıradaki `daily_goal` görevi (tarihe bağlı DEĞİL: kaçırılan gün borç yaratmaz)
-- ---------------------------------------------------------------------
create or replace function public.get_today_tasks()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select private.active_role()) is distinct from 'ogrenci' then null
    else (
      select jsonb_build_object(
        'plan_id', p.id,
        'daily_goal', p.daily_goal,
        'total', (select count(*) from public.plan_items i where i.plan_id = p.id),
        'completed', (select count(*) from public.plan_items i where i.plan_id = p.id and i.status = 'tamamlandi'),
        'tasks', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'item_id', t.item_id, 'topic_id', t.topic_id, 'title', t.title,
                   'subject_code', t.subject_code, 'subject_name', t.subject_name,
                   'grade', t.grade, 'est_minutes', t.est_minutes) order by t.seq)
          from (
            select i.id as item_id, i.topic_id, i.seq, tp.title, sub.code as subject_code, sub.name as subject_name,
                   cv.grade, tp.est_minutes
            from public.plan_items i
            join public.topics tp on tp.id = i.topic_id
            join public.units u on u.id = tp.unit_id
            join public.curriculum_versions cv on cv.id = u.curriculum_version_id
            join public.subjects sub on sub.id = cv.subject_id
            where i.plan_id = p.id and i.status = 'bekliyor'
            order by i.seq
            limit p.daily_goal
          ) t
        ), '[]'::jsonb)
      )
      from public.recovery_plans p
      where p.student_id = (select auth.uid()) and p.status = 'aktif'
    )
  end;
$$;

-- ---------------------------------------------------------------------
-- complete_plan_item: görev tamamlanır; seçilen mod (kısa/tam) kaydedilir. Hepsi bitince plan 'tamamlandi'.
-- ---------------------------------------------------------------------
create or replace function public.complete_plan_item(p_item_id uuid, p_mode text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_plan uuid;
begin
  if v_uid is null or (select private.active_role()) is distinct from 'ogrenci' then
    raise exception 'complete_plan_item: yalnızca aktif öğrenci' using errcode = '42501';
  end if;
  if p_mode is null or p_mode not in ('kisa', 'tam') then
    raise exception 'MOD_GECERSIZ: mod kisa ya da tam olmalı' using errcode = '22023';
  end if;

  update public.plan_items i
     set status = 'tamamlandi', completed_at = now(), completed_mode = p_mode
   from public.recovery_plans p
   where i.id = p_item_id
     and i.plan_id = p.id
     and p.student_id = v_uid
     and p.status = 'aktif'
     and i.status = 'bekliyor'
  returning i.plan_id into v_plan;

  if v_plan is null then
    raise exception 'GOREV_YOK: görev bulunamadı ya da zaten tamamlandı' using errcode = '22023';
  end if;

  update public.recovery_plans p
     set status = 'tamamlandi'
   where p.id = v_plan
     and not exists (select 1 from public.plan_items i where i.plan_id = p.id and i.status = 'bekliyor');
end;
$$;

-- Yetkiler: yalnızca giriş yapmış kullanıcı (anon ve PUBLIC kapalı); işlev içinde rol yeniden denetlenir.
revoke all on function public.create_recovery_plan(smallint, text[], date, date, smallint) from public, anon, authenticated, service_role;
revoke all on function public.get_today_tasks() from public, anon, authenticated, service_role;
revoke all on function public.complete_plan_item(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.create_recovery_plan(smallint, text[], date, date, smallint) to authenticated;
grant execute on function public.get_today_tasks() to authenticated;
grant execute on function public.complete_plan_item(uuid, text) to authenticated;

comment on function public.create_recovery_plan(smallint, text[], date, date, smallint) is
  'Aktif öğrenci için telafi planı üretir: derslere ara verilen haftaların (tatil hariç) haftalık konuları, MAT/FEN dönüşümlü sıralı plan maddeleri. Eski aktif plan arşive alınır. Konu yoksa KONU_YOK ile hata verir ve hiçbir şey değişmez.';
comment on function public.get_today_tasks() is
  'Aktif planın sıradaki daily_goal görevini döndürür (tarihe bağlı değil). Plan yoksa null.';
comment on function public.complete_plan_item(uuid, text) is
  'Çağıranın aktif planındaki bekleyen görevi tamamlar (kisa/tam). Tüm görevler bitince plan tamamlandi olur.';
