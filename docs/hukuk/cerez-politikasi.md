# Çerez ve Cihaz Belleği Politikası

> **TASLAKTIR – Yayınlamadan önce bir avukat tarafından incelenmelidir.** Bu metin avukat görüşünün yerini tutmaz.
> Sürüm `cerez v0.1` · 18.10.2026.
> - §1 ekip içindir.
> - §2, herkese açık `/cerezler` sayfasında yayımlanacak metindir. `legal_documents` tablosuna `doc_type = cerez` olarak eklenir. Bu bir rıza türü değildir; `consents` tablosuna yazılmaz.
> - Çerez ve anahtar adları kesinleşince (`tasarimci` / `backend`) §2'deki tablo güncellenir.

## 1. Değerlendirme: onay bandı gerekiyor mu? (ekip için)

**Dayanak.** KVKK'da çerezlere özgü bir hüküm yoktur; çerezle kişisel veri işleniyorsa m.5 ve m.6 uygulanır. KVKK Çerez Uygulamaları Hakkında Rehber'in (Temmuz 2025; resmî PDF okundu) yaklaşımı şöyledir:
- Açık rıza dışındaki bir şart varsa rıza istenmez.
- Kullanıcının **açıkça talep ettiği** hizmet için kesinlikle gerekli çerezler ("Kriter B") rıza gerektirmez. Örnekler: kimlik doğrulama, kullanıcı girdisi, güvenlik, kullanıcının bir düğmeyle seçtiği arayüz tercihi, rıza tercihinin hatırlanması.
- Analitik, reklam ve takip çerezleri rıza gerektirir. Rıza panelinde "Kabul et", "Reddet" ve "Tercihler" eşit ağırlıkta sunulur ve rızaya tabi çerezler varsayılan olarak kapalıdır.
- Rehber localStorage gibi benzer teknolojiler için ayrıca yön göstermez. Bu belgede aynı mantık bunlara da uygulanır.

**Bizdeki durum:** Analitik, reklam, sosyal medya eklentisi ve üçüncü taraf betik yok (`cocuk-koruma-kurallari.md` A10).

