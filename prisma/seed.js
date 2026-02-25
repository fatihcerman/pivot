const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.article.deleteMany({});

  const articles = [
    {
      title: "ELDEN RING: SHADOW OF THE ERDTREE – THE FINAL VERDICT",
      summary: "Miyazaki strikes again. A massive, brutal, and incredibly dense expansion that redefines what DLC can be. Read our full analysis of the Land of Shadow.",
      url: "https://example.com/elden-ring-review",
      imageUrl: "https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=2000&auto=format&fit=crop", 
      category: "REVIEW",
      isUrgent: true
    },
    {
      title: "Xbox's New Hardware Strategy Leaked",
      summary: "Internal documents suggest a complete pivot away from traditional consoles in favor of modular PC-like systems and an expanded Game Pass footprint.",
      url: "https://example.com/xbox-leak",
      imageUrl: "https://images.unsplash.com/photo-1622297845775-5ff3fef71d13?q=80&w=1200&auto=format&fit=crop", 
      category: "BREAKING",
      isUrgent: true
    },
    {
      title: "Valorant's Next Agent: Codename 'Vortex' Revealed",
      summary: "Riot reveals the first look at the new controller agent, featuring gravity manipulation abilities and a chaotic ultimate that redefines site takes.",
      url: "https://example.com/valorant-agent",
      imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop", 
      category: "ESPORTS",
      isUrgent: false
    },
    {
      title: "The Silent Hill 2 Remake is Actually... Masterful",
      summary: "Bloober Team has defied expectations, delivering a remake that respects the profound psychological horror of the original while modernizing the dread.",
      url: "https://example.com/silent-hill-review",
      imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop", 
      category: "REVIEW",
      isUrgent: false
    },
    {
      title: "GTA 6 Trailer Hit 200M Views in Record Time",
      summary: "Rockstar's return to Vice City continues to break internet records as the hype train accelerates towards the 2025 release window.",
      url: "https://example.com/gta-records",
      imageUrl: "https://images.unsplash.com/photo-1587883204987-a36c561aab2a?q=80&w=1200&auto=format&fit=crop", 
      category: "INDUSTRY",
      isUrgent: false
    },
    {
      title: "Next-Gen Nintendo Switch Specs Confirmed",
      summary: "The highly anticipated successor will feature an NVIDIA custom chip capable of DLSS 3.5, targeting 4K upscaling when docked.",
      url: "https://example.com/switch-2-specs",
      imageUrl: "https://images.unsplash.com/photo-1612036782180-6f0b6ce846ce?q=80&w=1200&auto=format&fit=crop", 
      category: "HARDWARE",
      isUrgent: true
    },
    {
      title: "Cyberpunk 2077: Phantom Liberty — The Definitive Redemption Arc",
      summary: "CD Projekt proves that second chances exist in gaming with an expansion that redefines Night City's legacy.",
      url: "https://example.com/cyberpunk-review",
      imageUrl: "https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=1200&auto=format&fit=crop", 
      category: "DEEP DIVE",
      isUrgent: false
    },
    {
      title: "The Mech Renaissance: How Armored Core VI Changed Everything",
      summary: "FromSoftware's pivot back to mechanical combat ignited a genre-wide revival that nobody saw coming.",
      url: "https://example.com/ac6-analysis",
      imageUrl: "https://images.unsplash.com/photo-1535295972055-1c762f4483e5?q=80&w=1200&auto=format&fit=crop", 
      category: "ANALYSIS",
      isUrgent: false
    },
    {
      title: "Starfield: Shattered Space Takes Us to the Edge of Known Space",
      summary: "Our hands-on preview of the first major story expansion introduces new factions, handcrafted planets, and cosmic horror.",
      url: "https://example.com/starfield-dlc",
      imageUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop", 
      category: "PREVIEW",
      isUrgent: false
    },
    {
      title: "Ghost of Yotei: The Art of the Open World Samurai Fantasy",
      summary: "Sucker Punch reveals the creative vision behind their gorgeous sequel set in 1600s Hokkaido.",
      url: "https://example.com/ghost-yotei",
      imageUrl: "https://images.unsplash.com/photo-1535551951406-a19828b0a76b?q=80&w=1200&auto=format&fit=crop", 
      category: "FEATURE",
      isUrgent: false
    },
    {
      title: "How to Defeat Every Legacy Dungeon Boss in Elden Ring",
      summary: "A comprehensive walkthrough for every major encounter in the base game and expansion.",
      url: "https://example.com/elden-ring-guide",
      imageUrl: "https://images.unsplash.com/photo-1605806616949-1e87b487cb2a?q=80&w=1200&auto=format&fit=crop", 
      category: "GUIDE",
      isUrgent: false
    },
    {
      title: "PlayStation State of Play Confirmed for March",
      summary: "Multiple first-party reveals and a surprise third-party partnership expected to dominate.",
      url: "https://example.com/state-of-play",
      imageUrl: "https://images.unsplash.com/photo-1606144042874-dc8d37aa6f02?q=80&w=1200&auto=format&fit=crop", 
      category: "NEWS",
      isUrgent: false
    },
    {
      title: "Racing Into the Future: Apex Horizon Sets a New Standard",
      summary: "Dynamic weather, 1000+ licensed vehicles, and the best haptic feedback we've ever experienced.",
      url: "https://example.com/apex-horizon",
      imageUrl: "https://images.unsplash.com/photo-1547394765-185e1e68f864?q=80&w=1200&auto=format&fit=crop", 
      category: "REVIEW",
      isUrgent: false
    },
    {
      title: "Counter-Strike 2 Major Copenhagen: Group Stage Results",
      summary: "All eight quarter-finalists confirmed after three days of intense group stage competition.",
      url: "cs2-major",
      imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop", 
      category: "ESPORTS",
      isUrgent: false
    },
    {
      title: "The Secret History of Cancelled Sequels That Could Have Changed Gaming",
      summary: "From Half-Life 3 prototypes to the Mega Man Legends 3 that almost shipped.",
      url: "https://example.com/cancelled-games",
      imageUrl: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1200&auto=format&fit=crop", 
      category: "FEATURE",
      isUrgent: false
    }
  ];

  for (const article of articles) {
    await prisma.article.create({
      data: article,
    });
  }

  console.log('Mock core gaming data seeded perfectly.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
