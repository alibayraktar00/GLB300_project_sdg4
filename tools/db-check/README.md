# db-check

Docker ve Supabase CLI olmadan `supabase/migrations` dosyalarını uygular ve `supabase/tests/database` altındaki pgTAP testlerini çalıştırır. Gömülü bir Postgres (PGlite) kullanır; Supabase'in `auth`, `storage` şemaları ve rolleri `mock/00_supabase_mock.sql` ile en az düzeyde taklit edilir.

```bash
cd tools/db-check
npm ci
npm test            # migration'lar + tüm testler
npm run test:seed   # önce seed.sql'i de uygular
node run.mjs --only 030   # yalnızca adı 030 ile başlayan test dosyası
```

Bu bir taklittir: gerçek GoTrue kaydı, TOTP/aal2, Storage API ve Supabase Advisor burada denenemez. Bunlar için Docker ile `supabase start` + `supabase test db` ya da gerçek bir dev projesi gerekir (bkz. `docs/veri-modeli.md`).
