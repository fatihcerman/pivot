/**
 * Profil görseli getirici.
 *
 * Taklit kontrolünde kullanıcı şüpheli bir profilin adresini verir.
 * Tarayıcı o görseli başka bir origin'den okuyup canvas'a alamaz (CORS),
 * bu yüzden görseli sunucu getirir ve kendi origin'imizden geri verir.
 *
 * Sunucu görseli YALNIZCA aktarır: yüz tespiti yapmaz, saklamaz,
 * kaydetmez. Karşılaştırma tamamen tarayıcıda, kullanıcının kendi
 * referans yüzüne karşı yapılır.
 */

import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { safeFetch, UnsafeUrlError } from '@/lib/iz/safe-fetch';
import { clientKey, rateLimit } from '@/lib/iz/rate-limit';

const RATE_LIMIT = { limit: 20, windowMs: 60_000 };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
];

/** HTML sayfasından profil görselini bulmayı dener. */
function findImageUrl(html: string, pageUrl: string): string | null {
  const $ = cheerio.load(html);
  const candidates = [
    $('meta[property="og:image"]').attr('content'),
    $('meta[property="og:image:secure_url"]').attr('content'),
    $('meta[name="twitter:image"]').attr('content'),
    $('link[rel="image_src"]').attr('href'),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return new URL(candidate, pageUrl).toString();
    } catch {
      continue;
    }
  }
  return null;
}

export async function GET(request: Request): Promise<NextResponse> {
  const limit = rateLimit(
    clientKey(request, 'iz-avatar'),
    RATE_LIMIT.limit,
    RATE_LIMIT.windowMs
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  const target = new URL(request.url).searchParams.get('url');
  if (!target) {
    return NextResponse.json({ error: 'url parametresi gerekli.' }, { status: 400 });
  }

  try {
    const first = await safeFetch(target, {
      accept: 'text/html,image/*',
      maxBytes: MAX_IMAGE_BYTES,
    });

    let image = first;

    // Sayfa geldiyse içinden profil görselini çıkar ve onu getir.
    if (first.contentType.includes('text/html')) {
      const imageUrl = findImageUrl(first.body.toString('utf8'), first.finalUrl);
      if (!imageUrl) {
        return NextResponse.json(
          {
            error:
              'Bu sayfada profil görseli bulunamadı. Görselin doğrudan adresini verebilir ya da ekran görüntüsünü yükleyebilirsiniz.',
          },
          { status: 422 }
        );
      }
      image = await safeFetch(imageUrl, {
        accept: 'image/*',
        maxBytes: MAX_IMAGE_BYTES,
      });
    }

    const baseType = image.contentType.split(';')[0].trim().toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(baseType)) {
      return NextResponse.json(
        { error: 'Adres bir görsele işaret etmiyor.' },
        { status: 422 }
      );
    }

    return new NextResponse(new Uint8Array(image.body), {
      status: 200,
      headers: {
        'Content-Type': baseType,
        // Kullanıcı verisidir; ara katmanlarda saklanmasın.
        'Cache-Control': 'no-store',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Görsel alınamadı.' }, { status: 502 });
  }
}
