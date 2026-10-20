# Demodan Gerçek Pilota Geçiş: Hukuki Kontrol Listesi

> **TASLAKTIR – Yayınlamadan önce bir avukat tarafından incelenmelidir.** Bu belge avukat görüşünün yerini tutmaz.
> Sürüm v0.2 · 18.10.2026. v0.2'de web uygulamasına göre güncellendi: Android ve Play maddeleri çıktı; Vercel, push servisleri, çerezler, CSP ve tarayıcı önbelleği eklendi.
> **Kural:** **[Zorunlu]** maddeler tamamlanmadan gerçek çocuk verisi işlenmez (plan Risk 1 ve 2). Resmî başvuruları (VERBİS, Kurum'a bildirim, etik kurul vb.) ajanlar yapmaz; yetkili kişiler yapar.

## A. Kurumsal sahiplik ve veri sorumlusu
- [ ] **[Zorunlu]** Veri sorumlusu belirlenir: üniversite, STK veya şirket. Unvan, adres, MERSİS/vergi no, KEP, yetkili kişi ve iletişim kanalı bütün metinlerdeki yer tutuculara işlenir. Öğrencilerin gerçek kişi olarak veri sorumlusu olması önerilmez. *Sahip: kullanıcı / kurum*
- [ ] **[Zorunlu]** Sorumlular atanır: veri koruma irtibat kişisi, çocuk güvenliği sorumlusu, teknik sorumlu. Yöneticilerin gizlilik taahhüdü ve eğitimi tamamlanır (Kurul 2018/10). *Sahip: kurum*
- [ ] Ekip ile kurum arasındaki ilişki (işleyen mi, ortak çalışma mı) yazılı hâle getirilir. *Sahip: avukat*

## B. Avukat incelemesi
- [ ] **[Zorunlu]** `docs/hukuk/` altındaki tüm metinler avukat tarafından incelenir. Özellikle şu konular:
  - AR-1'in hizmete şart koşulması ve dolaylı sağlık verisi yaklaşımı,
  - çocuk verisinde "sözleşme" hukuki sebebi,
  - 12 yaş üstü çocuğun onayının rolü (TMK m.16),
  - saklama süreleri (`consents` için 10 yıl),
  - 5651 kapsamında "yer sağlayıcı" sayılma ve trafik logu süresi,
  - gönüllülüğün iş ilişkisi sayılmaması,
  - yetki maddesi,
  - **tarayıcı push servislerinin niteliği** (`veri-envanteri.md` §4.2),
  - **çerez onay bandına gerek olmadığı sonucu** (`cerez-politikasi.md` §1),
  - **velilik değişikliğinde AR-1** (`acik-riza-veli.md` §2/8).
- [ ] Kurum 5395 m.6 kapsamında bir kuruluşsa (eğitim veya sağlık kuruluşu, STK) korunma ihtiyacı olan çocuğu bildirme prosedürü yazılır. TCK m.278 de dikkate alınır.
- [ ] **Mevzuat takibi:** Basında yer alan KVKK değişiklik taslağı izlenir (ör. "dijital rıza yaşı" ve çocuk verisine özel hükümler; Milliyet, 06.08.2026; resmî metin yok). Yasalaşırsa AR-1 ve çocuk bilgilendirmesi yeniden değerlendirilir.

## C. VERBİS ve politika
- [ ] **[Zorunlu]** VERBİS kayıt yükümlülüğü değerlendirilir. Güncel istisna (Kurul 2025/1572, RG 01.10.2025; resmî metinden doğrulanmalı):
  - genel: çalışan < 50 ve mali bilanço < 100 milyon TL,
  - ana faaliyet konusu özel nitelikli veri işleme olanlar: çalışan < 10 ve mali bilanço < 10 milyon TL.
  - Veri sorumlusu kamu üniversitesiyse mevcut VERBİS kaydı güncellenir.
- [ ] Kayıt yükümlülüğü varsa `saklama-ve-imha.md` Silme Yönetmeliği m.6'daki başlıklarla tam politikaya dönüştürülür.

## D. Barındırma ve yurt dışına aktarım (KVKK m.9)
- [ ] **[Zorunlu] Vercel planı:**
  - Hobby yalnızca "ticari olmayan kişisel kullanım" içindir. Vercel ticari kullanımı, projede çalışan herhangi birinin maddi kazancı olarak tanımlar; buna ücretli bir çalışan veya danışmanın kod yazması da dahildir.
  - Bir kurum adına, ücretli personelin de yer aldığı bir pilot bu tanıma girebilir.
  - Ayrıca **Vercel DPA'sı yalnızca Pro ve Enterprise planlarını kapsar.** Hobby'de veri işleyen sözleşmesi (KVKK m.12/2) yoktur.
  - **Sonuç:** Gerçek veriyle pilot için Vercel Pro (+ DPA) ya da DPA sunan başka bir barındırma gerekir (plan B: Cloudflare). *Sahip: kullanıcı + `devops`*
- [ ] **[Zorunlu] Hesap sahipliği:**
  - Hobby'de özel depodan yalnızca hesap sahibinin commit'leri yayına çıkar.
  - Hesap **tek bir kişiye** aittir ve bu kişi ekipten ayrılırsa hesap ve alan adı devredilmelidir.
  - Hesap sahibi Vercel panelinde logları ve ortam değişkenlerini görebilir. Bu kişi de yöneticiler gibi **gizlilik taahhüdü** imzalar ve iki aşamalı doğrulama kullanır.
  - Pilotta hesap, kişisel hesap yerine kurum adına açılmış bir takım hesabına taşınır.
- [ ] **[Zorunlu]** Her veri işleyen için sözleşme tarafı, sunucu konumu ve alt işleyenler doğrulanır: Supabase, **Vercel**, 8x8 JaaS, Resend veya Brevo.
- [ ] **[Zorunlu]** Kurul'un standart sözleşmesi (veri sorumlusundan veri işleyene modülü) her sağlayıcıyla **değiştirilmeden** imzalanır. İmzadan sonra **5 iş günü içinde** Kurum'a bildirim yapılır (m.9/5; Standart Sözleşme Bildirim Modülü, KEP veya fiziki). Vercel'in AB standart sözleşmeleri ve DPF sertifikası KVKK için yeterli değildir.
- [ ] Bir sağlayıcı imzalamazsa düzenli aktarım **açık rızaya dayandırılamaz.** Seçenekler:
  - DPA ve KVKK sözleşmesi sunan bir barındırma,
  - Türkiye'de barındırılan Jitsi,
  - Türkiye'deki bir e-posta sağlayıcısı,
  - veya pilotun ertelenmesi.
- [ ] **Tarayıcı push servisleri:** Avukat görüşü alınır (`veri-envanteri.md` §4.2). Görüş olumsuzsa push pilotta kapatılır; uygulama içi bildirim listesi yeterlidir.
- [ ] Sağlayıcılarla DPA yapılır (KVKK m.12/2). DPA'da silme, ihlal bildirimi ve alt işleyen hükümleri bulunur.

## E. Etik kurul, okul ve MEB izinleri
- [ ] Pilot araştırma niteliğindeyse (anket, kullanım verisi analizi, yayın) üniversite **etik kurulu** onayı alınır.
- [ ] Katılımcılar okul, rehberlik servisi, hastane okulu veya milli eğitim müdürlüğü üzerinden bulunacaksa MEB'in araştırma/uygulama izni gerekip gerekmediği değerlendirilir. **Doğrulanmalı.**
- [ ] Katılımcı bulma metinlerinde sağlık ifadesi, çocuk adı veya fotoğrafı yer almaz.

## F. Gönüllü güvenliği
- [ ] **Adli sicil:** Ceza mahkûmiyeti özel nitelikli veridir. İstenirse ayrı açık rıza (AR-G1), ölçülülük değerlendirmesi ve yazılı engel ölçütü gerekir. Belge saklanmaz. *Sahip: avukat*
- [ ] Gönüllü eğitimi ve quiz, çocuk koruma alanında deneyimli bir uzmana gözden geçirtilir.
- [ ] Yöneticiler **gönüllü inceleme prosedürünü** uygular (`cocuk-koruma-kurallari.md` Bölüm B). Bu prosedür belge eşleşmesini, harflerle yazılmış iletişim ipuçlarının kontrolünü ve 18 yaş şartını kapsar.
- [ ] Yönetici kuyruğu için hizmet süreleri yazılır: çocuk güvenliği bildirimi hemen askıya alınır, ilk inceleme `[24 saat]` içinde yapılır. Hafta sonu nöbeti planlanır.

## G. Metinlerin yayını
- [ ] Nihai metinler numaralandırılır ve `legal_documents` tablosuna (metin + özet değer) eklenir. Yayımlanan sürüm değiştirilmez.
- [ ] Herkese açık sayfalar oturumsuz açılır: `/gizlilik`, **`/cerezler`**, `/kullanim-kosullari`, `/aydinlatma/veli`, `/aydinlatma/gonullu`, `/hesap-silme`, `/lisanslar`.
- [ ] İlk ziyarette engellemeyen çerez bilgilendirme notu gösterilir; her sayfanın alt kısmında gizlilik ve çerez bağlantısı bulunur.
- [ ] "Deneme sürümü" kutusu ve demo uyarıları kaldırılır.
- [ ] "Eğitim Köprüsü" için TÜRKPATENT'te marka ön araştırması yapılır (sonuç garanti değildir).
- [ ] Açık kaynak lisans taraması yapılır (`npx license-checker` veya eşdeğeri). Hem npm bağımlılıkları hem `external_api.js` gibi depoya alınmış dosyalar taranır. `/lisanslar` sayfası üretilir.

## H. Süreçler
- [ ] **Veri sahibi başvuruları:** uygulama içi form, kayıtlı e-posta ve KEP üzerinden alınır; 30 günlük süre takip edilir. Yazılı başvuruda Tebliğ'deki asgari bilgiler istenir. TC kimlik no şartının veri minimizasyonuyla nasıl bağdaştırılacağı avukata sorulur.
- [ ] **Veri ihlali müdahale planı:**
  - Kurul'a 72 saat içinde bildirim (Kurul 2019/10; ikincil kaynak), ilgili kişilere de bildirim.
  - Sorumlular belirlenir. Sağlayıcıların ihlal bildirim süreleri DPA'da yer alır. Vercel'in DPA'sında süre "gecikmeksizin" olarak yazıyor, saat belirtilmemiş.
- [ ] **Saklama ve imha:** `cleanup` SK-01…SK-25 kurallarını uygular ve `deletion_log` tutulur. Silmeler test ortamında denenir.
- [ ] **Yedekleme:** Pro plan veya şifreli yedek. Yedekten silinme süresi metinlerle tutarlı olmalıdır.
- [ ] **5651:** Yer sağlayıcı sayılırsak 1 yıllık trafik logu gerekir. Bunun için Vercel Hobby'nin 1 saatlik logu ve log aktarımı (drain) olmaması nedeniyle bir log çözümü seçilir (Pro plan drain'i veya uygulama düzeyinde kısıtlı log).

