# Gerçek Supabase ile uçtan uca deneme adımları

Amaç: canlı projede (yghhjtydetzjiuryczdq) tüm akışı bir kez baştan sona çalıştırmak. Hesapları siz açarsınız;
gerçek e-posta kodu gerektiği için bu adımlar otomatikleştirilemez. Sahte (çocuk) veri kullanın, gerçek çocuk bilgisi girmeyin.

## 0. Hazırlık (bir kez)
1. `web/.env.local` içinde `SUPABASE_URL` ve `SUPABASE_PUBLISHABLE_KEY` dolu olmalı (doldu).
2. Supabase paneli → Authentication → Email Templates → "Confirm signup" ve "Magic link" şablonlarında kod için
   `{{ .Token }}` kullanılmalı (6 haneli kod e-postada görünsün).
3. Sunucuyu başlatın: `npm --prefix web run dev` → http://localhost:3000
4. İki ayrı e-posta adresi hazırlayın: biri veli (herhangi), biri gönüllü (**.edu.tr** ile biten). Üçüncü bir
   e-posta yönetici içindir (veli olarak açılacak, çocuğu olmayacak).

## 1. Veli ve çocuk
1. `/kayit/veli` → iki onayı işaretleyin, e-postaya gelen kodu girin.
2. `/veli/panel` → "Çocuk ekle" (`/veli/cocuk-ekle`): 8. sınıf, kullanıcı adı ve şifre belirleyin; açık rıza ekranını onaylayın.
3. Beklenen: çocuk hesabı oluşur; `/giris/ogrenci` ile kullanıcı adı + şifreyle giriş yapılır.

## 2. Gönüllü başvurusu
1. `/basvuru` → .edu.tr e-postayla başvurun. Beklenen: durum "başvuru".

## 2b. Gönüllü taahhütnamesi
1. Gönüllü olarak giriş yapın → `/gonullu/pano` üstündeki uyarıdan **Taahhütnameyi oku ve onayla** (`/gonullu/taahhut`).
2. 11 maddeyi tek tek işaretleyin (eksik bırakırsanız o madde altında uyarı çıkar) → "Taahhüt ediyorum".
3. Bu yapılmadan yönetici başvuruyu **onaylayamaz** (ekranda "onayı eksik" yazar; veritabanı da reddeder).

## 3. Yönetici (sıra önemli)
1. Üçüncü e-postayla `/kayit/veli` ile hesap açın (çocuk eklemeyin).
2. Giriş yapıp **`/mfa`** adresine gidin: QR'ı bir doğrulayıcı uygulamayla okutun, 6 haneli kodu girin.
   (Yönetici yapılmadan önce doğrulanmış TOTP faktörü şarttır.)
3. Supabase paneli → SQL Editor'de çalıştırın:
   `select private.grant_admin('yonetici-eposta-adresiniz');`
4. Çıkış yapıp yeniden girin → `/mfa` ile kodu girin → `/yonetici/basvurular` açılır.
5. Gönüllü başvurusunu **Onayla**. Gönüllünün ders/sınıf kaydı (8. sınıf Matematik) başvuru sırasında seçilmiş olmalı.

## 4. Eşleştirme
1. Yönetici: `/yonetici/eslestirme` → öğrenci ve gönüllü seçin → "Eşleşme öner".
2. Veli: `/veli/dersler` → "Eşleşme önerisi" kartında **Onaylıyorum**.

## 5. Soru-cevap
1. Öğrenci: `/ogrenci/sorular/yeni` → metin yazın ve bir fotoğraf ekleyin (telefon numarası yazmayı deneyin: maskelenmeli).
2. Gönüllü: `/gonullu/pano` → havuzdaki soruyu **Üstlen** → cevap yazın.
3. Öğrenci: cevabı görün, takip sorusu yazın, **Anladım, soruyu kapat**.
4. Veli: `/veli/sorular` salt okunur görünür.

## 6. Ders ve geri bildirim
1. Gönüllü: `/gonullu/dersler` → yarın 17:00 için Meet bağlantısıyla ders planlayın (geçersiz bağlantı ve 21:00 sonrası reddedilmeli).
2. Öğrenci ve veli: dersi görür, "Derse katıl" bağlantısı yeni sekmede açılır; iptal deneyin.
3. Geçmiş bir ders için (SQL ile başlangıç zamanını geçmişe alarak) geri bildirim formu görünür; gönderin.
4. Yönetici: `/yonetici/olcum` özetini görün.

## 7. Veli özeti
`/veli/ozet` → plan, soru ve ders sayıları; "Yazdır" ile önizleme.

## Sorun olursa
- Sunucu günlüğü: terminalde `npm run dev` çıktısı. Hata mesajını bana yapıştırın.
- Giriş sonrası beklenmedik sayfaya atılıyorsanız hesabın rolünü kontrol edin: `select role, status from profiles where id = ...`.
