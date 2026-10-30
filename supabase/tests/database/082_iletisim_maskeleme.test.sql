-- =====================================================================
-- 082 · İLETİŞİM BİLGİSİ MASKELEME (migration 09)
-- Proje raporu: "Messages cannot contain phone numbers or social media links."
-- =====================================================================
begin;
select plan(51);
select tests.make_fixture();

-- ====================== Tespit: bulunması gerekenler ======================
select is(private.contact_info_reasons('Beni ara 0555 123 45 67'), array['telefon'], 'telefon: boşluklu 11 hane');
select is(private.contact_info_reasons('numaram +90 (555) 123-45-67'), array['telefon'], 'telefon: +90 parantezli ve tireli');
select is(private.contact_info_reasons('05551234567'), array['telefon'], 'telefon: bitişik 11 hane');
select is(private.contact_info_reasons('yaz: ali.kaya55@gmail.com'), array['eposta'], 'e-posta');
select is(private.contact_info_reasons('https://wa.me/905551234567 e gel'), array['telefon', 'baglanti'], 'bağlantı + içindeki numara');
select is(private.contact_info_reasons('www.siteadi.com a bak'), array['baglanti'], 'www bağlantısı');
select is(private.contact_info_reasons('instagram.com/ali'), array['baglanti', 'uygulama_adi'], 'alan adı biçimli bağlantı (+ uygulama adı)');
select is(private.contact_info_reasons('beni @ali_kaya55 de bul'), array['kullanici_adi'], '@kullanıcı adı');
select is(private.contact_info_reasons('WhatsApp ten yaz'), array['uygulama_adi'], 'uygulama adı (büyük/küçük harf fark etmez)');
select is(private.contact_info_reasons('vatsap numaram'), array['uygulama_adi'], 'vatsap yazımı');
select is(private.contact_info_reasons('insta ve snapchat'), array['uygulama_adi'], 'insta / snapchat');
select is(private.contact_info_reasons('Telegram: ali'), array['uygulama_adi'], 'telegram');
select is(private.contact_info_reasons('tel 0 5 5 5 1 2 3 4 5 6 7'), array['telefon'], 'tek tek boşluklu rakamlar da yakalanır');

-- ====================== Tespit: bulunMAmaması gerekenler (matematik sorusu!) ======================
select is(private.contact_info_reasons('3x + 5 = 20 ise x kaçtır?'), '{}'::text[], 'denklem');
select is(private.contact_info_reasons('Kesirleri nasıl toplarız? 1/2 + 3/4'), '{}'::text[], 'kesir');
select is(private.contact_info_reasons('2^10 = 1024 ve 3^7 = 2187'), '{}'::text[], 'üslü sayılar');
select is(private.contact_info_reasons('Yarıçapı 7 olan dairenin alanı 3,14 x 49 = 153,86'), '{}'::text[], 'ondalık sayılar');
select is(private.contact_info_reasons('pi yaklaşık 3.14159265358979 dur'), '{}'::text[], 'uzun ondalık sayı (nokta ayraç sayılmaz)');
select is(private.contact_info_reasons('123456789 bir 9 haneli sayıdır'), '{}'::text[], '9 haneli sayı telefon sayılmaz');
select is(private.contact_info_reasons('x ve y gerçek sayı olsun, 5 < 7'), '{}'::text[], 'eşitsizlik');
select is(private.contact_info_reasons('Cevap: A seçeneği, çünkü 12 : 4 = 3'), '{}'::text[], 'oran');
select is(private.contact_info_reasons(''), '{}'::text[], 'boş metin');
select is(private.contact_info_reasons(null), '{}'::text[], 'null');

-- ====================== Maskeleme ======================
select is(private.mask_contact_text('Ara 0555 123 45 67 hemen'), 'Ara [gizlendi] hemen', 'telefon maskelenir, çevresi korunur');
select is(private.mask_contact_text('mail ali@x.com ve www.a.com'), 'mail [gizlendi] ve [gizlendi]', 'e-posta ve bağlantı');
select is(private.mask_contact_text('bana @ali55 yaz'), 'bana [gizlendi] yaz', 'kullanıcı adı: önündeki boşluk korunur');
select is(private.mask_contact_text('WhatsApp ve insta'), '[gizlendi] ve [gizlendi]', 'uygulama adları');
select is(private.mask_contact_text('3x + 5 = 20'), '3x + 5 = 20', 'temiz metin değişmez');
select is(private.contact_info_reasons(private.mask_contact_text('0555 123 45 67 ali@x.com @ali55 WhatsApp')), '{}'::text[],
  'maskelenmiş metin bir daha bayraklanmaz (idempotent)');

