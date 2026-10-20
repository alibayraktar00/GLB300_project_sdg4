-- =====================================================================
-- 071 · GÖNÜLLÜ PROFİLİ ONAYDAN SONRA KİLİTLENİR; AD ALANLARI; SERBEST METİN KANALLARI
-- Güvenlik denetimi Y2 ve kod incelemesi H-1, Ö-4:
--   * onaylı gönüllü ad/üniversite/bölüm alanlarını DEĞİŞTİREMEZ (öğrenciye/veliye iletişim kanalı olurdu)
--   * ad = given_name + family_name; kısa ad "Ad S." (çift soyadlı adlar sorun olmaz)
--   * ad/üniversite/bölüm yalnızca harf, boşluk, kesme, tire; bölünemez boşluk vb. reddedilir
--   * sessions.cancel_reason ve matches.end_reason kod listesidir (serbest metin YOK)
--   * öğrenci kendi rumuzunu değiştiremez; yalnızca velisi değiştirebilir
-- =====================================================================
begin;
select plan(61);
select tests.make_fixture();

-- ====================== Başvuru aşamasında düzenleme serbest, onaydan sonra kilitli ======================
select tests.signup('g_ad', 'ad@ogr.uni.edu.tr', '{"role":"gonullu","display_name":"Yeni"}');
select tests.login('g_ad');
select lives_ok($$ insert into public.volunteers (profile_id, given_name, family_name, university, department, class_year)
                   values (tests.id('g_ad'), 'Ayşe Nur', 'Kaya', 'Boğaziçi Üniversitesi', 'Matematik Öğretmenliği', 3) $$,
  'gönüllü ad / soyad ayrı sütunlarla başvuru açar');
select is(tests.affected($$ update public.volunteers set family_name = 'Demir' where profile_id = tests.id('g_ad') $$), 1::bigint,
  'başvuru ("basvuru") aşamasında ad güncellenebilir');
select tests.logout();
update public.volunteers set status = 'egitim' where profile_id = tests.id('g_ad');
select tests.login('g_ad');
select is(tests.affected($$ update public.volunteers set university = 'Orta Doğu Teknik Üniversitesi' where profile_id = tests.id('g_ad') $$), 1::bigint,
  '"egitim" aşamasında düzenlenebilir');
select tests.logout();
update public.volunteers set status = 'inceleme' where profile_id = tests.id('g_ad');
select tests.login('g_ad');
select is(tests.affected($$ update public.volunteers set department = 'Fizik' where profile_id = tests.id('g_ad') $$), 1::bigint,
  '"inceleme" aşamasında düzenlenebilir');
select tests.logout();

select is((select count(*) from public.audit_log where action = 'gonullu_profil_degisti' and entity_id = tests.id('g_ad')::text), 3::bigint,
  'ad/üniversite/bölüm değişikliklerinin her biri denetim kaydına yazıldı');
select ok((select details -> 'alanlar' @> '["family_name"]'::jsonb from public.audit_log
            where action = 'gonullu_profil_degisti' and entity_id = tests.id('g_ad')::text order by id limit 1),
  'denetim kaydı hangi alanın değiştiğini söyler (değerleri değil)');
select is((select count(*) from public.audit_log where action = 'gonullu_profil_degisti' and entity_id = tests.id('g_ad')::text
             and details::text like '%Demir%'), 0::bigint, 'denetim kaydı değerlerin kendisini (kişisel veri) içermez');

-- Onaydan sonra: S2 saldırısı
select tests.login('gon_x');
select is(tests.affected($$ update public.volunteers set given_name = 'Ali', family_name = 'Kaya' where profile_id = tests.id('gon_x') $$), 0::bigint,
  'ONAYLI gönüllü adını değiştiremez (S2)');
select is(tests.affected($$ update public.volunteers set university = 'Baska Universite' where profile_id = tests.id('gon_x') $$), 0::bigint,
  'onaylı gönüllü üniversitesini değiştiremez');
