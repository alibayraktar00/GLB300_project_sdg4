-- =====================================================================
-- 076 · WEB PUSH ABONELİKLERİ (device_tokens'ın yerine) · SES MIME TÜRLERİ
-- Ş1: push_subscriptions — endpoint CHECK'i (SSRF: yalnızca https + bilinen push servisi alan adları),
--     anahtar biçimleri, RPC'ler (register_push_subscription / remove_push_subscription), hesap devri, sınır, temizlik alanı.
-- Ş2: ses MIME türleri (Safari audio/mp4, Chrome/Firefox audio/webm) parametresiz tutulur.
-- =====================================================================
begin;
select plan(59);
select tests.make_fixture();

-- ====================== Şema ======================
select hasnt_table('public', 'device_tokens', 'device_tokens kaldırıldı (FCM / APNs jetonu yok: yalnızca Web Push)');
select has_table('public', 'push_subscriptions', 'push_subscriptions var');
select columns_are('public', 'push_subscriptions',
  array['id', 'user_id', 'endpoint', 'p256dh', 'auth', 'device_label', 'created_at', 'updated_at'],
  'push_subscriptions sütunları (ham user_agent YOK: yalnızca uç nokta, anahtarlar, isteğe bağlı KABA cihaz etiketi, zamanlar)');
select col_is_unique('public', 'push_subscriptions', 'endpoint', 'endpoint benzersiz (aynı endpoint iki hesapta olamaz)');
select has_index('public', 'push_subscriptions', 'push_subscriptions_updated_idx', 'updated_at indeksi: 60 günlük temizlik (SK-17)');
select fk_ok('public', 'push_subscriptions', 'user_id', 'public', 'profiles', 'id', 'abonelik kullanıcıya bağlı');
select is((select confdeltype::text from pg_constraint where conrelid = 'public.push_subscriptions'::regclass and contype = 'f'), 'c',
  'hesap silinince abonelikleri de silinir (ON DELETE CASCADE)');
select ok((select relrowsecurity from pg_class where oid = 'public.push_subscriptions'::regclass), 'RLS açık');

-- ====================== Endpoint CHECK kısıtı (SSRF) ======================
create temp table pt_sonuc (e text, kabul boolean);
do $$
declare
  r record;
begin
  for r in
    select e from (values
      ('http://fcm.googleapis.com/fcm/send/x'),                              -- https değil
      ('https://evil.example.com/fcm/send/x'),                               -- izinli alan adı değil
      ('https://fcm.googleapis.com.evil.com/fcm/send/x'),                    -- alan adı sonekle uzatılmış
      ('https://evil.com/fcm.googleapis.com/fcm/send/x'),                    -- izinli alan adı yolda
      ('https://fcm.googleapis.com@evil.com/fcm/send/x'),                    -- kullanıcı bilgisi tuzağı
      ('https://evil.com@fcm.googleapis.com/fcm/send/x'),                    -- kullanıcı bilgisi önde
      ('https://fcm.googleapis.com\.evil.com/x'),                            -- ters eğik çizgi
      ('https://fcm.googleapis.com:8443/fcm/send/x'),                        -- farklı port
      ('https://FCM.googleapis.com/fcm/send/x'),                             -- büyük harfli alan adı
      ('https://fcm.googleapis.com'),                                        -- yol yok
      ('https://fcm.googleapis.com/fcm/send/x y'),                           -- boşluk
      ('https://fcm.googleapis.com/fcm/send/x' || chr(10) || 'Host: evil'),  -- satır sonu (başlık enjeksiyonu)
      ('https://localhost/x'), ('https://127.0.0.1/x'), ('https://[::1]/x'),
      ('https://169.254.169.254/latest/meta-data/'),                         -- bulut meta veri adresi
      ('https://updates.push.services.mozilla.com.attacker.net/wpush/v2/x'),
      ('https://push.apple.com/x'),                                          -- etiketsiz apex
      ('https://-kotu.push.apple.com/x'),                                    -- etiket tireyle başlıyor
      ('https://evil.com.push.apple.com.attacker.net/x'),
      ('https://notify.windows.com/x'),                                      -- etiketsiz apex
      ('https://wns2.notify.windows.com.evil.net/w/?token=x'),
      ('https://fcm.googleapis.com/' || repeat('a', 2100)),                  -- 2048 karakter sınırı
      ('ftp://fcm.googleapis.com/x'), ('//fcm.googleapis.com/x'), ('fcm.googleapis.com/x'), ('')
    ) v(e)
  loop
    begin
      insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
      values (tests.id('veli_a'), r.e, repeat('A', 87), repeat('a', 22));
      insert into pt_sonuc values (r.e, true);
    exception when check_violation then
      insert into pt_sonuc values (r.e, false);
    end;
  end loop;
  -- geçerli biçimler: dört push servisi (+ açık :443)
  for r in
    select e from (values
      ('https://fcm.googleapis.com/fcm/send/dQw4w9WgXcQ:APA91bHun4MxP5egoKMwt2KZFBaFUH-1RYqx_gec'),
      ('https://fcm.googleapis.com/wp/ABCdef123-_456'),
      ('https://updates.push.services.mozilla.com/wpush/v2/gAAAAABk-xYz_0123456789'),
      ('https://web.push.apple.com/QDBbvWx3Y0h9-KJHg_aZk=='),
      ('https://wns2-par02p.notify.windows.com/w/?token=BQYAAAB%2fKjh%3d'),
      ('https://fcm.googleapis.com:443/fcm/send/abc')
    ) v(e)
  loop
    begin
      insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
      values (tests.id('veli_a'), r.e, repeat('A', 87), repeat('a', 22));
      insert into pt_sonuc values (r.e, true);
    exception when check_violation then
      insert into pt_sonuc values (r.e, false);
    end;
  end loop;
end $$;
select is_empty($$ select left(e, 70) from pt_sonuc where kabul and e not in (
    'https://fcm.googleapis.com/fcm/send/dQw4w9WgXcQ:APA91bHun4MxP5egoKMwt2KZFBaFUH-1RYqx_gec',
    'https://fcm.googleapis.com/wp/ABCdef123-_456',
    'https://updates.push.services.mozilla.com/wpush/v2/gAAAAABk-xYz_0123456789',
    'https://web.push.apple.com/QDBbvWx3Y0h9-KJHg_aZk==',
    'https://wns2-par02p.notify.windows.com/w/?token=BQYAAAB%2fKjh%3d',
    'https://fcm.googleapis.com:443/fcm/send/abc') $$,
  'SSRF: izinli push servisi dışındaki, http, kullanıcı bilgili, portlu, ters eğik çizgili, boşluklu, iç ağ / meta veri adresli endpoint''lerin HİÇBİRİ kabul edilmez');
select is((select count(*) from pt_sonuc where not kabul), 27::bigint, 'SSRF: 27 kötü örneğin hepsi CHECK''e takıldı');
select is((select count(*) from pt_sonuc where kabul), 6::bigint, 'FCM (iki biçim), Mozilla, Apple (web.push.apple.com), Windows WNS ve :443 biçimleri kabul edilir');
drop table pt_sonuc;
delete from public.push_subscriptions where user_id = tests.id('veli_a') and id <> tests.id('ps_veli_a');   -- DO bloğunda kabul edilen geçerli örnekleri temizle

-- Anahtar ve user_agent biçimleri
select throws_ok($$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (tests.id('veli_a'), 'https://fcm.googleapis.com/fcm/send/k1', repeat('A', 86), repeat('a', 22)) $$,
  '23514', null, 'p256dh 87 karakter olmalı (65 bayt P-256 noktası, base64url)');
select throws_ok($$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (tests.id('veli_a'), 'https://fcm.googleapis.com/fcm/send/k2', repeat('A', 87), repeat('a', 21)) $$,
  '23514', null, 'auth 22 karakter olmalı (16 bayt gizli, base64url)');
select throws_ok($$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (tests.id('veli_a'), 'https://fcm.googleapis.com/fcm/send/k3', repeat('A', 86) || '+', repeat('a', 22)) $$,
  '23514', null, 'p256dh base64url dışı karakter (+) içeremez');
select throws_ok($$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (tests.id('veli_a'), 'https://fcm.googleapis.com/fcm/send/k4', repeat('A', 87), repeat('a', 21) || '=') $$,
  '23514', null, 'auth dolgu (=) içeremez');
-- Cihaz etiketi (SK-17): HAM kullanıcı aracısı saklanmaz; yalnızca "Chrome · Android" gibi kaba etiket kabul edilir
create temp table pt_etiket (e text, kabul boolean);
do $$
declare
  r record;
  n int := 0;
begin
  for r in
    select e from (values
      ('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'),  -- ham UA
      ('Chrome 126 · Android'), ('Chrome/126 · Android'), ('Chrome · Android 14'),       -- sürüm numarası / eğik çizgi
      (''), (' '), ('Chrome ·Android'), ('Chrome · Android · Pixel'),                    -- boş, biçim bozuk, üç parça
      (repeat('A', 41)), ('Aaaaaaaaaaaaaaaaaaaa · Bbbbbbbbbbbbbbbbbbbb'), ('Chrome' || chr(10) || '· Android'), ('Chrome; Android'), ('1Chrome'), ('Chrome (Android)')
    ) v(e)
  loop
    n := n + 1;
    begin
      insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, device_label)
      values (tests.id('veli_a'), 'https://fcm.googleapis.com/fcm/send/etiket-' || n, repeat('A', 87), repeat('a', 22), r.e);
      insert into pt_etiket values (r.e, true);
    exception when check_violation then
      insert into pt_etiket values (r.e, false);
    end;
  end loop;
  for r in
    select e from (values ('Chrome · Android'), ('Safari · iOS'), ('Edge · Windows'), ('Firefox · Linux'), ('Safari · macOS'),
                          ('Samsung Internet · Android'), ('Chrome')) v(e)
  loop
    n := n + 1;
    begin
      insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, device_label)
      values (tests.id('veli_a'), 'https://fcm.googleapis.com/fcm/send/etiket-' || n, repeat('A', 87), repeat('a', 22), r.e);
      insert into pt_etiket values (r.e, true);
    exception when check_violation then
      insert into pt_etiket values (r.e, false);
    end;
  end loop;
