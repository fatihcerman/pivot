import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '../../../lib/prisma';
import * as cheerio from 'cheerio';

export const revalidate = 0;

/**
 * PIVOT Autonomous Content Pipeline (Phase 2)
 * 
 * Architecture:
 *   RSS Feeds (VGC, IGN, Gematsu) → Gemini 2.0 Flash Analysis → Pollinations Images → Prisma DB
 *   
 * Upgrades:
 *   - Multiple gaming-focused sources
 *   - "PIVOT Perspective" editorializing
 *   - Improved image prompting
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('--- STARTING PIVOT PIPELINE PHASE 2 ---');
    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

    // 1. Fetch from multiple gaming sources (RSS)
    const sources = [
      { name: 'VGC', url: 'https://www.videogameschronicle.com/feed/' },
      { name: 'Gematsu', url: 'https://www.gematsu.com/feed' },
      { name: 'IGN', url: 'https://feeds.feedburner.com/ign/news' }
    ];

    const allRawArticles: any[] = [];

    for (const source of sources) {
      try {
        console.log(`Fetching RSS from: ${source.name}`);
        const res = await fetch(source.url, { cache: 'no-store', next: { revalidate: 0 } });
        const xml = await res.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        $('item').each((i, el) => {
          if (i >= 15) return;
          const title = $(el).find('title').text();
          const url = $(el).find('link').text();
          const description = $(el).find('description').text();
          if (title && url) {
            allRawArticles.push({ title, url, description, sourceName: source.name });
          }
        });
      } catch (e) {
        console.error(`RSS Fetch failed for ${source.name}:`, e);
      }
    }

    console.log(`RSS Phase Complete. Articles found: ${allRawArticles.length}`);

    if (allRawArticles.length === 0) {
      return NextResponse.json({ success: false, error: 'No raw articles found.' }, { status: 500 });
    }

    // 2. Gemini Analysis
    const prompt = `
    You are the Senior Editorial AI for PIVOT, a premium gaming intelligence platform.
    
    Analyze these ${allRawArticles.length} recent news items:
    ${JSON.stringify(allRawArticles.slice(0, 30))}

    For EACH article produced:
    1. "title": Improve for maximum impact/clarity.
    2. "url": Keep original.
    3. "summary": Punchy 2-sentence hook.
    4. "category": ONE of: REVIEW, BREAKING, ESPORTS, INDUSTRY, HARDWARE, GUIDE, FEATURE, ANALYSIS, NEWS, PREVIEW.
    5. "perspective": A single sentence PIVOT TAKE. Analyze the deeper industry impact or why this REALLY matters to players. Be smart, slightly provocative, or contrarian.
    6. "isUrgent": true for major breaking news (max 3).
    7. "imageSearchQuery": 5-word cinematic image query (dark, moody, neon).
    8. "estimatedReadMin": Integer 3-20.

    Return ONLY a valid JSON array:
    [{ "title":"...", "url":"...", "category":"...", "summary":"...", "perspective":"...", "isUrgent":false, "imageSearchQuery":"...", "estimatedReadMin":5, "sourceName":"..." }]
    `;

    console.log('Starting Gemini Analysis...');
    const response = await genai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const text = response.text || '';
    console.log('Gemini raw response text length:', text.length);
    const parsedData = JSON.parse(text);
    console.log(`Analysis Complete. Parsed items: ${parsedData.length}`);

    // 3. Save
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
        console.warn(`Upsert fail for [${item.title}]: ${e.message}`);
      }
    }

    console.log(`Database Sync Complete. Saved: ${savedCount}`);

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
      stack: error.stack,
      hint: 'Check GEMINI_API_KEY and Prisma connection'
    }, { status: 500 });
  }
}
