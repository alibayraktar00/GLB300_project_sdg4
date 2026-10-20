-- =====================================================================
-- 05 · YARDIMCI FONKSİYONLAR VE TETİKLEYİCİLER
--
-- A) RLS yardımcıları (private şeması): is_admin, is_guardian_of,
--    is_matched_volunteer, can_access_question + küçük yardımcılar.
--    Hepsi SECURITY DEFINER + STABLE + set search_path = '' (plan 5.3, 9.1).
--    Neden SECURITY DEFINER? Politikalar çağıran kullanıcının yetkisiyle
--    çalışır; yardımcı fonksiyon ise başka tabloya (ör. matches, profiles)
--    o tablonun RLS'sine takılmadan bakabilsin diye tablo sahibi yetkisiyle
--    çalışır. Karşılığında: fonksiyon yalnızca "çağıran (auth.uid()) için
--    doğru mu?" sorusunu yanıtlar, hiçbir veri döndürmez, search_path
--    boş olduğundan her nesne şema adıyla yazılır.
-- B) Kimlik ve rol koruması: handle_new_user, rol/durum koruma tetikleyicileri.
-- C) Bütünlük tetikleyicileri, denetim kaydı (audit_log) yazıcısı.
--
-- GÜVENLİK NOTU: Yetki kararlarında ASLA auth.jwt() -> 'user_metadata'
-- kullanılmaz (istemci kendi user_metadata'sını değiştirebilir).
-- Tek güvenilir kaynaklar: profiles tablosu ve JWT'deki 'aal' bilgisi.
-- =====================================================================

-- =====================================================================
-- A) RLS YARDIMCILARI
-- =====================================================================

-- Çağıranın rolü; yalnızca hesap AKTİF ise. Askıdaki / bekleyen kullanıcı NULL alır,
-- dolayısıyla başkasının verisine erişemez ("önce askıya al, sonra incele").
create or replace function private.active_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = (select auth.uid())
    and p.status = 'aktif';
$$;

-- Yönetici: rol 'yonetici' + hesap aktif + oturum MFA ile doğrulanmış (aal2) + SON 12 SAATTE TOTP doğrulaması.
-- "amr" JWT iddiası kimlik doğrulama yöntemlerinin dizisidir: [{"method":"totp","timestamp":<saniye>}, ...].
-- aal2 tek başına yetmez: eski bir oturum (örn. çalınmış cihaz) 12 saat sonra yönetici yetkisini yitirir
-- ve yeniden TOTP doğrulaması (mfa.challengeAndVerify) ister. Biçimi bozuk amr (dizi değil, sayı olmayan
-- zaman damgası...) HATA vermez, yönetici saymaz.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt()) ->> 'aal', '') = 'aal2'
     and exists (
       select 1
       from jsonb_array_elements(
              case when jsonb_typeof((select auth.jwt()) -> 'amr') = 'array'
                   then (select auth.jwt()) -> 'amr' else '[]'::jsonb end) a
       where jsonb_typeof(a) = 'object'
         and a ->> 'method' = 'totp'
         and case when (a ->> 'timestamp') ~ '^[0-9]{1,12}$' then (a ->> 'timestamp')::bigint else 0 end
             >= extract(epoch from now())::bigint - 43200
     )
     and exists (
       select 1
       from public.profiles p
       where p.id = (select auth.uid())
         and p.role = 'yonetici'
         and p.status = 'aktif'
     );
$$;

-- Çağıran, bu öğrencinin (aktif) velisi mi?
create or replace function private.is_guardian_of(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.guardian_students gs
    join public.profiles me on me.id = gs.guardian_id
    where gs.student_id = p_student_id
      and gs.guardian_id = (select auth.uid())
      and me.role = 'veli'
      and me.status = 'aktif'
  );
$$;

-- Çağıran onaylı ve aktif bir gönüllü mü?
create or replace function private.is_approved_volunteer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.volunteers v
    join public.profiles p on p.id = v.profile_id
    where v.profile_id = (select auth.uid())
      and v.status = 'onayli'
      and p.role = 'gonullu'
      and p.status = 'aktif'
  );
$$;

-- Bu (öğrenci, gönüllü) çifti için engelleme kaydı var mı? (volunteer_blocks)
-- Kullanıcıdan bağımsız bir olgu sorusudur; backend RPC'leri de (propose_match,
-- claim_question, ask_question...) atama yapmadan önce bunu çağırmalıdır.
create or replace function private.is_blocked(p_student_id uuid, p_volunteer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.volunteer_blocks b
    where b.student_id = p_student_id
      and b.volunteer_id = p_volunteer_id
  );
$$;

-- Çağıran gönüllü, bu öğrenci için ENGELLİ mi? RLS politikaları için: yalnızca ÇAĞIRANIN kendi durumunu söyler
-- (is_blocked parametreyle başkasının durumunu da sorabildiğinden istemciye AÇILMAZ).
create or replace function private.is_blocked_for_me(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.volunteer_blocks b
    where b.student_id = p_student_id
      and b.volunteer_id = (select auth.uid())
  );
$$;

-- Çağıranın bu öğrenciyle HÂLÂ veli bağı var mı? (guardian_students; hesap DURUMUNA bakılmaz.)
-- Çocuğa bağlı rıza kayıtlarını okuma / geri çekme için kullanılır (güvenlik yeniden denetimi N4):
--   * velilikten çıkarılan (bağı silinen) kişi eski rıza satırını artık göremez ve geri çekemez,
--   * ama bağı süren askıdaki veli rızasını geri çekebilir (rızayı geri çekmek, vermek kadar kolay olmalı).
-- Durumu aktif şartı arayan is_guardian_of'tan bu yönüyle ayrılır.
create or replace function private.has_guardian_link(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.guardian_students gs
    where gs.student_id = p_student_id
      and gs.guardian_id = (select auth.uid())
  );
$$;