end $$;
select is_empty($$ select left(e, 50) from pt_etiket where kabul and e not in
    ('Chrome · Android', 'Safari · iOS', 'Edge · Windows', 'Firefox · Linux', 'Safari · macOS', 'Samsung Internet · Android', 'Chrome') $$,
  'cihaz etiketi: ham User-Agent, sürüm numarası, eğik çizgi, parantez, satır sonu ve 40 karakter üstü etiketlerin HİÇBİRİ kabul edilmez');
select is((select count(*) from pt_etiket where not kabul), 14::bigint, 'cihaz etiketi: 14 kötü örneğin hepsi CHECK''e takıldı');
select is((select count(*) from pt_etiket where kabul), 7::bigint, 'cihaz etiketi: "Chrome · Android" gibi kaba etiketler (tek ya da iki parçalı) kabul edilir');
drop table pt_etiket;
delete from public.push_subscriptions where user_id = tests.id('veli_a') and id <> tests.id('ps_veli_a');

-- ====================== RPC: register_push_subscription ======================
select tests.login_anon();
select throws_ok($$ select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/anon-aaaaaaaaaaaaaaaaaaaa', repeat('A', 87), repeat('a', 22)) $$,
  '42501', null, 'anon: abonelik kaydedemez');
select throws_ok($$ select public.remove_push_subscription('https://fcm.googleapis.com/fcm/send/anon-aaaaaaaaaaaaaaaaaaaa') $$, '42501', null, 'anon: abonelik silemez');
select tests.logout();
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
set local role authenticated;
select throws_ok($$ select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/oturumsuz-aaaaaaaaaaaaaaaa', repeat('A', 87), repeat('a', 22)) $$,
  '42501', 'register_push_subscription: oturum gerekli', 'oturumsuz (sub yok) çağrı reddedilir');
