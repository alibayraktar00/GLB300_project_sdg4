/**
 * Sağlık kontrolü: uptime izleme ve dağıtım sonrası duman testi için.
 * Kimlik doğrulama ve Supabase'e bağlanma YOK; yalnızca "sunucu ayakta mı?" sorusunu yanıtlar.
 * Yapılandırma durumu gibi iç bilgiler bilerek verilmez.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
}
