# Yazı tipi: Atkinson Hyperlegible Next

- **Aile:** Atkinson Hyperlegible Next (Braille Institute; Linus Boman ve ekip). Düşük görmeye göre tasarlanmıştır:
  karışabilen karakterler (`I l 1`, `O 0`, `ı i`) belirgin ayrılır. Matematik ve Fen içeriği rakam yoğun olduğu için seçildi.
- **Lisans:** SIL Open Font License 1.1. Metin: `OFL.txt` (yazı tipinin yanında durmak zorundadır). Telif: "Copyright 2020-2024
  The Atkinson Hyperlegible Next Project Authors".
- **Kaynak:** resmî depo `googlefonts/atkinson-hyperlegible-next` (`fonts/ttf/` altındaki statik TTF'ler).
- **Dosyalar:** `AtkinsonHyperlegibleNext-{Regular,SemiBold,Bold}.woff2` (400, 600, 700). Toplam yaklaşık 49 KB (hedef <= 120 KB).
- **Kullanım:** `src/app/fonts.ts` (`next/font/local`). Yalnızca Regular önceden yüklenir. Google Fonts ve harici CDN yoktur.

## Nasıl üretildi (yeniden üretmek için)

TTF'ler `fonttools` (`pip install fonttools brotli`) ile WOFF2'ye çevrildi ve alt kümelendi. Alt küme: Latin (U+0020-007E),
Latin-1 Eki ve Latin Genişletilmiş-A (U+00A0-017F; **Türkçe ğ Ğ ı İ ş Ş burada**), birleştirici işaretler, genel noktalama,
matematik işaretleri (− × ÷ ≤ ≥ ≠ √ ∞ π ...) ve yazı tipinin sahip olduğu birkaç Yunan harfi. Hint bilgisi atıldı.

```bash
pyftsubset AtkinsonHyperlegibleNext-Regular.ttf \
  --output-file=AtkinsonHyperlegibleNext-Regular.woff2 --flavor=woff2 \
  --unicodes="U+0020-007E,U+00A0-017F,U+0192,U+0218-021B,U+0237,U+02C6-02DD,U+0300-0308,U+030A-030C,U+0312,U+0326-0328,U+0394,U+03A9,U+03BC,U+03C0,U+1E80-1E85,U+1E9E,U+1EF2-1EF3,U+2009,U+2013-2014,U+2018-201A,U+201C-201E,U+2020-2022,U+2026,U+2030,U+2039-203A,U+2044,U+20AC,U+20B9,U+2113,U+2122,U+212E,U+2202,U+220F,U+2211-2212,U+2215,U+2219-221A,U+221E,U+222B,U+2248,U+2260,U+2264-2265,U+25CA,U+266A" \
  --layout-features='kern,liga,calt,locl,ccmp,mark,mkmk,case,tnum,pnum,frac' \
  --no-hinting --desubroutinize --name-IDs='*'
```

(`SemiBold` ve `Bold` için aynı komut.) `locl` (yerel biçimler) ve `tnum` (eş genişlikli rakamlar) bilerek tutuldu.

## Doğrulama

`tests/yazi-tipi.test.ts` her derlemede şunları denetler: toplam boyut <= 120 KB, Türkçe harflerin tamamı (`ğ Ğ ı İ ş Ş ç Ç ö Ö ü Ü â Â î Î û Û`),
rakam ve noktalama, OFL metni, tek `preload`. **Bilinen eksikler:** `₺` (U+20BA) ve alt simge rakamlar (`₂`, `H₂O`) yazı tipinde yok;
sistem yazı tipine düşer. Uygulama ücretsiz olduğundan `₺` kullanılmaz; alt simge gerektiren içerikte (kimya) bu bilinmelidir.
