-- =====================================================================
-- 15 · Gönüllü onayı için taahhüt şartı
--   review_volunteer('onayla'): gonullu_taahhut ve gonullu_davranis_kurallari onayları (verilmiş, geri çekilmemiş)
--   yoksa RIZA_EKSIK ile reddeder. Arayüz de düğmeyi kapatır; bu kural veritabanında son savunmadır.
-- =====================================================================

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
    -- Çocuk güvenliği: taahhütname ve davranış kuralları onayı (verilmiş ve geri çekilmemiş) olmadan gönüllü onaylanamaz.
    if (select count(distinct c.type) from public.consents c
         where c.user_id = p_volunteer_id and c.granted and c.withdrawn_at is null
           and c.type in ('gonullu_taahhut', 'gonullu_davranis_kurallari')) < 2 then
      raise exception 'RIZA_EKSIK: taahhütname ve davranış kuralları onayı yok' using errcode = '22023';
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
