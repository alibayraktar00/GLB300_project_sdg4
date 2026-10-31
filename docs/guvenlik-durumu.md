# Güvenlik durumu (31 Ekim 2026)

Bu belge, son geliştirme turunda yapılan güvenlik işlerini ve bilinçli kararları kısaca toplar. Avukat/uzman incelemesinin yerini tutmaz.

## Bu turda yapılanlar
| Alan | Değişiklik |
|------|-----------|
| CSP | **Zorunlu moda geçti** (`CSP_ENFORCED = true`). Nonce'lu `script-src`, `eval` yok. Düz HTTP'de `upgrade-insecure-requests` eklenmez (yerel deneme bozulmasın); HTTPS'te eklenir. |
| Zod | `jitless` açıldı: `new Function` kullanılmaz, `unsafe-eval` hiç gerekmez (`src/lib/zod-config.ts`). |
| CSP testi | `e2e/csp-ihlal.spec.ts`: ana sayfalar ve önizlemeler `securitypolicyviolation` olayı üretmemeli. |
| Yükleme ucu | `/api/soru-eki`: bildirilen gövde boyutu okunmadan önce denetlenir, oturum başına dakikada 20 yükleme sınırı. |
| Giriş | Hesap başına 10 dakikada 10, adres başına 40 deneme sınırı (Supabase'in kendi sınırına ek, en iyi çaba). |
| Ders bağlantısı | Ekranda `href`e yalnızca `https` + Meet/Zoom alan adı girer (`safeMeetingUrl`); veritabanında zaten CHECK vardır. |
| Veritabanı | Migration 14: `public.rls_auto_enable()` anon/authenticated rollerinden kapatıldı (Supabase uyarısı 0028/0029). |
| Yönetici | MFA (TOTP) ekranı `/mfa`; yönetici sayfaları aal2 olmadan açılmaz; RPC'ler `private.is_admin()` ister. |

| Gönüllü onayı | Migration 15: taahhüt + davranış kuralları onayı olmadan `review_volunteer('onayla')` reddedilir (`RIZA_EKSIK`); ekranda onay düğmesi de kapalı. Gönüllü için `/gonullu/taahhut` (11 madde, tek tek işaret). |
| Engel ve şikayet | Migration 17: `block_volunteer` RPC (öğrenci/veli engelleyebilir; eşleşme biter, planlı dersler iptal olur). Öğrenci/veli ekranında "Gönüllüyü engelle", her mesajda "Bildir" (neden listeden). Yönetici `/yonetici/sikayetler` kuyruğu: şikayeti incelemeye al/kapat, engeli incelendi işaretle. |

## Güvenlik danışmanı çıktısı (supabase db advisors, bilinçli kararlar)
- **5 × `security_definer_view`** (matched_students, matched_volunteers_for_student/guardian, matched_student_plan_items, my_pending_consents): **bilerek**.
  Bu görünümler gönüllüye yalnızca izinli sütunları (kısa ad, konu listesi) gösterir; ham tablo okuması kapalıdır. Her biri `auth.uid()` /
  `is_guardian_of` ile süzülür ve `security_barrier` taşır.
- **`authenticated_security_definer_function_executable` (RPC'ler)**: **bilerek**. Her RPC içeride `auth.uid()` ve rol/yetki denetimi yapar;
  `anon` hiçbirini çalıştıramaz. İzin listesi `001_sema_korumalari.test.sql` ile korunur: yeni bir RPC listeye eklenmeden testi geçemez.

## Hâlâ açık / insan kararı gerektirenler
- Migration 14-17 uzak veritabanına uygulandı (31 Ekim 2026).
- Gerçek e-posta ve MFA akışı canlıda denenmedi (`docs/deneme-adimlari.md`).
- Yasal metinler taslak; avukat incelemesi şart (`docs/hukuk/`).
- Sızma testi / dış güvenlik incelemesi yapılmadı.
- Oran sınırları bellekte ve örnek başınadır; sunucusuz ortamda yan yana çok örnek varsa kalıcı bir sınırlayıcı (ör. Upstash/Vercel KV) gerekir.
- İzleme: CSP ihlal raporları `/api/csp-report` ucuna gelir; günlüklere bakacak bir kişi atanmalı.
