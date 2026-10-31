-- =====================================================================
-- 18 · HESAP DURUMU (yönetici): set_account_status
--   Yönetici bir hesabı askıya alır ya da yeniden etkinleştirir. Yönetici hesapları ve kendisi bu yolla
--   değiştirilemez (yetki yükseltme ve kilitlenme riski). Değişiklik profiles_audit ile denetim kaydına düşer.
--   Askıdaki hesap giriş yapabilir ama requireRole /durum'a yönlendirir ve RLS politikaları (aktif şartı) erişimi keser.
-- =====================================================================

create or replace function public.set_account_status(p_user_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_role text;
begin
  if v_uid is null or not (select private.is_admin()) then
    raise exception 'set_account_status: yalnızca yönetici' using errcode = '42501';
  end if;
  if p_status is null or p_status not in ('aktif', 'askida') then
    raise exception 'DURUM_GECERSIZ: durum aktif ya da askıda olmalı' using errcode = '22023';
  end if;
  if p_user_id = v_uid then
    raise exception 'KENDI_HESABI: kendi hesabın değiştirilemez' using errcode = '22023';
  end if;

  select p.role into v_role from public.profiles p where p.id = p_user_id;
  if not found then
    raise exception 'HESAP_YOK: hesap bulunamadı' using errcode = '22023';
  end if;
  if v_role = 'yonetici' then
    raise exception 'YONETICI_HESABI: yönetici hesapları bu yolla değiştirilemez' using errcode = '22023';
  end if;

  update public.profiles set status = p_status where id = p_user_id and status is distinct from p_status;
end;
$$;

revoke all on function public.set_account_status(uuid, text) from public, anon;
grant execute on function public.set_account_status(uuid, text) to authenticated;
