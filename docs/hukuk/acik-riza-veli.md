# Veli Açık Rıza Metni

> **TASLAKTIR – Yayınlamadan önce bir avukat tarafından incelenmelidir.** Bu metin avukat görüşünün yerini tutmaz.
> Sürüm `veli-acik-riza v0.1` · 16.10.2026.
> §1 ve §2 ekip içindir. Veliye yalnızca §3 gösterilir; §4'teki rızalar ileride ihtiyaç doğarsa gösterilir.

## 1. Hangi işleme açık rıza gerekir? (ekip için)

Kurul'un 2026/347 sayılı İlke Kararı'na göre (RG 24.03.2026):
- İşleme başka bir hukuki sebebe dayanıyorsa açık rıza **istenmez**, yalnızca aydınlatma yapılır.
- Gereksiz yere rıza istemek yanıltıcıdır. Rıza geri alındığında işlemeye devam etmek de mümkün olmaz.

**Açık rıza GEREKMEYEN işlemler** (aydınlatma metninde yazılır, rıza istenmez):

| İşleme | Dayanak | Neden rıza değil |
|---|---|---|
| Veli ve çocuk hesabı, rumuz, sınıf, kullanıcı adı | m.5/2-c sözleşme | Hizmetin kendisi |
| Telafi planı, soru-cevap, fotoğraf, gönüllüyle eşleşme ve görüntülü ders | m.5/2-c sözleşme | Veli hizmeti bu içerikle talep ediyor. Eşleşme ayrıca **veli onayına** bağlı, ancak bu onay KVKK rızası değil, hizmet kararıdır. |
| Eşleşen gönüllüye rumuz, sınıf ve içeriğin gösterilmesi | m.5/2-c, m.8/2-a | Hizmetin ifası için zorunlu aktarım |
| Filtre, moderasyon, şikâyet, katılım kaydı, denetim kaydı, askıya alma | m.5/2-f meşru menfaat, m.5/2-e | Çocuk güvenliği. Rıza geri alınırsa durdurulamayacak işlemler. |
| Push ve e-posta hizmet bildirimleri | m.5/2-c | Hizmet iletişimi. Pazarlama yok. |
| Rıza ve onay kayıtlarının saklanması | m.5/2-ç, m.5/2-e | İspat yükü |
| **Yurt dışındaki hizmet sağlayıcılara aktarım** | KVKK m.9/4-c **standart sözleşme** + m.9/5 bildirim | 2024 değişikliğinden sonra açık rıza yalnızca **arızi** aktarımda kullanılabilir (m.9/6-a). Düzenli aktarım için **kullanılamaz.** |

**Açık rıza GEREKEN işlemler:**

| Kod | İşleme | Dayanak | MVP'de gösterilir mi? | Zorunlu mu? |
|---|---|---|---|---|
| **AR-1** | Platform kullanımı, devamsızlık tarihleri ve içerikler nedeniyle çocuğun **sağlık durumuna dolaylı olarak işaret edebilecek** verilerin işlenmesi | m.6/3-a | **Evet**, çocuk eklenmeden önce, her çocuk için ayrı | Hizmetin doğası gereği **evet**. Rıza verilmezse çocuk hesabı açılamaz. **Avukat değerlendirmeli** (bkz. not). |
| AR-2 | Çocuğun ilerleme özetinin okuldaki öğretmeniyle paylaşılması ("Köprü Raporu", Aşama 2) | m.5/1; özel nitelikli içerirse m.6/3-a | Hayır, Aşama 2 | Hayır, isteğe bağlı |
| AR-3 | Pilot değerlendirmesi için veli anketi ve yanıtların araştırmada kullanılması | m.5/1 (+ etik kurul) | Hayır, yalnızca pilotta araştırma yapılırsa | Hayır, isteğe bağlı |
| AR-G1 | Gönüllünün adli sicil kaydının görülmesi | m.6/3-a | Yalnızca pilotta karar verilirse (gönüllü ekranında) | Gönüllülük şartı olur. **Avukat değerlendirmeli.** |

**AR-1 neden zorunlu ve bu neden tartışmalı?**
- Açık rıza "özgür irade" ister. Rızanın hizmete şart koşulması genellikle sorunludur.
- Burada ise işleme hizmetten ayrılamaz. Sağlık verisini kasıtlı toplamıyoruz, ancak kullanıcı olmak bile bir çıkarım riski doğuruyor. m.6/3'te bu faaliyete uyan başka bir şart yok (bkz. `veri-envanteri.md` §3).
- Hizmet ücretsiz ve isteğe bağlı. Alternatifler mevcut (MEB evde ve hastanede eğitim).
- Bu durum veliye açıkça söylenir.
- Alternatif bir yaklaşım daha var: verinin sağlık verisi sayılmayacağı kadar nötr bir konumlandırma yapıp AR-1'i hiç istememek. Bu yaklaşımın riski daha yüksektir.
- **Hangi yolun izleneceğine avukat karar vermeli.**