-- ENGELLİ gönüllünün mesajı, çağırana GİZLENMELİ mi? (güvenlik yeniden denetimi N3)
-- Bir gönüllü engellenince onun mesajları, yönetici engeli İNCELEYENE KADAR (volunteer_blocks.reviewed_at boş)
-- yalnızca ilgili öğrenci, velisi ve yönetici tarafından görülür. Aksi halde soru havuza dönünce yeni üstlenen
-- gönüllü, çocuğu rahatsız etmiş kişinin yazdıklarını (iletişim bilgisi / yönlendirme dahil) okurdu.
-- Yönetici incelemesinden sonra olağan görünürlük kuralları geçerlidir; uygunsuz mesajı yönetici hidden_at ile gizler.
-- SECURITY DEFINER: çağıran gönüllü volunteer_blocks'u zaten göremez (RLS), bu yüzden kontrol burada yapılır.
create or replace function private.message_hidden_from_me(p_question_id uuid, p_sender_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_sender_id is not null
     and exists (
       select 1
       from public.volunteer_blocks b
       join public.questions q on q.id = p_question_id and q.student_id = b.student_id
       where b.volunteer_id = p_sender_id
         and b.reviewed_at is null
         and q.student_id is distinct from (select auth.uid())
         and not exists (select 1 from public.guardian_students gs
                         where gs.student_id = q.student_id and gs.guardian_id = (select auth.uid()))
         and not (select private.is_admin())
     );
$$;

-- message_hidden_from_me için ÖN SÜZGEÇ (performans): yönetici incelemesi bekleyen engelli gönüllülerin kimlikleri.
-- Politikada `sender_id in (select ... from embargoed_volunteers())` ucuz, bir kez hesaplanan (hash) bir kümedir; kesin
-- kontrol (message_hidden_from_me) yalnızca gönderen bu kümedeyse çalışır. Ön süzgeç olmadan 60.000 mesajlık filtresiz
-- taramada satır başına fonksiyon çağrısı ~2 sn sürüyordu, şimdi ~15 ms. Güvenlik kararını VERMEZ (kesin karar diğer
-- fonksiyondadır); `private` şemadadır, istemciye RPC olarak açılmaz. Yönetici zaten her şeyi gördüğü için boş küme alır.
create or replace function private.embargoed_volunteers()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select b.volunteer_id
  from public.volunteer_blocks b
  where b.reviewed_at is null
    and b.volunteer_id is not null
    and not (select private.is_admin());
$$;

-- Gönüllünün öğrenciye/veliye gösterilen kısa adı: "Ad S." = given_name + soyadın BAŞ HARFİ.
-- "Ayşe Nur" + "Kaya" -> "Ayşe Nur K."; çift soyad ("Yılmaz Kaya") -> yalnızca ilk soyadın baş harfi.
-- Türkçe baş harf (i -> İ, ı -> I, ş -> Ş...) veritabanı dil ayarından bağımsız çevrilir
-- (Postgres upper() yerel ayara bağlıdır ve i -> İ yapmayabilir). Soyad yoksa NULL.
create or replace function private.short_name(p_given_name text, p_family_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
           when nullif(btrim(coalesce(p_given_name, '')), '') is null
             or nullif(btrim(coalesce(p_family_name, '')), '') is null then null
           else btrim(p_given_name) || ' '
                || upper(translate(left(btrim(p_family_name), 1), 'çğıiöşü', 'ÇĞIİÖŞÜ')) || '.'
         end;
$$;

-- Çağıran, bu öğrenciyle AKTİF eşleşmesi olan onaylı gönüllü mü?
-- (veli_onayi / onerildi / bitti durumları erişim VERMEZ; engellenmiş çift de VERMEZ.)
create or replace function private.is_matched_volunteer(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.matches m
    join public.profiles sp on sp.id = m.student_id and sp.status = 'aktif'   -- askıdaki / beklemedeki çocuk gönüllüye kapalı
    where m.student_id = p_student_id
      and m.volunteer_id = (select auth.uid())
      and m.status = 'aktif'
  )
  and (select private.is_approved_volunteer())
  and not (select private.is_blocked(p_student_id, (select auth.uid())));
$$;

-- Çağıran bu soruyu görebilir mi?
--   * yönetici (aal2)
--   * sorunun sahibi aktif öğrenci
--   * öğrencinin velisi
--   * onaylı gönüllü ve: (a) soru ona atanmış (havuzda değilse), veya
--     (b) soru havuzda ve gönüllü o ders+sınıfı veriyor, veya
--     (c) o öğrenciyle o ders için aktif eşleşmesi var
create or replace function private.can_access_question(p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.questions q
    where q.id = p_question_id
      and (
        (select private.is_admin())
        or (q.student_id = (select auth.uid()) and (select private.active_role()) = 'ogrenci')
        or (select private.is_guardian_of(q.student_id))
        or (
          (select private.is_approved_volunteer())
          and not (select private.is_blocked(q.student_id, (select auth.uid())))
          and exists (select 1 from public.profiles sp where sp.id = q.student_id and sp.status = 'aktif')
          and (
            (q.assigned_volunteer_id = (select auth.uid()) and q.status <> 'havuzda')
            or (
              q.status = 'havuzda'
              and exists (
                select 1 from public.volunteer_subjects vs
                where vs.volunteer_id = (select auth.uid())
                  and vs.subject_id = q.subject_id
                  and vs.grade = q.grade
              )
            )
            or exists (
              select 1 from public.matches m
              where m.volunteer_id = (select auth.uid())
                and m.student_id = q.student_id
                and m.subject_id = q.subject_id
                and m.status = 'aktif'
            )
          )
        )
      )
  );
$$;

-- Çağıran bu soruyu CEVAPLAYABİLİR mi? (soru ona atanmış, onaylı gönüllü, soru açık, çift ENGELLİ DEĞİL,
-- çocuk hesabı aktif). Havuzdaki soruya önce claim_question RPC'si ile sahip çıkılmalıdır.
create or replace function private.can_answer_question(p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.questions q
    where q.id = p_question_id
      and q.assigned_volunteer_id = (select auth.uid())
      and q.status in ('atandi', 'cevaplandi')
      and not (select private.is_blocked(q.student_id, (select auth.uid())))
      and exists (select 1 from public.profiles sp where sp.id = q.student_id and sp.status = 'aktif')
  )
  and (select private.is_approved_volunteer());
$$;

-- Gönüllü başvurusu hâlâ düzenlenebilir aşamada mı? (onay/ret sonrası kilitlenir)
create or replace function private.volunteer_application_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.volunteers v
    join public.profiles p on p.id = v.profile_id
    where v.profile_id = (select auth.uid())
      and p.role = 'gonullu'
      and p.status = 'aktif'
      and v.status in ('basvuru', 'egitim', 'inceleme')
  );
$$;

-- Çağıran bu rıza türünü, bu çocuk (varsa) için verebilir mi?
--   * tür etkin ve hedef kitlesi çağıranın rolünü içeriyor
--   * tür çocuk-bazlıysa (student_scoped) student_id zorunlu
--   * student_id verilmişse: veli ise çocuğunun velisi, öğrenci ise kendisi olmalı
create or replace function private.consent_allowed(p_type text, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.consent_types ct
    join public.profiles p on p.id = (select auth.uid())
    where ct.code = p_type
      and ct.is_active
      and p.status = 'aktif'
      and p.role = any (ct.audiences)
      and (p_student_id is not null or not ct.student_scoped)
      and (
        p_student_id is null
        or (p.role = 'veli' and (select private.is_guardian_of(p_student_id)))
        or (p.role = 'ogrenci' and p_student_id = p.id)
      )
  );
$$;

-- Storage (soru-ekleri): bu yola dosya yükleyebilir mi?
--   yol biçimi: {student_id}/{question_id}/{uuid}.{jpg|m4a|aac|webm}
--   * öğrenci: yalnızca kendi klasörüne (soru, yükleme sırasında henüz
--     olmayabilir; ask_question RPC'si yolun doğruluğunu ayrıca doğrular)
--   * gönüllü: yalnızca kendisine atanmış, açık sorunun öğrenci klasörüne (cevap eki)
create or replace function private.can_upload_question_object(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role     text := (select private.active_role());
  v_student  uuid;
  v_question uuid;
begin
  if v_role is null
     or p_name !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|m4a|aac|webm)$'
  then
    return false;
  end if;

  v_student  := split_part(p_name, '/', 1)::uuid;
  v_question := split_part(p_name, '/', 2)::uuid;

  if v_role = 'ogrenci' then
    return v_student = (select auth.uid())
       and not exists (select 1 from public.questions q where q.id = v_question and q.student_id <> v_student);
  elsif v_role = 'gonullu' then
    return exists (select 1 from public.questions q where q.id = v_question and q.student_id = v_student)
       and (select private.can_answer_question(v_question));
  end if;
  return false;
end;
$$;

-- Storage (gonullu-belgeleri): {volunteer_id}/{uuid}.{pdf|jpg}; yalnızca kendi klasörüne,
-- başvuru düzenlenebilir aşamadayken.
create or replace function private.can_upload_volunteer_document(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg)$'
     and split_part(p_name, '/', 1) = (select auth.uid())::text
     and (select private.volunteer_application_open());
$$;

-- =====================================================================
-- B) KİMLİK VE ROL KORUMASI
-- =====================================================================

-- Gönüllü e-postası: yalnızca üniversite alan adı (*.edu.tr).
-- Düzenli ifade tek yerde dursun diye küçük bir fonksiyon.
create or replace function private.is_edu_tr_email(p_email text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(btrim(coalesce(p_email, ''))) ~ '^[^@[:space:]]+@([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+edu\.tr$';
$$;

-- ---------------------------------------------------------------------
-- handle_new_user: auth.users INSERT -> profiles satırı
--
-- Rol kaynağı iki yerden gelebilir:
--  1) raw_user_meta_data.role  -> istemci signUp(data: {...}) ile gönderir; GÜVENİLMEZ.
--     Yalnızca 'veli' ve 'gonullu' kabul edilir.
--  2) raw_app_meta_data.role   -> yalnızca servis anahtarıyla (Edge Function:
--     auth.admin.createUser) yazılabilir; istemci yazamaz. 'ogrenci' yalnızca buradan alınır.
-- 'yonetici' hiçbir metadata ile verilemez; yalnızca SQL ile: select private.grant_admin('...').
-- Kural ihlalinde kayıt TAMAMEN reddedilir (sessizce veli yapılmaz).
-- ---------------------------------------------------------------------
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trusted_role text := nullif(btrim(new.raw_app_meta_data ->> 'role'), '');
  v_self_role    text := nullif(btrim(new.raw_user_meta_data ->> 'role'), '');
  v_role         text;
  v_name         text;
  v_email        text := lower(btrim(coalesce(new.email, '')));
