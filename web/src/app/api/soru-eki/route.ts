import { inspectJpeg, MAX_PHOTO_BYTES } from '@/lib/jpeg';
import { UUID_PATTERN } from '@/lib/questions';
import { isSameOrigin } from '@/lib/same-origin';
import { getSessionUser } from '@/server/session';
import { createSupabaseServerClient } from '@/server/supabase';

/**
 * Soru fotoğrafı yükleme (öğrenci: soru/takip, gönüllü: cevap). Tarayıcıda Supabase istemcisi yoktur (oturum
 * httpOnly çerezdedir), bu yüzden dosya buradan geçer ve Storage'a KULLANICININ OTURUMUYLA yazılır: Storage
 * politikaları (yol, boyut, MIME, kota) yine uygulanır. Burada ek olarak:
 *   - istek aynı kökenden gelmeli (CSRF'e karşı ikinci hat),
 *   - dosya gerçekten JPEG olmalı, ≤ 2 MB ve EXIF/XMP (konum, cihaz) taşımamalı (src/lib/jpeg.ts),
 *   - yol sunucuda üretilir: {öğrenci}/{soru}/{rastgele}.jpg (istemci yol seçemez).
 * Başarıda `{ path }` döner; soru gönderilirken bu yol RPC'ye verilir ve orada yeniden doğrulanır.
 */

type ErrorCode = 'bicim' | 'boyut' | 'ustveri' | 'yuklenemedi' | 'yetki';

const json = (body: { path: string } | { error: ErrorCode }, status: number) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: 'yetki' }, 403);

  const user = await getSessionUser();
  if (!user || user.status !== 'aktif' || (user.role !== 'ogrenci' && user.role !== 'gonullu')) {
    return json({ error: 'yetki' }, 401);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'bicim' }, 400);
  }
  const questionId = String(form.get('soruId') ?? '');
  const file = form.get('dosya');
  if (!UUID_PATTERN.test(questionId) || !(file instanceof File)) return json({ error: 'bicim' }, 400);
  if (file.size > MAX_PHOTO_BYTES) return json({ error: 'boyut' }, 413);

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = inspectJpeg(bytes);
  if (!check.ok) return json({ error: check.reason }, check.reason === 'boyut' ? 413 : 400);

  try {
    const supabase = await createSupabaseServerClient();

    // Klasör her zaman ÖĞRENCİNİN kimliğidir. Öğrenci kendi kimliğini kullanır; gönüllü, kendisine atanmış sorunun
    // (RLS ile okuyabildiği) öğrencisinin klasörüne yükler. Yoksa ya da okuyamıyorsa reddedilir.
    let studentId = user.id;
    if (user.role === 'gonullu') {
      const { data } = await supabase.from('questions').select('student_id').eq('id', questionId).maybeSingle();
      if (!data || typeof data.student_id !== 'string' || !UUID_PATTERN.test(data.student_id)) {
        return json({ error: 'yetki' }, 403);
      }
      studentId = data.student_id;
    }

    const path = `${studentId}/${questionId}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage
      .from('soru-ekleri')
      .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
    if (error) return json({ error: 'yuklenemedi' }, 400);
    return json({ path }, 200);
  } catch {
    return json({ error: 'yuklenemedi' }, 500);
  }
}