select is(tests.affected($$ update public.volunteers set department = 'Baska Bolum' where profile_id = tests.id('gon_x') $$), 0::bigint,
  'onaylı gönüllü bölümünü değiştiremez');
select is(tests.affected($$ update public.volunteers set class_year = 1 where profile_id = tests.id('gon_x') $$), 0::bigint,
  'onaylı gönüllü sınıf yılını değiştiremez');
select tests.login('gon_s');
select is(tests.affected($$ update public.volunteers set university = 'X Universitesi' where profile_id = tests.id('gon_s') $$), 0::bigint, 'askıdaki gönüllü değiştiremez');
select tests.logout();
update public.volunteers set status = 'reddedildi', reject_reason = 'belge' where profile_id = tests.id('gon_z');
select tests.login('gon_z');
select is(tests.affected($$ update public.volunteers set university = 'X Universitesi' where profile_id = tests.id('gon_z') $$), 0::bigint, 'reddedilmiş başvuru düzenlenemez');
select tests.logout();
select is((select given_name || ' ' || family_name from public.volunteers where profile_id = tests.id('gon_x')), 'Gizliad Soyadx', 'onaylı gönüllünün adı değişmedi');

-- ====================== Ad alanı karakter kısıtı ======================
select lives_ok($$ update public.volunteers set given_name = 'Ayşe-Nur', family_name = 'O''Brien' where profile_id = tests.id('g_ad') $$, 'tire ve kesme (düz) kabul edilir');
select lives_ok($$ update public.volunteers set given_name = 'Çağlar', family_name = 'Öztürk İnce' where profile_id = tests.id('g_ad') $$, 'Türkçe harfler ve çift soyad kabul edilir');
select lives_ok($$ update public.volunteers set given_name = 'Ahmet', family_name = 'D’Arc' where profile_id = tests.id('g_ad') $$, 'kıvrık kesme işareti (’) kabul edilir');

select throws_ok($$ update public.volunteers set given_name = 'Ali5' where profile_id = tests.id('g_ad') $$, '23514',
  'new row for relation "volunteers" violates check constraint "volunteers_given_name_chk"', 'ad rakam içeremez');
select throws_ok($$ update public.volunteers set given_name = 'ali@insta' where profile_id = tests.id('g_ad') $$, '23514',
  'new row for relation "volunteers" violates check constraint "volunteers_given_name_chk"', 'ad "@" içeremez');
select throws_ok($$ update public.volunteers set given_name = 'Ali: ara' where profile_id = tests.id('g_ad') $$, '23514',
  'new row for relation "volunteers" violates check constraint "volunteers_given_name_chk"', 'ad ":" içeremez');
select throws_ok($$ update public.volunteers set family_name = 'Kaya/insta' where profile_id = tests.id('g_ad') $$, '23514',
  'new row for relation "volunteers" violates check constraint "volunteers_family_name_chk"', 'soyad "/" içeremez');
select throws_ok($$ update public.volunteers set given_name = 'Ali' || chr(160) || 'Veli' where profile_id = tests.id('g_ad') $$, '23514', null, 'bölünemez boşluk (U+00A0) reddedilir');
select throws_ok($$ update public.volunteers set given_name = 'Ali' || chr(8199) || 'Veli' where profile_id = tests.id('g_ad') $$, '23514', null, 'rakam genişliğinde boşluk (U+2007) reddedilir');
select throws_ok($$ update public.volunteers set given_name = 'Ali' || chr(8239) || 'Veli' where profile_id = tests.id('g_ad') $$, '23514', null, 'dar bölünemez boşluk (U+202F) reddedilir');
select throws_ok($$ update public.volunteers set given_name = 'Ali' || chr(12288) || 'Veli' where profile_id = tests.id('g_ad') $$, '23514', null, 'ideografik boşluk (U+3000) reddedilir');
select throws_ok($$ update public.volunteers set given_name = 'Ali' || chr(8203) || 'Veli' where profile_id = tests.id('g_ad') $$, '23514', null, 'sıfır genişlikli boşluk (U+200B) reddedilir');
select throws_ok($$ update public.volunteers set given_name = ' Ali' where profile_id = tests.id('g_ad') $$, '23514', null, 'baştaki boşluk reddedilir');
select throws_ok($$ update public.volunteers set given_name = 'Ali  Veli' where profile_id = tests.id('g_ad') $$, '23514', null, 'art arda iki boşluk reddedilir');
select throws_ok($$ update public.volunteers set given_name = 'Ali-' where profile_id = tests.id('g_ad') $$, '23514', null, 'sondaki tire reddedilir');
select throws_ok($$ update public.volunteers set given_name = repeat('a', 61) where profile_id = tests.id('g_ad') $$, '23514', null, 'ad en çok 60 karakter');
select throws_ok($$ update public.volunteers set given_name = '' where profile_id = tests.id('g_ad') $$, '23514', null, 'boş ad reddedilir');