begin
  if v_trusted_role is not null then
    v_role := v_trusted_role;
    if v_role not in ('ogrenci', 'veli', 'gonullu') then
      raise exception 'handle_new_user: app_metadata ile bu rol verilemez (%)', v_role
        using errcode = '42501';
    end if;
  else
    v_role := v_self_role;
    if v_role is null or v_role not in ('veli', 'gonullu') then
      raise exception 'handle_new_user: kendi kendine kayıtta yalnızca veli ve gonullu rolleri alınabilir'
        using errcode = '42501';
    end if;
  end if;

  if v_role in ('veli', 'gonullu')
     and v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'handle_new_user: geçerli bir e-posta adresi gerekli'
      using errcode = '23514';
  end if;

  if v_role = 'gonullu' and not private.is_edu_tr_email(v_email) then
    raise exception 'handle_new_user: gönüllü e-postası .edu.tr ile bitmelidir'
      using errcode = '23514';
  end if;

  v_name := btrim(left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 40));
  if v_name = '' or v_name ~ '@' then
    v_name := case v_role
                when 'veli'    then 'Veli'
                when 'gonullu' then 'Gönüllü'
                else 'Öğrenci'
              end;
  end if;

  insert into public.profiles (id, role, display_name, status)
  values (new.id, v_role, v_name, 'aktif');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Gönüllü, kayıttan sonra e-postasını .edu.tr dışına çeviremesin.
create or replace function private.enforce_volunteer_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email
     and exists (select 1 from public.profiles p where p.id = new.id and p.role = 'gonullu')
     and not private.is_edu_tr_email(new.email) then
    raise exception 'Gönüllü e-postası .edu.tr ile bitmelidir'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  before update of email on auth.users
  for each row execute function private.enforce_volunteer_email();

-- ---------------------------------------------------------------------
-- profiles.role / status koruması (ikinci savunma hattı)
-- Birinci hat: sütun yetkileri (istemcide yalnızca display_name güncellenebilir).
-- İkinci hat: bu tetikleyici; ileride biri yanlışlıkla GRANT verse bile
-- istemci rolleri (authenticated/anon) role ve status'ü değiştiremez.
--   role   : YALNIZCA private.grant_admin / revoke_admin değiştirebilir: bu fonksiyonlar işlem içinde
--            "app.rol_degisikligi_hedef" bayrağını (yalnızca o kullanıcı için, işlem-yerel) kurar. Serbest
--            "update profiles set role = ..." SQL oturumunda bile reddedilir; böylece doğrulanmış e-posta,
--            doğrulanmış MFA faktörü ve aktif hesap kontrolleri atlanamaz.
--   status : SQL + servis rolü (Edge Function) + SECURITY DEFINER RPC'ler
-- (SECURITY DEFINER RPC'lerde current_user = fonksiyon sahibi = postgres.)
-- ---------------------------------------------------------------------
create or replace function private.protect_profile_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'profiles.id değiştirilemez' using errcode = '42501';
  end if;
  if new.role is distinct from old.role
     and (current_user not in ('postgres', 'supabase_admin')
          or current_setting('app.rol_degisikligi_hedef', true) is distinct from new.id::text) then
    raise exception 'profiles.role yalnızca private.grant_admin / revoke_admin ile değiştirilebilir' using errcode = '42501';
  end if;
  if new.status is distinct from old.status
     and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'profiles.status istemciden değiştirilemez' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_koru
  before update on public.profiles
  for each row execute function private.protect_profile_columns();

-- students: sınıfı yalnızca veli (veya sistem) değiştirebilir; kullanıcı adı değişmez.
create or replace function private.protect_student_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.profile_id is distinct from old.profile_id then
    raise exception 'students.profile_id değiştirilemez' using errcode = '42501';
  end if;
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if new.username is distinct from old.username then
    raise exception 'students.username istemciden değiştirilemez' using errcode = '42501';
  end if;
  if new.grade is distinct from old.grade and not (select private.is_guardian_of(new.profile_id)) then
    raise exception 'Sınıfı yalnızca veli değiştirebilir' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger students_koru
  before update on public.students
  for each row execute function private.protect_student_columns();

-- volunteers: onay alanları istemciden değiştirilemez.
create or replace function private.protect_volunteer_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  -- Onay/ret/askı sonrası profil alanları kilitli (RLS politikası + bu tetikleyici)
  if old.status not in ('basvuru', 'egitim', 'inceleme')
     and (new.given_name is distinct from old.given_name
          or new.family_name is distinct from old.family_name
          or new.university is distinct from old.university
          or new.department is distinct from old.department
          or new.class_year is distinct from old.class_year) then
    raise exception 'Onaylanmış / sonuçlanmış gönüllü profili değiştirilemez' using errcode = '42501';
  end if;
  if new.profile_id is distinct from old.profile_id
     or new.status is distinct from old.status
     or new.training_passed_at is distinct from old.training_passed_at
     or new.approved_by is distinct from old.approved_by
     or new.approved_at is distinct from old.approved_at
     or new.reject_reason is distinct from old.reject_reason
     or new.decided_at is distinct from old.decided_at
     or new.left_at is distinct from old.left_at
     or new.max_students is distinct from old.max_students then
    raise exception 'Gönüllü durum/onay alanları istemciden değiştirilemez' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger volunteers_koru
  before update on public.volunteers
  for each row execute function private.protect_volunteer_columns();

-- Satırın bağlı olduğu profilin rolü beklenen rol olmalı
-- (ör. students.profile_id -> 'ogrenci'). Kullanım: tg_argv[0] = sütun, tg_argv[1] = rol.
create or replace function private.assert_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id   uuid := (to_jsonb(new) ->> tg_argv[0])::uuid;
  v_role text;
begin
  select p.role into v_role from public.profiles p where p.id = v_id;
  if v_role is distinct from tg_argv[1] then
    raise exception '%.%: profil rolü % olmalı (bulunan: %)',
      tg_table_name, tg_argv[0], tg_argv[1], coalesce(v_role, 'yok')
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger students_rol_kontrol
  before insert on public.students
  for each row execute function private.assert_profile_role('profile_id', 'ogrenci');
create trigger guardian_students_rol_kontrol
  before insert or update of guardian_id on public.guardian_students
  for each row execute function private.assert_profile_role('guardian_id', 'veli');
create trigger volunteers_rol_kontrol
  before insert on public.volunteers
  for each row execute function private.assert_profile_role('profile_id', 'gonullu');

-- Bir çocuğa en çok iki veli bağlanabilir.
create or replace function private.limit_guardians()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Aynı çocuğa eşzamanlı eklemeler sırayla işlensin.
  perform 1 from public.students s where s.profile_id = new.student_id for update;
  if (select count(*) from public.guardian_students g where g.student_id = new.student_id) >= 2 then
    raise exception 'Bir öğrenciye en çok iki veli bağlanabilir' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger guardian_students_en_cok_iki
  before insert on public.guardian_students
  for each row execute function private.limit_guardians();

-- Gönüllü belge sayısı sınırı (depolama kötüye kullanımına karşı).
create or replace function private.limit_volunteer_documents()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Aynı gönüllünün eşzamanlı eklemeleri sırayla işlensin (limit_guardians ile aynı kalıp);
  -- aksi halde iki istek de sayımı 4 görüp 6. belgeyi ekleyebilirdi.
  perform 1 from public.volunteers v where v.profile_id = new.volunteer_id for update;
  if (select count(*) from public.volunteer_documents d
      where d.volunteer_id = new.volunteer_id and d.purged_at is null) >= 5 then
    raise exception 'En çok 5 belge yüklenebilir' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger volunteer_documents_en_cok_bes
  before insert on public.volunteer_documents
  for each row execute function private.limit_volunteer_documents();

-- Rıza eklenirken: belge sürümü legal_documents'ta YAYIMLANMIŞ olmalı ve metnin
-- özet değeri (sha256) sunucu tarafından satıra kopyalanır; istemci bu alanı yazamaz.
create or replace function private.consents_doldur()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sha text;
  v_pub timestamptz;
begin
  select ld.sha256, ld.published_at into v_sha, v_pub
  from public.legal_documents ld
  where ld.doc_type = new.type and ld.version = new.doc_version;

  if v_sha is null or v_pub > now() then
    raise exception 'Bu belge sürümü yayımlanmamış: % %', new.type, new.doc_version
      using errcode = '23503';
  end if;

  new.doc_sha256 := v_sha;
  return new;
end;
$$;

create trigger consents_doldur
  before insert on public.consents
  for each row execute function private.consents_doldur();

-- Rıza kaydı kanıttır: tüm alanlar değiştirilemez; yalnızca withdrawn_at (boş -> dolu)
-- ve subject_hash (boş -> dolu, backend) yazılabilir. Geri çekme zamanını ve kimin geri
-- çektiğini sunucu belirler. Hesap silinince FK "SET NULL" user_id/student_id'yi boşaltabilir.
create or replace function private.consents_koru()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.user_id is distinct from old.user_id and new.user_id is not null)
     or (new.student_id is distinct from old.student_id and new.student_id is not null)
     or new.type is distinct from old.type
     or new.doc_version is distinct from old.doc_version
     or new.doc_sha256 is distinct from old.doc_sha256
     or new.granted is distinct from old.granted
     or new.accepted_at is distinct from old.accepted_at
     or new.channel is distinct from old.channel
     or new.app_version is distinct from old.app_version
     or (old.subject_hash is not null and new.subject_hash is distinct from old.subject_hash) then
    raise exception 'Rıza kaydı değiştirilemez; yalnızca geri çekilebilir' using errcode = '42501';
  end if;
  if old.withdrawn_at is not null and new.withdrawn_at is distinct from old.withdrawn_at then
    raise exception 'Geri çekilmiş rıza yeniden değiştirilemez' using errcode = '42501';
  end if;
  if old.withdrawn_at is null and new.withdrawn_at is not null then
    new.withdrawn_at := now();
    new.withdrawn_by := (select p.id from public.profiles p where p.id = (select auth.uid()));
  end if;
  return new;
