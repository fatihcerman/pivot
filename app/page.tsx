import { prisma } from '../lib/prisma';
import HeroCarousel from '../components/HeroCarousel';
import NewsList from '../components/NewsList';
import DeepDives from '../components/DeepDives';
import TheFeed from '../components/TheFeed';
import Newsletter from '../components/Newsletter';
import styles from './page.module.css';

export const revalidate = 60;

export default async function Home() {
  const articles = await prisma.article.findMany({
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  if (!articles || articles.length === 0) {
    return (
      <main className="container">
        <div className={styles.emptyState}>
          <h1>Awaiting Intelligence</h1>
          <p>No articles found. Hit the <a href="/api/cron" className="text-accent">uplink</a> to fetch the latest news via Gemini AI.</p>
        </div>
      </main>
    );
  }

  // Smart distribution
  const heroArticles = articles.slice(0, 4);   // Top 4 rotate in the hero
  const railEnd = Math.min(8, articles.length);
  const deepEnd = Math.min(railEnd + 4, articles.length);

  const rightRailArticles = articles.slice(4, railEnd);
  const deepDiveArticles = articles.slice(railEnd, deepEnd);
  const feedArticles = articles.slice(deepEnd);

  return (
    <main className="container animate-fade-in">
      {/* Hero Carousel + Breaking Rail */}
      <section className={styles.topSection}>
        <div className={styles.heroColumn}>
          <HeroCarousel articles={heroArticles} intervalMs={8000} />
        </div>
        <div className={styles.railColumn}>
          <h2>Latest Intelligence</h2>
          {rightRailArticles.length > 0 && <NewsList articles={rightRailArticles} />}
        </div>
      </section>

      <div className="section-divider" />

      {/* Deep Dives Grid */}
      <h2>Trending Now</h2>
      {deepDiveArticles.length > 0 && <DeepDives articles={deepDiveArticles} />}

      <div className="section-divider" />

      {/* The Feed */}
      <h2>Field Reports</h2>
      {feedArticles.length > 0 && <TheFeed articles={feedArticles} />}

      {/* Newsletter */}
      <Newsletter />
    </main>
  );
}
