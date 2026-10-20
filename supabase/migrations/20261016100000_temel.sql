-- =====================================================================
-- 01 · TEMEL YAPI
-- Eğitim Köprüsü · docs/plan.md bölüm 5, 9.1
--
-- Bu dosya: "private" şeması, ortak küçük yardımcılar ve varsayılan
-- yetkilerin sıkılaştırılması. Tablolar sonraki dosyalarda.
-- =====================================================================

-- ---------------------------------------------------------------------
-- "private" şeması
-- İçindeki fonksiyonlar (RLS yardımcıları, tetikleyiciler) PostgREST ile
-- DIŞARIYA AÇILMAZ; config.toml [api].schemas listesinde yalnızca "public"
-- vardır. İstemci bu fonksiyonları RPC olarak çağıramaz, ama RLS politikaları
-- (kullanıcının rolüyle çalışır) çağırabilsin diye "authenticated" rolüne
-- USAGE veriyoruz.
-- ---------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

comment on schema private is
  'İstemciye açılmayan yardımcılar: RLS yardımcı fonksiyonları, tetikleyiciler, denetim kaydı yazıcısı.';

-- ---------------------------------------------------------------------
-- Varsayılan yetkiler: "yeni nesne = erişim yok"
-- Supabase eskiden her yeni tabloyu anon/authenticated/service_role'e
-- otomatik açardı. Biz bunu kapatıyoruz; her tablo için GRANT'i bilerek
-- (06_rls_politikalari.sql içinde) yazıyoruz. Böylece yeni eklenen bir
-- tablo, RLS'si unutulsa bile istemciye açılmaz.
-- ---------------------------------------------------------------------
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;

-- FONKSİYONLAR: Postgres her yeni fonksiyonu varsayılan olarak PUBLIC'e (yani anon dahil herkese)
-- çalıştırılabilir yapar; üstelik bunu "şemaya özel" ayar geri alamaz. Bu yüzden KÜRESEL varsayılanı
-- (postgres rolü için) kapatıyoruz: backend'in yazacağı yeni bir SECURITY DEFINER fonksiyon
-- REVOKE unutulsa bile anon/authenticated tarafından çağrılamaz; çağrılabilir olması için
-- açıkça GRANT EXECUTE gerekir (güvenlik denetimi S4 / D1).
alter default privileges for role postgres revoke execute on functions from public;

-- Eklenti fonksiyonları (extensions şeması: pgcrypto, pgtap, uuid-ossp...) eskisi gibi herkese açık kalsın;
-- aksi halde sonradan kurulan eklentiler çalışmaz.
create schema if not exists extensions;
alter default privileges for role postgres in schema extensions grant execute on functions to public;

-- ---------------------------------------------------------------------
-- Güvenli ad denetimi (gönüllünün ad, soyad, üniversite, bölüm alanları)
-- Çocuğa ve veliye GÖSTERİLEN metinlerde iletişim kanalı açılmasın diye yalnızca:
--   harf (Latin + Türkçe + Avrupa harfleri), tek boşluk, kesme (' ve ’), tire.
-- Rakam, @, :, /, bölünemez boşluk (U+00A0, U+2007, U+202F, U+3000), sıfır genişlikli
-- karakterler ve ardışık ayraçlar REDDEDİLİR (CHECK içinde kullanılır; reddetme, "temizleme"den güvenlidir).
-- Harf aralıkları kod noktasıyla yazılır (veritabanının dil ayarına bağlı olmasın).
-- Not: CHECK içinde çağrıldığı için authenticated'a EXECUTE verilir (yalnızca saf bir metin denetimi).
-- ---------------------------------------------------------------------
create or replace function private.is_safe_name(p_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    p_text ~ '^[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F]+([ ''’-][A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u024F]+)*$',
    false);
$$;

comment on function private.is_safe_name(text) is
  'Yalnızca harf, tek boşluk, kesme ve tireden oluşan metin mi? (ad / soyad / üniversite / bölüm)';

-- ---------------------------------------------------------------------
-- updated_at tetikleyicisi (değiştirilebilen tüm tablolarda kullanılır)
-- ---------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
