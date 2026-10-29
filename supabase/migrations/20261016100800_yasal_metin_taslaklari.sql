-- =====================================================================
-- 08 · YASAL METİN KAYITLARI (TASLAK SÜRÜMLER)
--
-- Kayıt ve çocuk ekleme akışları, rıza kaydını `legal_documents` içindeki en güncel yayımlanmış sürüme bağlar
-- (consents.doc_version + doc_sha256). Bu tablo boşsa kayıt "onaylar kaydedilemedi" hatasıyla durur; bu yüzden
-- demo için TASLAK sürümler burada yayımlanır.
--
-- ÖNEMLİ: Bunlar avukat incelemesinden GEÇMEMİŞ yer tutucu kayıtlardır (sürüm adı `v0.1-taslak`).
-- Gerçek metinler docs/hukuk/ altındadır ve gerçek pilottan önce:
--   1) avukat incelemesinden geçirilir,
--   2) YENİ bir migration ile yeni sürüm (ör. `v1.0`) olarak yayımlanır (eski satır DEĞİŞTİRİLMEZ),
--   3) kullanıcılardan yeniden onay istenir (public.my_pending_consents görünümü bunu listeler).
-- Sahte veriyle yapılan demoda gerçek çocuk verisi işlenmez (docs/plan.md varsayımları).
-- =====================================================================

insert into public.legal_documents (doc_type, version, sha256, published_at, body_md)
select d.doc_type,
       'v0.1-taslak',
       encode(sha256(convert_to(d.body, 'UTF8')), 'hex'),
       now(),
       d.body
from (values
  ('aydinlatma_veli',            'TASLAK: Veli aydınlatma metni. Gerçek metin docs/hukuk/aydinlatma-veli.md dosyasındadır ve avukat incelemesinden geçmemiştir.'),
  ('kullanim_kosullari',         'TASLAK: Kullanım koşulları. Gerçek metin docs/hukuk/kullanim-kosullari.md dosyasındadır ve avukat incelemesinden geçmemiştir.'),
  ('acik_riza_dolayli_saglik',   'TASLAK: Açık rıza beyanı (AR-1). Gerçek metin docs/hukuk/acik-riza-veli.md dosyasındadır ve avukat incelemesinden geçmemiştir.'),
  ('aydinlatma_gonullu',         'TASLAK: Gönüllü aydınlatma metni. Gerçek metin docs/hukuk/aydinlatma-gonullu.md dosyasındadır ve avukat incelemesinden geçmemiştir.'),
  ('gonullu_davranis_kurallari', 'TASLAK: Gönüllü davranış kuralları. Gerçek metin docs/hukuk/gonullu-davranis-kurallari.md dosyasındadır ve avukat incelemesinden geçmemiştir.'),
  ('gonullu_taahhut',            'TASLAK: Gönüllü taahhütnamesi. Gerçek metin docs/hukuk/gonullu-taahhutname.md dosyasındadır ve avukat incelemesinden geçmemiştir.'),
  ('cocuk_bilgilendirme',        'TASLAK: Çocuk bilgilendirmesi. Gerçek metin docs/hukuk/cocuk-bilgilendirme.md dosyasındadır ve avukat incelemesinden geçmemiştir.'),
  ('cocuk_guvenlik_hatirlatma',  'TASLAK: Çocuğa çevrimiçi güvenlik hatırlatması. Gerçek metin docs/hukuk/cocuk-bilgilendirme.md dosyasındadır ve avukat incelemesinden geçmemiştir.')
) as d(doc_type, body)
on conflict (doc_type, version) do nothing;
