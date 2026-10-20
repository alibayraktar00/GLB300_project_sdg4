-- =====================================================================
-- GERİ ALMA (YALNIZCA GELİŞTİRME) · 20261016100000 ... 20261016100600 migration'larını geri alır
--
-- !!! BU DOSYA TÜM TABLOLARDAKİ VERİYİ SİLER. ÜRETİMDE ÇALIŞTIRMAYIN. !!!
--
-- Supabase CLI "down" migration desteklemez; geliştirmede geri alma yolu `supabase db reset`tir
-- (veritabanını sıfırlar, migration'ları baştan uygular). Bu dosya, reset yapmadan yalnızca
-- ilk şemayı kaldırmak isteyenler (ör. uzak dev projesinde temiz başlangıç) içindir.
-- Üretimde geri alma = geri alan YENİ bir migration yazmaktır (ileri doğru düzeltme).
--
-- Çalıştırdıktan sonra migration geçmişini de düzeltin:
--   supabase migration repair --status reverted 20261016100000 20261016100100 ... 20261016100600
-- =====================================================================

-- auth.users üzerindeki tetikleyiciler (private fonksiyonlarına bağlı)
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_email_changed on auth.users;

-- Storage: politikalar, nesneler, bucket'lar (nesneleri silmeden bucket silinemez)
drop policy if exists soru_ekleri_insert on storage.objects;
drop policy if exists soru_ekleri_select on storage.objects;
drop policy if exists gonullu_belgeleri_insert on storage.objects;
drop policy if exists gonullu_belgeleri_select_owner on storage.objects;
drop policy if exists gonullu_belgeleri_select_admin on storage.objects;
delete from storage.objects where bucket_id in ('soru-ekleri', 'gonullu-belgeleri');
delete from storage.buckets where id in ('soru-ekleri', 'gonullu-belgeleri');

-- public şemasındaki tüm tablolar ve (bağlı) görünümler
do $$
declare
  r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;
end $$;

-- private şema: yardımcı fonksiyonlar ve tetikleyici fonksiyonları
drop schema if exists private cascade;

-- public şemasındaki RPC'ler (Web Push)
drop function if exists public.register_push_subscription(text, text, text, text);
drop function if exists public.remove_push_subscription(text);
