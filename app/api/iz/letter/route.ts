/**
 * KVKK / GDPR talep metni üretici.
 *
 * Kullanıcının kendi bulgularından, platforma veya veri sorumlusuna
 * gönderebileceği bir talep metni hazırlar. Girdi tamamen kullanıcının
 * kendi verisidir; üretilen metin de yalnızca kullanıcıya döner.
 *
 * API anahtarı yoksa yerleşik şablonla çalışmaya devam eder — bu özellik
 * dış servise bağımlı değildir.
 */

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { clientKey, rateLimit } from '@/lib/iz/rate-limit';

const RATE_LIMIT = { limit: 6, windowMs: 60_000 };
const MAX_FIELD_LENGTH = 400;
const MAX_NOTES_LENGTH = 1200;

export type LetterKind = 'impersonation' | 'erasure';

interface LetterRequestBody {
  kind?: LetterKind;
  displayName?: string;
  platformName?: string;
  profileUrl?: string;
  handle?: string;
  notes?: string;
}

interface LetterInput {
  kind: LetterKind;
  displayName: string;
  platformName: string;
  profileUrl: string;
  handle: string;
  notes: string;
}

function clean(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

/** Anahtar yokken ya da model hata verdiğinde kullanılan sabit şablon. */
function templateLetter(input: LetterInput): string {
  const today = new Date().toLocaleDateString('tr-TR');
  const subject =
    input.kind === 'impersonation'
      ? 'Kimliğimin izinsiz kullanımı hakkında bildirim ve kaldırma talebi'
      : 'Kişisel verilerimin silinmesi talebi';

  const body =
    input.kind === 'impersonation'
      ? `${input.platformName || 'Platformunuz'} üzerinde yer alan ${input.profileUrl || '[profil adresi]'} adresli hesabın, benim fotoğrafımı ve kimliğimi benim rızam olmaksızın kullandığını tespit ettim. Söz konusu hesap bana ait değildir ve beni temsil etmemektedir.

Bu kullanım, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında kişisel verilerimin hukuka aykırı olarak işlenmesi niteliğindedir. Ayrıca ilgili hesap, üçüncü kişilerin beni bu hesapla karıştırmasına yol açarak zarar doğurma riski taşımaktadır.`
      : `${input.platformName || 'Platformunuz'} üzerinde tarafıma ait kişisel verilerin ${input.profileUrl || '[adres]'} adresinde herkese açık biçimde yer aldığını tespit ettim.

6698 sayılı Kişisel Verilerin Korunması Kanunu'nun 7. maddesi ile 11. maddesinin (e) bendi uyarınca, işlenmesini gerektiren sebeplerin ortadan kalkmış olması nedeniyle kişisel verilerimin silinmesini talep ediyorum.`;

  const demands =
    input.kind === 'impersonation'
      ? `1. Söz konusu hesabın incelenerek yayından kaldırılmasını,
2. Hesapta yer alan bana ait görsellerin silinmesini,
3. İşlem sonucundan tarafıma yazılı olarak bilgi verilmesini`
      : `1. Yukarıda belirtilen kişisel verilerimin silinmesini,
2. Verilerin aktarıldığı üçüncü kişiler varsa bu talebin onlara da bildirilmesini,
3. İşlem sonucundan tarafıma yazılı olarak bilgi verilmesini`;

  return `Tarih: ${today}

Konu: ${subject}

İlgili Makama,

${body}

Bu kapsamda;

${demands}

talep ediyorum.

6698 sayılı Kanun'un 13. maddesi uyarınca başvurumun en geç otuz gün içinde sonuçlandırılmasını, talebimin reddi hâlinde gerekçesinin tarafıma yazılı olarak bildirilmesini rica ederim.

Ad Soyad: ${input.displayName || '[Ad Soyad]'}
${input.handle ? `Hesabım: ${input.handle}\n` : ''}İletişim: [e-posta / adres]
İmza:`;
}

function buildPrompt(input: LetterInput): string {
  const goal =
    input.kind === 'impersonation'
      ? 'Kullanıcının fotoğrafını izinsiz kullanan sahte bir hesabın kaldırılmasını talep eden bildirim'
      : 'Kullanıcının kişisel verilerinin silinmesini talep eden başvuru';

  return `Sen Türkiye hukukuna göre KVKK başvuru metni hazırlayan bir yazım asistanısın.

Görev: ${goal} metni yaz.

Bilgiler:
- Başvuran: ${input.displayName || 'belirtilmedi'}
- Platform: ${input.platformName || 'belirtilmedi'}
- İlgili adres: ${input.profileUrl || 'belirtilmedi'}
- Başvuranın kendi hesabı: ${input.handle || 'belirtilmedi'}
- Ek açıklama: ${input.notes || 'yok'}

Kurallar:
- Türkçe, resmî ve ölçülü bir dil kullan. Tehdit veya hakaret içerme.
- 6698 sayılı KVKK'nın ilgili maddelerine (özellikle 11. ve 13. madde) atıf yap.
- Bilgi verilmemiş alanlar için [köşeli parantez] içinde doldurulacak yer bırak.
- Uydurma olay, tarih, madde numarası veya delil ekleme; yalnızca verilen bilgileri kullan.
- Karşı tarafın kimliği hakkında iddia veya tahminde bulunma; yalnızca içeriğin kaldırılmasını talep et.
- Sadece mektup metnini döndür; başlık, açıklama veya markdown biçimlendirme ekleme.`;
}

export async function POST(request: Request): Promise<NextResponse> {
  const limit = rateLimit(
    clientKey(request, 'iz-letter'),
    RATE_LIMIT.limit,
    RATE_LIMIT.windowMs
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  let body: LetterRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek gövdesi.' }, { status: 400 });
  }

  const kind: LetterKind = body.kind === 'erasure' ? 'erasure' : 'impersonation';
  const input: LetterInput = {
    kind,
    displayName: clean(body.displayName, MAX_FIELD_LENGTH),
    platformName: clean(body.platformName, MAX_FIELD_LENGTH),
    profileUrl: clean(body.profileUrl, MAX_FIELD_LENGTH),
    handle: clean(body.handle, MAX_FIELD_LENGTH),
    notes: clean(body.notes, MAX_NOTES_LENGTH),
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      letter: templateLetter(input),
      source: 'template' as const,
    });
  }

  try {
    const genai = new GoogleGenAI({ apiKey });
    const response = await genai.models.generateContent({
      model: 'gemini-3.0-flash',
      contents: buildPrompt(input),
    });

    const letter = response.text?.trim();
    if (!letter) {
      return NextResponse.json({ letter: templateLetter(input), source: 'template' as const });
    }

    return NextResponse.json({ letter, source: 'ai' as const });
  } catch {
    // Model erişilemezse kullanıcı elleri boş kalmasın.
    return NextResponse.json({ letter: templateLetter(input), source: 'template' as const });
  }
}
