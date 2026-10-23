// create-child-account: veli, çocuğu için giriş hesabı açar (docs/plan.md 4.1 ve 6).
//
// DURUM: yazıldı ama henüz hiçbir Supabase projesinde ÇALIŞTIRILMADI (proje yok, Deno ve Docker kurulu değil).
// İlk dev projesinde `supabase functions deploy create-child-account` sonrası uçtan uca denenmelidir.
//
// Güvenlik:
//   - Çağıran, istekle gelen kullanıcı JWT'sinden (Authorization) belirlenir; gövdedeki hiçbir kimliğe güvenilmez.
//   - Çağıran aktif bir `veli` olmalı.
//   - AR-1 açık rızası bu işlemin KENDİSİNDE, çocuk hesabıyla birlikte ve en güncel yayımlanmış metin sürümüyle
//     kaydedilir; rıza kaydı olmadan hesap bırakılmaz (hata olursa oluşturulan Auth kullanıcısı silinir).
//   - Servis anahtarı yalnızca bu işlevin ortamında bulunur; web uygulamasına hiç girmez.
//   - Yanıt her zaman HTTP 200'dür; sonuç `{ ok, code }` alanındadır (hata ayrıntısı istemciye sızmaz).

import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const MAX_CHILDREN_PER_GUARDIAN = 5;
const STUDENT_EMAIL_DOMAIN = 'ogrenci.ornek.test'; // web/src/lib/auth.ts içindeki STUDENT_EMAIL_DOMAIN ile aynı olmalı
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;
const NICKNAME_PATTERN = /^\p{L}+(?:[ '’-]\p{L}+)*$/u;

type Code = 'username_taken' | 'limit' | 'consent' | 'invalid' | 'forbidden';
type Result = { ok: true } | { ok: false; code: Code };

const json = (body: Result) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (request) => {
  if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const url = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!url || !publishableKey || !serviceKey || !authorization) return json({ ok: false, code: 'forbidden' });

  // 1) Çağıranı kullanıcı JWT'sinden belirle.
  const asCaller = createClient(url, publishableKey, { global: { headers: { Authorization: authorization } } });
  const { data: userData } = await asCaller.auth.getUser();
  const guardianId = userData.user?.id;
  if (!guardianId) return json({ ok: false, code: 'forbidden' });

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: guardian } = await admin.from('profiles').select('role, status').eq('id', guardianId).maybeSingle();
  if (!guardian || guardian.role !== 'veli' || guardian.status !== 'aktif') return json({ ok: false, code: 'forbidden' });

  // 2) Girdiyi yeniden doğrula (istemci doğrulamasına güvenilmez).
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, code: 'invalid' });
  }
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
  const username = typeof body.username === 'string' ? body.username.trim().toLocaleLowerCase('tr-TR') : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const grade = Number(body.grade);
  if (
    body.ar1 !== true ||
    nickname.length < 1 || nickname.length > 30 || !NICKNAME_PATTERN.test(nickname) ||
    !USERNAME_PATTERN.test(username) ||
    !Number.isInteger(grade) || grade < 5 || grade > 8 ||
    password.length < 10 || password.length > 200 || !/\p{L}/u.test(password) || !/\d/.test(password)
  ) {
    return json({ ok: false, code: 'invalid' });
  }

  // 3) Çocuk sayısı sınırı.
  const { count } = await admin
    .from('guardian_students')
    .select('student_id', { count: 'exact', head: true })
    .eq('guardian_id', guardianId);
  if ((count ?? 0) >= MAX_CHILDREN_PER_GUARDIAN) return json({ ok: false, code: 'limit' });

  // 4) AR-1 için en güncel yayımlanmış metin sürümü; yoksa kanıtsız rıza kaydedilmez.
  const { data: doc } = await admin
    .from('legal_documents')
    .select('version, sha256')
    .eq('doc_type', 'acik_riza_dolayli_saglik')
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!doc) return json({ ok: false, code: 'consent' });

  // 5) Auth kullanıcısı: rol yalnızca burada (app_metadata) verilir; handle_new_user profili oluşturur.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: `${username}@${STUDENT_EMAIL_DOMAIN}`,
    password,
    email_confirm: true,
    app_metadata: { role: 'ogrenci' },
    user_metadata: { display_name: nickname },
  });
  if (createError || !created.user) {
    const taken = createError?.message?.toLowerCase().includes('already') || createError?.status === 422;
    return json({ ok: false, code: taken ? 'username_taken' : 'invalid' });
  }
  const studentId = created.user.id;

  // 6) Öğrenci kaydı, veli bağı ve AR-1 kaydı. Biri başarısız olursa Auth kullanıcısı silinir (CASCADE ile hepsi gider).
  const rollback = async (code: Code) => {
    await admin.auth.admin.deleteUser(studentId);
    return json({ ok: false, code });
  };

  const { error: studentError } = await admin.from('students').insert({ profile_id: studentId, grade, username });
  if (studentError) return rollback(studentError.code === '23505' ? 'username_taken' : 'invalid');

  const { error: linkError } = await admin
    .from('guardian_students')
    .insert({ guardian_id: guardianId, student_id: studentId, relation: 'diger' });
  if (linkError) return rollback('invalid');

  const { error: consentError } = await admin.from('consents').insert({
    user_id: guardianId,
    student_id: studentId,
    type: 'acik_riza_dolayli_saglik',
    doc_version: doc.version,
    doc_sha256: doc.sha256,
    granted: true,
    channel: 'web',
  });
  if (consentError) return rollback('consent');

  return json({ ok: true });
});