-- ====================== Mesaj tetikleyicisi ======================
insert into public.question_messages (id, question_id, sender_id, kind, body)
values (tests.id('mm1'), tests.id('q1'), tests.id('gon_x'), 'takip', 'Whatsapp numaram 0555 123 45 67 yaz bana');
select is((select body from public.question_messages where id = tests.id('mm1')), '[gizlendi] numaram [gizlendi] yaz bana', 'mesaj gövdesi maskelendi');
select ok((select has_flag from public.question_messages where id = tests.id('mm1')), 'mesaj bayraklandı (has_flag)');
select is((select count(*)::int from public.moderation_flags where entity = 'mesaj' and entity_id = tests.id('mm1')), 1, 'yönetici kuyruğuna tek kayıt düştü');
select is((select reasons from public.moderation_flags where entity_id = tests.id('mm1')), array['telefon', 'uygulama_adi'], 'nedenler kaydedildi');
select is((select original_body from public.moderation_flags where entity_id = tests.id('mm1')), 'Whatsapp numaram 0555 123 45 67 yaz bana', 'özgün metin yalnızca moderasyon kaydında');
select is((select author_id from public.moderation_flags where entity_id = tests.id('mm1')), tests.id('gon_x'), 'yazar kaydedildi');

insert into public.question_messages (id, question_id, sender_id, kind, body)
values (tests.id('mm2'), tests.id('q1'), tests.id('ogr_a1'), 'takip', '3x + 5 = 20 ise x kaç? 2^10 = 1024');
select is((select body from public.question_messages where id = tests.id('mm2')), '3x + 5 = 20 ise x kaç? 2^10 = 1024', 'temiz matematik mesajı değişmez');
select ok(not (select has_flag from public.question_messages where id = tests.id('mm2')), 'temiz mesaj bayraklanmaz');
select is((select count(*)::int from public.moderation_flags where entity_id = tests.id('mm2')), 0, 'temiz mesaj için kuyruk kaydı yok');

insert into public.question_messages (id, question_id, sender_id, kind, body)
values (tests.id('mm3'), tests.id('q1'), tests.id('gon_x'), 'takip', 'bana ali.kaya@gmail.com adresinden ulaş');
select is((select reasons from public.moderation_flags where entity_id = tests.id('mm3')), array['eposta'], 'yalnızca e-posta: tek neden');
select is((select body from public.question_messages where id = tests.id('mm3')), 'bana [gizlendi] adresinden ulaş', 'e-posta maskelendi');

-- ====================== Ders notu tetikleyicisi ======================
update public.sessions set volunteer_note = 'Yarin ara: 0555 123 45 67' where id = tests.id('s1');
select is((select volunteer_note from public.sessions where id = tests.id('s1')), 'Yarin ara: [gizlendi]', 'ders notu maskelendi');
select is((select count(*)::int from public.moderation_flags where entity = 'ders_notu' and entity_id = tests.id('s1')), 1, 'ders notu için kuyruk kaydı');
select is((select original_body from public.moderation_flags where entity = 'ders_notu' and entity_id = tests.id('s1')), 'Yarin ara: 0555 123 45 67', 'özgün not yalnızca moderasyon kaydında');
update public.sessions set volunteer_note = 'Kesirleri tekrar ettik' where id = tests.id('s1');
select is((select volunteer_note from public.sessions where id = tests.id('s1')), 'Kesirleri tekrar ettik', 'temiz not değişmez');
update public.sessions set duration_min = 20 where id = tests.id('s1');
select is((select count(*)::int from public.moderation_flags where entity = 'ders_notu' and entity_id = tests.id('s1')), 1,
  'not değişmeyen güncellemede yeni kuyruk kaydı açılmaz');

-- ====================== Yetki ======================
select tests.login('veli_a');
select is((select count(*)::int from public.moderation_flags), 0, 'veli moderasyon kaydını göremez (özgün metin gizli)');
select tests.logout();
select tests.login('ogr_a1');
select is((select count(*)::int from public.moderation_flags), 0, 'öğrenci moderasyon kaydını göremez');
select throws_ok($$ select private.contact_info_reasons('x') $$, '42501', null, 'giriş yapmış kullanıcı filtre işlevini doğrudan çağıramaz (private şema)');
select tests.logout();
select tests.login('admin', 'aal2');
select ok((select count(*) from public.moderation_flags) >= 3, 'yönetici (aal2) moderasyon kuyruğunu görür');
select tests.logout();

select has_trigger('public', 'question_messages', 'question_messages_maskele', 'mesaj tetikleyicisi var');
select has_trigger('public', 'sessions', 'sessions_note_maskele', 'ders notu tetikleyicisi var');

select * from finish();
rollback;