select tests.logout();

select tests.login('veli_a');
select ok(public.register_push_subscription('https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa', repeat('B', 87), repeat('b', 22), 'Chrome · Android') is not null,
  'aktif kullanıcı abonelik kaydeder (abonelik kimliği döner)');
select results_eq($$ select user_id, p256dh = repeat('B', 87), auth = repeat('b', 22), device_label from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa' $$,
  $$ select tests.id('veli_a'), true, true, 'Chrome · Android'::text $$, 'kayıt çağıranın hesabına yazılır (kullanıcı kimliği istemciden alınmaz)');
select is(public.register_push_subscription('https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa', repeat('C', 87), repeat('c', 22)),
  (select id from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa'),
  'aynı endpoint tekrar kaydedilince aynı satır tazelenir (çoğalmaz)');
select is((select count(*) from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa'), 1::bigint, 'endpoint başına tek satır');
select is((select p256dh from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa'), repeat('C', 87), 'anahtarlar yenisiyle değişir');
select is((select device_label from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa'), null,
  'device_label isteğe bağlı: gönderilmezse boş kalır (yeniden kayıt etiketi de siler: veri en aza indirme)');
select tests.logout();
update public.push_subscriptions set updated_at = now() - interval '45 days' where endpoint = 'https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa';
select tests.login('veli_a');
select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa', repeat('C', 87), repeat('c', 22));
select ok((select updated_at > now() - interval '1 minute' from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa'),
  'her kayıtta updated_at tazelenir (SK-17: 60 gün tazelenmeyen abonelik cleanup ile silinir)');
select throws_ok($$ select public.register_push_subscription('https://evil.example.com/fcm/send/x', repeat('A', 87), repeat('a', 22)) $$,
  '23514', null, 'RPC de SSRF kısıtına takılır (izinli olmayan alan adı)');
select throws_ok($$ select public.register_push_subscription('http://fcm.googleapis.com/fcm/send/x', repeat('A', 87), repeat('a', 22)) $$,
  '23514', null, 'RPC: http endpoint reddedilir');
select throws_ok($$ select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/ham-ua-aaaaaaaaaaaaaaaa', repeat('A', 87), repeat('a', 22), 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36') $$,
  '23514', null, 'RPC: ham User-Agent dizgesi cihaz etiketi olarak kabul edilmez (SK-17)');
select throws_ok($$ select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/kisa-anahtar-aaaaaaaa', 'kisa', repeat('a', 22)) $$,
  '23514', null, 'RPC: biçimi bozuk anahtar reddedilir');
select is(tests.cnt($$ select 1 from public.push_subscriptions $$), 2::bigint, 'veli_a yalnızca kendi 2 aboneliğini görür (fixture + yeni); başkalarınınkini görmez');

-- ====================== Hesap devri: aynı endpoint başka hesaba geçer ======================
select tests.logout();
select set_config('t.eski_abonelik', (select id::text from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa'), true);
select tests.login('veli_b');
select is(public.register_push_subscription('https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa', repeat('D', 87), repeat('d', 22))::text,
  current_setting('t.eski_abonelik'),
  'aynı tarayıcıda hesap değişince (aynı endpoint) mevcut satır YENİ kullanıcıya taşınır');
select is((select user_id from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa'), tests.id('veli_b'), 'sahip artık veli_b');
select is((select p256dh from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa'), repeat('D', 87), 'anahtarlar yeni kayıttakilerle değişir');
select tests.login('veli_a');
select is(tests.cnt($$ select 1 from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa' $$), 0::bigint,
  'eski kullanıcı (veli_a) artık o tarayıcının aboneliğini görmez: push eski hesaba gitmez');

-- ====================== RPC: remove_push_subscription ======================
select is(public.remove_push_subscription('https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa'), false, 'başkasının aboneliği silinemez (false döner, satır yerinde)');
select tests.login('veli_b');
select is(public.remove_push_subscription('https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa'), true, 'sahibi kendi aboneliğini siler (çıkış)');
select is(public.remove_push_subscription('https://fcm.googleapis.com/fcm/send/veli-a-yeni-aaaaaaaaaaaaaaaa'), false, 'olmayan abonelik: false');
select tests.logout();

-- ====================== Kullanıcı başına en çok 10 abonelik ======================
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, updated_at)
select tests.id('gon_y'), 'https://fcm.googleapis.com/fcm/send/lim-' || lpad(g::text, 2, '0'), repeat('A', 87), repeat('a', 22), now() - (g || ' days')::interval
from generate_series(1, 10) g;
select tests.login('gon_y');
select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/lim-yeni', repeat('A', 87), repeat('a', 22));
select is(tests.cnt($$ select 1 from public.push_subscriptions $$), 10::bigint, 'kullanıcı başına en çok 10 abonelik kalır');
select is(tests.cnt($$ select 1 from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/lim-10' $$), 0::bigint, 'fazla olan: en uzun süredir tazelenmeyen abonelik silinir');
select is(tests.cnt($$ select 1 from public.push_subscriptions where endpoint in ('https://fcm.googleapis.com/fcm/send/lim-yeni', 'https://fcm.googleapis.com/fcm/send/lim-01') $$), 2::bigint,
  'yeni ve en taze abonelikler korunur');
select tests.logout();

-- ====================== Askıdaki / beklemedeki kullanıcı ======================
update public.profiles set status = 'askida' where id = tests.id('gon_x');
select tests.login('gon_x');
select throws_ok($$ select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/askida-gon-x-aaaaaaaaaaaa', repeat('A', 87), repeat('a', 22)) $$,
  '42501', 'register_push_subscription: hesap aktif değil', 'askıdaki gönüllü abone olamaz');
select is(tests.cnt($$ select 1 from public.push_subscriptions $$), 1::bigint, 'askıdaki kullanıcı mevcut aboneliğini okuyabilir (silebilsin diye)');
select is(public.remove_push_subscription('https://updates.push.services.mozilla.com/wpush/v2/gon-x-xxxxxxxxxxxx'), true, 'askıdaki kullanıcı aboneliğini silebilir');
select tests.logout();
update public.profiles set status = 'beklemede' where id = tests.id('ogr_b1');
select tests.login('ogr_b1');
select throws_ok($$ select public.register_push_subscription('https://fcm.googleapis.com/fcm/send/beklemede-ogr-aaaaaaaaaaaa', repeat('A', 87), repeat('a', 22)) $$,
  '42501', 'register_push_subscription: hesap aktif değil', 'hesabı "beklemede" olan çocuk (ör. AR-1 geri çekildi) abone olamaz');
select tests.logout();

-- ====================== Doğrudan tablo erişimi ve hesap silme ======================
select tests.login('veli_a');
select throws_ok($$ insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (tests.id('veli_a'), 'https://fcm.googleapis.com/fcm/send/dogrudan-aaaaaaaaaaaaaaaaaa', repeat('A', 87), repeat('a', 22)) $$,
  '42501', null, 'istemci tabloya doğrudan satır ekleyemez');
select throws_ok($$ update public.push_subscriptions set user_id = tests.id('veli_b') $$, '42501', null, 'istemci abonelik sahibini doğrudan değiştiremez');
select tests.logout();
select tests.signup('ps_tmp', 'pstmp@pgtap.test', '{"role":"veli"}');
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (tests.id('ps_tmp'), 'https://fcm.googleapis.com/fcm/send/ps-tmp-aaaaaaaaaaaaaaaaaaaa', repeat('A', 87), repeat('a', 22));
delete from auth.users where id = tests.id('ps_tmp');
select is((select count(*) from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/ps-tmp-aaaaaaaaaaaaaaaaaaaa'), 0::bigint, 'hesap silinince push abonelikleri de silinir (CASCADE)');
select tests.login_service();
select lives_ok($$ select endpoint, p256dh, auth from public.push_subscriptions $$, 'servis rolü (send-push) abonelikleri okuyabilir');
select is(tests.affected($$ delete from public.push_subscriptions where endpoint = 'https://fcm.googleapis.com/fcm/send/lim-yeni' $$), 1::bigint,
  'servis rolü 404/410 alan aboneliği silebilir');
select tests.logout();

-- ====================== Ş2: ses MIME türleri ======================
select ok((select allowed_mime_types @> array['audio/mp4', 'audio/webm'] from storage.buckets where id = 'soru-ekleri'),
  'soru-ekleri bucket''ı Safari (audio/mp4 -> .m4a) ve Chrome / Firefox (audio/webm -> .webm) ses türlerini kabul eder');
select ok(not exists (select 1 from storage.buckets b, unnest(b.allowed_mime_types) m where b.id = 'soru-ekleri' and m like '%;%'),
  'bucket listesinde parametreli MIME ("audio/webm;codecs=opus") yok: istemci / Route Handler MIME''yi parametresiz gönderir');
select lives_ok($$ insert into public.attachments (message_id, storage_path, kind, mime, size_bytes, duration_sec)
                   values (tests.id('msg1'), tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('ses_mp4')::text || '.m4a', 'ses', 'audio/mp4', 40000, 20) $$,
  'attachments: Safari kaydı (audio/mp4, .m4a) kabul edilir');
select lives_ok($$ insert into public.attachments (message_id, storage_path, kind, mime, size_bytes, duration_sec)
                   values (tests.id('msg1'), tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('ses_webm')::text || '.webm', 'ses', 'audio/webm', 40000, 20) $$,
  'attachments: Chrome / Firefox kaydı (audio/webm, .webm) kabul edilir');
select throws_ok($$ insert into public.attachments (message_id, storage_path, kind, mime, size_bytes, duration_sec)
                    values (tests.id('msg1'), tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('ses_param')::text || '.webm', 'ses', 'audio/webm;codecs=opus', 40000, 20) $$,
  '23514', null, 'attachments.mime parametresiz olmalı: backend "audio/webm;codecs=opus"u kaydetmeden önce ";" sonrasını atar (yol uzantısından da türetilebilir)');
select throws_ok($$ insert into public.attachments (message_id, storage_path, kind, mime, size_bytes, duration_sec)
                    values (tests.id('msg1'), tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('ses_ogg')::text || '.webm', 'ses', 'audio/ogg', 40000, 20) $$,
  '23514', null, 'audio/ogg (Firefox varsayılanı) kabul edilmez: istemci önce webm / mp4 dener (plan 4.3.4); gerekirse dört yer birlikte değişir');
select throws_ok($$ insert into public.attachments (message_id, storage_path, kind, mime, size_bytes)
                    values (tests.id('msg1'), tests.id('ogr_a1')::text || '/' || tests.id('q1')::text || '/' || tests.id('foto_png')::text || '.jpg', 'foto', 'image/png', 40000) $$,
  '23514', null, 'fotoğraf yalnızca JPEG: istemci tarayıcıda yeniden kodlar (HEIC / PNG kabul edilmez)');

select * from finish();
rollback;
