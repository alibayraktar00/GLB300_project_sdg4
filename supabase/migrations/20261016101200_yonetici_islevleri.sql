-- =====================================================================
-- 12 · YÖNETİCİ VE VELİ KARAR İŞLEVLERİ
--   review_volunteer : yönetici gönüllü başvurusunu onaylar / reddeder / askıya alır
--   propose_match    : yönetici bir öğrenci-gönüllü-ders eşleşmesi önerir (veli kararını bekler)
--   decide_match     : veli, çocuğuna önerilen eşleşmeyi onaylar ya da reddeder
-- Yazma yalnızca bu RPC'lerle (matches / volunteers durum alanlarına istemci doğrudan yazamaz).
-- Yönetici yetkisi private.is_admin(): MFA (aal2, son 12 saatte TOTP) şarttır.
-- =====================================================================

-- ---------------------------------------------------------------------
-- review_volunteer
-- ---------------------------------------------------------------------
create or replace function public.review_volunteer(p_volunteer_id uuid, p_decision text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_old text;
begin
  if v_uid is null or not (select private.is_admin()) then
    raise exception 'review_volunteer: yalnızca yönetici' using errcode = '42501';
  end if;
  if p_decision is null or p_decision not in ('onayla', 'reddet', 'askiya_al', 'incelemeye_al') then
    raise exception 'KARAR_GECERSIZ: karar listeden seçilmeli' using errcode = '22023';
  end if;
  -- Ret gerekçesi serbest metin DEĞİL, koddur: gönüllüye gösterilebilir, kişisel veri sızdırmaz.
  if p_decision = 'reddet' and (p_reason is null or p_reason not in ('belge_eksik', 'uygun_degil', 'diger')) then
    raise exception 'GEREKCE_GECERSIZ: ret gerekçesi listeden seçilmeli' using errcode = '22023';
  end if;

  select v.status into v_old from public.volunteers v where v.profile_id = p_volunteer_id for update;
  if not found then
    raise exception 'BASVURU_YOK: gönüllü bulunamadı' using errcode = '22023';
  end if;

  if p_decision = 'onayla' then
    if v_old not in ('basvuru', 'egitim', 'inceleme', 'askida') then
      raise exception 'DURUM_UYGUN_DEGIL: bu başvuru onaylanamaz' using errcode = '22023';
    end if;
    update public.volunteers
       set status = 'onayli', approved_by = v_uid, approved_at = now(), reject_reason = null
     where profile_id = p_volunteer_id;
  elsif p_decision = 'reddet' then
    if v_old not in ('basvuru', 'egitim', 'inceleme') then
      raise exception 'DURUM_UYGUN_DEGIL: bu başvuru reddedilemez' using errcode = '22023';
    end if;
    update public.volunteers set status = 'reddedildi', reject_reason = p_reason where profile_id = p_volunteer_id;
  elsif p_decision = 'askiya_al' then
    if v_old <> 'onayli' then
      raise exception 'DURUM_UYGUN_DEGIL: yalnızca onaylı gönüllü askıya alınabilir' using errcode = '22023';
    end if;
    update public.volunteers set status = 'askida' where profile_id = p_volunteer_id;
  else
    if v_old not in ('basvuru', 'egitim') then
      raise exception 'DURUM_UYGUN_DEGIL: bu başvuru incelemeye alınamaz' using errcode = '22023';
    end if;
    update public.volunteers set status = 'inceleme' where profile_id = p_volunteer_id;
  end if;

  perform private.write_audit('review_volunteer', 'volunteers', p_volunteer_id::text,
                              jsonb_build_object('decision', p_decision, 'from', v_old));
end;
$$;

-- ---------------------------------------------------------------------
-- propose_match
-- ---------------------------------------------------------------------
create or replace function public.propose_match(p_student_id uuid, p_volunteer_id uuid, p_subject_id smallint)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_grade   smallint;
  v_max     smallint;
  v_open    integer;
  v_id      uuid;
begin
  if v_uid is null or not (select private.is_admin()) then
    raise exception 'propose_match: yalnızca yönetici' using errcode = '42501';
  end if;

  select s.grade into v_grade
    from public.students s join public.profiles p on p.id = s.profile_id
   where s.profile_id = p_student_id and p.status = 'aktif';
  if not found then
    raise exception 'OGRENCI_YOK: aktif öğrenci bulunamadı' using errcode = '22023';
  end if;

  select v.max_students into v_max
    from public.volunteers v join public.profiles p on p.id = v.profile_id
   where v.profile_id = p_volunteer_id and v.status = 'onayli' and p.status = 'aktif';
  if not found then
    raise exception 'GONULLU_UYGUN_DEGIL: onaylı ve aktif gönüllü bulunamadı' using errcode = '22023';
  end if;

  if not exists (select 1 from public.volunteer_subjects vs
                  where vs.volunteer_id = p_volunteer_id and vs.subject_id = p_subject_id and vs.grade = v_grade) then
    raise exception 'DERS_UYGUN_DEGIL: gönüllü bu ders ve sınıfı vermiyor' using errcode = '22023';
  end if;

  select count(*) into v_open from public.matches m
   where m.volunteer_id = p_volunteer_id and m.status in ('onerildi', 'veli_onayi', 'aktif');
  if v_open >= v_max then
    raise exception 'KONTENJAN_DOLU: gönüllünün öğrenci kontenjanı dolu' using errcode = '22023';
  end if;

  if exists (select 1 from public.matches m
              where m.student_id = p_student_id and m.subject_id = p_subject_id and m.status in ('onerildi', 'veli_onayi', 'aktif')) then
    raise exception 'ESLESME_VAR: bu öğrencinin bu derste açık eşleşmesi var' using errcode = '22023';
  end if;

  insert into public.matches (student_id, volunteer_id, subject_id, status, proposed_by)
  values (p_student_id, p_volunteer_id, p_subject_id, 'onerildi', v_uid)
  returning id into v_id;

  perform private.write_audit('propose_match', 'matches', v_id::text, '{}'::jsonb);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- decide_match: veli kararı
-- ---------------------------------------------------------------------
create or replace function public.decide_match(p_match_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id  uuid;
begin
  if v_uid is null or (select private.active_role()) is distinct from 'veli' or p_approve is null then
    raise exception 'decide_match: yalnızca veli' using errcode = '42501';
  end if;

  update public.matches m
     set status = case when p_approve then 'aktif' else 'bitti' end,
         guardian_decision_at = now(),
         started_at = case when p_approve then now() else null end,
         ended_at = case when p_approve then null else now() end,
         end_reason = case when p_approve then null else 'veli_reddetti' end
   where m.id = p_match_id
     and m.status = 'onerildi'
     and (select private.is_guardian_of(m.student_id))
  returning m.id into v_id;

  if v_id is null then
    raise exception 'ESLESME_YOK: karar bekleyen eşleşme bulunamadı' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.review_volunteer(uuid, text, text) from public, anon;
revoke all on function public.propose_match(uuid, uuid, smallint) from public, anon;
revoke all on function public.decide_match(uuid, boolean) from public, anon;
grant execute on function public.review_volunteer(uuid, text, text) to authenticated;
grant execute on function public.propose_match(uuid, uuid, smallint) to authenticated;
grant execute on function public.decide_match(uuid, boolean) to authenticated;
