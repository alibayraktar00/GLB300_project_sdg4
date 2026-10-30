-- =====================================================================
-- 083 · SORU-CEVAP İŞLEVLERİ (migration 10): ask_question, post_message, claim_question, close_question
-- Fixture: ogr_a1 (6. sınıf) ile gon_x MAT'ta aktif eşleşmiş; ogr_b1 (6. sınıf) MAT'ta eşleşmesiz;
-- gon_y onaylı, MAT 6 + FEN 6. veli_a ogr_a1'in velisi.
-- =====================================================================
begin;
select plan(48);
select tests.make_fixture();

-- ====================== Yetki ======================
select tests.login_anon();
select throws_ok($$ select public.ask_question(tests.id('qa0'), 'MAT', 'x') $$, '42501', null, 'anon soru soramaz');
select tests.logout();

select tests.login('veli_a');
select throws_ok($$ select public.ask_question(tests.id('qa0'), 'MAT', 'x') $$, '42501',
  'ask_question: yalnızca aktif öğrenci soru sorabilir', 'veli soru soramaz');
select throws_ok($$ select public.close_question(tests.id('q1')) $$, '42501', 'close_question: yalnızca aktif öğrenci', 'veli soru kapatamaz');
select tests.logout();

-- ====================== Girdi doğrulaması ======================
select tests.login('ogr_a1');
select throws_ok($$ select public.ask_question(null, 'MAT', 'x') $$, '22023', 'SORU_KIMLIK: soru kimliği gerekli', 'soru kimliği şart');
select throws_ok($$ select public.ask_question(tests.id('qa0'), 'MAT', '   ') $$, '22023', 'SORU_BOS: soru metni ya da fotoğrafı gerekli', 'boş soru');
select throws_ok($$ select public.ask_question(tests.id('qa0'), 'MAT', repeat('a', 4001)) $$, '22023', 'METIN_UZUN: soru en çok 4000 karakter olabilir', 'çok uzun soru');
select throws_ok($$ select public.ask_question(tests.id('qa0'), 'TAR', 'x') $$, '22023', 'DERS_GECERSIZ: bilinmeyen ders kodu', 'bilinmeyen ders');
select throws_ok($$ select public.ask_question(tests.id('qa0'), 'MAT', 'x', array['a','b','c','d']) $$, '22023', 'EK_COK: en çok 3 fotoğraf eklenebilir', 'dörtten fazla ek');
select throws_ok($$ select public.ask_question(tests.id('q1'), 'MAT', 'x') $$, '22023', 'SORU_VAR: bu kimlikle bir soru zaten var', 'var olan kimlikle soru');
select tests.logout();

-- ====================== Eşleşmiş gönüllüye atama ======================
select tests.login('ogr_a1');
select lives_ok($$ select public.ask_question(tests.id('qa1'), 'MAT', '3x + 5 = 20 ise x kaçtır?') $$, 'öğrenci soru sordu');
select tests.logout();
select is((select status from public.questions where id = tests.id('qa1')), 'atandi', 'aktif eşleşme varsa soru atandı');
select is((select assigned_volunteer_id from public.questions where id = tests.id('qa1')), tests.id('gon_x'), 'eşleşmiş gönüllüye (süreklilik)');
select is((select grade::int from public.questions where id = tests.id('qa1')), 6, 'sınıf öğrencinin kayıtlı sınıfından alındı');
select ok((select assigned_at is not null from public.questions where id = tests.id('qa1')), 'atama zamanı damgalandı (24 saat kuralı için)');
select is((select kind from public.question_messages where question_id = tests.id('qa1')), 'soru', 'ilk mesaj "soru" türünde');
select is((select count(*)::int from public.question_messages where question_id = tests.id('qa1')), 1, 'tek mesaj');

-- ====================== Eşleşmesiz öğrenci: havuz ======================
select tests.login('ogr_b1');
select lives_ok($$ select public.ask_question(tests.id('qb1'), 'MAT', 'Üslü sayılar nasıl çarpılır?') $$, 'eşleşmesiz öğrenci soru sordu');
select tests.logout();
select is((select status from public.questions where id = tests.id('qb1')), 'havuzda', 'eşleşme yoksa soru havuza düştü');
select is((select assigned_volunteer_id from public.questions where id = tests.id('qb1')), null, 'havuzdaki soru kimseye atanmamış');

