import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const articles = [
    {
      title: 'The Arrival of AGI: OpenAI Unveils Strawberry Reasoning Model',
      url: 'https://news.ycombinator.com/item?id=9991',
      category: 'AI',
      summary: 'A dramatic leap forward in artificial reasoning capabilities, allowing systems to "think" for extended periods before generating an answer. This shift from rote pattern matching to logical deduction marks a pivotal moment.',
      isUrgent: true,
      imageUrl: 'https://image.pollinations.ai/prompt/cyberpunk%20ai%20glowing%20monolith%20masterpiece%20dark%20moody?width=1200&height=800&nologo=true',
    },
    {
      title: 'Global Chip Shortage Ends as TSMC Scales 2nm Process',
      url: 'https://news.ycombinator.com/item?id=9992',
      category: 'Hardware',
      summary: 'Taiwan Semiconductor Manufacturing Co. (TSMC) announced today that their long-awaited 2nm node has achieved unexpected yield rates, promising an influx of powerful, highly efficient silicon for the data center market.',
      isUrgent: false,
      imageUrl: 'https://image.pollinations.ai/prompt/glowing%20macro%20silicon%20wafer%20processor%20dark%20moody?width=800&height=600&nologo=true',
    },
    {
      title: 'Federal Reserve Cuts Rates by 50 Bps, Injecting Life into VC Markets',
      url: 'https://news.ycombinator.com/item?id=9993',
      category: 'Markets',
      summary: 'In an aggressive move to stave off a cooling labor market, the Fed slashed interest rates, signaling a new dawn for startup funding and venture capital deployment across Silicon Valley.',
      isUrgent: true,
      imageUrl: 'https://image.pollinations.ai/prompt/abstract%20stock%20market%20upward%20neon%20arrows%20dark%20moody?width=800&height=600&nologo=true',
    },
    {
      title: 'Rust Overtakes C++ in Linux Kernel Contributions for Q3',
      url: 'https://news.ycombinator.com/item?id=9994',
      category: 'Software',
      summary: 'The relentless march of memory safety continues. For the first time, new code committed to the Linux kernel featured more lines of Rust than traditional C++, marking a generational shift in systems programming.',
      isUrgent: false,
      imageUrl: 'https://image.pollinations.ai/prompt/server%20rack%20glowing%20orange%20rust%20dark%20moody?width=800&height=600&nologo=true',
    },
    {
      title: 'SpaceX Starship Successfully Catches Super Heavy Booster on Return',
      url: 'https://news.ycombinator.com/item?id=9995',
      category: 'Space',
      summary: 'History was made this morning at Starbase as the massive Super Heavy booster returned from the edge of space and was gently caught mid-air by the launch towers "chopsticks." The era of rapid reuse has begun.',
      isUrgent: true,
      imageUrl: 'https://image.pollinations.ai/prompt/massive%20rocket%20launch%20tower%20nighttime%20cinematic%20dark?width=800&height=600&nologo=true',
    },
    {
      title: 'Apple Vision Pro 2 Rumored to Drop External Battery Pack',
      url: 'https://news.ycombinator.com/item?id=9996',
      category: 'AR/VR',
      summary: 'Supply chain leaks indicate that the next iteration of Apples high-end spatial computer will feature a revolutionary solid-state micro-battery integrated directly into the rear headband, significantly improving ergonomics.',
      isUrgent: false,
      imageUrl: 'https://image.pollinations.ai/prompt/sleek%20vr%20headset%20glowing%20visor%20dark%20cinematic?width=800&height=600&nologo=true',
    },
    {
      title: 'New Quantum Decryption Algorithm Threatens Standard RSA',
      url: 'https://news.ycombinator.com/item?id=9997',
      category: 'Security',
      summary: 'Researchers have published a paper outlining a novel algorithm that dramatically reduces the number of stable qubits required to break RSA-2048 encryption, accelerating the timeline for sweeping cryptographic upgrades.',
      isUrgent: true,
      imageUrl: 'https://image.pollinations.ai/prompt/quantum%20computer%20chandelier%20glowing%20fractals%20dark%20moody?width=800&height=600&nologo=true',
    }
  ];

  for (const article of articles) {
    await prisma.article.upsert({
      where: { url: article.url },
      update: article,
      create: article,
    });
  }

  console.log(`Seeded ${articles.length} beautiful mock articles for Pivot UI preview.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
