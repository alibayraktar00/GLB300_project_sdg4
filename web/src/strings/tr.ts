/**
 * Türkçe arayüz metinleri (plan 3.8). Metinler bileşenlere gömülmez, buradan alınır.
 * Flutter sürümündeki `app_tr.arb` metinleri buraya taşındı.
 *
 * Yazım kuralları (docs/tasarim-sistemi.md 11): ünlem işareti yok; baskı ve suçlama yok; hata mesajı edilgen
 * ve nötr; öğrenci metinlerinde hastalık, engel, tedavi, sağlık sözcüğü geçmez. Yasal metinler bu kuralın
 * bilinçli istisnasıdır; anahtarları `legal` ile başlar ve yalnızca velinin ayrı yasal ekranlarında
 * gösterilir (tests/tasarim-kurallari.test.ts denetler).
 */
export const tr = {
  appName: 'Eğitim Köprüsü',
  skipLink: 'İçeriğe geç',

  home: {
    title: 'Eğitim Köprüsü',
    description:
      'Derslere ara vermek zorunda kalan öğrenciler için kişisel telafi planı ve birebir gönüllü desteği.',
    chooseTitle: 'Başlayalım',
    guardian: { title: 'Veliyim', subtitle: 'Hesap açar, çocuğumun hesabını oluştururum.' },
    volunteer: { title: 'Gönüllüyüm', subtitle: 'Üniversite öğrencisi olarak destek vermek isterim.' },
    student: { title: 'Öğrenciyim', subtitle: 'Velimin verdiği kullanıcı adıyla giriş yaparım.' },
    studentNote: 'Öğrenci hesabını veli açar. Kullanıcı adı ve şifre veliden alınır.',
    comingSoon: 'Giriş çok yakında açılacak.',
    galleryLink: 'Bileşen galerisi (geliştirici)',
  },

  common: {
    ok: 'Tamam',
    close: 'Kapat',
    retry: 'Tekrar dene',
    back: 'Geri',
    homeLink: 'Ana sayfaya dön',
  },

  states: {
    loading: 'Yükleniyor',
    errorTitle: 'Şu an yüklenemedi',
    errorMessage: 'Bağlantıda bir sorun olabilir. Biraz sonra tekrar denenebilir.',
    emptyTitle: 'Henüz bir şey yok',
  },

  banner: {
    info: 'Bilgi',
    success: 'Başarılı',
    warning: 'Uyarı',
    error: 'Hata',
    dismiss: 'Mesajı kapat',
  },

  progress: {
    completed: 'tamamlandı',
  },

  notice: {
    regionLabel: 'Bildirimler',
  },

  shell: {
    navLabel: 'Ana gezinme',
    notifications: 'Bildirimler',
    settings: 'Ayarlar',
    pageActions: 'Sayfa eylemleri',
  },

  nav: {
    today: 'Bugün',
    plan: 'Plan',
    questions: 'Sorular',
    lessons: 'Dersler',
    guardianHome: 'Panel',
    account: 'Hesap',
    volunteerHome: 'Pano',
    students: 'Öğrenciler',
    calendar: 'Takvim',
    applications: 'Başvurular',
    matching: 'Eşleştirme',
    reports: 'Şikayetler',
    users: 'Kullanıcılar',
    audit: 'Denetim',
  },

  roles: {
    student: 'Öğrenci',
    guardian: 'Veli',
    volunteer: 'Gönüllü',
    admin: 'Yönetici',
  },

  footer: {
    label: 'Site altbilgisi',
    privacy: 'Gizlilik',
    cookies: 'Çerezler',
  },

  /** `cerez-politikasi.md` §1 sonuç 3: bilgilendirme notu; tek düğme "Tamam", "Kabul et" yok. */
  cookieNotice: {
    label: 'Çerez bilgilendirmesi',
    text: 'Bu site yalnızca çalışması için gereken çerezleri ve cihaz belleğini kullanır. Reklam veya analitik yoktur.',
    detail: 'Ayrıntı:',
    link: 'Çerez Politikası',
    ok: 'Tamam',
  },

  /** Yasal sayfalar (`legal_documents`, Faz A) hazır olana kadar yer tutucu. */
  legalPlaceholder: {
    privacyTitle: 'Gizlilik Politikası',
    cookiesTitle: 'Çerez ve Cihaz Belleği Politikası',
    body: 'Bu metin yayına hazırlanıyor. Yayımlandığında bu sayfada okunabilecek.',
  },

  form: {
    optional: 'isteğe bağlı',
    showPassword: 'Şifreyi göster',
  },

  error: {
    title: 'Bir sorun oluştu',
    body: 'Sayfa şu anda açılamadı. Biraz sonra tekrar denenebilir.',
    retry: 'Tekrar dene',
    home: 'Ana sayfaya dön',
  },

  notFound: {
    title: 'Sayfa bulunamadı',
    body: 'Aradığın sayfa taşınmış ya da hiç var olmamış olabilir.',
    home: 'Ana sayfaya dön',
  },

  /** Yalnızca geliştirme galerisi (`/galeri`); üretimde görünmez. */
  gallery: {
    title: 'Bileşen galerisi',
    intro:
      'Yalnızca geliştirme ortamında görünür. Tema, yazı boyutu ve hareket ayarlarını değiştirip bileşenleri deneyin. Bu denemeler cihazda saklanmaz.',
    controls: {
      label: 'Önizleme ayarları',
      theme: 'Tema',
      themeSystem: 'Sistem',
      themeLight: 'Açık',
      themeDark: 'Koyu',
      highContrast: 'Yüksek kontrast',
      textSize: 'Yazı boyutu',
      reduceMotion: 'Animasyonları azalt',
    },
    sections: {
      colors: 'Renkler ve kontrast',
      type: 'Yazı ölçeği',
      buttons: 'Düğmeler',
      cards: 'Kartlar',
      choices: 'Seçilebilir kartlar',
      banners: 'Bilgi bantları',
      progress: 'İlerleme',
      states: 'Durumlar',
      form: 'Form öğeleri',
      notices: 'Bildirimler',
      shell: 'Gezinme iskeleti',
      motion: 'Hareket',
      icons: 'İkonlar',
    },
    themeNames: {
      light: 'Açık',
      dark: 'Koyu',
      hcLight: 'Açık yüksek kontrast',
      hcDark: 'Koyu yüksek kontrast',
    },
    sample: {
      pangram:
        'Öğrenci Şükran, çiçekli bahçede güneşin doğuşunu izlerken İpek de gözlüğünü takıp yanına geldi, ığdır elmasını paylaştılar.',
      primaryAction: 'Göreve başla',
      secondaryAction: 'Sonra bakarım',
      textAction: 'Tümünü gör',
      disabledAction: 'Henüz hazır değil',
      disabledReason: 'Devam etmek için bir seçenek işaretleyin.',
      loadingAction: 'Kaydediliyor',
      cardTitle: 'Kesirleri karşılaştırma',
      cardSubtitle: 'Matematik · 5. sınıf',
      staticCard: 'Dokunulamayan kart: yalnızca bilgi gösterir.',
      linkCardDescription: 'Kartın tamamı tek bir bağlantıdır.',
      choiceLegend: 'Bugün ne kadar vaktin var?',
      choiceShortTitle: '5 dakika',
      choiceShortBody: 'Kısa bir tekrar',
      choiceFullTitle: 'Tam ders',
      choiceFullBody: 'Konuyu baştan sona çalış',
      headerTitle: 'Bugünün görevi',
      bannerInfo: 'Plan ve özetler internet olmadan da açılır.',
      bannerSuccess: 'Sorun gönderildi. Cevap gelince haber vereceğiz.',
      bannerWarning: 'Konu sırası yaklaşıktır; okulundaki sıraya göre değişebilir.',
      bannerError: 'Gönderilemedi. Bağlantı gelince yeniden denenecek.',
      progressLabel: 'Plan ilerlemesi',
      progressCaption: '3 / 10 konu',
      emptyTitle: 'Henüz sorun yok',
      emptyMessage: 'İlk sorunu sorduğunda cevaplar burada görünür.',
      emptyAction: 'Soru sor',
      fieldLabel: 'Kullanıcı adı',
      fieldHint: 'Velinin verdiği ad',
      fieldHelp: 'Küçük harflerle yaz.',
      fieldError: 'Bu kullanıcı adı bulunamadı.',
      switchLabel: 'Büyük yazı',
      switchHelp: 'Bu ayar yalnızca bu cihazda saklanır.',
      showNotice: 'Bildirim göster',
      noticeMessage: 'Kaydedildi.',
      shellBody: 'Sayfa içeriği burada görünür.',
      shellPageTitle: 'Bugün',
      shellCompact: 'Telefon (360 px genişlik)',
      shellWide: 'Geniş ekran (1024 px genişlik)',
      shellRole: 'Rol',
      motionToggle: 'Kutuyu kaydır',
      motionHint: 'Animasyonları azalt kapalıyken kutu kayar; açıkken anında yer değiştirir.',
    },
  },
} as const;
