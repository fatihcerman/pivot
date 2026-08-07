/**
 * Herkese açık profil varlığı taraması.
 *
 * SINIR: Bu uç nokta yalnızca çağıranın KENDİSİNE ait olduğunu açıkça
 * beyan ettiği kullanıcı adlarını kabul eder (`attested: true`). Ad,
 * fotoğraf veya yüz verisiyle kişi araması yapmaz — girdi yalnızca
 * kullanıcı adıdır ve çıktı yalnızca "bu adda herkese açık profil var mı"
 * bilgisidir. Beyan koşulu sunucu tarafında zorunlu tutulur ki arayüzü
 * atlayan bir istemci de bu kuralı aşamasın.
 */

import { NextResponse } from 'next/server';
import {
  getPlatform,
  HANDLE_PATTERN,
  type Platform,
} from '@/lib/iz/platforms';
import type { PresenceResult, PresenceStatus } from '@/lib/iz/types';
import { clientKey, rateLimit } from '@/lib/iz/rate-limit';

/** Tek istekte kontrol edilebilecek en fazla hesap. */
const MAX_HANDLES = 40;
const REQUEST_TIMEOUT_MS = 8000;
/** Hedef platformlara nazik davranmak için eşzamanlılık sınırı. */
const CONCURRENCY = 5;

const RATE_LIMIT = { limit: 10, windowMs: 60_000 };

const USER_AGENT =
  'Mozilla/5.0 (compatible; IZ-SelfAudit/1.0; +kendi hesaplarini denetleme araci)';

interface ScanRequestBody {
  attested?: boolean;
  handles?: Array<{ platformId?: string; handle?: string }>;
}

interface CheckTarget {
  platform: Platform;
  handle: string;
  url: string;
}

async function checkPresence(target: CheckTarget): Promise<PresenceResult> {
  const { platform, handle, url } = target;
  const base = {
    platformId: platform.id,
    platformName: platform.name,
    handle,
    url,
    exposedFields: platform.exposedFields,
    checkedAt: new Date().toISOString(),
  };

  // Otomatik sorguları engelleyen platformlarda engeli aşmaya çalışmayız;
  // kullanıcıyı kendi hesabını elle kontrol etmesi için yönlendiririz.
  if (platform.blocksAutomatedChecks) {
    return {
      ...base,
      status: 'blocked' satisfies PresenceStatus,
      detail:
        'Bu platform otomatik kontrolleri engelliyor. Bağlantıya tıklayıp oturumu kapalı bir sekmede kendiniz bakın — profiliniz orada görünüyorsa herkese açıktır.',
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'tr,en;q=0.8',
      },
    });

    if (response.status === 404 || response.status === 410) {
      return {
        ...base,
        status: 'not_found',
        detail: 'Bu kullanıcı adında herkese açık bir profil bulunamadı.',
      };
    }

    if (response.status === 403 || response.status === 429 || response.status === 451) {
      return {
        ...base,
        status: 'blocked',
        detail:
          'Platform bu kontrolü engelledi (bot koruması). Bağlantıdan kendiniz kontrol edebilirsiniz.',
      };
    }

    if (!response.ok) {
      return {
        ...base,
        status: 'error',
        detail: `Beklenmeyen yanıt: HTTP ${response.status}.`,
      };
    }

    const body = (await response.text()).toLowerCase();

    if (platform.notFoundMarkers?.some((marker) => body.includes(marker.toLowerCase()))) {
      return {
        ...base,
        status: 'not_found',
        detail: 'Bu kullanıcı adında herkese açık bir profil bulunamadı.',
      };
    }

    if (
      platform.foundMarkers &&
      !platform.foundMarkers.some((marker) => body.includes(marker.toLowerCase()))
    ) {
      return {
        ...base,
        status: 'blocked',
        detail:
          'Sonuç kesinleştirilemedi. Bu platform her iki durumda da aynı yanıtı veriyor; bağlantıdan kendiniz kontrol edin.',
      };
    }

    return {
      ...base,
      status: 'found',
      detail:
        'Herkese açık profil bulundu. Aşağıdaki alanlar oturum açmamış herkes tarafından görülebiliyor.',
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      ...base,
      status: 'error',
      detail: aborted
        ? 'Platform zamanında yanıt vermedi.'
        : 'Platforma ulaşılamadı.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

/** Sabit boyutlu havuzla sırayla işler — hedef siteleri sel altında bırakmaz. */
async function runPooled(targets: CheckTarget[]): Promise<PresenceResult[]> {
  const results = new Array<PresenceResult>(targets.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < targets.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await checkPresence(targets[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker)
  );

  return results;
}

export async function POST(request: Request): Promise<NextResponse> {
  const limit = rateLimit(clientKey(request, 'iz-scan'), RATE_LIMIT.limit, RATE_LIMIT.windowMs);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  let body: ScanRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 });
  }

  // Beyan olmadan tarama yok. Bu, ürünün temel kuralının sunucu
  // tarafındaki karşılığıdır: yalnızca kendi hesaplarınızı denetlersiniz.
  if (body.attested !== true) {
    return NextResponse.json(
      {
        error:
          'Tarama yapılabilmesi için bu hesapların size ait olduğunu onaylamanız gerekir.',
      },
      { status: 403 }
    );
  }

  const rawHandles = Array.isArray(body.handles) ? body.handles : [];
  if (rawHandles.length === 0) {
    return NextResponse.json({ error: 'Kontrol edilecek hesap yok.' }, { status: 400 });
  }
  if (rawHandles.length > MAX_HANDLES) {
    return NextResponse.json(
      { error: `Tek seferde en fazla ${MAX_HANDLES} hesap kontrol edilebilir.` },
      { status: 400 }
    );
  }

  const targets: CheckTarget[] = [];
  for (const entry of rawHandles) {
    const platform = entry.platformId ? getPlatform(entry.platformId) : undefined;
    const handle = entry.handle?.trim();
    if (!platform || !handle || !HANDLE_PATTERN.test(handle)) {
      // Geçersiz girdiyi sessizce atlamak yerine isteği reddederiz ki
      // kullanıcı hangi satırın hatalı olduğunu bilsin.
      return NextResponse.json(
        { error: `Geçersiz platform veya kullanıcı adı: ${entry.platformId ?? '?'} / ${entry.handle ?? '?'}` },
        { status: 400 }
      );
    }
    targets.push({ platform, handle, url: platform.url(handle) });
  }

  const results = await runPooled(targets);
  return NextResponse.json({ results });
}