## 2. Arayüz kuralları (ekip için)
1. **Sıra:** Aydınlatma metni ("Okudum, anladım") → kullanım koşulları ("Kabul ediyorum") → **ayrı ekranda** AR-1 → çocuk ekleme. Her çocuk eklenirken AR-1 o çocuk için yeniden alınır (`consents.student_id`).
2. **Seçenekler:** "Açık rıza veriyorum" / "Açık rıza vermiyorum". Hiçbiri **önceden seçili olmaz.** Seçim yapılmadan devam düğmesi pasif kalır.
3. Ekranda metnin tamamı ya da açılır özeti bulunur. Ekran aydınlatma metnine bağlantı verir, ancak aydınlatmayla **aynı onay kutusunda birleştirilmez.**
4. **"Vermiyorum" seçilirse:** "Bu rıza olmadan çocuk hesabı açılamıyor, çünkü…" açıklaması ve geri dönüş seçeneği gösterilir. Kayıt `granted=false` olarak yazılır.
5. **Kayıt alanları:** kullanıcı, öğrenci, tür, belge sürümü, metnin özet değeri, verildi/verilmedi, zaman, kanal (`web`), web derleme sürümü (git kısa SHA'sı).
   - Tür adı: `acik_riza_dolayli_saglik`. Plandaki genel `acik_riza_veli` yerine amaca özgü ad kullanılır, çünkü her rıza belirli bir konuya ilişkin olmalıdır (KVKK m.3/1-a).
   - İleride eklenecek türler: `acik_riza_ogretmen_paylasimi` (AR-2), `acik_riza_arastirma` (AR-3), `acik_riza_gonullu_adli_sicil` (AR-G1).
6. **Kontrol:** `create-child-account`, AR-1 kaydı `granted=true` değilse **veya** `withdrawn_at` doluysa işlemi reddeder.
7. **Geri alma:** Ayarlar > Yasal metinler > Rızalarım > "Rızamı geri al". Kaydı veren veli **ya da** çocuğun diğer velisi geri alabilir.
   - Geri alma, verme kadar kolay olmalıdır.
   - Güvenlik için istenen yeniden doğrulama (şifre veya OTP; plan 4.1/9) tek adımlı tutulur.
   - Geri almayı zorlaştıran ek onay ekranları veya caydırıcı metinler kullanılmaz.
8. **Velilik değişince ve askıdaki veli (güvenlik ajanının sorusu):**
   - **Velilikten çıkarılan kişi** (`guardian_students` bağlantısı silinmiş), artık çocuğun yasal temsilcisi sıfatıyla platformda işlem yapamaz. Rızayı geri alma hakkı çocuğa aittir ve yasal temsilci aracılığıyla kullanılır (TMK m.342). Bu yüzden bu kişinin eski AR-1 satırını görmesinin ve geri çekmesinin **kapatılması uygundur.**
     - Bu kişinin kendi verileri üzerindeki m.11 hakları (ör. "hakkımda hangi kayıtlar var") **başvuru yoluyla** (m.13) sürer. Cevapta çocuğun güncel verileri paylaşılmaz.
     - Bağlantının kaldırılması yalnızca tanımlı bir süreçle (yönetici, belge veya diğer velinin bildirimi) yapılır ve denetim kaydına yazılır.
     - Kaldırılan kişinin verdiği AR-1, verildiği anda yasal temsilci tarafından verilmiş olduğu için geçmişe dönük olarak geçerlidir. Ancak çocuğun **geçerli tek AR-1 kaydı bu kişiye aitse** kalan veliden yeni AR-1 istenir; o verilene kadar çocuk hesabı `beklemede` kalır.
     - Bağlantı, kişi hiç veli olmadığı (sahte beyan) için kaldırıldıysa o rıza baştan geçersiz sayılır. Kalan veliden AR-1 alınana kadar işleme durur.
   - **Askıdaki veli**, platform yaptırımı altında olsa da yasal temsilci olmayı sürdürür. Rıza her zaman geri alınabilmelidir. Bu yüzden askıdaki velinin AR-1'i geri çekebilmesinin **açık kalması doğrudur.** Erişim, düzeltme ve silme gibi m.11 hakları da başvuru yoluyla sürer.
   - **İki veli anlaşamazsa** (biri geri çeker, diğeri yeniden verir): Geri çekme, işlemeyi hemen durdurur. Yeni rıza verilse bile hesap bir sonraki adımda otomatik açılmaz; yönetici iki veliyi bilgilendirir ve hesap pasif kalır. Uyuşmazlık **avukata danışılarak** çözülür.

---

## 3. Veliye gösterilecek metin

**Açık Rıza Beyanı: Çocuğumun dolaylı olarak sağlık durumuna işaret edebilecek verileri**

`[VERİ SORUMLUSU]` tarafından sunulan Eğitim Köprüsü platformu hakkındaki aydınlatma metnini okudum.

Şunları biliyorum:
- Platform, derslere ara vermek zorunda kalan öğrencilere yöneliktir. Çocuğumun platformu kullanması, derslere ara verdiği tarih aralığı ve soru-cevaplarında kendiliğinden yazabileceği ya da fotoğraflarında görünebilecek bilgiler, **dolaylı olarak bir sağlık durumuna işaret edebilir.**
- Platform hastalık, tanı veya engel bilgisi **sormaz ve toplamaz.** Arayüzde sağlık bilgisi paylaşılmaması önerilir.
- Bu veriler yalnızca telafi planı, soru-cevap ve gönüllü desteği sunmak için işlenir. Çocuğumla eşleşen gönüllü yalnızca rumuzunu, sınıfını ve sorularını görür; derslere ara verdiği tarihleri görmez.
- Bu rıza olmadan çocuğum için hesap açılamaz, çünkü bu işleme hizmetten ayrılamaz.
- Rızamı istediğim zaman **Ayarlar > Yasal metinler > Rızalarım** bölümünden geri alabilirim. Geri aldığımda çocuğumun hesabı kapatılır ve verileri en geç 30 gün içinde silinir. Güvenlik kayıtları gizlilik politikasında belirtilen süre boyunca saklanabilir.

**Yasal temsilci beyanı:** `[Rumuz]` adlı çocuğun velisi veya vasisi (yasal temsilcisi) olduğumu beyan ederim.

Bu bilgiler ışığında, `[Rumuz]` adlı çocuğumun yukarıda açıklanan verilerinin, belirtilen amaçla sınırlı olarak işlenmesine:

( ) **Açık rıza veriyorum.**
( ) **Açık rıza vermiyorum.**

[ Devam ]

---

## 4. İleride kullanılabilecek isteğe bağlı rızalar (MVP'de gösterilmez)

**AR-2: Öğretmenle paylaşım (Aşama 2).**
> `[Rumuz]` adlı çocuğumun plan ilerleme özetinin (tamamlanan konular ve tarihleri) okuldaki öğretmeni `[Öğretmen adı, okul]` ile paylaşılmasına açık rıza veriyorum / vermiyorum. Bu rıza hizmetten yararlanma şartı değildir ve istediğim zaman geri alınabilir.

Öğretmenin kimliği doğrulanmadan bu rıza istenmemelidir. Paylaşım sağlık bilgisi içerebilecekse AR-1 ile birlikte değerlendirilmelidir.

**AR-3: Pilot değerlendirme anketi (yalnızca araştırma yapılırsa).**
> Pilot sonunda bana gönderilecek kısa ankete katılmayı ve yanıtlarımın `[araştırma adı / etik kurul onay no]` kapsamında, yayınlarda kimliğim belirlenemeyecek şekilde kullanılmasını kabul ediyorum / etmiyorum. Bu rıza hizmetten yararlanma şartı değildir.

Yalnızca anonim istatistik kullanılacaksa (KVKK m.28/1-b) bu rıza gerekmez. Anket yapılacaksa etik kurul onayı gerekip gerekmediği değerlendirilmelidir.

## 5. Kaynaklar
- KVKK m.3/1-a (açık rıza tanımı), m.5, m.6/3, m.9: [mevzuat.gov.tr](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.6698.pdf) (doğrulandı).
- Aydınlatma Tebliği m.5 (aydınlatma ile açık rıza ayrı ayrı yerine getirilir): [RG 10.03.2018](https://www.resmigazete.gov.tr/eskiler/2018/03/20180310-5.htm) (doğrulandı).
- Kurul'un 2026/347 sayılı Kararı (RG 24.03.2026, 33203): ayrı başlık, ayrı beyan, "veriyorum/vermiyorum" seçenekleri, aydınlatmada "okudum, anladım" ifadesi. İçerik [ikincil kaynaktan](https://www.alomaliye.com/2026/03/24/kvkkdan-yeni-ilke-karari-acik-riza-metni-ile-aydinlatma-metni-artik-ayri-duzenlenmeli/); karar metni okunmalı.
- TMK m.16 ve m.342 (yasal temsil; eşlerden birinin diğerinin rızasıyla işlem yaptığının varsayılması): [mevzuat.gov.tr](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4721.pdf) (doğrulandı).
