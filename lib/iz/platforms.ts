/**
 * Herkese açık profil adresi kalıpları.
 *
 * Buradaki tek amaç, kullanıcının KENDİ beyan ettiği kullanıcı adının
 * hangi platformlarda herkese açık bir profil olarak göründüğünü
 * kullanıcıya göstermektir. Kişi arama / kimlik tespiti amacıyla
 * kullanılmaz; girdi her zaman kullanıcının kendi beyanıdır.
 */

export interface Platform {
  id: string;
  name: string;
  /** Kullanıcı adından herkese açık profil adresi üretir. */
  url: (handle: string) => string;
  /**
   * Platform sunucu taraflı otomatik isteklere kapalıysa true.
   * Bu platformlar için sonuç "blocked" döner ve kullanıcı eliyle
   * kontrol etmesi için bağlantı verilir — kaçamak/atlatma denenmez.
   */
  blocksAutomatedChecks?: boolean;
  /** Profil herkese açıkken dışarıdan görülebilen tipik alanlar. */
  exposedFields: string[];
  /** Gizlilik ayarları sayfası — kullanıcı hemen aksiyon alabilsin diye. */
  privacyUrl?: string;
  /**
   * Sayfa 200 dönse de bu ifadeler gövdedeyse profil yok demektir
   * (bazı platformlar "bulunamadı" sayfasını 200 ile servis eder).
   */
  notFoundMarkers?: string[];
  /**
   * Tanımlıysa, "var" sonucu için gövdede bu ifadelerden biri aranır.
   * Hiçbiri yoksa sonuç kesinleştirilemez ve kullanıcıya elle kontrol
   * önerilir — uydurma "bulundu" sonucu üretmeyiz.
   */
  foundMarkers?: string[];
}

/** Kullanıcı adı olarak kabul edilebilir girdi (kaba doğrulama). */
export const HANDLE_PATTERN = /^[a-zA-Z0-9._-]{1,40}$/;

export const PLATFORMS: Platform[] = [
  {
    id: 'github',
    name: 'GitHub',
    url: (h) => `https://github.com/${h}`,
    exposedFields: ['Ad', 'Biyografi', 'Konum', 'Şirket', 'Depolar', 'Katkı geçmişi'],
    privacyUrl: 'https://github.com/settings/profile',
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    url: (h) => `https://x.com/${h}`,
    blocksAutomatedChecks: true,
    exposedFields: ['Ad', 'Biyografi', 'Profil fotoğrafı', 'Gönderiler', 'Katılma tarihi'],
    privacyUrl: 'https://x.com/settings/audience_and_tagging',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    url: (h) => `https://www.instagram.com/${h}/`,
    blocksAutomatedChecks: true,
    exposedFields: ['Ad', 'Biyografi', 'Profil fotoğrafı', 'Takipçi sayısı', 'Gönderiler'],
    privacyUrl: 'https://www.instagram.com/accounts/privacy_and_security/',
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    url: (h) => `https://www.linkedin.com/in/${h}`,
    blocksAutomatedChecks: true,
    exposedFields: ['Ad', 'İş geçmişi', 'Eğitim', 'Konum', 'Bağlantılar'],
    privacyUrl: 'https://www.linkedin.com/psettings/',
  },
  {
    id: 'reddit',
    name: 'Reddit',
    url: (h) => `https://www.reddit.com/user/${h}`,
    exposedFields: ['Gönderi geçmişi', 'Yorumlar', 'Karma', 'Hesap yaşı'],
    privacyUrl: 'https://www.reddit.com/settings/privacy',
    notFoundMarkers: ['nobody on Reddit goes by that name', 'page not found'],
  },
  {
    id: 'youtube',
    name: 'YouTube',
    url: (h) => `https://www.youtube.com/@${h}`,
    exposedFields: ['Kanal adı', 'Açıklama', 'Videolar', 'Abone sayısı'],
    privacyUrl: 'https://myaccount.google.com/data-and-privacy',
    notFoundMarkers: ['This page isn’t available', 'This page isn&#39;t available'],
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    url: (h) => `https://www.tiktok.com/@${h}`,
    blocksAutomatedChecks: true,
    exposedFields: ['Ad', 'Biyografi', 'Profil fotoğrafı', 'Videolar', 'Beğeniler'],
    privacyUrl: 'https://www.tiktok.com/setting/privacy',
  },
  {
    id: 'medium',
    name: 'Medium',
    url: (h) => `https://medium.com/@${h}`,
    exposedFields: ['Ad', 'Biyografi', 'Yazılar', 'Takipçiler'],
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    url: (h) => `https://www.pinterest.com/${h}/`,
    exposedFields: ['Ad', 'Panolar', 'Kaydedilen içerikler'],
    privacyUrl: 'https://www.pinterest.com/settings/privacy-data',
  },
  {
    id: 'twitch',
    name: 'Twitch',
    url: (h) => `https://www.twitch.tv/${h}`,
    exposedFields: ['Kanal adı', 'Yayın geçmişi', 'Takipçiler'],
    privacyUrl: 'https://www.twitch.tv/settings/security',
    // Twitch tek sayfa uygulaması; her iki durumda da 200 döner.
    // Kanal varsa og:title meta etiketi üretilir.
    foundMarkers: ['og:title'],
    notFoundMarkers: ['content is unavailable'],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    url: (h) => `https://t.me/${h}`,
    exposedFields: ['Ad', 'Profil fotoğrafı', 'Biyografi'],
    // Telegram olmayan kullanıcı için de 200 döner; ayrımı gövdeden yaparız.
    foundMarkers: ['tgme_page_title'],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    url: (h) => `https://open.spotify.com/user/${h}`,
    exposedFields: ['Ad', 'Herkese açık çalma listeleri', 'Takipçiler'],
    privacyUrl: 'https://www.spotify.com/account/privacy/',
  },
];

export function getPlatform(id: string): Platform | undefined {
  return PLATFORMS.find((p) => p.id === id);
}

/** Bir profil adresinden platformu tahmin eder (taklit kontrolü için). */
export function detectPlatformFromUrl(rawUrl: string): Platform | null {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }

  const hostMap: Record<string, string> = {
    'github.com': 'github',
    'x.com': 'x',
    'twitter.com': 'x',
    'instagram.com': 'instagram',
    'linkedin.com': 'linkedin',
    'reddit.com': 'reddit',
    'youtube.com': 'youtube',
    'tiktok.com': 'tiktok',
    'medium.com': 'medium',
    'pinterest.com': 'pinterest',
    'twitch.tv': 'twitch',
    't.me': 'telegram',
    'open.spotify.com': 'spotify',
  };

  const id = hostMap[host];
  return id ? getPlatform(id) ?? null : null;
}

/** Profil adresinden kullanıcı adını çıkarmayı dener. */
export function extractHandleFromUrl(rawUrl: string): string | null {
  try {
    const { pathname } = new URL(rawUrl);
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;
    // /in/foo, /user/foo gibi ön ekleri atla.
    const skip = new Set(['in', 'user', 'users', 'u', 'profile']);
    const candidate = skip.has(segments[0].toLowerCase()) ? segments[1] : segments[0];
    if (!candidate) return null;
    const handle = candidate.replace(/^@/, '');
    return HANDLE_PATTERN.test(handle) ? handle : null;
  } catch {
    return null;
  }
}
