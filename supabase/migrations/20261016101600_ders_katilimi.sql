-- =====================================================================
-- 16 · DERS KATILIMI: mark_session + özetteki katılım oranı (rapor ölçütü: haftalık katılım > %85)
--   mark_session: ders bittikten sonra gönüllü, kendi dersini 'tamamlandi' (yapıldı) ya da 'gelinmedi' (öğrenci gelmedi)
--   olarak işaretler. İptal edilmiş ders işaretlenemez; ders bitmeden işaretlenemez.
-- =====================================================================

create or replace function public.mark_session(p_session_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id  uuid;
begin
  if v_uid is null or not (select private.is_approved_volunteer()) then
    raise exception 'mark_session: yalnızca onaylı gönüllü' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('tamamlandi', 'gelinmedi') then
    raise exception 'DURUM_GECERSIZ: durum yapıldı ya da gelinmedi olmalı' using errcode = '22023';
  end if;

  update public.sessions s
     set status = p_status
    from public.matches m
   where s.id = p_session_id and m.id = s.match_id and m.volunteer_id = v_uid
     and s.status in ('planlandi', 'tamamlandi', 'gelinmedi')
     and s.starts_at + make_interval(mins => s.duration_min) < now()
  returning s.id into v_id;

  if v_id is null then
    raise exception 'DERS_YOK: işaretlenebilecek (bitmiş) ders bulunamadı' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.mark_session(uuid, text) from public, anon;
grant execute on function public.mark_session(uuid, text) to authenticated;

create or replace function public.get_feedback_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select private.is_admin()) then
    raise exception 'get_feedback_summary: yalnızca yönetici' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'completed_sessions', (select count(*) from public.sessions s
                            where s.status in ('planlandi', 'tamamlandi')
                              and s.starts_at + make_interval(mins => s.duration_min) < now()),
    'attendance', (
      select jsonb_build_object(
               'attended', count(*) filter (where s.status = 'tamamlandi'),
               'missed', count(*) filter (where s.status = 'gelinmedi'),
               'attendance_pct', case when count(*) filter (where s.status in ('tamamlandi', 'gelinmedi')) = 0 then null
                                      else round(100.0 * count(*) filter (where s.status = 'tamamlandi')
                                                 / count(*) filter (where s.status in ('tamamlandi', 'gelinmedi')), 1) end)
        from public.sessions s
    ),
    'by_role', coalesce((
      select jsonb_object_agg(r.role, jsonb_build_object(
               'responses', r.n,
               'avg_rating', round(r.avg_rating, 2),
               'satisfied_pct', round(100.0 * r.satisfied / r.n, 1),
               'continue_pct', round(100.0 * r.cont / r.n, 1)))
        from (
          select f.role,
                 count(*) as n,
                 avg(f.rating) as avg_rating,
                 count(*) filter (where f.rating >= 4) as satisfied,
                 count(*) filter (where f.would_continue) as cont
            from public.session_feedback f
           group by f.role
        ) r
    ), '{}'::jsonb)
  );
end;
$$;
