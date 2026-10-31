import { z } from 'zod';

/**
 * Zod 4 varsayılan olarak `new Function` ile hızlandırılmış doğrulayıcı üretmeye çalışır. Zorunlu CSP'de
 * (`script-src` içinde `unsafe-eval` yok) bu her denemede ihlal raporu doğurur. Tarayıcıda kullanılan şemalar
 * küçüktür; hızlandırma kapatılır ve `unsafe-eval` hiçbir zaman gerekmez. İstemciye giren her şema modülü bunu içe aktarır.
 */
z.config({ jitless: true });
