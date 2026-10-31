# Rapor ↔ proje uyum tablosu

Kaynak: `GLB 300 Project Form.docx` (proje formu). Son güncelleme: 30 Ekim 2026.
Amaç: raporda **yazan her iddianın** kodda karşılığı olup olmadığını dürüstçe göstermek. "Uygulandı" yalnızca
testle doğrulanmış kısımlar içindir. Gerçek bir Supabase projesinde uçtan uca denenmesi gereken yerler ayrıca belirtilmiştir.

## 1. Özellikler (rapor bölüm 5)

| Rapordaki iddia | Durum | Nerede |
|---|---|---|
| Yalnızca **8. sınıf Matematik** | **Uygulandı** (arayüz kapsamı) | `web/src/lib/scope.ts`; plan sihirbazı ve çocuk ekleme yalnızca 8. sınıf Matematik sunar |
| **Kişisel telafi planı:** öğrenci kaçırdığı haftaları seçer, küçük günlük hedefler | **Uygulandı** | `create_recovery_plan`, `get_today_tasks`, `complete_plan_item` (37 test); plan sihirbazı ve "Bugün" ekranı |
| Yorgun günler için **5 dakikalık kolay tekrar** | **Uygulandı** | "Bugün" ekranı: 5 dakika / Tam ders |
| **Fotoğraflı soru desteği:** öğrenci fotoğraf gönderir, gönüllü adım adım açıklar | **Uygulandı** (sunucu + ekranlar; gerçek Supabase ile uçtan uca deneme sırada) | `ask_question`, `post_message`, `claim_question`, `close_question` (48 test). Ekranlar: öğrenci soru sor/sorularım/ayrıntı, gönüllü pano/cevap, veli salt okunur; fotoğraf tarayıcıda küçültülür, EXIF silinir |
| **Birebir çevrimiçi ders, 30-40 dk, Google Meet / Zoom bağlantısı** | **Sunucu tarafı uygulandı; ekran YOK** | `schedule_session`, `set_session_link`, `cancel_session`; bağlantı yalnızca Meet/Zoom adres biçimi (44 test). Ders süreleri 20/30/40 dk. Arayüz sırada |
| Gönüllü öğrenci kartı yükler | **Şema hazır; yükleme ve yönetici ekranı YOK** | `volunteer_documents` + Storage kuralları; ekranlar yapılmadı |
| Gönüllü eğitimi, sonunda gönüllülük belgesi | **YOK** | Eğitim metni `docs/hukuk/gonullu-davranis-kurallari.md` içinde; belge üretimi yapılmadı |
| Okula dönüşte öğretmen tamamlanan konuları görür | **YOK** | Aşama 2 olarak planlanmıştı ("Köprü Raporu"); raporda paydaş faydası olarak yazılı. Küçük bir çözüm: veliye yazdırılabilir ilerleme özeti |

## 2. Güvenlik sözleri (rapor bölüm 9)

| Söz | Durum |
|---|---|
| Veli çocuğun hesabını açar | **Uygulandı** (`create-child-account`; Supabase'te henüz denenmedi) |
| Gönüllüler öğrenci kartı gönderir | Şema hazır, ekran YOK (yukarıya bakın) |
| **Mesajlarda telefon numarası ya da sosyal medya bağlantısı olamaz** | **Uygulandı** (migration 09, 51 test): sunucuda maskelenir, yönetici kuyruğuna düşer. En az çaba filtresidir; her hileyi yakalamaz, bu yüzden "Bildir" düğmesi ve yönetici incelemesi ikinci hattır (bildir ekranı henüz YOK) |
| Veli onayı, KVKK, sağlık bilgisi toplamama | **Uygulandı** (açık rıza ekranı, sağlık sorusu yok, veri minimizasyonu) |

## 3. Ölçüm (rapor bölüm 8)

| Ölçüt | Durum |
|---|---|
| Tamamlanan eksik konu yüzdesi | Veri toplanıyor (`plan_items`); **toplu rapor ekranı yok** |
| Memnuniyet > %80 (hafta 7 testi) | **Anket mekanizması YOK**. Hafta 7'den önce kısa bir geri bildirim formu gerekir |
| Haftalık oturum katılımı > %85 | Şemada `sessions.status` (tamamlandı / gelinmedi) var; **işaretleme ekranı ve rapor YOK** |

## 4. Raporda düzeltmenizi önerdiğim ifadeler

1. **"these students only get a few hours of lessons every week"** (bölüm 3). MEB rehberi ortaokul düzeyinde evde eğitimi haftada yaklaşık **10 ders saati** olarak planlıyor (kesin rakamı yönetmelik metninden doğrulayın). "Birkaç saat" fazla sert olabilir. Daha güvenli ifade: "MEB provides home or hospital education, but the lesson hours are shared across all subjects, so there is little time left for individual questions."
2. **"Students can choose a 5-minute easy review plan on days when they feel sick"** (bölüm 9). Ürünümüz bilerek sağlık durumu sormuyor ve sağlık dilini kullanmıyor. Raporda da "on low-energy days" demek ürünle tutarlı olur.
3. **"Studies show that sick children get lower marks"** (bölüm 3). Kaynağınız (Jay ve ark., 2023) devamsızlığın başarı farkını **tek başına açıklamadığını** söylüyor. Cümleyi "children with chronic conditions have lower academic attainment, and absence alone does not explain this gap; additional support is needed" biçimine yaklaştırmak doğru olur.
4. **AI Use Statement (bölüm 10) — lütfen düzeltin.** Rapor, Claude Code'un "basic code syntax checking and fixing small database errors" için kullanıldığını ve tasarım/yazılım seçimlerinin öğrenciler tarafından yapıldığını söylüyor. Bu geliştirme sürecinin gerçeğini yansıtmıyor: bu projenin kodu, veritabanı şeması, güvenlik kuralları ve testlerinin büyük kısmı Claude Code (yapay zekâ ajanları) tarafından yazıldı; ekip kapsamı belirledi, seçenekler arasında karar verdi, çıktıları inceledi ve hesapları kurdu. Dersin yapay zekâ politikası sizi bağlar; yanlış ya da eksik beyan akademik dürüstlük sorunu yaratabilir. Önerilen metin:

   > *Claude Code (AI coding assistant) was used extensively to write and review the application code, the database schema, security rules and automated tests, working from requirements and decisions made by the team. The team defined the scope, chose between the design options, reviewed the outputs, set up the accounts and services, and tested the prototype. Generative AI (Gemini) was used to check English spelling and grammar.*

   Aynı bölümün "Computer Engineering Students: Build the website … Create the database …" maddeleri de buna göre "design, review and test" olarak yeniden ifade edilmeli.

## 5. Sırada ne var (öncelik sırasıyla)

1. (Yapıldı) Fotoğraflı soru-cevap ekranları.
2. (Yapıldı) Gönüllü panosu ve ders planlama formu (Meet/Zoom); öğrenci ve veli ders listesi, iptal.
3. (Yapıldı) Yönetici ekranı: gönüllü başvurusu onayı (taahhüt şartlı), eşleştirme, MFA.
4. (Yapıldı) Geri bildirim formu ve ölçüm özeti; veli için yazdırılabilir ilerleme özeti (/veli/ozet).
5. Supabase üzerinde uçtan uca deneme (hesap açıldı; yeni migration'lar 09-11 henüz uzak projeye uygulanmadı).
