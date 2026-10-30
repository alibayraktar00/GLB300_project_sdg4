-- =====================================================================
-- 10 · SORU-CEVAP İŞLEVLERİ (proje raporu: "Photo Question Support")
--   ask_question   : öğrenci soru sorar (metin + en çok 3 JPEG fotoğraf); eşleşmiş gönüllüye atanır, yoksa havuza düşer
--   post_message   : öğrenci takip sorusu ya da atanmış gönüllü cevap yazar
--   claim_question : onaylı gönüllü havuzdaki soruyu üstlenir
--   close_question : öğrenci "anlaşıldı" der
--
-- İlkeler: SECURITY DEFINER + search_path = ''; kimlik auth.uid()'den alınır; mesaj metni mask_contact_info
-- tetikleyicisinden (09) geçer; kapalı özellik (qa_enabled) ve engel tetikleyicileri (05) yine çalışır.
-- Fotoğraf yolu: {öğrenci_id}/{soru_id}/{dosya_id}.jpg (Storage politikasıyla aynı). Yükleme soru
-- oluşmadan ÖNCE yapıldığı için soru kimliğini istemci üretir.
-- Hata kodları ileti başında sabit önektir (istemci eşler); yetki hatası SQLSTATE 42501.
-- =====================================================================

-- Ortak: eklenecek fotoğrafları doğrular ve attachments satırlarını açar. Yalnızca bu dosyadaki işlevler çağırır.
create or replace function private.attach_photos(p_message_id uuid, p_student_id uuid, p_question_id uuid, p_owner uuid, p_paths text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
  v_size integer;
begin
  if p_paths is null or cardinality(p_paths) = 0 then
    return;
  end if;
  foreach v_path in array p_paths loop
    -- Yol: tam olarak {öğrenci}/{soru}/{dosya}.jpg (başka bir öğrencinin / sorunun dosyası bağlanamaz)
    if v_path is null
       or v_path !~ ('^' || p_student_id::text || '/' || p_question_id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$') then
      raise exception 'EK_GECERSIZ: ek yolu bu soruya ait değil' using errcode = '22023';
    end if;
    -- Dosya gerçekten yüklenmiş ve çağıran tarafından yüklenmiş olmalı (yetim / başkasının dosyası bağlanamaz)
    select nullif(o.metadata ->> 'size', '')::integer into v_size
    from storage.objects o
    where o.bucket_id = 'soru-ekleri' and o.name = v_path and o.owner_id = p_owner::text;
    if not found then
      raise exception 'EK_YOK: dosya yüklenmemiş ya da size ait değil' using errcode = '22023';
    end if;
    insert into public.attachments (message_id, storage_path, kind, mime, size_bytes)
    values (p_message_id, v_path, 'foto', 'image/jpeg', coalesce(v_size, 1));
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- ask_question
-- ---------------------------------------------------------------------
create or replace function public.ask_question(
  p_question_id    uuid,
  p_subject_code   text,
  p_body           text,
  p_attachment_paths text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_body      text := btrim(coalesce(p_body, ''));
  v_grade     smallint;
  v_subject   smallint;
  v_volunteer uuid;
  v_message   uuid;
begin
  if v_uid is null or (select private.active_role()) is distinct from 'ogrenci' then
    raise exception 'ask_question: yalnızca aktif öğrenci soru sorabilir' using errcode = '42501';
  end if;
  if p_question_id is null then
    raise exception 'SORU_KIMLIK: soru kimliği gerekli' using errcode = '22023';
  end if;
  if char_length(v_body) > 4000 then
    raise exception 'METIN_UZUN: soru en çok 4000 karakter olabilir' using errcode = '22023';
  end if;
  if p_attachment_paths is not null and cardinality(p_attachment_paths) > 3 then
    raise exception 'EK_COK: en çok 3 fotoğraf eklenebilir' using errcode = '22023';
  end if;
  if v_body = '' and (p_attachment_paths is null or cardinality(p_attachment_paths) = 0) then
    raise exception 'SORU_BOS: soru metni ya da fotoğrafı gerekli' using errcode = '22023';
  end if;
  if exists (select 1 from public.questions q where q.id = p_question_id) then
    raise exception 'SORU_VAR: bu kimlikle bir soru zaten var' using errcode = '22023';
  end if;

  -- Eşzamanlı çift gönderimde günlük sınırın aşılmaması için öğrenci başına kilit
  perform pg_advisory_xact_lock(hashtextextended('soru:' || v_uid::text, 0));
  if (select count(*) from public.questions q where q.student_id = v_uid and q.created_at > now() - interval '24 hours') >= 20 then
    raise exception 'GUNLUK_SINIR: 24 saatte en çok 20 soru sorulabilir' using errcode = '22023';
  end if;

  select s.id into v_subject from public.subjects s where s.code = p_subject_code;
  if v_subject is null then
    raise exception 'DERS_GECERSIZ: bilinmeyen ders kodu' using errcode = '22023';
  end if;
  select st.grade into v_grade from public.students st where st.profile_id = v_uid;

  -- Süreklilik: o derste ÖĞRENCİYLE aktif eşleşmesi olan, onaylı ve engellenmemiş gönüllü varsa ona atanır
  select m.volunteer_id into v_volunteer
  from public.matches m
  join public.volunteers v on v.profile_id = m.volunteer_id and v.status = 'onayli'
  where m.student_id = v_uid and m.subject_id = v_subject and m.status = 'aktif'
    and not (select private.is_blocked(v_uid, m.volunteer_id))
  order by m.started_at desc nulls last
  limit 1;

  insert into public.questions (id, student_id, subject_id, grade, status, assigned_volunteer_id, assigned_at)
  values (p_question_id, v_uid, v_subject, v_grade,
          case when v_volunteer is null then 'havuzda' else 'atandi' end,
          v_volunteer,
          case when v_volunteer is null then null else now() end);

  insert into public.question_messages (question_id, sender_id, kind, body)
  values (p_question_id, v_uid, 'soru', v_body)
  returning id into v_message;

  perform private.attach_photos(v_message, v_uid, p_question_id, v_uid, p_attachment_paths);
  return p_question_id;
end;
$$;

-- ---------------------------------------------------------------------
-- post_message: öğrenci (takip) ya da atanmış gönüllü (cevap)
-- ---------------------------------------------------------------------
create or replace function public.post_message(
  p_question_id uuid,
  p_body        text,
  p_attachment_paths text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := (select auth.uid());
  v_body    text := btrim(coalesce(p_body, ''));
  v_q       public.questions%rowtype;
  v_kind    text;
  v_message uuid;
begin
  if v_uid is null then
    raise exception 'post_message: oturum gerekli' using errcode = '42501';
  end if;
  if char_length(v_body) > 4000 then
    raise exception 'METIN_UZUN: mesaj en çok 4000 karakter olabilir' using errcode = '22023';
  end if;
  if p_attachment_paths is not null and cardinality(p_attachment_paths) > 3 then
    raise exception 'EK_COK: en çok 3 fotoğraf eklenebilir' using errcode = '22023';
  end if;
  if v_body = '' and (p_attachment_paths is null or cardinality(p_attachment_paths) = 0) then
    raise exception 'MESAJ_BOS: mesaj metni ya da fotoğrafı gerekli' using errcode = '22023';
  end if;

  select * into v_q from public.questions q where q.id = p_question_id for update;
  if not found then
    raise exception 'SORU_YOK: soru bulunamadı' using errcode = '42501';
  end if;
  if v_q.status = 'kapandi' then
    raise exception 'SORU_KAPALI: kapanmış soruya mesaj yazılamaz' using errcode = '22023';
  end if;

  if v_uid = v_q.student_id and (select private.active_role()) = 'ogrenci' then
    v_kind := 'takip';
  elsif (select private.can_answer_question(p_question_id)) then
    v_kind := 'cevap';
  else
    -- Başkasının sorusu ya da yetkisiz: varlığını da sızdırma
    raise exception 'SORU_YOK: soru bulunamadı' using errcode = '42501';
  end if;

  insert into public.question_messages (question_id, sender_id, kind, body)
  values (p_question_id, v_uid, v_kind, v_body)
  returning id into v_message;

  perform private.attach_photos(v_message, v_q.student_id, p_question_id, v_uid, p_attachment_paths);

  if v_kind = 'cevap' then
    update public.questions
       set status = 'cevaplandi', first_answered_at = coalesce(first_answered_at, now())
     where id = p_question_id;
  elsif v_q.status = 'cevaplandi' then
    -- Öğrencinin takip sorusu cevap bekler: aynı gönüllüye geri döner
    update public.questions set status = 'atandi', assigned_at = now() where id = p_question_id;
  end if;
  return v_message;
end;
$$;

-- ---------------------------------------------------------------------
-- claim_question: onaylı gönüllü, havuzdaki soruyu (verdiği ders ve sınıf için) üstlenir. Tek kazanan.
-- ---------------------------------------------------------------------
create or replace function public.claim_question(p_question_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_claimed uuid;
begin
  if v_uid is null or not (select private.is_approved_volunteer()) then
    raise exception 'claim_question: yalnızca onaylı gönüllü üstlenebilir' using errcode = '42501';
  end if;

  update public.questions q
     set status = 'atandi', assigned_volunteer_id = v_uid, assigned_at = now()
   where q.id = p_question_id
     and q.status = 'havuzda'
     and exists (select 1 from public.volunteer_subjects vs
                 where vs.volunteer_id = v_uid and vs.subject_id = q.subject_id and vs.grade = q.grade)
     and not (select private.is_blocked(q.student_id, v_uid))
     and exists (select 1 from public.profiles sp where sp.id = q.student_id and sp.status = 'aktif')
  returning q.id into v_claimed;

  if v_claimed is null then
    raise exception 'HAVUZ_YOK: soru havuzda değil, başkası üstlendi ya da bu soruyu üstlenemezsiniz' using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- close_question: öğrenci "anlaşıldı" der
-- ---------------------------------------------------------------------
create or replace function public.close_question(p_question_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_closed uuid;
begin
  if v_uid is null or (select private.active_role()) is distinct from 'ogrenci' then
    raise exception 'close_question: yalnızca aktif öğrenci' using errcode = '42501';
  end if;
  update public.questions q set status = 'kapandi'
   where q.id = p_question_id and q.student_id = v_uid and q.status <> 'kapandi'
  returning q.id into v_closed;
  if v_closed is null then
    raise exception 'SORU_YOK: soru bulunamadı ya da zaten kapalı' using errcode = '22023';
  end if;
end;
$$;

revoke all on function private.attach_photos(uuid, uuid, uuid, uuid, text[]) from public, anon, authenticated, service_role;
revoke all on function public.ask_question(uuid, text, text, text[]) from public, anon, authenticated, service_role;
revoke all on function public.post_message(uuid, text, text[]) from public, anon, authenticated, service_role;
revoke all on function public.claim_question(uuid) from public, anon, authenticated, service_role;
revoke all on function public.close_question(uuid) from public, anon, authenticated, service_role;
grant execute on function public.ask_question(uuid, text, text, text[]) to authenticated;
grant execute on function public.post_message(uuid, text, text[]) to authenticated;
grant execute on function public.claim_question(uuid) to authenticated;
grant execute on function public.close_question(uuid) to authenticated;

comment on function public.ask_question(uuid, text, text, text[]) is
  'Aktif öğrenci soru sorar (metin + en çok 3 JPEG). O derste aktif, onaylı, engellenmemiş eşleşmiş gönüllüye atanır; yoksa havuza düşer. 24 saatte en çok 20 soru.';
comment on function public.post_message(uuid, text, text[]) is
  'Öğrenci takip sorusu (cevaplanmış soru tekrar cevap bekler) ya da atanmış gönüllü cevap yazar (soru cevaplandı olur). Metin iletişim bilgisi filtresinden geçer.';
comment on function public.claim_question(uuid) is
  'Onaylı gönüllü, verdiği ders ve sınıftaki havuz sorusunu üstlenir. Tek kazanan; engellenen gönüllü üstlenemez.';
comment on function public.close_question(uuid) is
  'Öğrenci sorusunu "anlaşıldı" diyerek kapatır.';
