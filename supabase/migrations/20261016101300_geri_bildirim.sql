-- =====================================================================
-- 13 · DERS GERİ BİLDİRİMİ VE BASİT ÖLÇÜM (proje raporu: memnuniyet > %80, hafta 7 testi)
--
--   session_feedback        : ders sonrası 1-5 puan + "devam etmek ister misin?" Serbest metin YOK
--                             (çocuktan kişisel bilgi toplanmasın, moderasyon yükü olmasın).
--   submit_feedback         : dersin tarafı (öğrenci, veli, gönüllü) bitmiş ders için BİR kez cevap verir.
--   get_feedback_summary    : yönetici (MFA) için toplu sayılar; kişi bilgisi içermez.
-- =====================================================================

create table public.session_feedback (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  respondent_id uuid references public.profiles(id) on delete set null,
  role          text not null check (role in ('ogrenci', 'veli', 'gonullu')),
  rating        smallint not null check (rating between 1 and 5),
  would_continue boolean not null,
  created_at    timestamptz not null default now()
);
-- Aynı kişi aynı ders için bir kez cevap verir (hesap silinip respondent_id boşalsa bile satır kalır).
create unique index session_feedback_tek_cevap on public.session_feedback (session_id, respondent_id, role)
  where respondent_id is not null;
create index session_feedback_session_idx on public.session_feedback (session_id);
comment on table public.session_feedback is
  'Ders sonrası kısa geri bildirim. Serbest metin yoktur; yazma yalnızca submit_feedback RPC''siyle.';

alter table public.session_feedback enable row level security;
grant select on public.session_feedback to authenticated;
revoke all on public.session_feedback from anon;
grant select, insert, update, delete on public.session_feedback to service_role;

create policy session_feedback_select_own on public.session_feedback for select to authenticated
  using (respondent_id = (select auth.uid()));
create policy session_feedback_select_admin on public.session_feedback for select to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------
-- submit_feedback
-- ---------------------------------------------------------------------
create or replace function public.submit_feedback(p_session_id uuid, p_rating smallint, p_would_continue boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_role text := (select private.active_role());
  v_ok   boolean;
begin
  if v_uid is null or v_role is null or v_role not in ('ogrenci', 'veli', 'gonullu') then
    raise exception 'submit_feedback: oturum gerekli' using errcode = '42501';
  end if;
  if p_rating is null or p_rating not between 1 and 5 or p_would_continue is null then
    raise exception 'PUAN_GECERSIZ: puan 1 ile 5 arasında olmalı' using errcode = '22023';
  end if;

  -- Ders bitmiş olmalı (iptal edilmemiş) ve çağıran dersin tarafı olmalı.
  select exists (
    select 1
      from public.sessions s
      join public.matches m on m.id = s.match_id
     where s.id = p_session_id
       and s.status in ('planlandi', 'tamamlandi')
       and s.starts_at + make_interval(mins => s.duration_min) < now()
       and (
         (v_role = 'ogrenci' and m.student_id = v_uid)
         or (v_role = 'gonullu' and m.volunteer_id = v_uid and (select private.is_approved_volunteer()))
         or (v_role = 'veli' and (select private.is_guardian_of(m.student_id)))
       )
  ) into v_ok;
  if not v_ok then
    raise exception 'DERS_YOK: geri bildirim verilebilecek ders bulunamadı' using errcode = '42501';
  end if;

  begin
    insert into public.session_feedback (session_id, respondent_id, role, rating, would_continue)
    values (p_session_id, v_uid, v_role, p_rating, p_would_continue);
  exception when unique_violation then
    raise exception 'ZATEN_VAR: bu ders için geri bildirim verildi' using errcode = '22023';
  end;
end;
$$;

-- ---------------------------------------------------------------------
-- get_feedback_summary: rol bazında toplu sayılar (kişi yok)
-- ---------------------------------------------------------------------
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

revoke all on function public.submit_feedback(uuid, smallint, boolean) from public, anon;
revoke all on function public.get_feedback_summary() from public, anon;
grant execute on function public.submit_feedback(uuid, smallint, boolean) to authenticated;
grant execute on function public.get_feedback_summary() to authenticated;