-- ====================== İletişim bilgisi filtresi (migration 09) soru metninde ======================
select tests.login('ogr_b1');
select lives_ok($$ select public.ask_question(tests.id('qb2'), 'MAT', 'Bana whatsapp tan 0555 123 45 67 yaz') $$, 'iletişim bilgisi içeren soru kabul edilir ama süzülür');
select tests.logout();
select is((select body from public.question_messages where question_id = tests.id('qb2')), 'Bana [gizlendi] tan [gizlendi] yaz', 'soru metni maskelendi');
select ok((select has_flag from public.question_messages where question_id = tests.id('qb2')), 'mesaj bayraklandı');

-- ====================== Fotoğraf ekleri ======================
insert into storage.objects (bucket_id, name, owner_id, metadata) values
  ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('qp1')::text || '/' || tests.id('f1')::text || '.jpg', tests.id('ogr_a1')::text, '{"size": 150000}'),
  ('soru-ekleri', tests.id('ogr_a1')::text || '/' || tests.id('qp1')::text || '/' || tests.id('f2')::text || '.jpg', tests.id('gon_y')::text,  '{"size": 150000}');

select tests.login('ogr_a1');
select throws_ok(format($$ select public.ask_question(tests.id('qp1'), 'MAT', 'foto', array[%L]) $$,
    tests.id('ogr_b1')::text || '/' || tests.id('qp1')::text || '/' || tests.id('f1')::text || '.jpg'),
  '22023', 'EK_GECERSIZ: ek yolu bu soruya ait değil', 'başka öğrencinin klasörü bağlanamaz');
select throws_ok(format($$ select public.ask_question(tests.id('qp1'), 'MAT', 'foto', array[%L]) $$,
    tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('f1')::text || '.jpg'),
  '22023', 'EK_GECERSIZ: ek yolu bu soruya ait değil', 'başka sorunun klasörü bağlanamaz');
select throws_ok(format($$ select public.ask_question(tests.id('qp1'), 'MAT', 'foto', array[%L]) $$,
    tests.id('ogr_a1')::text || '/' || tests.id('qp1')::text || '/' || tests.id('f1')::text || '.png'),
  '22023', 'EK_GECERSIZ: ek yolu bu soruya ait değil', 'yalnızca JPEG yolu kabul edilir');
select throws_ok(format($$ select public.ask_question(tests.id('qp1'), 'MAT', 'foto', array[%L]) $$,
    tests.id('ogr_a1')::text || '/' || tests.id('qp1')::text || '/' || tests.id('f3')::text || '.jpg'),
  '22023', 'EK_YOK: dosya yüklenmemiş ya da size ait değil', 'yüklenmemiş dosya bağlanamaz');
select throws_ok(format($$ select public.ask_question(tests.id('qp1'), 'MAT', 'foto', array[%L]) $$,
    tests.id('ogr_a1')::text || '/' || tests.id('qp1')::text || '/' || tests.id('f2')::text || '.jpg'),
  '22023', 'EK_YOK: dosya yüklenmemiş ya da size ait değil', 'başkasının yüklediği dosya bağlanamaz');
select is((select count(*)::int from public.questions where id = tests.id('qp1')), 0, 'başarısız denemelerde soru da oluşmaz (işlem geri alındı)');
select lives_ok(format($$ select public.ask_question(tests.id('qp1'), 'MAT', '', array[%L]) $$,
    tests.id('ogr_a1')::text || '/' || tests.id('qp1')::text || '/' || tests.id('f1')::text || '.jpg'),
  'yalnızca fotoğraflı soru (metinsiz) kabul edilir');
select tests.logout();
select is((select a.kind || ':' || a.mime || ':' || a.size_bytes from public.attachments a join public.question_messages m on m.id = a.message_id where m.question_id = tests.id('qp1')),
  'foto:image/jpeg:150000', 'ek satırı: tür, mime ve boyut Storage kaydından alındı');