## I. Demo verisinin temizlenmesi
- [ ] Demo projeleri ve test hesapları silinir ya da pilot **yeni ve temiz** bir `prod` ile başlar (SK-23).
- [ ] Demo süresince kayıt davet kodu veya izin listesiyle sınırlı tutulur.

## J. Teknik uyum (yayın öncesi `hukuk` yeniden kontrol eder; plan 11.2)

**Rıza ve bilgilendirme:**
- [ ] Aydınlatma ekranında "Okudum, anladım" bulunur. AR-1 ayrı ekranda alınır, seçenekler önceden seçili değildir. Rıza geri alma tek adımlı yeniden doğrulamayla yapılır.
- [ ] `create-child-account` geçerli bir AR-1 olmadan çocuk hesabı açmaz. Velilikten çıkarılan kişi AR-1'i göremez ve geri çekemez; askıdaki veli geri çekebilir. Bu kurallar pgTAP testiyle doğrulanır.
- [ ] Çocuk bilgilendirmesi, güvenlik hatırlatması ve çevrimdışı saklama sorusu gösterilir; hatırlatmanın gösterildiği kaydedilir.

**Çocuk koruma:**
- [ ] Veli özellik anahtarları ve "Gönüllüyü engelle" çalışır (`cocuk-koruma-kurallari.md` A2–A3).
- [ ] Gönüllü devamsızlık tarihlerini göremez (pgTAP).

