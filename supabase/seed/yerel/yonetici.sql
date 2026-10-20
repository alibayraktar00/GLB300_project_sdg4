-- =====================================================================
-- YALNIZCA YEREL GELİŞTİRME: seed'deki yonetici@ornek.test hesabını yönetici yapar.
--
-- Bu dosya config.toml [db.seed].sql_paths içinde DEĞİLDİR: `db reset` ile çalışmaz, uzak projeye
-- hiçbir yolla gönderilmez. Elle çalıştırılır (yerel Studio SQL düzenleyicisi veya psql).
--
-- Sıra (grant_admin doğrulanmış bir TOTP faktörü olmadan REDDEDER):
--   1) yonetici@ornek.test / Test1234! ile uygulamadan veya web panelinden giriş yap.
--   2) Profil > Güvenlik'ten TOTP (authenticator uygulaması) kaydı yap ve kodu DOĞRULA.
--   3) Bu dosyayı çalıştır.
--   4) Çıkış yapıp yeniden giriş yap; TOTP kodunu gir (oturum aal2 olur). Yönetici yetkisi, son 12 saatte
--      TOTP doğrulaması yapılmış oturumlarda geçerlidir.
-- =====================================================================
select private.assert_seed_allowed();                 -- uzak projede / gerçek kullanıcı varken DURUR
select private.grant_admin('yonetici@ornek.test');
