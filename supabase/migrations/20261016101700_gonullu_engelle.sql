-- =====================================================================
-- 17 · GÖNÜLLÜYÜ ENGELLE (Google Play Families: bire bir etkileşimde engelleme zorunlu)
--   block_volunteer: öğrenci kendi adına, veli çocuğu adına bir gönüllüyü engeller.
--   Asıl iş tetikleyicilerdedir (volunteer_blocks_kaynak_kontrol: çağıranın çocukla ilişkisi;
--   volunteer_blocks_uygula: eşleşmeyi bitirir, planlı dersleri iptal eder, soruları serbest bırakır/kapatır).
--   Bu RPC yalnızca doğru kimlikle satırı ekler. Neden listeden seçilir (serbest metin yok).
-- =====================================================================

create or replace function public.block_volunteer(p_student_id uuid, p_volunteer_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or (select private.active_role()) not in ('ogrenci', 'veli') then
    raise exception 'block_volunteer: yalnızca öğrenci ya da veli' using errcode = '42501';
  end if;
  if p_reason is null or p_reason not in ('uygunsuz_davranis', 'rahatsiz_edici', 'platform_disi_iletisim', 'tercih_etmiyorum', 'diger') then
    raise exception 'GEREKCE_GECERSIZ: engel nedeni listeden seçilmeli' using errcode = '22023';
  end if;
  -- Öğrenci yalnızca kendisi için engelleyebilir (tetikleyici de denetler; burada açık hata verilir).
  if (select private.active_role()) = 'ogrenci' and p_student_id is distinct from v_uid then
    raise exception 'block_volunteer: öğrenci yalnızca kendisi için engelleyebilir' using errcode = '42501';
  end if;
  -- Engellenecek gönüllü bu çocukla en az bir kez eşleşmiş ya da ona önerilmiş olmalı (rastgele hesap engellenemez).
  if not exists (select 1 from public.matches m where m.student_id = p_student_id and m.volunteer_id = p_volunteer_id) then
    raise exception 'GONULLU_YOK: bu gönüllü ile eşleşme kaydı yok' using errcode = '22023';
  end if;

  insert into public.volunteer_blocks (student_id, volunteer_id, match_id, blocked_by, blocked_by_role, reason_code)
  values (p_student_id, p_volunteer_id,
          (select m.id from public.matches m where m.student_id = p_student_id and m.volunteer_id = p_volunteer_id
            order by m.created_at desc limit 1),
          v_uid, case when (select private.active_role()) = 'ogrenci' then 'ogrenci' else 'veli' end, p_reason)
  on conflict (student_id, volunteer_id) do nothing;
end;
$$;

revoke all on function public.block_volunteer(uuid, uuid, text) from public, anon;
grant execute on function public.block_volunteer(uuid, uuid, text) to authenticated;