end;
$$;

create trigger consents_koru
  before update on public.consents
  for each row execute function private.consents_koru();

-- Yayımlanmış hukuki metin DEĞİŞTİRİLEMEZ (kanıt bütünlüğü): yeni sürüm = yeni satır.
-- Yalnızca bağlantı (url) taşınabilir.
create or replace function private.legal_documents_koru()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.doc_type is distinct from old.doc_type
     or new.version is distinct from old.version
     or new.sha256 is distinct from old.sha256
     or new.published_at is distinct from old.published_at
     or new.body_md is distinct from old.body_md then
    raise exception 'Yayımlanmış hukuki metin değiştirilemez; yeni sürüm ekleyin' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger legal_documents_koru
  before update on public.legal_documents
  for each row execute function private.legal_documents_koru();

-- Mesajlar DEĞİŞTİRİLEMEZ. Tek izinli değişiklik: yönetici gizleme (hidden_at).
-- İstisnalar: FK "ON DELETE SET NULL" eylemleri sender_id / hidden_by'ı NULL yapabilir.
create or replace function private.question_messages_koru()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.question_id is distinct from old.question_id
     or new.kind is distinct from old.kind
     or new.body is distinct from old.body
     or new.has_flag is distinct from old.has_flag
     or new.created_at is distinct from old.created_at then
    raise exception 'Mesajlar değiştirilemez' using errcode = '42501';
  end if;
  if new.sender_id is distinct from old.sender_id and new.sender_id is not null then
    raise exception 'Mesajın göndereni değiştirilemez' using errcode = '42501';
  end if;

  if new.hidden_at is distinct from old.hidden_at then
    if new.hidden_at is null then
      new.hidden_by := null;                       -- gizleme kaldırıldı
    else
      new.hidden_at := now();                      -- zamanı sunucu belirler
      new.hidden_by := (select p.id from public.profiles p where p.id = (select auth.uid()));
    end if;
  elsif new.hidden_by is distinct from old.hidden_by and new.hidden_by is not null then
    raise exception 'hidden_by doğrudan değiştirilemez' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger question_messages_koru
  before update on public.question_messages
  for each row execute function private.question_messages_koru();

-- Bildirimi inceleyen yönetici ve zaman damgası sunucuda yazılır.
create or replace function private.reports_damgala()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status or new.action_taken is distinct from old.action_taken then
    new.handled_by := (select p.id from public.profiles p where p.id = (select auth.uid()));
    new.handled_at := now();
  end if;
  return new;
end;
$$;

create trigger reports_damgala
  before update on public.reports
  for each row execute function private.reports_damgala();

-- updated_at tetikleyicileri
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger students_set_updated_at before update on public.students
  for each row execute function private.set_updated_at();
create trigger volunteers_set_updated_at before update on public.volunteers
  for each row execute function private.set_updated_at();
create trigger recovery_plans_set_updated_at before update on public.recovery_plans
  for each row execute function private.set_updated_at();
create trigger questions_set_updated_at before update on public.questions
  for each row execute function private.set_updated_at();
create trigger availability_slots_set_updated_at before update on public.availability_slots
  for each row execute function private.set_updated_at();
create trigger matches_set_updated_at before update on public.matches
  for each row execute function private.set_updated_at();
create trigger sessions_set_updated_at before update on public.sessions
  for each row execute function private.set_updated_at();
create trigger push_subscriptions_set_updated_at before update on public.push_subscriptions
  for each row execute function private.set_updated_at();

-- =====================================================================
-- B2) SAKLAMA ZAMAN DAMGALARI, ENGELLEME, ÖZELLİK ANAHTARLARI
-- =====================================================================

-- ---- Kapanış damgası: durum kapanış değerine geçince closed_at = now(); yeniden açılırsa boşalır.
-- Her tablo için küçük, okunur bir tetikleyici. "UPDATE OF" KULLANILMAZ (bkz. docs/veri-modeli.md,
-- "Durum tetikleyicileri"): başka bir tetikleyici NEW.status'ü değiştirirse "UPDATE OF status" tetiklenmezdi.
create or replace function private.recovery_plans_closed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status in ('tamamlandi', 'arsiv') then
    new.closed_at := coalesce(new.closed_at, now());
  else
    new.closed_at := null;
  end if;
  return new;
end;
$$;

create trigger recovery_plans_closed_at before insert or update on public.recovery_plans
  for each row execute function private.recovery_plans_closed_at();

create or replace function private.questions_closed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'kapandi' then
    new.closed_at := coalesce(new.closed_at, now());
  else
    new.closed_at := null;
  end if;
  return new;
end;
$$;

create trigger questions_closed_at before insert or update on public.questions
  for each row execute function private.questions_closed_at();

create or replace function private.reports_closed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'kapandi' then
    new.closed_at := coalesce(new.closed_at, now());
  else
    new.closed_at := null;
  end if;
  return new;
end;
$$;

create trigger reports_closed_at before insert or update on public.reports
  for each row execute function private.reports_closed_at();

-- ---- Sorunun son etkinlik zamanı: her yeni mesajda güncellenir (ek saklama süresi SK-05).
-- greatest(): eski tarihli (geriye dönük) bir mesaj değeri GERİ almaz.
create or replace function private.touch_question_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.questions
     set last_activity_at = greatest(last_activity_at, new.created_at)
   where id = new.question_id;
  return new;
end;
$$;

create trigger question_messages_son_etkinlik
  after insert on public.question_messages
  for each row execute function private.touch_question_activity();

-- ---- Gönüllü karar damgası ve belge saklama süreleri (SK-06)
-- Karar (onay/ret) anı decided_at'e yazılır; açık duruma ("basvuru/egitim/inceleme") geri dönülürse SIFIRLANIR.
-- O gönüllünün silinmemiş belgeleri için purge_after = min(yükleme + 60 gün, karar + 30 gün), reviewed_at/by damgalanır.
create or replace function private.volunteers_karar_damgala()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status in ('onayli', 'reddedildi') then
      new.decided_at := now();
    end if;
  elsif old.status is distinct from new.status then
    if new.status in ('onayli', 'reddedildi') then
      new.decided_at := now();
    elsif new.status in ('basvuru', 'egitim', 'inceleme') then
      new.decided_at := null;
    end if;
  end if;
  return new;
end;
$$;

create trigger volunteers_karar_damgala
  before insert or update on public.volunteers
  for each row execute function private.volunteers_karar_damgala();

create or replace function private.volunteers_karar_belgeler()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('onayli', 'reddedildi') and old.status is distinct from new.status then
    update public.volunteer_documents d
       set reviewed_at = coalesce(d.reviewed_at, new.decided_at),
           reviewed_by = coalesce(d.reviewed_by, (select p.id from public.profiles p where p.id = (select auth.uid()))),
           purge_after = least(coalesce(d.purge_after, new.decided_at + interval '30 days'),
                               new.decided_at + interval '30 days')
     where d.volunteer_id = new.profile_id
       and d.purged_at is null;
  end if;
  return new;
end;
$$;

create trigger volunteers_karar_belgeler
  after update on public.volunteers
  for each row execute function private.volunteers_karar_belgeler();

-- Yeni belge: karar yoksa yüklemeden 60 gün; karar zaten verilmişse karardan 30 gün.
create or replace function private.volunteer_documents_purge_damgala()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_decided timestamptz;
begin
  select v.decided_at into v_decided from public.volunteers v where v.profile_id = new.volunteer_id;
  new.purge_after := least(new.uploaded_at + interval '60 days', v_decided + interval '30 days');
  return new;
end;
$$;

create trigger volunteer_documents_purge_damgala
  before insert on public.volunteer_documents
  for each row execute function private.volunteer_documents_purge_damgala();

