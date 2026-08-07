/**
 * İZ — Dijital İz Denetimi
 *
 * Ortak tip tanımları.
 *
 * TASARIM KURALI: Bu üründeki her yüz işlemi, kullanıcının canlılık
 * doğrulamasıyla kaydettiği KENDİ referans yüzüne karşı 1:1 karşılaştırmadır.
 * Yabancıların yüzlerinden oluşan bir veri tabanı yoktur ve 1:N arama yapılmaz.
 * Ayrıntı için docs/iz-gizlilik.md.
 */

/** 128 boyutlu yüz betimleyicisi (face descriptor). */
export type FaceDescriptor = number[];

export const DESCRIPTOR_LENGTH = 128;

/** Canlılık doğrulamasında kullanıcıdan istenen hareketler. */
export type LivenessChallenge =
  | 'blink'
  | 'mouth'
  | 'turn-left'
  | 'turn-right'
  | 'smile';

export const LIVENESS_CHALLENGE_LABELS: Record<LivenessChallenge, string> = {
  blink: 'Gözlerinizi kırpın',
  mouth: 'Ağzınızı açın',
  'turn-left': 'Başınızı sola çevirin',
  'turn-right': 'Başınızı sağa çevirin',
  smile: 'Gülümseyin',
};

/**
 * Kullanıcının kendi yüzü. Yalnızca tarayıcıda (IndexedDB) saklanır,
 * hiçbir zaman sunucuya gönderilmez. Ham fotoğraf hiç saklanmaz —
 * yalnızca geri döndürülemez sayısal betimleyici tutulur.
 */
export interface FaceReference {
  descriptor: FaceDescriptor;
  /** Canlılık testinde başarıyla tamamlanan hareketler. */
  passedChallenges: LivenessChallenge[];
  /** Betimleyicinin ortalandığı örnek sayısı (gürültüyü azaltır). */
  sampleCount: number;
  createdAt: string;
}

/** Kullanıcının "bu benim" beyanıyla girdiği hesap. */
export interface DeclaredHandle {
  id: string;
  platformId: string;
  handle: string;
}

/**
 * Kimlik beyanı. Tarama yapılabilmesi için kullanıcının bu hesapların
 * kendisine ait olduğunu açıkça onaylaması gerekir.
 */
export interface IdentityDeclaration {
  displayName: string;
  handles: DeclaredHandle[];
  /** "Bu hesaplar bana ait" onayının verildiği an. Yoksa tarama çalışmaz. */
  attestedAt: string | null;
}

export type PresenceStatus =
  /** Herkese açık profil bulundu. */
  | 'found'
  /** Bu kullanıcı adında herkese açık profil yok. */
  | 'not_found'
  /** Platform otomatik sorguları engelliyor; elle kontrol gerekiyor. */
  | 'blocked'
  /** Ağ/istek hatası. */
  | 'error';

export interface PresenceResult {
  platformId: string;
  platformName: string;
  handle: string;
  url: string;
  status: PresenceStatus;
  /** Kullanıcıya gösterilecek kısa açıklama. */
  detail: string;
  /** Bu platformda profil herkese açıksa hangi veriler görünür durumda. */
  exposedFields?: string[];
  checkedAt: string;
}

export interface ScanRecord {
  id: string;
  results: PresenceResult[];
  createdAt: string;
}

export type ImpersonationVerdict =
  /** Yüz kullanıcının referansıyla eşleşiyor ama hesap beyan edilenler arasında değil. */
  | 'possible_impersonation'
  /** Yüz eşleşiyor ve hesap kullanıcının kendi beyan ettiği hesabı. */
  | 'own_account'
  /** Yüz kullanıcıya ait değil. */
  | 'no_match'
  /** Görselde yüz bulunamadı. */
  | 'no_face';

export interface ImpersonationFinding {
  id: string;
  /** İncelenen profilin adresi (kullanıcı girer). */
  profileUrl: string;
  platformId: string | null;
  /** Profil kullanıcı adı, biliniyorsa. */
  handle: string | null;
  /** Referans yüzle öklid uzaklığı. Küçük = benzer. */
  distance: number | null;
  /** 0–1 arası okunabilir benzerlik skoru. */
  similarity: number | null;
  verdict: ImpersonationVerdict;
  note: string;
  createdAt: string;
}

/** Dışa aktarma / tam silme için kullanıcının tüm yerel verisi. */
export interface LocalVault {
  version: 1;
  reference: FaceReference | null;
  identity: IdentityDeclaration;
  scans: ScanRecord[];
  findings: ImpersonationFinding[];
}

export const EMPTY_VAULT: LocalVault = {
  version: 1,
  reference: null,
  identity: { displayName: '', handles: [], attestedAt: null },
  scans: [],
  findings: [],
};
