-- =====================================================================
-- 081 · TASLAK YASAL METİN KAYITLARI (migration 08)
-- Kayıt ve çocuk ekleme akışları rıza kaydını en güncel yayımlanmış sürüme bağlar; bu kayıtlar olmadan akış durur.
-- =====================================================================
begin;
select plan(8);

select is(
  (select count(*)::int from public.legal_documents where version = 'v0.1-taslak'), 8,
  'sekiz taslak yasal metin türü yayımlanmış');
select is(
  (select count(*)::int from public.consent_types ct
    where ct.code <> all (select doc_type from public.legal_documents where published_at <= now())),
  0, 'her rıza türünün yayımlanmış en az bir metni var (aksi halde o rıza kaydedilemez)');
select ok(
  not exists (select 1 from public.legal_documents where body_md not like 'TASLAK:%' and version = 'v0.1-taslak'),
  'taslak kayıtların hepsi açıkça "TASLAK" diye işaretli (gerçek metin sanılmasın)');
select ok(
  not exists (select 1 from public.legal_documents
              where version = 'v0.1-taslak' and sha256 <> encode(sha256(convert_to(body_md, 'UTF8')), 'hex')),
  'özet değeri metnin gerçek SHA-256 özetidir');

-- anon (kayıttan önce) metinleri okuyabilir; yazamaz
select tests.login_anon();
select ok((select count(*) from public.legal_documents) >= 8, 'anon yasal metin sürümlerini okuyabilir');
select throws_ok(
  $$ insert into public.legal_documents (doc_type, version, sha256, published_at, body_md)
     values ('gizlilik_politikasi', 'x', repeat('a', 64), now(), 'x') $$,
  '42501', null, 'anon yasal metin ekleyemez');
select tests.logout();

select tests.make_fixture();
select tests.login('veli_a');
select throws_ok(
  $$ update public.legal_documents set body_md = 'DEĞİŞTİRİLDİ' where doc_type = 'aydinlatma_veli' $$,
  '42501', null, 'giriş yapmış kullanıcı yasal metni değiştiremez');
select tests.logout();

-- yeniden çalıştırma güvenli: aynı migration ikinci kez çakışma yaratmaz
select lives_ok(
  $$ insert into public.legal_documents (doc_type, version, sha256, published_at, body_md)
     select 'aydinlatma_veli', 'v0.1-taslak', repeat('0', 64), now(), 'x'
     on conflict (doc_type, version) do nothing $$,
  'on conflict do nothing: ikinci uygulama hata vermez ve mevcut kaydı değiştirmez');

select * from finish();
rollback;