-- ---- Eşleşme bitince: gelecekteki PLANLI dersler iptal edilir (engelleme, rıza geri çekme, hesap silme,
-- yönetici sonlandırması... hangi yoldan bitirilirse bitirilsin). Başlangıcı geçmişte kalan planlı dersler
-- dokunulmaz (tamamlandi / gelinmedi işaretlemesi pg_cron işinindir).
create or replace function private.cancel_future_sessions(p_match_id uuid, p_reason text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.sessions
     set status = 'iptal', cancelled_at = now(), cancel_reason = p_reason
   where match_id = p_match_id
     and status = 'planlandi'
     and starts_at > now();
$$;

create or replace function private.matches_bitince()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'bitti' and (tg_op = 'INSERT' or old.status is distinct from 'bitti') then
    perform private.cancel_future_sessions(
      new.id,
      case
        when new.end_reason = 'engellendi' then 'engellendi'
        when new.end_reason in ('gonullu_hesabi_silindi', 'ogrenci_hesabi_silindi') then 'hesap_silindi'
        else 'eslesme_bitti'
      end);
  end if;
  return new;
end;
$$;

create trigger matches_bitince
  after insert or update on public.matches
  for each row execute function private.matches_bitince();

-- ---- Hesap silinirken eşleşme / ders / soru davranışı (SK-08, SK-14)
-- Öğrenci veya gönüllü hesabı silinince FK "SET NULL" matches satırını günceller.
-- Bu tetikleyici, o satırın CHECK kuralına (kişi yoksa eşleşme 'bitti' olmalı) uymasını
-- sağlar: eşleşmeyi bitirir; öğrenci silindiyse satırı anonimleştirir (serbest metin yok, yalnızca kod).
create or replace function private.matches_kisi_silinince()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.student_id is null and old.student_id is not null then
    new.status := 'bitti';
    new.ended_at := coalesce(new.ended_at, now());
    new.anonymized_at := coalesce(new.anonymized_at, now());
    new.end_reason := 'ogrenci_hesabi_silindi';
  elsif new.volunteer_id is null and old.volunteer_id is not null then
    new.status := 'bitti';
    new.ended_at := coalesce(new.ended_at, now());
    new.end_reason := coalesce(new.end_reason, 'gonullu_hesabi_silindi');
  end if;
  return new;
end;
$$;

create trigger matches_kisi_silinince
  before update on public.matches
  for each row execute function private.matches_kisi_silinince();

-- Öğrenci silinirken onun eşleşmelerindeki dersler (ve katılım kayıtları) silinir.
create or replace function private.students_silinirken()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.sessions s
  using public.matches m
  where s.match_id = m.id
    and m.student_id = old.profile_id;
  return old;
end;
$$;

create trigger students_silinirken
  before delete on public.students
  for each row execute function private.students_silinirken();

-- Atama kalkınca (gönüllü silindi / engellendi / yönetici boşalttı) sahipsiz kalan "atandi" VEYA "cevaplandi"
-- soru havuza döner. (questions_atanan_gonullu_chk: bu durumlar atanan gönüllü ister.)
create or replace function private.questions_atama_kalkinca()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.assigned_volunteer_id is null and old.assigned_volunteer_id is not null
     and new.status in ('atandi', 'cevaplandi') then
    new.status := 'havuzda';
    new.escalated_at := coalesce(new.escalated_at, now());
  end if;
  return new;
end;
$$;

create trigger questions_atama_kalkinca
  before update on public.questions
  for each row execute function private.questions_atama_kalkinca();

-- ---- Çocuk hesabını "beklemede"ye al: AR-1 geri çekilince ve son veli ayrılınca ortak yol.
-- Çocuğun açık eşleşmelerini bitirir (bitince planlı dersler iptal olur), denetim kaydı yazar.
-- Veli çocuğun verisini görmeye devam eder (indirme / silme için); gönüllü ve çocuk erişemez.
-- Yeniden aktifleştirme bilinçli bir işlemdir (yeni rıza / yeni veli + yönetici/RPC); otomatik DEĞİL.
create or replace function private.suspend_student(p_student_id uuid, p_end_reason text, p_audit_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set status = 'beklemede'
   where id = p_student_id and role = 'ogrenci' and status = 'aktif';

  update public.matches
     set status = 'bitti', ended_at = coalesce(ended_at, now()), end_reason = p_end_reason
   where student_id = p_student_id and status <> 'bitti';

  perform private.write_audit(p_audit_action, 'profiles', p_student_id::text, '{}'::jsonb);
end;
$$;

-- AR-1 (hizmetin dayandığı açık rıza) geri çekilince ve o çocuk için başka GEÇERLİ kayıt kalmayınca
-- çocuk hesabı askıya alınır. Hangi türlerin böyle davrandığı consent_types.withdrawal_suspends_student'ta.
-- Çocuğun herhangi bir velisi geri çekebilir; sonuç aynıdır.
-- GEÇERLİ kayıt = verildi (granted), geri çekilmedi VE kaydı veren kişi çocuğun HÂLÂ velisi (N4: velilikten
-- çıkarılan kişinin eski rızası çocuğu açık tutmaz).
create or replace function private.consents_askiya_al()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.withdrawn_at is null and new.withdrawn_at is not null
     and new.granted
     and new.student_id is not null
     and exists (select 1 from public.consent_types ct where ct.code = new.type and ct.withdrawal_suspends_student)
     and not exists (
       select 1 from public.consents c
       where c.student_id = new.student_id and c.type = new.type
         and c.granted and c.withdrawn_at is null and c.id <> new.id
         and exists (select 1 from public.guardian_students g where g.guardian_id = c.user_id and g.student_id = c.student_id)) then
    perform private.suspend_student(new.student_id, 'riza_geri_cekildi', 'ar1_geri_cekildi');
  end if;
  return new;
end;
$$;

create trigger consents_askiya_al
  after update on public.consents
  for each row execute function private.consents_askiya_al();

-- Veli bağı kalkınca (veli hesabı silindi / bağlantı kaldırıldı):
--   1) hiç veli kalmadıysa çocuk hesabı "beklemede" olur; hesap silme akışı çocuğu sonra siler
--      (hukuk: son velinin hesabı silinirse çocuk hesabı da silinir),
--   2) veli kaldıysa ama KALAN velilerin hiçbirinin o çocuk için GEÇERLİ AR-1'i yoksa (rızayı kalkan veli
--      vermişti) çocuk yine "beklemede" olur (N4): hizmetin dayanağı olan açık rıza kalmamıştır.
--      Kalan veli yeni AR-1 verince hesap yönetici/RPC ile yeniden etkinleştirilir (otomatik DEĞİL).
create or replace function private.guardian_students_son_veli()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.guardian_students g where g.student_id = old.student_id) then
    perform private.suspend_student(old.student_id, 'velisiz_kaldi', 'cocuk_velisiz_kaldi');
  elsif exists (
          select 1 from public.consent_types ct
          where ct.withdrawal_suspends_student
            and not exists (
              select 1
              from public.consents c
              join public.guardian_students g on g.guardian_id = c.user_id and g.student_id = c.student_id
              where c.student_id = old.student_id and c.type = ct.code
                and c.granted and c.withdrawn_at is null)) then
    perform private.suspend_student(old.student_id, 'riza_geri_cekildi', 'cocuk_riza_gecersiz');
  end if;
  return old;
end;
$$;

create trigger guardian_students_son_veli
  after delete on public.guardian_students
  for each row execute function private.guardian_students_son_veli();

