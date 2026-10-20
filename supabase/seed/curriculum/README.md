# Müfredat içeriği: CSV şablonları ve içe aktarma

Bu klasör, **içerik ekibinin** dolduracağı CSV dosyalarını ve onları veritabanına yükleyen
küçük bir aracı içerir. Veritabanı bilgisi gerekmez; Excel / Google Sheets yeterlidir.

> Şu an dosyalardaki **bütün satırlar ÖRNEKTİR** (`ornek` sütunu `TRUE`, kodlar `ORNEK-…`).
> Gerçek içeriği hazırlarken örnek satırları **silin** ve `ornek` sütununu `FALSE` yapın ya da boş bırakın.

## Dosyalar ve sütunlar

Her dosyanın **ilk satırı başlıktır**; sütun adlarını değiştirmeyin. Sütun sırası önemli değildir.
`ornek` sütunu her dosyada vardır: örnek satırlarda `TRUE`, gerçek satırlarda `FALSE`.

| Dosya | Sütunlar | Anlamı |
|---|---|---|
| `academic_years.csv` | `id`, `starts_on`, `ends_on` | Öğretim yılı. `id` örneği: `2026-2027`. Tarih biçimi: `YYYY-AA-GG` |
| `academic_weeks.csv` | `academic_year_id`, `week_no`, `starts_on`, `ends_on`, `is_break`, `note` | Haftalar (1, 2, 3 …). Ara tatil ve yarıyıl tatili haftalarında `is_break=TRUE`. Haftalar çakışmamalı |
| `curriculum_versions.csv` | `code`, `name`, `subject_code`, `grade`, `source_url` | Program sürümü. `subject_code`: `MAT` veya `FEN`. `code` kararlı kısa koddur (ör. `TYMM-MAT-5`) |
| `grade_programs.csv` | `academic_year_id`, `grade`, `subject_code`, `curriculum_version_code` | Hangi yıl, hangi sınıf ve ders için hangi program geçerli (2026-27: 5–7. sınıf TYMM, 8. sınıf önceki program) |
| `units.csv` | `curriculum_version_code`, `seq`, `title` | Üniteler. `seq`: ünite sırası (1, 2, …) |
| `topics.csv` | `code`, `curriculum_version_code`, `unit_seq`, `seq`, `title`, `outcome_code`, `est_minutes`, `summary_md`, `mini_review_md` | Konular. `code` her konu için **benzersiz ve değişmeyen** koddur (ör. `TYMM-MAT-5-U1-K2`). `summary_md`: özet (Markdown), `mini_review_md`: "5 dakika" tekrarı |
| `weekly_topics.csv` | `academic_year_id`, `grade`, `subject_code`, `week_no`, `seq`, `topic_code` | **Haftalık konu tablosu.** Bir haftada bir dersin birden çok konusu olabilir (`seq`). Tatil haftasına konu yazılamaz |
| `resources.csv` | `topic_code`, `kind`, `title`, `url`, `provider`, `mode`, `est_minutes`, `requires_login`, `offline_ok`, `is_active` | Konu başına dış kaynak. `kind`: `baglanti` (dış bağlantı), `ozet` (uygulama içi kısa özet), `pdf`. `mode`: `kisa`, `tam` veya `ikisi`. `requires_login`: EBA girişi gerekiyor mu |

Kurallar:
- Bağlantılar yalnızca **`https://`** ile başlar. İçerik kopyalanmaz, yalnızca bağlantı verilir (telif).
- `summary_md` gibi uzun metinlerde virgül ve satır sonu kullanacaksanız metni **çift tırnak** içine alın.
  Tırnağın kendisi için `""` yazın. Excel bunu kendisi yapar.
- Hiçbir dosyaya **sağlık, hastalık veya kişisel bilgi** yazmayın.
- Excel (Türkçe) dosyayı **"CSV UTF-8 (virgülle ayrılmış)"** olarak kaydedin. Noktalı virgül (`;`) ayraçlı
  dosyalar ve BOM da otomatik tanınır. Ayraç, başlık satırından bulunur; tırnak içindeki virgül ve `;` sayılmaz.
- Dosya **geçerli UTF-8 olmak zorundadır**. Değilse (ör. Windows-1254 olarak kaydedilmişse) araç Türkçe
  karakterleri sessizce bozmaz; **bozuk ilk satırın numarasını** söyleyip durur.
- Tırnak yalnızca **alanın başında** açılır. Alanın ortasındaki `"` düz karakterdir (ör. `5" tahta`).
  Açılan tırnak kapatılmazsa araç **açıldığı satırı** söyleyip durur (sonraki satırlar sessizce alana karışmaz).
- Veri satırı hiç yoksa (yalnızca başlık) o tablo için SQL üretilmez; **bütün** dosyalar boşsa araç hata verir.

## Çalışma akışı

