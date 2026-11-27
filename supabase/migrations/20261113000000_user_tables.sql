-- Kullanıcı tabloları: yalnızca 8. sınıf Matematik; roller: veli (parent), öğrenci (student), gönüllü (tutor).

-- Her giriş yapan kullanıcı için bir profil. Rol ve durum sunucu tarafında belirlenir; istemci değiştiremez.
-- Rol değerleri uygulamadaki adres önekleriyle aynıdır (web/src/lib/role-navigation.ts).
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         text not null check (role in ('veli', 'ogrenci', 'gonullu')),
  status       text not null default 'aktif' check (status in ('aktif', 'beklemede', 'askida')),
  display_name text not null,
  created_at   timestamptz not null default now()
);

-- Öğrenci ayrıntıları: hangi veliye bağlı olduğu ve sınıfı (her zaman 8).
create table public.students (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  parent_id  uuid not null references public.profiles (id) on delete cascade,
  grade      smallint not null default 8 check (grade = 8)
);

create index students_parent_id_idx on public.students (parent_id);

-- Gönüllü ayrıntıları: üniversite ve öğrenci belgesinin doğrulanıp doğrulanmadığı.
create table public.tutors (
  profile_id          uuid primary key references public.profiles (id) on delete cascade,
  university          text not null,
  student_id_verified boolean not null default false
);

-- 8. sınıf Matematik üniteleri, müfredat sırasıyla.
create table public.topics (
  id         smallint generated always as identity primary key,
  title      text not null unique,
  sort_order smallint not null unique
);

insert into public.topics (title, sort_order) values
  ('Çarpanlar ve Katlar', 1),
  ('Üslü İfadeler', 2),
  ('Kareköklü İfadeler', 3),
  ('Veri Analizi', 4),
  ('Basit Olayların Olma Olasılığı', 5),
  ('Cebirsel İfadeler ve Özdeşlikler', 6),
  ('Doğrusal Denklemler', 7),
  ('Eşitsizlikler', 8),
  ('Üçgenler', 9),
  ('Eşlik ve Benzerlik', 10),
  ('Dönüşüm Geometrisi', 11),
  ('Geometrik Cisimler', 12);

-- Satır düzeyinde güvenlik ------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.tutors   enable row level security;
alter table public.topics   enable row level security;

-- Supabase varsayılan olarak anon/authenticated rollerine tüm yetkileri verir.
-- Önce hepsini geri alıp yalnızca gerekenleri açıyoruz. Ekleme ve silme sunucu
-- tarafında (service_role) yapılır; istemciye hiç açılmaz.
revoke all on public.profiles, public.students, public.tutors, public.topics from anon, authenticated;

grant select on public.profiles, public.students, public.tutors, public.topics to authenticated;
-- Rol, durum ve student_id_verified istemciden değiştirilemez: yalnızca bu sütunlar güncellenebilir.
grant update (display_name) on public.profiles to authenticated;
grant update (university)   on public.tutors   to authenticated;

-- Oturumdaki kullanıcının rolü (yalnızca hesabı aktifse; değilse null). Politikalar bunu kullanır.
-- security definer: profiles politikası içinden profiles'ı okurken sonsuz özyinelemeyi önler.
-- API'ye açık olmayan ayrı bir şemada durur.
create schema if not exists private;

create function private.active_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = (select auth.uid()) and p.status = 'aktif'
$$;

revoke all on function private.active_role() from public;
grant usage on schema private to authenticated;
grant execute on function private.active_role() to authenticated;

-- profiles: kullanıcı kendi profilini her durumda okur (uygulama durumunu buradan öğrenir).
-- Aktif veli çocuklarının profilini okur; yalnızca aktif kullanıcı kendi profilini günceller.
create policy "profiles: kendi profilini oku" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: veli çocuklarını okur" on public.profiles
  for select to authenticated
  using ((select private.active_role()) = 'veli' and exists (
    select 1 from public.students s
    where s.profile_id = profiles.id and s.parent_id = (select auth.uid())
  ));

create policy "profiles: kendi profilini güncelle" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and (select private.active_role()) is not null)
  with check (id = (select auth.uid()));

-- students: aktif öğrenci kendi kaydını, aktif veli kendi çocuklarının kaydını okur.
create policy "students: kendi kaydı veya velisi okur" on public.students
  for select to authenticated
  using (
    ((select private.active_role()) = 'ogrenci' and profile_id = (select auth.uid()))
    or ((select private.active_role()) = 'veli' and parent_id = (select auth.uid()))
  );

-- tutors: gönüllü kendi kaydını her durumda okur (başvuru incelenirken de); aktifse üniversitesini günceller.
create policy "tutors: kendi kaydını oku" on public.tutors
  for select to authenticated
  using (profile_id = (select auth.uid()));

create policy "tutors: kendi kaydını güncelle" on public.tutors
  for update to authenticated
  using (profile_id = (select auth.uid()) and (select private.active_role()) = 'gonullu')
  with check (profile_id = (select auth.uid()));

-- topics: aktif hesabı olan herkes okur; istemciden değiştirilemez.
create policy "topics: aktif kullanıcılar okur" on public.topics
  for select to authenticated
  using ((select private.active_role()) is not null);
