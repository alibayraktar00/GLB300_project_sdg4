-- =====================================================================
-- 07 · STORAGE: BUCKET'LAR VE YOL BAZLI POLİTİKALAR  (plan 5.4, 9.1)
--
-- İki özel (public=false) bucket:
--   soru-ekleri        {student_id}/{question_id}/{uuid}.jpg|m4a|aac|webm
--   gonullu-belgeleri  {volunteer_id}/{uuid}.pdf|jpg
--
-- storage.objects tablosunda RLS Supabase tarafından zaten açıktır.
-- İstemci için UPDATE ve DELETE politikası YOKTUR: yüklenen dosya
-- değiştirilemez/silinemez/üzerine yazılamaz (upsert çalışmaz). Silme
-- yalnızca servis rolüyle (cleanup, delete-account Edge Function'ları).
--
-- Not (INSERT ... RETURNING): Storage API, yüklemede yeni satırı geri okur;
-- bu yüzden yükleyenin kendi nesnesini görmesine izin veren SELECT
-- politikası vardır (owner_id = auth.uid()). Gerçek projede, yalnızca
-- INSERT ile yüklemenin çalışıp çalışmadığı denenmeli; çalışıyorsa
-- "*_select_owner" politikaları kaldırılabilir (docs/veri-modeli.md).
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  -- Foto ≤ 2 MB (attachments tablosu CHECK'i), ses ≤ 3 MB: bucket tek sınır tanıdığı için 3 MB.
  ('soru-ekleri', 'soru-ekleri', false, 3145728,
     array['image/jpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/webm']),
  ('gonullu-belgeleri', 'gonullu-belgeleri', false, 5242880,
     array['application/pdf', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- Yükleme KOTASI (güvenlik denetimi O3 / S5): bir kullanıcı sınırsız nesne yükleyip depolamayı dolduramaz.
--   soru-ekleri       : yükleyen başına SON 24 SAATTE en çok 30 nesne
--   gonullu-belgeleri : yükleyen başına TOPLAM en çok 5 nesne (volunteer_documents tablosundaki sınırla aynı)
-- Sayı storage.objects.owner_id üzerinden alınır (Storage API owner_id'yi JWT'den yazar).
-- DİKKAT: Bu fonksiyon VOLATILE olmalı ve politikada `(select ...)` SARMALAMADAN çağrılmalıdır:
--   * VOLATILE: aynı INSERT sorgusunda önceki satırları da görür (tek sorguda toplu ekleme kotayı aşamaz),
--   * `(select f())` sarmalı tek sefer (initPlan) hesaplanır ve satır başına sayımı bozardı.
-- Yetim nesneler (yüklendi ama ask_question / volunteer_documents kaydı oluşmadı) backend'in cleanup işinde
-- silinir; bu kota o temizlik yetişene kadar kötüye kullanımı sınırlar.
-- Sınırları değiştirmek için bu fonksiyonu yeni bir migration'da güncelleyin.
-- ---------------------------------------------------------------------
create or replace function private.storage_kota_uygun(p_bucket text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_adet bigint;
begin
  if v_uid is null then
    return false;
  end if;

  -- Aynı kullanıcının EŞZAMANLI yüklemeleri sıraya girer (güvenlik yeniden denetimi N5): kilit olmadan iki işlem
  -- aynı anda "29 nesne var" görüp ikisi de ekleyebilir ve kota aşılırdı. Kilit işlem sonunda (commit/rollback)
  -- kalkar; aynı işlemde tekrar alınması sorun değildir (satır satır sayımda her satır için çağrılır).
  -- Kullanıcı + bucket bazlıdır: bir bucket'taki yükleme diğerini beklemez.
  perform pg_advisory_xact_lock(hashtextextended('storage_kota:' || v_uid::text || ':' || p_bucket, 0));

  if p_bucket = 'soru-ekleri' then
    select count(*) into v_adet
    from storage.objects o
    where o.bucket_id = 'soru-ekleri'
      and o.owner_id = v_uid::text
      and o.created_at > now() - interval '24 hours';
    return v_adet < 30;
  elsif p_bucket = 'gonullu-belgeleri' then
    select count(*) into v_adet
    from storage.objects o
    where o.bucket_id = 'gonullu-belgeleri'
      and o.owner_id = v_uid::text;
    return v_adet < 5;
  end if;

  return false;
end;
$$;

revoke all on function private.storage_kota_uygun(text) from public, anon, authenticated, service_role;
grant execute on function private.storage_kota_uygun(text) to authenticated;

-- ---------------------------------------------------------------------
-- soru-ekleri
-- ---------------------------------------------------------------------
-- Yükleme: öğrenci kendi klasörüne; gönüllü yalnızca kendisine atanmış açık
-- sorunun klasörüne (yol kuralları private.can_upload_question_object içinde).
create policy soru_ekleri_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'soru-ekleri'
    and (select private.can_upload_question_object(name))
    and private.storage_kota_uygun('soru-ekleri')      -- (select ...) ile SARMALANMAZ: bkz. kota notu
  );

-- Okuma/imzalı URL: yükleyen (hesabı AKTİFSE), yönetici (aal2) veya eki GÖREBİLEN kullanıcı.
-- "Eki görebilen": attachments -> question_messages -> can_access_question
-- zinciri (RLS), gizlenmiş mesajın eki dahil edilmez.
-- Yükleyen dalı yalnızca Storage'ın INSERT ... RETURNING davranışı için vardır (bkz. dosya başı notu).
create policy soru_ekleri_select on storage.objects for select to authenticated
  using (
    bucket_id = 'soru-ekleri'
    and (
      (owner_id = (select auth.uid())::text and (select private.active_role()) is not null)
      or (select private.is_admin())
      or exists (select 1 from public.attachments a where a.storage_path = objects.name)
    )
  );

-- ---------------------------------------------------------------------
-- gonullu-belgeleri
--   Gönüllü: yalnızca kendi klasörüne yükler (başvuru aşamasındayken).
--   Yönetici (aal2): okur. Silme: servis rolü (cleanup), karar sonrası ≤ 30 gün.
-- ---------------------------------------------------------------------
create policy gonullu_belgeleri_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'gonullu-belgeleri'
    and (select private.can_upload_volunteer_document(name))
    and private.storage_kota_uygun('gonullu-belgeleri')   -- (select ...) ile SARMALANMAZ: bkz. kota notu
  );

-- Yükleyen kendi nesnesini okuyabilir (hesabı AKTİFSE). Gerçek Supabase'te yalnızca INSERT ile yüklemenin
-- çalıştığı doğrulanırsa bu politika KALDIRILABİLİR (docs/veri-modeli.md, açık sorunlar).
create policy gonullu_belgeleri_select_owner on storage.objects for select to authenticated
  using (
    bucket_id = 'gonullu-belgeleri'
    and owner_id = (select auth.uid())::text
    and (select private.active_role()) is not null
  );

create policy gonullu_belgeleri_select_admin on storage.objects for select to authenticated
  using (
    bucket_id = 'gonullu-belgeleri'
    and (select private.is_admin())
  );
