-- Yalnızca yerel geliştirme için test verisi (supabase db reset). Tüm şifreler: test1234
-- 1 veli, o velinin 1 öğrencisi, 1 gönüllü.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
  extensions.crypt('test1234', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'veli@example.com'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'elif@ogrenci.ornek.test'),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'gonullu@example.com')
) as u (id, email);

-- E-posta ile giriş için her kullanıcının bir kimlik kaydı olmalı.
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users u
where u.id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

insert into public.profiles (id, role, display_name) values
  ('11111111-1111-1111-1111-111111111111', 'parent',  'Ayşe Yılmaz'),
  ('22222222-2222-2222-2222-222222222222', 'student', 'Elif Yılmaz'),
  ('33333333-3333-3333-3333-333333333333', 'tutor',   'Mehmet Demir');

insert into public.students (profile_id, parent_id) values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111');

insert into public.tutors (profile_id, university) values
  ('33333333-3333-3333-3333-333333333333', 'Orta Doğu Teknik Üniversitesi');
