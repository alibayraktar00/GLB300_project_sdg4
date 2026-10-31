-- =====================================================================
-- 19 · UYGULAMA İÇİ BİLDİRİMLER (notifications satırlarını üreten tetikleyiciler)
--   Başlık ve metin GENEL ve kişisel veri içermez (ad, soru metni, bağlantı yok); ayrıntı için uygulamaya girilir.
--   Satır yalnızca bu tetikleyicilerle (SECURITY DEFINER) eklenir; kullanıcı yalnızca okur ve okundu işaretler.
--   data.path: bildirime tıklayınca gidilecek uygulama içi yol (yalnızca '/' ile başlayan sabit yollar).
-- =====================================================================

create or replace function private.notify(p_user_id uuid, p_type text, p_title text, p_path text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, type, title, data)
  select p.id, p_type, p_title, jsonb_build_object('path', p_path)
  from public.profiles p
  where p.id = p_user_id and p.status = 'aktif';
$$;
revoke all on function private.notify(uuid, text, text, text) from public, anon, authenticated;

-- Çocuğun velilerine
create or replace function private.notify_guardians(p_student_id uuid, p_type text, p_title text, p_path text)
returns void
language sql
security definer
set search_path = ''
as $$
  select private.notify(g.guardian_id, p_type, p_title, p_path)
  from public.guardian_students g
  where g.student_id = p_student_id;
$$;
revoke all on function private.notify_guardians(uuid, text, text, text) from public, anon, authenticated;

-- Eşleşme önerildi -> veli
create or replace function private.notify_match_proposed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'onerildi' and new.student_id is not null then
    perform private.notify_guardians(new.student_id, 'eslesme_onerildi', 'Çocuğun için bir gönüllü önerildi', '/veli/dersler');
  end if;
  return new;
end;
$$;
create trigger matches_bildirim_onerildi after insert on public.matches
  for each row execute function private.notify_match_proposed();

-- Veli eşleşmeyi onayladı -> gönüllü
create or replace function private.notify_match_decided()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'onerildi' and new.status = 'aktif' and new.volunteer_id is not null then
    perform private.notify(new.volunteer_id, 'eslesme_onaylandi', 'Yeni bir öğrenciyle eşleştin', '/gonullu/ogrenciler');
  end if;
  return new;
end;
$$;
create trigger matches_bildirim_karar after update of status on public.matches
  for each row execute function private.notify_match_decided();

-- Cevap -> öğrenci ve veliler; takip sorusu -> atanmış gönüllü
create or replace function private.notify_question_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_q public.questions%rowtype;
begin
  select * into v_q from public.questions q where q.id = new.question_id;
  if not found then
    return new;
  end if;
  if new.kind = 'cevap' then
    perform private.notify(v_q.student_id, 'yeni_cevap', 'Sorun cevaplandı', '/ogrenci/sorular/' || v_q.id);
    perform private.notify_guardians(v_q.student_id, 'yeni_cevap', 'Çocuğunun sorusu cevaplandı', '/veli/sorular/' || v_q.id);
  elsif new.kind = 'takip' and v_q.assigned_volunteer_id is not null then
    perform private.notify(v_q.assigned_volunteer_id, 'yeni_takip', 'Bir öğrenci takip sorusu sordu', '/gonullu/sorular/' || v_q.id);
  end if;
  return new;
end;
$$;
create trigger question_messages_bildirim after insert on public.question_messages
  for each row execute function private.notify_question_message();

-- Soru üstlenildi -> öğrenci
create or replace function private.notify_question_claimed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'atandi' and old.status is distinct from 'atandi' and new.assigned_volunteer_id is not null then
    perform private.notify(new.student_id, 'soru_ustlenildi', 'Sorunu bir gönüllü üstlendi', '/ogrenci/sorular/' || new.id);
  end if;
  return new;
end;
$$;
create trigger questions_bildirim_ustlenildi after update of status on public.questions
  for each row execute function private.notify_question_claimed();

-- Ders planlandı / iptal edildi -> öğrenci ve veliler (iptalde gönüllü de)
create or replace function private.notify_session_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid;
begin
  select m.student_id into v_student from public.matches m where m.id = new.match_id;
  if v_student is not null then
    perform private.notify(v_student, 'ders_planlandi', 'Yeni bir ders planlandı', '/ogrenci/dersler');
    perform private.notify_guardians(v_student, 'ders_planlandi', 'Çocuğun için yeni bir ders planlandı', '/veli/dersler');
  end if;
  return new;
end;
$$;
create trigger sessions_bildirim_olustu after insert on public.sessions
  for each row execute function private.notify_session_created();

create or replace function private.notify_session_cancelled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_match public.matches%rowtype;
begin
  if new.status = 'iptal' and old.status is distinct from 'iptal' then
    select * into v_match from public.matches m where m.id = new.match_id;
    if found then
      if v_match.student_id is not null then
        perform private.notify(v_match.student_id, 'ders_iptal', 'Bir ders iptal edildi', '/ogrenci/dersler');
        perform private.notify_guardians(v_match.student_id, 'ders_iptal', 'Çocuğunun bir dersi iptal edildi', '/veli/dersler');
      end if;
      if v_match.volunteer_id is not null then
        perform private.notify(v_match.volunteer_id, 'ders_iptal', 'Bir ders iptal edildi', '/gonullu/dersler');
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger sessions_bildirim_iptal after update of status on public.sessions
  for each row execute function private.notify_session_cancelled();

-- Başvuru karara bağlandı -> gönüllü
create or replace function private.notify_volunteer_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and new.status in ('onayli', 'reddedildi') then
    perform private.notify(new.profile_id, 'basvuru_karari',
      case when new.status = 'onayli' then 'Başvurun onaylandı' else 'Başvurun sonuçlandı' end, '/gonullu/pano');
  end if;
  return new;
end;
$$;
create trigger volunteers_bildirim_karar after update of status on public.volunteers
  for each row execute function private.notify_volunteer_decision();