-- ====================== Cevap ve takip ======================
select tests.login('gon_y');
select throws_ok($$ select public.post_message(tests.id('qa1'), 'cevap') $$, '42501', 'SORU_YOK: soru bulunamadı', 'atanmamış gönüllü cevap yazamaz (varlığı sızdırılmaz)');
select tests.logout();
select tests.login('ogr_b1');
select throws_ok($$ select public.post_message(tests.id('qa1'), 'merhaba') $$, '42501', 'SORU_YOK: soru bulunamadı', 'başka öğrenci başkasının sorusuna yazamaz');
select tests.logout();
select tests.login('veli_a');
select throws_ok($$ select public.post_message(tests.id('qa1'), 'merhaba') $$, '42501', 'SORU_YOK: soru bulunamadı', 'veli yalnızca okur, yazamaz');
select tests.logout();

select tests.login('gon_x');
select lives_ok($$ select public.post_message(tests.id('qa1'), 'x = 5 çünkü 3x = 15') $$, 'atanmış gönüllü cevap yazdı');
select tests.logout();
select is((select status from public.questions where id = tests.id('qa1')), 'cevaplandi', 'cevaptan sonra soru "cevaplandı"');
select ok((select first_answered_at is not null from public.questions where id = tests.id('qa1')), 'ilk cevap zamanı kaydedildi');
select is((select kind from public.question_messages where question_id = tests.id('qa1') and sender_id = tests.id('gon_x')), 'cevap', 'mesaj türü "cevap"');

select tests.login('ogr_a1');
select lives_ok($$ select public.post_message(tests.id('qa1'), 'Neden 15?') $$, 'öğrenci takip sorusu yazdı');
select tests.logout();
select is((select status from public.questions where id = tests.id('qa1')), 'atandi', 'takip sorusu aynı gönüllüye yeniden cevap bekler');

-- ====================== Havuz: üstlenme ======================
select tests.login('veli_a');
select throws_ok($$ select public.claim_question(tests.id('qb1')) $$, '42501', 'claim_question: yalnızca onaylı gönüllü üstlenebilir', 'veli üstlenemez');
select tests.logout();
select tests.login('gon_y');
select lives_ok($$ select public.claim_question(tests.id('qb1')) $$, 'verdiği derste havuz sorusunu üstlendi');
select tests.logout();
select is((select assigned_volunteer_id from public.questions where id = tests.id('qb1')), tests.id('gon_y'), 'soru üstlenen gönüllüye atandı');
select tests.login('gon_x');
select throws_ok($$ select public.claim_question(tests.id('qb1')) $$, '22023',
  'HAVUZ_YOK: soru havuzda değil, başkası üstlendi ya da bu soruyu üstlenemezsiniz', 'üstlenilmiş soru bir daha üstlenilemez (tek kazanan)');
select tests.logout();

-- ====================== Kapatma ======================
select tests.login('ogr_b1');
select throws_ok($$ select public.close_question(tests.id('qa1')) $$, '22023', 'SORU_YOK: soru bulunamadı ya da zaten kapalı', 'başkasının sorusu kapatılamaz');
select tests.logout();
select tests.login('ogr_a1');
select lives_ok($$ select public.close_question(tests.id('qa1')) $$, 'öğrenci sorusunu kapattı');
select throws_ok($$ select public.post_message(tests.id('qa1'), 'tekrar') $$, '22023', 'SORU_KAPALI: kapanmış soruya mesaj yazılamaz', 'kapanmış soruya yazılamaz');
select tests.logout();

-- ====================== Günlük sınır ve kapalı özellik ======================
insert into public.questions (student_id, subject_id, grade, status)
select tests.id('ogr_b1'), (select id from public.subjects where code = 'MAT'), 6, 'havuzda' from generate_series(1, 20);
select tests.login('ogr_b1');
select throws_ok($$ select public.ask_question(tests.id('qb9'), 'MAT', 'bir tane daha') $$, '22023',
  'GUNLUK_SINIR: 24 saatte en çok 20 soru sorulabilir', '24 saatte en çok 20 soru');
select tests.logout();

update public.student_features set qa_enabled = false where student_id = tests.id('ogr_a1');
select tests.login('ogr_a1');
select throws_ok($$ select public.ask_question(tests.id('qz1'), 'MAT', 'veli kapattı') $$, '42501',
  'OZELLIK_KAPALI: soru-cevap bu öğrenci için veli tarafından kapatıldı', 'veli soru-cevabı kapattıysa soru sorulamaz');
select tests.logout();

select * from finish();
rollback;