| Teknoloji | Değerlendirme |
|---|---|
| Oturum çerezi (httpOnly) | Kimlik doğrulama, Kriter B. **Önemli:** Rehber, tarayıcı oturumları arasında kalıcı olan kimlik doğrulama çerezlerini Kriter B'ye **dahil etmez** ve "beni hatırla" seçeneği önerir. `@supabase/ssr` varsayılan olarak 400 günlük kalıcı çerez yazar. Mevcut `web/src/lib/session-cookies.ts` httpOnly, Secure ve SameSite'ı zorluyor, ama `maxAge` vermediği için bu varsayılan büyük olasılıkla geçerli kalıyor (doğrulanmalı). **Öneri:** Varsayılan olarak tarayıcı oturumu çerezi kullanılır (Max-Age yok). Kullanıcı girişte "Bu cihazda oturumum açık kalsın" kutusunu (varsayılan boş) işaretlerse çerez `[30 gün]` kalıcı olur. Teknik uygulanabilirliği spike'ta denenmeli; iOS ana ekran uygulamasında oturum çerezinin davranışına bakılmalı. |
| Görünüm tercihleri, hafif mod, son seçilen mod (localStorage) | Kullanıcı arayüzü tercihi, Kriter B. Ancak yalnızca kullanıcı bir ayarı **değiştirdiğinde** yazılır; varsayılanlar sistem ayarından okunur. Ayarın yanında "Bu ayar yalnızca bu cihazda saklanır." yazar. Rehber, açık bir bilgi verilmeden seçimin oturum süresinden uzun hatırlanmasının istendiğinin varsayılamayacağını söylüyor. Sunucuya gönderilmez. |
| Gönüllü cevap taslağı (localStorage) | Kullanıcı girdisi, Kriter B. Gönderilince ve çıkışta silinir; en fazla `[7 gün]` saklanır. Ekranda "Taslak bu cihazda saklanıyor" yazar. |
| Service worker: uygulama kabuğu (JS, CSS, yazı tipi) | Kişisel veri içermez; Rehber kapsamı dışında. |
| Service worker: öğrenci sayfalarının çevrimdışı önbelleği (Cache Storage) | Kişisel veri içerir (plan, konu sayfaları). Çevrimdışı okuma tanıtılan bir hizmettir (m.5/2-c). Ancak kullanıcı bunu "açıkça talep" etmedikçe Kriter B tartışmalıdır. **Öneri:** Öğrencinin ilk girişinde "Planın internetsiz de açılsın mı?" diye sorulur. Seçim yapılana kadar sayfa önbelleği kapalıdır. Çıkışta silinir. |
| Push aboneliği | Kullanıcı düğmeye basarak ve tarayıcı iznini vererek açıkça talep eder. Kriter B. İsteğe bağlıdır. Push servisleri için bkz. `veri-envanteri.md` §4. |
| Bilgilendirme notunun kapatıldığının hatırlanması (localStorage) | Rıza veya tercih yönetimi kaydının benzeri, Kriter B. |
| `8x8.vc` iframe'i (yalnızca ders sayfası) | Üçüncü tarafın kendi alanında kullandığı çerez ve yerel depolama. Tarayıcılar bunu üçüncü taraf bağlamında bölümler. Görüşmenin çalışması için gerekenler Kriter B'dir. **8x8'in analitik veya telemetri amaçlı depolama ya da istek yapıp yapmadığı doğrulanmalı.** Yapıyorsa `configOverwrite` ile kapatılmalı (ör. analitik ve üçüncü taraf istekleri; seçenek adları spike'ta doğrulanır). Kapatılamıyorsa avukatla değerlendirilmelidir. |
| Vercel | Üretimde çerez yerleştirmez. Vercel güvenlik meydan okuması ("Attack Mode") açılırsa geçici bir güvenlik çerezi yerleşebilir (Kriter B, güvenlik; **doğrulanmalı**). Önizleme ortamındaki Vercel Authentication çerezi yalnızca ekip üyelerini ilgilendirir. |

