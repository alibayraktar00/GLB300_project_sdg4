import { tr } from '@/strings/tr';

/**
 * "İçeriğe geç" bağlantısı: sayfanın ilk odaklanabilir öğesi. Yalnızca odak alınca görünür (global.css `.skip-link`).
 * Hedef: sayfadaki `<main id="icerik">`. Klavye ve ekran okuyucu kullanıcıları gezinmeyi atlayabilir.
 */
export function SkipLink() {
  return (
    <a className="skip-link" href="#icerik">
      {tr.skipLink}
    </a>
  );
}
