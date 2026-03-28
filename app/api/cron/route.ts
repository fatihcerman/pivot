import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '../../../lib/prisma';
import * as cheerio from 'cheerio';

export const revalidate = 0;
// Next.js App Router'da Vercel sunucusuz fonksiyon zaman kısıtlamasını limitlerine çekip (Hobby default 10s'dir) maksimum zamana (60) yayarak timeout olma olasılığını sıfırlıyoruz.
export const maxDuration = 60; 

/**
 * PIVOT Autonomous Content Pipeline (Phase 3 - Otonom ve Organize)
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('--- STARTING PIVOT PIPELINE PHASE 3 ---');
    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

    // 1. Fetching RSS Paralel Optimizasyonu (Saniyeleri Kurtarmak İçin Senkron Bekleme Kaldırıldı)
    const sources = [
      { name: 'VGC', url: 'https://www.videogameschronicle.com/feed/' },
      { name: 'Gematsu', url: 'https://www.gematsu.com/feed' },
      { name: 'IGN', url: 'https://feeds.feedburner.com/ign/news' }
    ];

    const fetchPromises = sources.map(async (source) => {
      try {
        console.log(`[RSS] Fetching: ${source.name}`);
        const res = await fetch(source.url, { cache: 'no-store', next: { revalidate: 0 } });
        const xml = await res.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        const sourceArticles: any[] = [];
        $('item').each((i, el) => {
          if (i >= 10) return; // Top 10 per source (Max 30 total context size limitini yormamak için)
          const title = $(el).find('title').text();
          const url = $(el).find('link').text();
          const description = $(el).find('description').text();
          if (title && url) {
            sourceArticles.push({ title, url, description, sourceName: source.name });
          }
        });
        return sourceArticles;
      } catch (e) {
        console.error(`[RSS] Fetch failed for ${source.name}:`, e);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    const allRawArticles = results.flat();

    console.log(`[RSS] Phase Complete. Articles found: ${allRawArticles.length}`);

    if (allRawArticles.length === 0) {
      return NextResponse.json({ success: false, error: 'No raw articles found.' }, { status: 500 });
    }

    // 2. Gemini Analysis (Prompt Mühendisliği & Akademik Dürüstlük)
    const prompt = `
    Sen "PIVOT" adlı premium, bilimsel ve son derece saygın global bir oyun haber/istihbarat platformunun Kurgusal Yapay Zeka Baş Editörüsün. Hedefimiz 1 numaralı Google sıralamasına ve sitede en uzun okunma süresine (Session Duration) ulaşmak.

    Aşağıda ${allRawArticles.length} adet yeni gelen ham haberi veriyorum:
    ${JSON.stringify(allRawArticles.slice(0, 30))}

    BİRİNCİ KURAL (DÜRÜSTLÜK & KAYNAK): Orijinal haberi yapan gazeteciliğe tam saygı göstermelisin. "perspective" (bakış açısı) alanı içinde veya özetin içinde açıkça "Via [sourceName]" ya da "Kaynak: [sourceName]" referansını metnin estetiğini bozmadan havalı şekilde ver.
    İKİNCİ KURAL (ANTİ-CLICKBAIT): Başlıklar net, anlaşılır ve asla yanıltıcı (clickbait) olmamalıdır. Dürüst ama tıklama isteği uyandıran merak tetikleyici başlıklar kur (Zeigarnik Effect).
    
    HER HABER İÇİN şu yapıda bir JSON dizisi (Array) dön. DÖNÜŞ YALNIZCA GEÇERLİ JSON OLMALIDIR:
    1. "title": Maximum netlikte, merak uyandıran ama clickbait olmayan şık bir MASAÜSTÜ BİLGİSİ (Intel) başlığı. Türkçe yaz.
    2. "url": Orijinal URL'yi BİREBİR koru.
    3. "summary": Tam olarak 2 cümlelik; olayın ne olduğunu çok vurucu bir şekilde anlatan özet (Türkçe).
    4. "category": REVIEW, BREAKING, ESPORTS, INDUSTRY, HARDWARE, GUIDE, FEATURE, ANALYSIS, NEWS, PREVIEW arasından en uygun tek kelime.
    5. "perspective": SADECE "PIVOT" editoryal analizidir. Haberin derinine inen, kullanıcının sitede kalmasını sağlayacak provakatif, analitik veya çok zekice bir okuma üret. İçine dürüstçe orijinal yazar kaynağını ekle. (Türkçe)
    6. "isUrgent": Gerçekten yeri göğü yerinden oynatan çok nadir bir haber ise true, standartsa false (Aynı anda maximum 3 tanesi true olabilir).
    7. "imageSearchQuery": Karanlık, neon, sinematik tarzda haber ile ilgili İngilizce 5 kelimelik görsel arama promptu. (Örn: "dark futuristic cyber city rain")
    8. "estimatedReadMin": Olayın derinliğine göre 3 ile 15 arasında rasyonel bir tam sayı dakika ver.
    9. "sourceName": Orijinal kaynağın adını döndür ("IGN", "VGC", vs.).

    JSON Array formatı dışında HİÇBİR AÇIKLAMA YAZMA.
    [{ "title":"...", "url":"...", "category":"...", "summary":"...", "perspective":"...", "isUrgent":false, "imageSearchQuery":"...", "estimatedReadMin":5, "sourceName":"..." }]
    `;

    console.log('[Gemini] Starting Analysis with Fast Flash Model...');
    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash', // Modelimiz Flash serisinin mevcut API üzerindeki en güncel ve tutarlı versiyonudur.
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text || '';
    const parsedData = JSON.parse(text);
    console.log(`[Gemini] Analysis Complete. Parsed items: ${parsedData.length}`);

    // 3. Database Save
    const newUrls: string[] = [];
    let savedCount = 0;

    for (const item of parsedData) {
      if (!item.title || !item.url) continue;

      const imageQuery = (item.imageSearchQuery || 'gaming technology dark') + ', cinematic 8k';
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imageQuery)}?width=1200&height=800&nologo=true`;

      try {
        await prisma.article.upsert({
          where: { url: item.url },
          update: {
            title: item.title,
            summary: item.summary,
            perspective: item.perspective,
            category: item.category,
            isUrgent: Boolean(item.isUrgent),
            imageUrl,
            sourceName: item.sourceName || 'PIVOT'
          },
          create: {
            title: item.title,
            url: item.url,
            summary: item.summary,
            perspective: item.perspective,
            category: item.category,
            isUrgent: Boolean(item.isUrgent),
            imageUrl,
            sourceName: item.sourceName || 'PIVOT'
          }
        });
        newUrls.push(item.url);
        savedCount++;
      } catch (e: any) {
        console.warn(`[DB] Upsert fail for [${item.title}]: ${e.message}`);
      }
    }

    console.log(`[DB] Sync Complete. Saved: ${savedCount}`);

    // Eski nesil veritabanı temizliği (Hacim büyümesin ve maliyet artmasın diye Vercel Free Tier korunumu)
    if (newUrls.length > 0) {
      await prisma.article.deleteMany({
        where: { url: { notIn: newUrls } }
      });
    }

    return NextResponse.json({ success: true, count: savedCount });

  } catch (error: any) {
    console.error('CRITICAL PIPELINE ERROR:', error);
    return NextResponse.json({
      success: false,
      error: error.message || String(error),
      hint: 'Check GEMINI_API_KEY and DB connection'
    }, { status: 500 });
  }
}
