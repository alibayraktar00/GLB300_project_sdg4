-- =====================================================================
-- 09 · İLETİŞİM BİLGİSİ MASKELEME (çocuk güvenliği; proje raporu: "mesajlarda telefon numarası ve
--      sosyal medya bağlantısı paylaşılamaz")
--
-- Kapsam: soru-cevap mesajları (question_messages.body) ve gönüllünün ders notu (sessions.volunteer_note).
-- Çocuğa ya da gönüllüye gösterilen bu serbest metinler platform dışı iletişim kanalı olmasın diye sunucuda,
-- veritabanı tetikleyicisinde süzülür (istemci süzmesine güvenilmez).
--
-- Bulunca: eşleşen kısım "[gizlendi]" ile değiştirilir, mesaj bayrakla işaretlenir ve özgün metin yalnızca
-- yöneticinin görebildiği moderation_flags tablosuna yazılır (saklama SK-10).
--
-- Bilinçli denge: bu bir EN AZ ÇABA filtresidir; her hileyi yakalamaz ("sıfır beş yüz..." gibi yazıyla yazılmış
-- rakamlar, harfleri boşlukla ayrılmış adlar). İkinci savunma hattı: her ekranda "Bildir", yönetici kuyruğu ve
-- "önce askıya al, sonra incele" kuralı. Matematik soruları uzun sayılar içerebilir; bu yüzden telefon kuralı
-- yalnızca 10 ve üzeri rakamlık dizilerde çalışır ve ondalık nokta ayraç sayılmaz.
-- =====================================================================

-- Metindeki iletişim bilgisi türleri (yoksa boş dizi). Sıra sabittir.
create or replace function private.contact_info_reasons(p_text text)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_reasons text[] := '{}';
begin
  if p_text is null or p_text = '' then
    return v_reasons;
  end if;
  -- telefon: 10+ rakam; rakamlar ARASINDA en çok iki boşluk/parantez/tire (nokta ayraç DEĞİL). Bir rakamın ya da
  -- "rakam + nokta/virgül"ün hemen ardından başlayan dizi sayılmaz: uzun ondalık sayılar (3.14159265358979) korunur.
  if p_text ~ '(?<![0-9])(?<![0-9][.,])\+?[0-9]([ ()-]{0,2}[0-9]){9,}' then v_reasons := array_append(v_reasons, 'telefon'); end if;
  if p_text ~* '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}' then v_reasons := array_append(v_reasons, 'eposta'); end if;
  if p_text ~* '(https?://|www\.)[^[:space:]]+'
     or p_text ~* '(?<![@[:alnum:].-])[[:alnum:]-]+\.(com|net|org|info|me|gg|io|tv|co|tr)\y' then
    v_reasons := array_append(v_reasons, 'baglanti');
  end if;
  if p_text ~ '(^|[^[:alnum:]])@[[:alnum:]_.]{3,}' then v_reasons := array_append(v_reasons, 'kullanici_adi'); end if;
  if p_text ~* '\y(whats?app|vatsap|instagram|insta|telegram|snap(chat)?|discord|tiktok|facebook|twitter|skype)\y' then
    v_reasons := array_append(v_reasons, 'uygulama_adi');
  end if;
  return v_reasons;
end;
$$;

-- Eşleşen kısımları "[gizlendi]" ile değiştirir.
create or replace function private.mask_contact_text(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
           regexp_replace(
             regexp_replace(
               regexp_replace(
                 regexp_replace(
                   regexp_replace(coalesce(p_text, ''),
                     '(?<![0-9])(?<![0-9][.,])\+?[0-9]([ ()-]{0,2}[0-9]){9,}', '[gizlendi]', 'g'),
                   '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[[:alpha:]]{2,}', '[gizlendi]', 'gi'),
                 '(https?://|www\.)[^[:space:]]+', '[gizlendi]', 'gi'),
               '(?<![@[:alnum:].-])[[:alnum:]-]+\.(com|net|org|info|me|gg|io|tv|co|tr)\y(/[^[:space:]]*)?', '[gizlendi]', 'gi'),
             '(^|[^[:alnum:]])@[[:alnum:]_.]{3,}', '\1[gizlendi]', 'g'),
           '\y(whats?app|vatsap|instagram|insta|telegram|snap(chat)?|discord|tiktok|facebook|twitter|skype)\y',
           '[gizlendi]', 'gi');
$$;

-- ---------------------------------------------------------------------
-- Mesajlar: ekleme sırasında süz, bayrakla, özgün metni yönetici kuyruğuna yaz.
-- (question_messages değiştirilemez; güncelleme zaten 05 tetikleyicisiyle kapalı.)
-- ---------------------------------------------------------------------
create or replace function private.question_messages_maskele()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reasons text[] := private.contact_info_reasons(new.body);
begin
  if cardinality(v_reasons) > 0 then
    insert into public.moderation_flags (entity, entity_id, author_id, reasons, original_body)
    values ('mesaj', new.id, new.sender_id, v_reasons, new.body);
    new.body := private.mask_contact_text(new.body);
    new.has_flag := true;
  end if;
  return new;
end;
$$;

create trigger question_messages_maskele
  before insert on public.question_messages
  for each row execute function private.question_messages_maskele();

-- ---------------------------------------------------------------------
-- Ders notu: ekleme ve DEĞİŞİKLİKTE süz (tek seferlik yazım kuralı ayrıca RLS'tedir).
-- ---------------------------------------------------------------------
create or replace function private.sessions_note_maskele()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reasons text[];
begin
  if new.volunteer_note is null or new.volunteer_note is not distinct from old.volunteer_note then
    return new;
  end if;
  v_reasons := private.contact_info_reasons(new.volunteer_note);
  if cardinality(v_reasons) > 0 then
    insert into public.moderation_flags (entity, entity_id, author_id, reasons, original_body)
    values ('ders_notu', new.id, (select auth.uid()), v_reasons, new.volunteer_note);
    new.volunteer_note := private.mask_contact_text(new.volunteer_note);
  end if;
  return new;
end;
$$;

create trigger sessions_note_maskele
  before update of volunteer_note on public.sessions
  for each row execute function private.sessions_note_maskele();

comment on function private.contact_info_reasons(text) is
  'Metinde telefon (10+ rakam), e-posta, bağlantı, @kullanıcı adı ya da sosyal medya uygulaması adı varsa nedenlerini döndürür. En az çaba filtresi: her hileyi yakalamaz.';
comment on function private.mask_contact_text(text) is
  'İletişim bilgisi eşleşmelerini "[gizlendi]" ile değiştirir.';