select throws_ok($$ update public.volunteers set university = 'WhatsApp 0555 123 45 67' where profile_id = tests.id('g_ad') $$, '23514',
  'new row for relation "volunteers" violates check constraint "volunteers_university_chk"', 'üniversite rakam içeremez (iletişim kanalı)');
select throws_ok($$ update public.volunteers set department = 'Snap: alikaya' where profile_id = tests.id('g_ad') $$, '23514',
  'new row for relation "volunteers" violates check constraint "volunteers_department_chk"', 'bölüm ":" içeremez');
select throws_ok($$ update public.volunteers set university = 'a@b.com' where profile_id = tests.id('g_ad') $$, '23514', null, 'üniversite "@" içeremez');
select lives_ok($$ update public.volunteers set university = 'İstanbul Teknik Üniversitesi', department = 'Fen Bilgisi Öğretmenliği' where profile_id = tests.id('g_ad') $$,
  'gerçekçi üniversite ve bölüm adları kabul edilir');
select lives_ok($$ update public.volunteers set department = null where profile_id = tests.id('g_ad') $$, 'bölüm boş bırakılabilir');

-- ====================== Kısa ad: "Ad S." ======================
select is(private.short_name('Ayşe Nur', 'Kaya'), 'Ayşe Nur K.', 'kısa ad: tüm ad + soyadın baş harfi');
select is(private.short_name('Ali', 'Yılmaz Kaya'), 'Ali Y.', 'çift soyad: yalnızca İLK soyadın baş harfi');
select is(private.short_name('mehmet', 'inci'), 'mehmet İ.', 'Türkçe baş harf: i -> İ');
select is(private.short_name('Ali', 'ışık'), 'Ali I.', 'Türkçe baş harf: ı -> I');
select is(private.short_name('Zeynep', 'şahin'), 'Zeynep Ş.', 'Türkçe baş harf: ş -> Ş');
select is(private.short_name('Ömer', 'çelik'), 'Ömer Ç.', 'Türkçe baş harf: ç -> Ç');
select is(private.short_name('Ali', 'O''Brien'), 'Ali O.', 'kesme içeren soyad');
select is(private.short_name('Ali', null), null, 'soyad yoksa NULL');
select tests.login('ogr_a1');
select results_eq($$ select volunteer_name from public.matched_volunteers_for_student $$, $$ values ('Gizliad S.'::text) $$,
  'öğrenci görünümü given_name + soyad baş harfi kullanır');
select tests.login('veli_a');
select results_eq($$ select volunteer_name from public.matched_volunteers_for_guardian where match_id = tests.id('m1') $$, $$ values ('Gizliad S.'::text) $$,
  'veli görünümü de aynı kısa adı kullanır');
select tests.logout();
select throws_ok($$ select full_name from public.volunteers $$, '42703', null, 'full_name sütunu artık yok (given_name + family_name)');

-- ====================== Serbest metin yerine kod listesi ======================
select throws_ok($$ update public.matches set end_reason = 'Gonullu bana kotu davrandi, tel 0555' where id = tests.id('m3') $$, '23514',
  'new row for relation "matches" violates check constraint "matches_end_reason_chk"', 'matches.end_reason serbest metin kabul etmez');