**Sonuç (taslak):**
1. **Rıza bandı gerekmez.** Yukarıdaki koşullar sağlanmalıdır: oturumun kalıcı olması kullanıcı seçimine bağlı, tercihler kullanıcı isteğiyle yazılıyor, çevrimdışı saklama soruluyor, 8x8 telemetrisi kapalı.
2. Zorunlu çerezler için "Kabul et" bandı göstermek de yanlış olur. Başka bir hukuki sebep varken rıza izlenimi verir (Kurul 2026/347; Rehber §10'daki 2020/173 değerlendirmesi).
3. **Aydınlatma yine de gerekir.** Rehber §9'a göre siteye girişte bilgilendirme yapılmalıdır. Uygulama:
   - İlk ziyarette, sayfayı engellemeyen kısa bir **bilgilendirme notu** gösterilir: "Bu site yalnızca çalışması için gereken çerezleri ve cihaz belleğini kullanır. Reklam veya analitik yoktur. Ayrıntı: Çerez Politikası." Notun tek düğmesi "Tamam"dır; "Kabul ediyorum" kullanılmaz.
   - Her sayfanın alt kısmında `/cerezler` bağlantısı bulunur.
   - Aydınlatma metinlerinden çerez politikasına bağlantı verilir.
4. **Tetikleyici kural:** İleride zorunlu olmayan bir teknoloji eklenirse (analitik, hata izleme, oturum kaydı vb.), bu teknoloji çalışmadan önce rıza paneli eklenir. Panelde "Kabul et", "Reddet" ve "Tercihler" eşit ağırlıkta olur. Çocuk hesaplarında bu tür teknolojiler hiç kullanılmaz.

---

## 2. Yayımlanacak metin (`/cerezler`)

# Eğitim Köprüsü Çerez ve Cihaz Belleği Politikası

**Yürürlük:** `[TARİH]` · **Sürüm:** `[1.0]` · **Veri sorumlusu:** `[VERİ SORUMLUSU UNVANI]`, `[E-POSTA]`

Eğitim Köprüsü bir **web uygulamasıdır.** Tarayıcıdan kullanılır, isterseniz telefonunuzun ana ekranına da eklenebilir. Bu sayfa, uygulamanın cihazınızda neleri sakladığını ve neden sakladığını anlatır. Kişisel verilerinizin genel olarak nasıl işlendiği [Gizlilik Politikası](`[GİZLİLİK POLİTİKASI URL]`) sayfasındadır.

**Kısaca:**
- **Reklam, analitik, sosyal medya veya takip çerezi kullanmıyoruz.**
- Yalnızca uygulamanın çalışması ve sizin istediğiniz özellikler için gereken bilgileri saklıyoruz.
- Bu nedenle onay istemiyoruz. Ancak siz isteyince silebileceğiniz biçimde tasarladık.

### Cihazınızda saklananlar

| Ne | Nerede | Neden | Ne kadar süre | Kimin |
|---|---|---|---|---|
| Oturum çerezi (`sb-[proje]-auth-token`; büyük olduğunda `.0`, `.1` diye parçalara bölünebilir) | Çerez. Yalnızca sunucumuz okuyabilir (HttpOnly, Secure, SameSite=Lax); sayfadaki kodlar okuyamaz. | Giriş yaptığınızı hatırlamak | Tarayıcıyı kapatana kadar. "Bu cihazda oturumum açık kalsın" seçeneğini işaretlerseniz en fazla `[30 gün]`. Çıkış yapınca silinir. | Bizim (birinci taraf) |
| Oturum süresi tercihi (`ek-kalici-oturum`) | Çerez (HttpOnly, Secure, SameSite=Lax). Yalnızca "Bu cihazda oturumum açık kalsın" kutusunu işaretlerseniz yazılır. | Oturumunuzun bu cihazda açık kalmasını istediğinizi hatırlamak | Oturum çereziyle aynı (en fazla `[30 gün]`). Çıkış yapınca silinir. | Bizim (birinci taraf) |
| Giriş doğrulama çerezi (`sb-[proje]-auth-token-code-verifier`; yalnızca bazı giriş akışlarında, `[doğrulanacak]`) | Çerez | Giriş işleminin güvenliği | Giriş tamamlanınca silinir | Bizim |
| Görünüm tercihleri: yazı boyutu, tema, yüksek kontrast, animasyon; hafif mod; son seçtiğiniz ders modu (5 dakika / tam ders) | Tarayıcı belleği (localStorage) | Seçtiğiniz görünümün bu cihazda korunması | Siz değiştirene veya çıkış yapana kadar | Bizim. **Sunucuya gönderilmez.** |
| Gönüllü cevap taslağı | Tarayıcı belleği | Yazdığınız cevabın kaybolmaması | Cevabı gönderince, çıkış yapınca veya en fazla `[7 gün]` sonra silinir | Bizim. Sunucuya gönderilmez. |
| Uygulama dosyaları (sayfa düzeni, yazı tipleri, ikonlar) | Service worker önbelleği | Uygulamanın hızlı açılması | Yeni sürüm gelince yenilenir | Bizim. Kişisel veri içermez. |
| Öğrencinin planı, Bugün ekranı ve konu özetleri (**yalnızca öğrenci "internetsiz de açılsın" derse**) | Service worker önbelleği (Cache Storage) | İnternet kesildiğinde planın okunabilmesi | En fazla 14 gün; çıkış yapınca silinir | Bizim |
| Bildirim aboneliği (**yalnızca bildirimleri açarsanız**) | Tarayıcınızın bildirim servisinde ve sunucumuzda | Cevap ve ders hatırlatması gelince haber vermek | Bildirimleri kapatana, çıkış yapana veya 60 gün kullanılmayana kadar | Bizim + tarayıcınızın bildirim servisi (aşağıya bakın) |
| Bilgilendirme notunu kapattığınız bilgisi | Tarayıcı belleği | Notu her seferinde göstermemek | Siz silene kadar | Bizim |
| Görüntülü ders bileşeninin kendi çerezleri ve belleği (**yalnızca ders sayfasında**) | `8x8.vc` alanı | Görüşmenin çalışması (bağlantı, ses ve görüntü ayarları) | 8x8'in belirlediği süre `[doğrulanacak]` | 8x8 (üçüncü taraf, görüntülü ders hizmet sağlayıcımız) |

**Kullanmadıklarımız:**
- reklam ve yeniden hedefleme çerezleri,
- analitik ve istatistik araçları,
- sosyal medya eklentileri,
- tarayıcı parmak izi,
- konum.

### Tarayıcı bildirim servisleri
Bildirimleri açarsanız bildirim, tarayıcınızın kendi bildirim servisi üzerinden gelir:
- Chrome, Samsung Internet ve diğer Chromium tabanlı Android tarayıcıları: Google
- Safari (iPhone/iPad, Mac): Apple
- Firefox: Mozilla
- Edge (Windows): Microsoft

Bildirimin içeriği **şifreli** gönderilir; bu servisler okuyamaz. Yine de bildirimin ne zaman gönderildiğini ve hangi tarayıcıya gittiğini görürler. Bu servislerin kendi gizlilik koşulları geçerlidir. Bildirimler isteğe bağlıdır. Açmasanız da cevaplar ve hatırlatmalar uygulama içindeki bildirim listesinde görünür.

### Silme ve kontrol
- **Çıkış yap:** Oturum çerezi, bildirim aboneliği, önbellek ve taslaklar bu cihazdan silinir.
- **Ayarlar > "Bu cihazdaki kayıtlı verileri temizle":** Görünüm tercihleri ve çevrimdışı sayfalar silinir.
- **Tarayıcı ayarları:** Site verilerini ve çerezleri tarayıcınızdan da silebilirsiniz. Oturum çerezini engellerseniz giriş yapamazsınız.
- **Bildirim izni:** Tarayıcı veya telefon ayarlarından istediğiniz zaman kapatabilirsiniz.
- **Hesap silme:** Hesabınızı silmek sunucudaki verileri siler. Cihazınızdaki tarayıcı belleğine ise biz erişemeyiz; çıkış yapmadan hesap sildiyseniz bu cihazdaki verileri tarayıcı ayarlarından silebilirsiniz.

**Ortak cihaz uyarısı:** Bu telefonu veya bilgisayarı başkası da kullanıyorsa işiniz bitince **çıkış yapın.** Çıkış yapmazsanız yukarıdaki bilgiler cihazda kalır.

### Değişiklikler
Zorunlu olmayan bir çerez veya benzeri bir teknoloji kullanmaya karar verirsek, bu teknoloji **sizden onay alınmadan çalışmaz.** Onay ekranında "Kabul et" ve "Reddet" seçenekleri eşit biçimde sunulur. Bu sayfadaki değişiklikler sürüm numarasıyla yayımlanır.

**İletişim:** `[E-POSTA]` · Haklarınız için bkz. Gizlilik Politikası §9.

---

## 3. Kaynaklar
- KVKK Çerez Uygulamaları Hakkında Rehber, Temmuz 2025 (KVKK Yayınları No: 69), §2.2, §4 (Kriter A/B), §5.1–5.10, §7, §9, §10: [kvkk.gov.tr](https://kvkk.gov.tr/Icerik/7353/Cerez-Uygulamalari-Hakkinda-Rehber) (resmî PDF okundu, 18.10.2026).
- KVKK m.5, m.10: [mevzuat.gov.tr](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6698.pdf) (doğrulandı).
- Kurul'un 2026/347 sayılı Kararı (RG 24.03.2026): `veri-envanteri.md` §8.
- `@supabase/ssr` 0.5.1 ile varsayılan çerez ömrünün 400 gün olması: [paket değişiklik günlüğü (yarn)](https://classic.yarnpkg.com/en/package/@supabase/ssr) (ikincil; kullanılan 0.12.7 sürümünde doğrulanmalı).
- Web Push şifrelemesi: IETF RFC 8030 (Web Push protokolü) ve RFC 8291 (yük şifrelemesi).
