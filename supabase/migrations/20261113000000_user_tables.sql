-- Kullanıcı tabloları: yalnızca 8. sınıf Matematik; roller: veli (parent), öğrenci (student), gönüllü (tutor).

-- Her giriş yapan kullanıcı için bir profil. Rol, kayıt sırasında sunucu tarafında belirlenir.
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  role         text not null check (role in ('parent', 'student', 'tutor')),
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
-- Rol ve student_id_verified istemciden değiştirilemez: yalnızca bu sütunlar güncellenebilir.
grant update (display_name) on public.profiles to authenticated;
grant update (university)   on public.tutors   to authenticated;

-- profiles: kullanıcı kendi profilini okur ve günceller; veli kendi çocuklarının profilini okur.
create policy "profiles: kendi profilini oku" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: veli çocuklarını okur" on public.profiles
  for select to authenticated
  using (exists (
    select 1 from public.students s
    where s.profile_id = profiles.id and s.parent_id = (select auth.uid())
  ));

create policy "profiles: kendi profilini güncelle" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- students: öğrenci kendi kaydını, veli kendi çocuklarının kaydını okur.
create policy "students: kendi kaydı veya velisi okur" on public.students
  for select to authenticated
  using (profile_id = (select auth.uid()) or parent_id = (select auth.uid()));

-- tutors: gönüllü kendi kaydını okur ve üniversitesini güncelleyebilir.
create policy "tutors: kendi kaydını oku" on public.tutors
  for select to authenticated
  using (profile_id = (select auth.uid()));

create policy "tutors: kendi kaydını güncelle" on public.tutors
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

-- topics: giriş yapmış herkes okur; istemciden değiştirilemez.
create policy "topics: giriş yapanlar okur" on public.topics
  for select to authenticated
  using (true);