**Güvenlik başlıkları ve dış kaynaklar:**
- [ ] **CSP zorunlu modda** çalışır (H9'dan itibaren). "Dış kaynak yok" testi geçer: Google Fonts ve CDN yok, tek dış köken `8x8.vc` iframe'i.
- [ ] **`Referrer-Policy: no-referrer`** her yanıtta bulunur, dış bağlantılarda `rel="noopener noreferrer"` kullanılır. **Gerekçe:** Yönlendiren bilgisi dış sitelere kullanıcının Eğitim Köprüsü'nden geldiğini söyler; platformun kitlesi düşünüldüğünde bu dolaylı sağlık çıkarımına yol açabilir (`veri-envanteri.md` §3).
- [ ] `Permissions-Policy` öğrenci ve veli ders sayfalarında ekran paylaşımını kapatır. Varsayılanda konum, kamera ve mikrofon kapalıdır.

**Bildirim ve görüntülü ders:**
- [ ] Push metinleri ve `Topic` başlığı geneldir. Push izni yalnızca kullanıcı düğmeye basınca, açıklamadan sonra istenir.
- [ ] Jitsi'de şunlar sağlanır:
  - sohbet, davet, kayıt, yayın ve transkripsiyon kapalı,
  - kamera öğrencide ve velide kapalı başlar,
  - görünen ad rumuz veya "Ad S.",
  - 8x8 iframe'inde analitik veya telemetri depolaması yok (tarayıcı geliştirici araçlarıyla kontrol edilir).

**Oturum, loglar ve cihazda kalanlar:**
- [ ] Oturum çerezi httpOnly ve Secure'dur. Varsayılan olarak tarayıcı oturumu çerezidir; "oturumum açık kalsın" seçilirse `[30 gün]` kalır.
- [ ] **Loglarda kişisel veri yok:** Vercel ve Edge Function logları ile hata mesajları kontrol edilir (test + elle inceleme).
- [ ] **Çıkışta tarayıcı temizliği:** localStorage, Cache Storage ve push aboneliği silinir; yanıtta `Clear-Site-Data` başlığı bulunur. Bu, ortak cihaz senaryosuyla Playwright'ta test edilir.
- [ ] Hesap silme uygulama içinden ve `/hesap-silme` sayfasından çalışır. Kalan veriler gizlilik politikasıyla tutarlıdır.
- [ ] Vercel Web Analytics, Speed Insights ve önizleme araç çubuğu üretimde kapalıdır. Vercel–Supabase entegrasyonu kurulmamıştır.

## Kaynaklar
`veri-envanteri.md` §9, `saklama-ve-imha.md` §7, `cerez-politikasi.md` §3. Ek:
- Vercel Hobby ve ticari kullanım: [vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby), [Fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines). Vercel DPA: [vercel.com/legal/dpa](https://vercel.com/legal/dpa). Hepsi 18.10.2026'da okundu.
- KVKK değişiklik taslağı haberi: [Milliyet, 06.08.2026](https://www.milliyet.com.tr/7636112) (basın kaynağı; resmî metin yok).
- Kurul 2019/10 (72 saat): [alomaliye.com](https://www.alomaliye.com/2019/01/24/kvkk-karari-2019-10-kisisel-veri-ihlali-bildirim-usul-ve-esaslari/) (ikincil).
- 5395 m.6 ve TCK m.278: mevzuat.gov.tr (doğrulandı).
- Eski Play ve Android maddeleri: `arsiv/play-store-uyum.md`.
