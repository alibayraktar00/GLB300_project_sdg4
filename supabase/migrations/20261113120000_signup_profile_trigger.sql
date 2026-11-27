-- Kayıt olan kullanıcı için profil satırını otomatik oluşturur.
-- display_name ve role, kayıtta istemcinin gönderdiği raw_user_meta_data'dan okunur.
--   veli    -> status 'aktif'
--   gonullu -> status 'beklemede' (öğrenci belgesi doğrulanana kadar)
--   ogrenci -> REDDEDİLİR: öğrenciyi velisi oluşturur, sunucu tarafında.
--   diğer / boş -> REDDEDİLİR.
-- Reddetmek, auth.users ekleme işlemini (yani kaydı) tamamen geri alır.
--
-- Sunucunun oluşturduğu kullanıcılar (ör. öğrenciler, seed verisi) raw_app_meta_data içinde
-- "profile_created_by_server": true taşır; tetikleyici bunları atlar ve profili sunucu kendisi ekler.
-- raw_app_meta_data'yı istemci değiştiremez, yalnızca service_role (auth admin API) yazabilir.

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := new.raw_user_meta_data ->> 'role';
  v_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  if (new.raw_app_meta_data ->> 'profile_created_by_server') = 'true' then
    return new;
  end if;

  if v_role is null or v_role not in ('veli', 'gonullu') then
    raise exception 'Bu rolle kayıt olunamaz.' using errcode = '22023';
  end if;

  if v_name = '' then
    raise exception 'display_name zorunludur.' using errcode = '22023';
  end if;

  insert into public.profiles (id, role, status, display_name)
  values (new.id, v_role, case v_role when 'veli' then 'aktif' else 'beklemede' end, v_name);

  return new;
end;
$$;

-- Yalnızca tetikleyici çağırır; API rolleri doğrudan çalıştıramaz.
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
