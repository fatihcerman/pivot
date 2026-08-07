/**
 * Kullanıcı tarafından verilen adreslere giderken sunucuyu koruyan katman.
 *
 * Taklit kontrolünde adresi kullanıcı giriyor. Bu, sunucunun keyfi bir
 * hedefe istek atması demek; önlem alınmazsa iç ağa erişim (SSRF) için
 * kullanılabilir. Burada şema, port ve çözümlenen IP her adımda —
 * yönlendirmeler dahil — denetlenir.
 */

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export class UnsafeUrlError extends Error {}

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const ALLOWED_PORTS = new Set(['', '80', '443']);
const MAX_REDIRECTS = 3;

/** Özel/dahili IPv4 aralıkları. */
function isPrivateIPv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;

  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // özel
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local (bulut metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // özel
  if (a === 192 && b === 168) return true; // özel
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast + ayrılmış
  return false;
}

function isPrivateIPv6(address: string): boolean {
  const value = address.toLowerCase();
  if (value === '::' || value === '::1') return true;
  if (value.startsWith('fe80')) return true; // link-local
  if (/^f[cd]/.test(value)) return true; // benzersiz yerel adres
  // IPv4 eşlemeli adresler IPv4 kurallarına tabi.
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

function isPrivateAddress(address: string, family: number): boolean {
  return family === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address);
}

/** Adresi doğrular; güvenli değilse hata fırlatır. */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError('Geçersiz adres.');
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new UnsafeUrlError('Yalnızca http ve https adresleri desteklenir.');
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new UnsafeUrlError('Bu port desteklenmiyor.');
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '');

  // Adres doğrudan IP ise DNS'e sormadan kontrol et.
  const literalFamily = isIP(hostname);
  if (literalFamily) {
    if (isPrivateAddress(hostname, literalFamily)) {
      throw new UnsafeUrlError('Dahili ağ adreslerine istek yapılamaz.');
    }
    return url;
  }

  let records: Array<{ address: string; family: number }>;
  try {
    records = await lookup(hostname, { all: true });
  } catch {
    throw new UnsafeUrlError('Alan adı çözümlenemedi.');
  }

  if (records.length === 0) {
    throw new UnsafeUrlError('Alan adı çözümlenemedi.');
  }
  // Tek bir kayıt bile dahili ağı gösteriyorsa reddet (DNS rebinding'e karşı).
  for (const record of records) {
    if (isPrivateAddress(record.address, record.family)) {
      throw new UnsafeUrlError('Dahili ağ adreslerine istek yapılamaz.');
    }
  }

  return url;
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  accept?: string;
  /** Yanıt gövdesi için üst sınır (bayt). */
  maxBytes?: number;
}

export interface SafeFetchResult {
  finalUrl: string;
  contentType: string;
  body: Buffer;
}

/**
 * Yönlendirmeleri elle takip eder ve her adımda adresi yeniden doğrular.
 * (redirect: 'follow' kullanılsaydı, ilk adres güvenli olsa bile
 * yönlendirme dahili bir adrese düşebilirdi.)
 */
export async function safeFetch(
  rawUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const { timeoutMs = 8000, accept = '*/*', maxBytes = 5 * 1024 * 1024 } = options;

  let current = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const url = await assertSafeUrl(current);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          Accept: accept,
          'User-Agent':
            'Mozilla/5.0 (compatible; IZ-SelfAudit/1.0; +kendi hesaplarini denetleme araci)',
        },
      });
    } catch (error) {
      clearTimeout(timer);
      const aborted = error instanceof Error && error.name === 'AbortError';
      throw new UnsafeUrlError(
        aborted ? 'Adres zamanında yanıt vermedi.' : 'Adrese ulaşılamadı.'
      );
    }

    try {
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location) {
          throw new UnsafeUrlError('Yönlendirme hedefi okunamadı.');
        }
        current = new URL(location, url).toString();
        continue;
      }

      if (!response.ok) {
        throw new UnsafeUrlError(`Adres HTTP ${response.status} döndü.`);
      }

      const declaredLength = Number(response.headers.get('content-length') ?? '0');
      if (declaredLength > maxBytes) {
        throw new UnsafeUrlError('İçerik boyut sınırını aşıyor.');
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.byteLength > maxBytes) {
        throw new UnsafeUrlError('İçerik boyut sınırını aşıyor.');
      }

      return {
        finalUrl: url.toString(),
        contentType: response.headers.get('content-type') ?? '',
        body: buffer,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  throw new UnsafeUrlError('Çok fazla yönlendirme.');
}