-- ---- Silinen gönüllünün kimlik bağlantısı (SK-16): deleted_volunteer_links
-- Gönüllünün mesajları ve eşleşmeleri hesap silinince anonimleşir; "bu mesajı kim yazmıştı?" sorusunun
-- cevabı 2 yıl boyunca YALNIZCA yöneticide kalır. Ad / e-posta tutulmaz; tuz tanımlıysa (app.kimlik_tuzu,
-- backend ayarlar) ad + soyad + üniversitenin tuzlu özeti (HMAC-SHA256) yazılır, tuz yoksa özet NULL kalır
-- ve silme ENGELLENMEZ.
-- İki tetikleyici: profiles BEFORE DELETE (hesap silme: FK "SET NULL" eylemleri henüz çalışmadan mesaj
-- bağları okunur; RI tetikleyicilerinin sırası garanti olmadığı için volunteers'a değil buraya bağlanır) ve
-- volunteers BEFORE DELETE (yalnızca gönüllü satırı silinirse). Aynı bağlantı iki kez yazılmaz.
create or replace function private.gonullu_baglantisi_kaydet(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_digest text;
  v_tuz    text := coalesce(current_setting('app.kimlik_tuzu', true), '');
  v        record;
begin
  select given_name, family_name, university into v from public.volunteers where profile_id = p_profile_id;
  if v_tuz <> '' and v.given_name is not null then
    begin
      v_digest := encode(extensions.hmac(lower(v.given_name || ' ' || v.family_name || '|' || v.university), v_tuz, 'sha256'), 'hex');
    exception when others then
      v_digest := null;   -- pgcrypto yoksa vb.: silme engellenmez
    end;
  end if;

  insert into public.deleted_volunteer_links (former_profile_id, entity, entity_id, name_digest)
  select p_profile_id, 'question_messages', m.id, v_digest
  from public.question_messages m
  where m.sender_id = p_profile_id
    and not exists (select 1 from public.deleted_volunteer_links l
                    where l.former_profile_id = p_profile_id and l.entity = 'question_messages' and l.entity_id = m.id);

  insert into public.deleted_volunteer_links (former_profile_id, entity, entity_id, name_digest)
  select p_profile_id, 'matches', ma.id, v_digest
  from public.matches ma
  where ma.volunteer_id = p_profile_id
    and not exists (select 1 from public.deleted_volunteer_links l
                    where l.former_profile_id = p_profile_id and l.entity = 'matches' and l.entity_id = ma.id);
end;
$$;

create or replace function private.profiles_silinirken_baglanti()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'gonullu' then
    perform private.gonullu_baglantisi_kaydet(old.id);
  end if;
  return old;
end;
$$;

create trigger profiles_silinirken_baglanti
  before delete on public.profiles
  for each row execute function private.profiles_silinirken_baglanti();

-- N6: Bağlantı kaydı 2 yıl boyunca delildir. Servis rolü (ve her istemci rolü) yalnızca SÜRESİ DOLMUŞ satırı silebilir;
-- süresi dolmamış satırı yalnızca postgres / supabase_admin (yönetici SQL'i, ör. veri sahibi talebi) silebilir.
create or replace function private.deleted_volunteer_links_koru()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.expires_at > now() and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'deleted_volunteer_links: süresi dolmamış bağlantı kaydı silinemez (son kullanma: %)', old.expires_at
      using errcode = '42501';
  end if;
  return old;
end;
$$;

create trigger deleted_volunteer_links_koru
  before delete on public.deleted_volunteer_links
  for each row execute function private.deleted_volunteer_links_koru();

create or replace function private.volunteers_silinirken_baglanti()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.gonullu_baglantisi_kaydet(old.profile_id);
  return old;
end;
$$;

create trigger volunteers_silinirken_baglanti
  before delete on public.volunteers
  for each row execute function private.volunteers_silinirken_baglanti();

-- ---- Veli özellik anahtarları
-- Öğrenci oluşturulunca varsayılan anahtar satırı açılır.
create or replace function private.students_ozellik_satiri()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.student_features (student_id) values (new.profile_id);
  return new;
end;
$$;

create trigger students_ozellik_satiri
  after insert on public.students
  for each row execute function private.students_ozellik_satiri();

-- Özellik açık mı? Satır yoksa varsayılan (açık) kabul edilir.
create or replace function private.student_feature_enabled(p_student_id uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case p_feature
             when 'qa'    then f.qa_enabled
             when 'voice' then f.voice_enabled
             when 'video' then f.video_enabled
           end
    from public.student_features f
    where f.student_id = p_student_id
  ), true);
$$;

-- Kapalı özellik VERİTABANINDA da zorlanır (RPC hatası olsa bile): soru/mesaj, sesli ek, ders.
create or replace function private.enforce_feature_qa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid;
begin
  if tg_table_name = 'questions' then
    v_student := new.student_id;
  else
    select q.student_id into v_student from public.questions q where q.id = new.question_id;
  end if;
  if v_student is not null and not private.student_feature_enabled(v_student, 'qa') then
    raise exception 'OZELLIK_KAPALI: soru-cevap bu öğrenci için veli tarafından kapatıldı' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger questions_ozellik_kontrol before insert on public.questions
  for each row execute function private.enforce_feature_qa();
create trigger question_messages_ozellik_kontrol before insert on public.question_messages
  for each row execute function private.enforce_feature_qa();

create or replace function private.enforce_feature_voice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid;
begin
  if new.kind = 'ses' then
    select q.student_id into v_student
    from public.question_messages m
    join public.questions q on q.id = m.question_id
    where m.id = new.message_id;
    if v_student is not null and not private.student_feature_enabled(v_student, 'voice') then
      raise exception 'OZELLIK_KAPALI: sesli cevaplar bu öğrenci için veli tarafından kapatıldı' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger attachments_ozellik_kontrol before insert on public.attachments
  for each row execute function private.enforce_feature_voice();

create or replace function private.enforce_feature_video()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid;
begin
  select m.student_id into v_student from public.matches m where m.id = new.match_id;
  if v_student is not null and not private.student_feature_enabled(v_student, 'video') then
    raise exception 'OZELLIK_KAPALI: görüntülü ders bu öğrenci için veli tarafından kapatıldı' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger sessions_ozellik_kontrol before insert on public.sessions
  for each row execute function private.enforce_feature_video();

-- Kimin değiştirdiği sunucuda damgalanır; her değişiklik denetim kaydına yazılır (bkz. C).
create or replace function private.student_features_damgala()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.student_id := old.student_id;
  new.updated_by := (select p.id from public.profiles p where p.id = (select auth.uid()));
  return new;
end;
$$;

create trigger student_features_damgala
  before update on public.student_features
  for each row execute function private.student_features_damgala();
create trigger student_features_set_updated_at before update on public.student_features
  for each row execute function private.set_updated_at();

-- ---- Gönüllü engelleme: çift bir daha eşleştirilemez / atanamaz
create or replace function private.enforce_not_blocked_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'bitti'
     and new.student_id is not null and new.volunteer_id is not null
     and private.is_blocked(new.student_id, new.volunteer_id) then
    raise exception 'ENGELLI: bu gönüllü bu öğrenci için engellenmiş' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger matches_engel_kontrol
  before insert or update on public.matches
  for each row execute function private.enforce_not_blocked_match();

-- Yalnızca atama YENİ yapılırken / değişirken denetlenir: engelden sonra "kapandi" olan eski sorular tarihçe için
-- engelli gönüllünün adını taşır ve durum güncellemesi (kapatma, saklama damgaları) bu yüzden reddedilmemelidir.
create or replace function private.enforce_not_blocked_question()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.assigned_volunteer_id is not null
     and (tg_op = 'INSERT' or new.assigned_volunteer_id is distinct from old.assigned_volunteer_id)
     and private.is_blocked(new.student_id, new.assigned_volunteer_id) then
    raise exception 'ENGELLI: bu gönüllü bu öğrenci için engellenmiş' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger questions_engel_kontrol
  before insert or update on public.questions
  for each row execute function private.enforce_not_blocked_question();

-- Engel kaydının KAYNAĞI sunucuda doğrulanır (güvenlik yeniden denetimi N2). volunteer_blocks'a doğrudan yazma
-- yetkisi istemcide yoktur; kayıt block_volunteer RPC'siyle (SECURITY DEFINER) eklenir. RPC'nin içinde bile
-- auth.uid() çağıranı verir, bu yüzden kimlik İSTEMCİDEN ALINMAZ:
--   * auth.uid() doluysa: blocked_by := çağıran; rolü PROFİLDEN türetilir. Çağıran ya çocuğun kendisi (aktif öğrenci)
--     ya da çocuğun aktif velisi olmalı; başkası (başka öğrencinin velisi, rakip gönüllü, yönetici...) REDDEDİLİR.
--   * auth.uid() boşsa (servis rolü / SQL): blocked_by verilmişse çocukla ilişkili olmalı (çocuğun kendisi ya da
--     velisi); rol buna göre yazılır. Sahte "başka velinin adıyla engel" kaydı oluşturulamaz.
--   * match_id verilmişse AYNI öğrenci-gönüllü çiftine ait olmalı.
create or replace function private.volunteer_blocks_kaynak_kontrol()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is not null then
    new.blocked_by := v_uid;
    if v_uid = new.student_id and (select private.active_role()) = 'ogrenci' then
      new.blocked_by_role := 'ogrenci';
    elsif (select private.is_guardian_of(new.student_id)) then
      new.blocked_by_role := 'veli';
    else
      raise exception 'volunteer_blocks: engeli yalnızca öğrencinin kendisi veya velisi ekleyebilir' using errcode = '42501';
    end if;
  elsif new.blocked_by is not null then
    if new.blocked_by = new.student_id then
      new.blocked_by_role := 'ogrenci';
    elsif exists (select 1 from public.guardian_students gs
                  where gs.guardian_id = new.blocked_by and gs.student_id = new.student_id) then
      new.blocked_by_role := 'veli';
    else
      raise exception 'volunteer_blocks: blocked_by çocukla ilişkili değil (çocuğun kendisi ya da velisi olmalı)' using errcode = '42501';
    end if;
  end if;

  if new.match_id is not null and not exists (
       select 1 from public.matches m
       where m.id = new.match_id and m.student_id = new.student_id and m.volunteer_id = new.volunteer_id) then
    raise exception 'volunteer_blocks: match_id bu öğrenci-gönüllü çiftine ait değil' using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger volunteer_blocks_kaynak_kontrol
  before insert on public.volunteer_blocks
  for each row execute function private.volunteer_blocks_kaynak_kontrol();

-- Engel kaydı eklenince RPC'ye (block_volunteer) GÜVENİLMEZ: şema kendisi uygular (güvenlik denetimi Y1, N3):
--   * o öğrenci + gönüllü arasındaki açık eşleşmeyi bitirir (planlı dersler matches_bitince ile iptal olur),
--   * gönüllünün CEVAPLAMADIĞI (yalnızca "atandi") sorularının atamasını boşaltır; soru havuza döner
--     (questions_atama_kalkinca). Engelli gönüllü havuzda da o öğrencinin sorusunu göremez (can_access_question),
--   * gönüllünün ZATEN CEVAPLADIĞI ("cevaplandi") soruları KAPANIR, havuza DÖNMEZ: aksi halde havuzdan üstlenen yeni
--     bir gönüllü, çocuğu rahatsız etmiş kişinin yazdıklarını okurdu (N3). Atanan gönüllü kaydı tarihçe için kalır.
--     Engellenen gönüllünün mesajları ayrıca yönetici incelemesine kadar gizlenir (message_hidden_from_me).
-- Engel yalnızca o öğrenci içindir: gönüllünün başka öğrencilerle eşleşmesi/soruları etkilenmez.
create or replace function private.volunteer_blocks_uygula()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.volunteer_id is null then
    return new;
  end if;

  update public.matches
     set status = 'bitti', ended_at = coalesce(ended_at, now()), end_reason = 'engellendi'
   where student_id = new.student_id
     and volunteer_id = new.volunteer_id
     and status <> 'bitti';

  update public.questions
     set status = 'kapandi'
   where student_id = new.student_id
     and assigned_volunteer_id = new.volunteer_id
     and status = 'cevaplandi';

  update public.questions
     set assigned_volunteer_id = null
   where student_id = new.student_id
     and assigned_volunteer_id = new.volunteer_id
     and status = 'atandi';

  return new;
end;
$$;

create trigger volunteer_blocks_uygula
  after insert on public.volunteer_blocks
  for each row execute function private.volunteer_blocks_uygula();

-- Yönetici incelemesi sunucuda damgalanır.
create or replace function private.volunteer_blocks_damgala()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reviewed_at is distinct from old.reviewed_at then
    if new.reviewed_at is null then
      new.reviewed_by := null;
    else
      new.reviewed_at := now();
      new.reviewed_by := (select p.id from public.profiles p where p.id = (select auth.uid()));
    end if;
  end if;
  return new;
end;
$$;

create trigger volunteer_blocks_damgala
  before update on public.volunteer_blocks
  for each row execute function private.volunteer_blocks_damgala();

-- =====================================================================
-- C) DENETİM KAYDI (audit_log)
-- =====================================================================

-- Denetim kaydı yazıcısı. İstemciye KAPALI: yalnızca SECURITY DEFINER RPC'ler,
-- tetikleyiciler ve SQL oturumu çağırabilir. actor_id = çağıran kullanıcı
-- (SQL / sistem işlemlerinde NULL). details içine kişisel veri YAZMAYIN.
create or replace function private.write_audit(
  p_action    text,
  p_entity    text,
  p_entity_id text  default null,
  p_details   jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, entity, entity_id, details)
  values (
    (select p.id from public.profiles p where p.id = (select auth.uid())),
    p_action, p_entity, p_entity_id, coalesce(p_details, '{}'::jsonb)
  );
$$;

-- Rol/durum değişiklikleri her yoldan (RPC, servis rolü, SQL) denetim kaydına düşer.
create or replace function private.audit_profiles()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    perform private.write_audit('profil_rol_degisti', 'profiles', new.id::text,
      jsonb_build_object('eski', old.role, 'yeni', new.role));
  end if;
  if new.status is distinct from old.status then
    perform private.write_audit('profil_durum_degisti', 'profiles', new.id::text,
      jsonb_build_object('eski', old.status, 'yeni', new.status));
  end if;
  return new;
end;
$$;

create trigger profiles_audit
  after update on public.profiles
  for each row execute function private.audit_profiles();

-- Gönüllü durumu ve çocuğa/veliye gösterilen profil alanlarındaki değişiklikler (S2: ad kanalı) denetlenir.
-- Profil alanı değişikliğinde yalnızca HANGİ alanın değiştiği yazılır, değerler (kişisel veri) yazılmaz.
create or replace function private.audit_volunteers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alanlar text[] := '{}';
begin
  if new.status is distinct from old.status then
    perform private.write_audit('gonullu_durum_degisti', 'volunteers', new.profile_id::text,
      jsonb_build_object('eski', old.status, 'yeni', new.status));
  end if;
  if new.given_name  is distinct from old.given_name  then v_alanlar := v_alanlar || 'given_name'::text;  end if;
  if new.family_name is distinct from old.family_name then v_alanlar := v_alanlar || 'family_name'::text; end if;
  if new.university  is distinct from old.university  then v_alanlar := v_alanlar || 'university'::text;  end if;
  if new.department is distinct from old.department then v_alanlar := v_alanlar || 'department'::text; end if;
  if new.class_year  is distinct from old.class_year  then v_alanlar := v_alanlar || 'class_year'::text;  end if;
  if cardinality(v_alanlar) > 0 then
    perform private.write_audit('gonullu_profil_degisti', 'volunteers', new.profile_id::text,
      jsonb_build_object('alanlar', to_jsonb(v_alanlar)));
  end if;
  return new;
end;
$$;

create trigger volunteers_audit
  after update on public.volunteers
  for each row execute function private.audit_volunteers();

create or replace function private.audit_matches()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.write_audit('eslesme_olusturuldu', 'matches', new.id::text,
      jsonb_build_object('durum', new.status, 'ders', new.subject_id));
  elsif new.status is distinct from old.status then
    perform private.write_audit('eslesme_durumu_degisti', 'matches', new.id::text,
      jsonb_build_object('eski', old.status, 'yeni', new.status));
  end if;
  return new;
end;
$$;

create trigger matches_audit
  after insert or update on public.matches
  for each row execute function private.audit_matches();

create or replace function private.audit_message_hidden()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.hidden_at is distinct from old.hidden_at then
    perform private.write_audit(
      case when new.hidden_at is null then 'mesaj_gizleme_kaldirildi' else 'mesaj_gizlendi' end,
      'question_messages', new.id::text, '{}'::jsonb);
  end if;
  return new;
end;
$$;

create trigger question_messages_audit
  after update on public.question_messages
  for each row execute function private.audit_message_hidden();

create or replace function private.audit_reports()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    perform private.write_audit('bildirim_durumu_degisti', 'reports', new.id::text,
      jsonb_build_object('eski', old.status, 'yeni', new.status, 'hedef_tur', new.target_type));
  end if;
  return new;
end;
$$;

create trigger reports_audit
  after update on public.reports
  for each row execute function private.audit_reports();

-- Engelleme: kalıcı iz + yönetici incelemesi için denetim kaydı (yalnızca kimlikler, kişisel veri yok).
create or replace function private.audit_volunteer_blocks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.write_audit('gonullu_engellendi', 'volunteer_blocks', new.id::text,
      jsonb_build_object('ogrenci', new.student_id, 'gonullu', new.volunteer_id, 'engelleyen_rol', new.blocked_by_role));
  elsif new.reviewed_at is distinct from old.reviewed_at then
    perform private.write_audit('engelleme_incelendi', 'volunteer_blocks', new.id::text, '{}'::jsonb);
  end if;
  return new;
end;
$$;

create trigger volunteer_blocks_audit
  after insert or update on public.volunteer_blocks
  for each row execute function private.audit_volunteer_blocks();

-- Özellik anahtarı değişiklikleri (çocuk güvenliği ayarı) denetim kaydına yazılır.
create or replace function private.audit_student_features()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.qa_enabled is distinct from old.qa_enabled
     or new.voice_enabled is distinct from old.voice_enabled
     or new.video_enabled is distinct from old.video_enabled then
    perform private.write_audit('ozellik_degisti', 'student_features', new.student_id::text,
      jsonb_build_object('soru_cevap', new.qa_enabled, 'sesli_cevap', new.voice_enabled, 'goruntulu_ders', new.video_enabled));
  end if;
  return new;
end;
$$;

create trigger student_features_audit
  after update on public.student_features
  for each row execute function private.audit_student_features();

-- Ders notu (çocuğun/velinin gördüğü serbest metin) yazımı denetlenir; metnin kendisi değil UZUNLUĞU yazılır.
create or replace function private.audit_sessions_note()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.volunteer_note is distinct from old.volunteer_note and new.volunteer_note is not null then
    perform private.write_audit('ders_notu_yazildi', 'sessions', new.id::text,
      jsonb_build_object('uzunluk', char_length(new.volunteer_note)));
  end if;
  return new;
end;
$$;

create trigger sessions_not_audit
  after update on public.sessions
  for each row execute function private.audit_sessions_note();

-- ---------------------------------------------------------------------
-- Yönetici atama / geri alma: YALNIZCA SQL ile (Studio SQL düzenleyicisi / psql).
--   select private.grant_admin('ekip-yoneticisi@ornek.com');
--   select private.revoke_admin('ekip-yoneticisi@ornek.com');
-- grant_admin şunları ister (hiçbiri atlanamaz, çünkü profiles.role başka yoldan değişmez):
--   * hesap veli olarak açılmış ve bağlı çocuğu olmayan,
--   * e-postası DOĞRULANMIŞ,
--   * hesap AKTİF (askıdaki hesap sessizce aktifleştirilmez; önce incelenmeli),
--   * en az bir DOĞRULANMIŞ TOTP (MFA) faktörü (auth.mfa_factors) var.
-- Rol değişikliğini profiles tetikleyicisi audit_log'a yazar. Rol, "app.rol_degisikligi_hedef" işlem-yerel
-- bayrağıyla yalnızca bu iki fonksiyon içinde değişebilir. İstemci rolleri bu fonksiyonları ÇAĞIRAMAZ.
-- ---------------------------------------------------------------------
create or replace function private.grant_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id        uuid;
  v_confirmed timestamptz;
  v_role      text;
  v_status    text;
begin
  select u.id, u.email_confirmed_at into v_id, v_confirmed
  from auth.users u
  where lower(u.email) = lower(btrim(p_email));

  if v_id is null then
    raise exception 'grant_admin: kullanıcı bulunamadı' using errcode = 'P0002';
  end if;

  select p.role, p.status into v_role, v_status from public.profiles p where p.id = v_id;
  if v_role is distinct from 'veli' then
    raise exception 'grant_admin: yalnızca veli olarak açılmış, bağlı çocuğu olmayan bir hesap yönetici yapılabilir (mevcut rol: %)',
      coalesce(v_role, 'yok') using errcode = '23514';
  end if;
  if exists (select 1 from public.guardian_students gs where gs.guardian_id = v_id) then
    raise exception 'grant_admin: bu hesaba bağlı çocuk kayıtları var; yeni bir hesap kullanın'
      using errcode = '23514';
  end if;
  if v_confirmed is null then
    raise exception 'grant_admin: e-posta doğrulanmamış' using errcode = '23514';
  end if;
  if v_status is distinct from 'aktif' then
    raise exception 'grant_admin: hesap aktif değil (durum: %); önce hesabı inceleyin', v_status using errcode = '23514';
  end if;
  if not exists (
       select 1 from auth.mfa_factors f
       where f.user_id = v_id and f.factor_type::text = 'totp' and f.status::text = 'verified') then
    raise exception 'grant_admin: doğrulanmış TOTP (MFA) faktörü yok' using errcode = '23514';
  end if;

  perform set_config('app.rol_degisikligi_hedef', v_id::text, true);   -- işlem-yerel, yalnızca bu kullanıcı için
  update public.profiles set role = 'yonetici' where id = v_id;
  perform set_config('app.rol_degisikligi_hedef', '', true);
end;
$$;

-- Yöneticiyi veliye düşürür (görevden ayrılma). Hesabı kapatmak için ayrıca status 'askida' yapılabilir.
create or replace function private.revoke_admin(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id   uuid;
  v_role text;
begin
  select u.id into v_id from auth.users u where lower(u.email) = lower(btrim(p_email));
  if v_id is null then
    raise exception 'revoke_admin: kullanıcı bulunamadı' using errcode = 'P0002';
  end if;
  select p.role into v_role from public.profiles p where p.id = v_id;
  if v_role is distinct from 'yonetici' then
    raise exception 'revoke_admin: hesap yönetici değil (mevcut rol: %)', coalesce(v_role, 'yok') using errcode = '23514';
  end if;

  perform set_config('app.rol_degisikligi_hedef', v_id::text, true);
  update public.profiles set role = 'veli' where id = v_id;
  perform set_config('app.rol_degisikligi_hedef', '', true);
end;
$$;

-- ---------------------------------------------------------------------
-- Seed kilidi: supabase/seed/seed.sql ilk satırlarında private.assert_seed_allowed() çağırır.
--   * app.ortam = 'uzak' ise (uzak projede bir kez ayarlanır:
--       alter database postgres set "app.ortam" = 'uzak';  ) seed BOŞ veritabanında bile DURUR,
--   * veritabanında seed'in kendi (TAM eşleşen) 9 örnek adresi dışında kullanıcı varsa DURUR.
-- Mantık, test edilebilsin diye saf bir fonksiyondadır (seed_engel_nedeni): NULL = seed çalışabilir.
-- ---------------------------------------------------------------------
create or replace function private.seed_engel_nedeni(p_emails text[])
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_izinli constant text[] := array[
    'yonetici@ornek.test', 'veli1@ornek.test', 'veli2@ornek.test',
    'mavikus@ogrenci.ornek.test', 'yesilelma@ogrenci.ornek.test', 'turuncubulut@ogrenci.ornek.test',
    'gonullu1@ornek-universite.edu.tr', 'gonullu2@ornek-universite.edu.tr', 'gonullu3@ornek-universite.edu.tr'];
begin
  if current_setting('app.ortam', true) = 'uzak' then
    return 'seed.sql uzak projede çalıştırılamaz: app.ortam = uzak';
  end if;
  if exists (
       select 1 from unnest(coalesce(p_emails, array[]::text[])) e
       where lower(btrim(coalesce(e, ''))) <> all (v_izinli)) then
    return 'seed.sql yalnızca boş / yerel veritabanında çalıştırılabilir: örnek olmayan kullanıcı bulundu';
  end if;
  return null;
end;
$$;

create or replace function private.assert_seed_allowed()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_neden text;
begin
  v_neden := private.seed_engel_nedeni(array(select u.email::text from auth.users u));
  if v_neden is not null then
    raise exception '%', v_neden using errcode = 'P0001';
  end if;
end;
$$;

-- =====================================================================
-- FONKSİYON YETKİLERİ
-- Postgres, yeni fonksiyonları varsayılan olarak PUBLIC'e çalıştırılabilir
-- yapar; migration 01 bu varsayılanı postgres rolü için kapattı. Burada ise o migration'a kadar
-- oluşmuş TÜM private fonksiyonlarının yetkisi sıfırlanır. Yalnızca RLS politikalarının / görünümlerin /
-- kısıtların çağırdığı yardımcılar "authenticated"e açılır (001 testi bu izin listesini denetler). Tetikleyici fonksiyonlarına kimse
-- EXECUTE yetkisi almaz (tetikleyici çalışırken yetki aranmaz).
-- =====================================================================
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
  loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', f.sig);
  end loop;
end $$;

grant execute on function
  private.active_role(),
  private.is_admin(),
  private.is_guardian_of(uuid),
  private.is_approved_volunteer(),
  private.is_matched_volunteer(uuid),
  private.is_blocked_for_me(uuid),
  private.can_access_question(uuid),
  private.can_answer_question(uuid),
  private.volunteer_application_open(),
  private.consent_allowed(text, uuid),
  private.can_upload_question_object(text),
  private.can_upload_volunteer_document(text),
  private.has_guardian_link(uuid),
  private.message_hidden_from_me(uuid, uuid),
  private.embargoed_volunteers(),
  private.short_name(text, text),   -- görünümler içinde çağrılır: görünümdeki FONKSİYONLAR çağıranın yetkisiyle denetlenir (tablolar değil)
  private.is_safe_name(text)        -- CHECK kısıtlarında çağrılır
to authenticated;

-- Servis rolü (Edge Function'lar) RLS'yi atlar ama volunteers CHECK kısıtları is_safe_name'i çağırır: EXECUTE gerekir (N1).
-- Aksi halde servis rolü volunteers tablosuna yazamazdı. Başka hiçbir private fonksiyon açılmaz (görünümler istemci
-- içindir; servis rolü tabloları doğrudan okur).
grant execute on function private.is_safe_name(text) to service_role;