select lives_ok($$ update public.matches set end_reason = 'yonetici_sonlandirdi' where id = tests.id('m3') $$, 'matches.end_reason kodla yazılır');
select throws_ok($$ update public.sessions set status = 'iptal', cancelled_at = now(), cancel_reason = 'Hasta oldum, doktora gidiyorum' where id = tests.id('s1') $$, '23514',
  'new row for relation "sessions" violates check constraint "sessions_cancel_reason_chk"', 'sessions.cancel_reason serbest metin (sağlık bilgisi dahil) kabul etmez');
select lives_ok($$ update public.sessions set status = 'iptal', cancelled_at = now(), cancel_reason = 'zaman_uygun_degil' where id = tests.id('s1') $$, 'sessions.cancel_reason kodla yazılır');
select is((select count(*) from pg_constraint where conrelid = 'public.sessions'::regclass and conname = 'sessions_cancel_reason_chk'), 1::bigint, 'cancel_reason kısıtı adlandırılmış');

-- ====================== Öğrenci rumuzu yalnızca velisi değiştirir ======================
select tests.login('ogr_a1');
select is(tests.affected($$ update public.profiles set display_name = 'Elif Yilmaz 0555 111 22 33' where id = tests.id('ogr_a1') $$), 0::bigint,
  'öğrenci kendi rumuzunu DEĞİŞTİREMEZ (S6)');
select tests.login('veli_a');
select is(tests.affected($$ update public.profiles set display_name = 'Gok Kus' where id = tests.id('ogr_a1') $$), 1::bigint, 'veli çocuğunun rumuzunu değiştirebilir');
select is(tests.affected($$ update public.profiles set display_name = 'Yeni Veli Adi' where id = tests.id('veli_a') $$), 1::bigint, 'veli kendi görünen adını değiştirebilir');
select is(tests.affected($$ update public.profiles set display_name = 'Hack' where id = tests.id('ogr_b1') $$), 0::bigint, 'veli BAŞKA velinin çocuğunun rumuzunu değiştiremez');
select throws_ok($$ update public.profiles set role = 'veli' where id = tests.id('ogr_a1') $$, '42501', null, 'veli çocuğun rolünü değiştiremez');
select tests.login('gon_x');
select is(tests.affected($$ update public.profiles set display_name = 'Hack' where id = tests.id('ogr_a1') $$), 0::bigint, 'gönüllü öğrencinin rumuzunu değiştiremez');
select tests.logout();
select is((select display_name from public.profiles where id = tests.id('ogr_a1')), 'Gok Kus', 'rumuz yalnızca velinin değişikliğiyle güncellendi');

-- ====================== İkinci savunma hattı: tetikleyici ======================
-- Birisi ileride RLS politikasını yanlışlıkla gevşetirse (geçici politika ile simüle edilir; ROLLBACK ile kalkar),
-- onaylı gönüllü profili yine de tetikleyiciyle korunur.
create policy gecici_hepsi on public.volunteers for update to authenticated using (true) with check (true);
grant update (status, max_students) on public.volunteers to authenticated;   -- sütun yetkisi de gevşetilmiş gibi (ROLLBACK ile kalkar)
select tests.login('gon_x');
select throws_ok($$ update public.volunteers set given_name = 'Ali' where profile_id = tests.id('gon_x') $$,
  '42501', 'Onaylanmış / sonuçlanmış gönüllü profili değiştirilemez', 'ikinci hat: politika gevşese bile tetikleyici onaylı profili korur');
select throws_ok($$ update public.volunteers set status = 'onayli', max_students = 99 where profile_id = tests.id('gon_x') $$,
  '42501', 'Gönüllü durum/onay alanları istemciden değiştirilemez', 'ikinci hat: politika VE sütun yetkisi gevşese bile durum / onay alanlarını tetikleyici korur');
select tests.logout();
drop policy gecici_hepsi on public.volunteers;

select * from finish();
rollback;