1. CSV'leri doldurun (örnek satırları silin).
2. Kontrol edin (hiçbir şey yazmaz):
   ```
   node supabase/seed/curriculum/csv-to-migration.mjs --kontrol
   ```
   Hatalar Türkçe ve satır numarasıyla çıkar (ör. `topics.csv satır 14: "TYMM-MAT-5-U9-K1" sürümünde 9. ünite units.csv içinde yok`).
   **Uyarılar** (kaynağı olmayan konu, konusu girilmemiş hafta) hata değildir ama gözden geçirin.
3. Kontrol temizse migration dosyasını üretin:
   ```
   node supabase/seed/curriculum/csv-to-migration.mjs
   ```
   Çıktı: `supabase/migrations/<zaman>_mufredat_icerik.sql`. Başka ad için `--ad mufredat_5_sinif`.
4. Üretilen dosyayı gözden geçirin, git'e ekleyin, yerelde `supabase db reset` ile deneyin.
5. İçerik değişince (yeni konu, düzeltme, yeni kaynak) CSV'yi düzenleyip aracı **yeniden** çalıştırın:
   yeni bir migration üretilir. Üretilen SQL yeniden çalıştırılabilirdir (aynı veriyi iki kez uygulamak çoğaltmaz,
   değişen satırı günceller).

## İçerik güncelleme kuralları

- **Konu silmeyin.** Telafi planlarında kullanılan konular silinemez. Kullanımdan kaldırmak için kaynağı
  `is_active=FALSE` yapın; konunun adını/özetini düzeltmek serbesttir (`code` aynı kalmak şartıyla).
- `code` değerleri **değişmez** anahtarlardır. Kodu değiştirirseniz araç bunu "yeni konu" sayar.
- Haftalık konu tablosu (`weekly_topics.csv`) her çalıştırmada, dosyada geçen **(yıl, sınıf, ders)** üçlüleri için
  veritabanındaki halini dosyadaki hale getirir (dosyadan çıkardığınız satır veritabanından da çıkar).
- Konu sırasını değiştirmek serbesttir (`seq` değerlerini yer değiştirebilirsiniz).
- **Kaynak (resources) anahtarı = konu + başlık.** Bir kaynağın `title` değerini değiştirirseniz araç bunu
  **yeni kaynak** sayar; eski başlıklı satır veritabanında **etkin kalır** (iki kaynak görünür). Eski satırı
  gizlemek için önce eski başlıkla `is_active=FALSE` satırını bir kez uygulayın, ya da başlığı değiştirmeyin.
- **Haftalık konu, programın sürümünden gelmelidir.** `weekly_topics.csv` satırındaki konu, o yıl/sınıf/ders için
  `grade_programs.csv`'nin gösterdiği program sürümüne ait olmalıdır (ör. 2026-27 8. sınıf için TYMM konusu atanamaz).
  Araç bunu hata olarak bildirir; veritabanı da tetikleyiciyle aynı kuralı zorlar. `grade_programs.csv`'de karşılığı
  olmayan (yıl, sınıf, ders) için haftalık konu da eklenemez.

## Güvenlik önlemleri

- `ornek=TRUE` olan satır varsa araç **migration üretmez**. Yalnızca yerelde denemek için `--ornek-izin`
  verilebilir; o durumda üretilen dosyanın başına uyarı yazılır. **Bu dosyayı commit etmeyin.**
- `ORNEK-` ile başlayan kod ya da `ÖRNEK` ile başlayan başlık varsa ama `ornek` işaretlenmemişse araç hata verir.
- Yerel geliştirmede örnek müfredat zaten `supabase/seed/seed.sql` içindedir; gerçek müfredat migration'la yüklenince
  seed bu örnekleri **atlar** (müfredat tabloları boş değilse eklemez).

## Aracın yaptığı kontroller

Dosyanın UTF-8 olması, tırnak/ayraç yapısı, başlık/sütun denetimi, tarih ve sayı biçimleri, `https` bağlantısı,
benzersiz anahtarlar, dosyalar arası başvurular (hafta, sürüm, ünite, konu var mı), konunun ders/sınıfının satırla
uyumu, programın ders/sınıf uyumu, haftalık konunun program sürümüyle uyumu, tatil haftasına konu atanmaması,
haftaların çakışmaması. Veritabanı aynı kuralları ayrıca kısıt ve tetikleyicilerle zorlar.
Üretilen SQL `set local standard_conforming_strings = on;` ile başlar: CSV içeriği hiçbir koşulda SQL olarak yorumlanmaz.

## Aracın kendi testleri

CSV okuyucusu ve üretici için küçük testler vardır (ek paket gerekmez, Node 20+):

```
node --test supabase/seed/curriculum/csv-to-migration.test.mjs
```

(Node 24'te klasör değil, **dosya yolu** verin.) Testler: bozuk UTF-8 (satır numarasıyla), boş CSV (geçersiz SQL
üretmez), kapanmamış tırnak (satır numarasıyla), alan ortasındaki tırnak, tırnak içindeki ayraçla ayraç tespiti,
BOM, CRLF, çok satırlı alan, program sürümü uyumsuzluğu.
