import { APPEARANCE_STORAGE_KEY, COOKIE_NOTICE_STORAGE_KEY } from '@/lib/appearance';

/**
 * Sayfa ilk boyanmadan ÖNCE çalışan küçük satır içi betik (`<head>` içinde, nonce'lu; src/app/layout.tsx).
 *
 * Yaptığı iş:
 *   1. Kullanıcı daha önce bir görünüm ayarı DEĞİŞTİRDİYSE (localStorage `ek-gorunum`) tercihi `<html>` üzerine
 *      yazar: tema, yüksek kontrast, yazı boyutu, animasyon azaltma. Böylece sayfa açılırken tema yanıp sönmez.
 *   2. Çerez bilgilendirme notu daha önce kapatıldıysa `<html data-cerez="tamam">` yazar (CSS notu gizler).
 *
 * Hiçbir şey saklanmamışsa hiçbir şey yazmaz: tema o zaman yalnızca CSS medya sorgularından
 * (prefers-color-scheme, prefers-contrast) gelir, JavaScript gerekmez. Hiçbir veri sunucuya gitmez.
 *
 * `appearanceToAttributes` (src/lib/appearance.ts) ile BİREBİR aynı eşlemeyi yapar; fark olursa test kırılır
 * (src/lib/appearance-script.test.ts). Betik düz JavaScript'tir (derlenmez): ES5 sözdizimi bilerek kullanıldı.
 */
export const appearanceScript = `(function () {
  try {
    var root = document.documentElement;
    var raw = window.localStorage.getItem(${JSON.stringify(APPEARANCE_STORAGE_KEY)});
    if (raw) {
      var a = JSON.parse(raw);
      var hc = a.highContrast === true;
      var theme = a.theme === 'light' || a.theme === 'dark' ? a.theme : null;
      var value = theme ? (hc ? 'hc-' + theme : theme) : (hc ? 'hc' : null);
      if (value) root.setAttribute('data-theme', value);
      if (a.textScale === 1.15 || a.textScale === 1.3) root.setAttribute('data-text-scale', String(a.textScale));
      if (a.reduceMotion === true) root.setAttribute('data-motion', 'reduce');
    }
    if (window.localStorage.getItem(${JSON.stringify(COOKIE_NOTICE_STORAGE_KEY)})) root.setAttribute('data-cerez', 'tamam');
  } catch (e) {}
})();`;
