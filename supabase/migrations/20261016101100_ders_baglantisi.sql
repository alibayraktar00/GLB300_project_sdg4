-- =====================================================================
-- 11 · BİREBİR DERS: Google Meet / Zoom BAĞLANTISI (proje raporu: "One-to-One Online Sessions ... we use
--      Google Meet or Zoom links"; özel görüntülü ders sistemi yok)
--
--   sessions.meeting_url : yalnızca Google Meet ya da Zoom adresi (alan adı izin listesi: başka siteye,
--                          oltalama bağlantısına yönlendirme olmasın; çocuklar bu bağlantıya tıklar)
--   schedule_session     : onaylı gönüllü, aktif eşleşmesindeki öğrenci için ders planlar (+ bağlantı)
--   cancel_session       : gönüllü, öğrenci ya da öğrencinin velisi planlı dersi iptal eder (kod listesi)
--   set_session_link     : gönüllü, planlı dersin bağlantısını değiştirir (ör. yeni oda)
--
-- Ders süresi: rapor 30-40 dakika der; 30 dakika seçeneği eklendi (20 / 30 / 40).
-- Eski Jitsi için ayrılan room_name sütunu kalır (kullanılmıyor); video kaydı alınmaz.
-- =====================================================================

alter table public.sessions drop constraint sessions_duration_min_check;
alter table public.sessions add constraint sessions_duration_min_chk check (duration_min in (20, 30, 40));

alter table public.sessions add column meeting_url text;
alter table public.sessions add constraint sessions_meeting_url_chk check (
  meeting_url is null or (
    char_length(meeting_url) <= 300
    -- Google Meet: https://meet.google.com/abc-defg-hij ; Zoom: https://zoom.us/j/123... ya da https://us02web.zoom.us/j/...
    and meeting_url ~ '^https://(meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}(\?[^[:space:]@\\]*)?|([a-z0-9]+\.)?zoom\.us/(j|my)/[A-Za-z0-9_.-]+(\?[^[:space:]@\\]*)?)$'
  )
);
comment on column public.sessions.meeting_url is
  'Ders için Google Meet / Zoom bağlantısı. CHECK ile yalnızca bu iki servisin adres biçimi kabul edilir. Öğrenci, veli ve gönüllü okur.';

-- ---------------------------------------------------------------------
-- schedule_session
-- ---------------------------------------------------------------------
create or replace function public.schedule_session(
  p_match_id     uuid,
  p_starts_at    timestamptz,
  p_duration_min smallint,
  p_meeting_url  text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_match   public.matches%rowtype;
  v_ends_at timestamptz;
  v_local   time;
  v_id      uuid;
begin
  if v_uid is null or not (select private.is_approved_volunteer()) then
    raise exception 'schedule_session: yalnızca onaylı gönüllü ders planlayabilir' using errcode = '42501';
  end if;

  select * into v_match from public.matches m where m.id = p_match_id and m.volunteer_id = v_uid and m.status = 'aktif';
  if not found or (select private.is_blocked(v_match.student_id, v_uid)) then
    raise exception 'ESLESME_YOK: aktif eşleşme bulunamadı' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles sp where sp.id = v_match.student_id and sp.status = 'aktif') then
    raise exception 'ESLESME_YOK: aktif eşleşme bulunamadı' using errcode = '42501';
  end if;

  if p_duration_min is null or p_duration_min not in (20, 30, 40) then
    raise exception 'SURE_GECERSIZ: ders süresi 20, 30 ya da 40 dakika olmalı' using errcode = '22023';
  end if;
  if p_starts_at is null or p_starts_at < now() + interval '15 minutes' or p_starts_at > now() + interval '60 days' then
    raise exception 'ZAMAN_GECERSIZ: ders en erken 15 dakika sonrasına, en geç 60 gün içine planlanabilir' using errcode = '22023';
  end if;
  v_ends_at := p_starts_at + p_duration_min * interval '1 minute';
  v_local := (p_starts_at at time zone 'Europe/Istanbul')::time;
  if v_local < time '08:00' or v_local > time '21:00' - p_duration_min * interval '1 minute' then
    raise exception 'SAAT_DISI: ders 08:00-21:00 (İstanbul saati) arasında bitmeli' using errcode = '22023';
  end if;
  if p_meeting_url is null or btrim(p_meeting_url) = '' then
    raise exception 'BAGLANTI_GEREKLI: Google Meet ya da Zoom bağlantısı gerekli' using errcode = '22023';
  end if;

  -- Aynı gönüllünün ya da aynı öğrencinin çakışan planlı dersi olmasın (eşzamanlı planlamada tek kazanan)
  perform pg_advisory_xact_lock(hashtextextended('ders:' || v_uid::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('ders:' || v_match.student_id::text, 0));
  if exists (
    select 1
    from public.sessions s
    join public.matches m2 on m2.id = s.match_id
    where s.status = 'planlandi'
      and (m2.volunteer_id = v_uid or m2.student_id = v_match.student_id)
      and tstzrange(s.starts_at, s.starts_at + s.duration_min * interval '1 minute') && tstzrange(p_starts_at, v_ends_at)
  ) then
    raise exception 'CAKISMA: bu saatte başka bir ders var' using errcode = '22023';
  end if;

  begin
    insert into public.sessions (match_id, starts_at, duration_min, meeting_url, booked_by)
    values (p_match_id, p_starts_at, p_duration_min, btrim(p_meeting_url), v_uid)
    returning id into v_id;
  exception when check_violation then
    -- Tek CHECK, bağlantı biçimi; saat kuralı yukarıda ayrıca denetlendi.
    raise exception 'BAGLANTI_GECERSIZ: yalnızca Google Meet ya da Zoom bağlantısı kabul edilir' using errcode = '22023';
  end;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------
-- set_session_link
-- ---------------------------------------------------------------------
create or replace function public.set_session_link(p_session_id uuid, p_meeting_url text)
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
    raise exception 'set_session_link: yalnızca onaylı gönüllü' using errcode = '42501';
  end if;
  if p_meeting_url is null or btrim(p_meeting_url) = '' then
    raise exception 'BAGLANTI_GEREKLI: Google Meet ya da Zoom bağlantısı gerekli' using errcode = '22023';
  end if;
  begin
    update public.sessions s set meeting_url = btrim(p_meeting_url)
     from public.matches m
     where s.id = p_session_id and m.id = s.match_id and m.volunteer_id = v_uid
       and s.status = 'planlandi' and s.starts_at > now()
       and not (select private.is_blocked(m.student_id, v_uid))
    returning s.id into v_id;
  exception when check_violation then
    raise exception 'BAGLANTI_GECERSIZ: yalnızca Google Meet ya da Zoom bağlantısı kabul edilir' using errcode = '22023';
  end;
  if v_id is null then
    raise exception 'DERS_YOK: planlı ders bulunamadı' using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- cancel_session: gönüllü, öğrenci ya da öğrencinin velisi (kod listesi; serbest metin YOK)
-- ---------------------------------------------------------------------
create or replace function public.cancel_session(p_session_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id  uuid;
begin
  if v_uid is null or (select private.active_role()) is null then
    raise exception 'cancel_session: oturum gerekli' using errcode = '42501';
  end if;
  if p_reason is null or p_reason not in ('zaman_uygun_degil', 'teknik_sorun', 'diger') then
    raise exception 'GEREKCE_GECERSIZ: iptal gerekçesi listeden seçilmeli' using errcode = '22023';
  end if;

  update public.sessions s
     set status = 'iptal', cancelled_by = v_uid, cancelled_at = now(), cancel_reason = p_reason
    from public.matches m
   where s.id = p_session_id and m.id = s.match_id and s.status = 'planlandi'
     and (
       (m.volunteer_id = v_uid and (select private.is_approved_volunteer()))
       or (m.student_id = v_uid and (select private.active_role()) = 'ogrenci')
       or (exists (select 1 from public.guardian_students g where g.guardian_id = v_uid and g.student_id = m.student_id)
           and (select private.active_role()) = 'veli')
     )
  returning s.id into v_id;

  if v_id is null then
    raise exception 'DERS_YOK: planlı ders bulunamadı' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.schedule_session(uuid, timestamptz, smallint, text) from public, anon, authenticated, service_role;
revoke all on function public.set_session_link(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.cancel_session(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.schedule_session(uuid, timestamptz, smallint, text) to authenticated;
grant execute on function public.set_session_link(uuid, text) to authenticated;
grant execute on function public.cancel_session(uuid, text) to authenticated;

comment on function public.schedule_session(uuid, timestamptz, smallint, text) is
  'Onaylı gönüllü, aktif eşleşmesindeki öğrenci için ders planlar (20/30/40 dk, 08:00-21:00 İstanbul, en erken 15 dk sonra, çakışma yok) ve Meet/Zoom bağlantısını ekler.';
comment on function public.set_session_link(uuid, text) is
  'Gönüllü, kendi planlı dersinin Meet/Zoom bağlantısını değiştirir.';
comment on function public.cancel_session(uuid, text) is
  'Gönüllü, öğrenci ya da öğrencinin velisi planlı dersi iptal eder. Gerekçe kod listesinden (serbest metin yok).';
