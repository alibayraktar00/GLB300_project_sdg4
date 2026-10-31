-- =====================================================================
-- 14 · Supabase'in kendi yardımcı işlevi public.rls_auto_enable() herkese açık kalmasın
--
-- Supabase panelindeki "otomatik RLS" seçeneği bu olay tetikleyicisi işlevini public şemasına koyar. Varsayılan
-- olarak anon ve authenticated rolleri /rest/v1/rpc/rls_auto_enable ile çağırabilir görünür (güvenlik danışmanı
-- uyarısı 0028/0029). İşlev yalnızca olay tetikleyicisi tarafından çalışmalıdır; istemci rollerinden kapatılır.
-- İşlev yerelde (test veritabanında) yoktur; bu yüzden koşullu yazılmıştır.
-- =====================================================================
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
