const { GoogleGenAI } = require('@google/genai');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const cheerio = require('cheerio');

async function test() {
  const sources = [
    { name: 'VGC', url: 'https://www.videogameschronicle.com/feed/' },
    { name: 'Gematsu', url: 'https://www.gematsu.com/feed' }
  ];

  const allRawArticles = [];

  for (const source of sources) {
      console.log(`Fetching from ${source.name}...`);
      const res = await fetch(source.url);
      const xml = await res.text();
      const $ = cheerio.load(xml, { xmlMode: true });

      $('item').each((i, el) => {
        if (i >= 5) return;
        const title = $(el).find('title').text();
        const url = $(el).find('link').text();
        allRawArticles.push({ title, url, sourceName: source.name });
      });
  }

  console.log(`Total items: ${allRawArticles.length}`);
  
  const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `Analyze: ${JSON.stringify(allRawArticles)}. Return JSON: [{title, url, category, summary, perspective, isUrgent, imageSearchQuery, sourceName}]`;

  const response = await genai.getGenerativeModel({ model: 'gemini-2.0-flash' }).generateContent(prompt);
  console.log("Gemini Response received.");
  
  const data = JSON.parse(response.response.text().replace(/```json|```/g, ''));
  
  for (const item of data) {
    try {
      console.log(`Upserting: ${item.title}`);
      await prisma.article.upsert({
        where: { url: item.url },
        update: { 
            title: item.title, 
            perspective: item.perspective, 
            sourceName: item.sourceName 
        },
        create: { 
            id: require('crypto').randomUUID(),
            title: item.title, 
            url: item.url, 
            category: item.category, 
            summary: item.summary, 
            perspective: item.perspective, 
            sourceName: item.sourceName,
            imageUrl: 'https://image.pollinations.ai/prompt/gaming'
        }
      });
      console.log("Success.");
    } catch (e) {
      console.error(`ERROR: ${e.message}`);
    }
  }
}

test();
