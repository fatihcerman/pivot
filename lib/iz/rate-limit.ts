/**
 * Basit, bellek içi hız sınırlayıcı.
 *
 * Amaç iki yönlü: hem kendi uç noktalarımızı kötüye kullanıma karşı
 * korumak, hem de sorguladığımız platformlara makul yükte davranmak.
 *
 * Not: sayaç süreç belleğindedir; birden fazla sunucu örneğinde
 * örnek başına çalışır. Tek bir örnek için yeterli, dağıtık bir
 * kotanın yerini tutmaz.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Sızıntıyı önlemek için süresi geçmiş kayıtları ara sıra temizler. */
function sweep(now: number): void {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return {
    allowed: true,
    remaining: limit - bucket.count,
    retryAfterSeconds: 0,
  };
}

/** İstemci kimliği — kimlik doğrulama yok, yalnızca kaba bir ayrım. */
export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return `${scope}:${ip}`;
}
