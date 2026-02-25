import Image from 'next/image';
import type { Article } from '@prisma/client';
import styles from './Hero.module.css';

/**
 * Calculates estimated reading time from summary length.
 * Average reading speed: ~200 words per minute.
 */
function getReadingTime(summary: string): number {
  const words = summary.split(/\s+/).length;
  return Math.max(2, Math.ceil(words / 200) * 5); // Min 2 min, rounded to 5s
}

/**
 * Formats a date to a relative or short format.
 */
function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function Hero({ article }: { article: Article }) {
  if (!article) return null;

  const readTime = getReadingTime(article.summary);

  return (
    <a href={`/article/${article.id}`} className={styles.heroLink}>
      <article className={`${styles.hero} animate-fade-in`}>
        
        {/* Atmospheric Bleed Effect */}
        {article.imageUrl && (
          <div 
            className={styles.atmosphericBleed} 
            style={{ backgroundImage: `url(${article.imageUrl})` }}
            aria-hidden="true"
          />
        )}

        <div className={styles.imageLayer}>
          {article.imageUrl ? (
            <Image 
              src={article.imageUrl} 
              alt={article.title} 
              fill 
              sizes="(max-width: 1024px) 100vw, 70vw"
              className={styles.image}
              priority
              unoptimized
            />
          ) : (
            <div className={styles.imagePlaceholder}>
              <div className={styles.placeholderGlow} />
            </div>
          )}
          <div className={styles.gradientOverlay} />
        </div>

        {article.isUrgent && (
          <div className={styles.urgentBadgeContainer}>
            <div className={styles.urgentGlow} />
            <div className={styles.urgentPulse} />
            <span className={styles.urgentBadge}>BREAKING</span>
          </div>
        )}

        <div className={styles.contentLayer}>
          <div className={styles.metaData}>
            <span className={styles.category}>{article.category}</span>
            <span className={styles.readingTime}>⚡ {readTime} MIN READ</span>
          </div>
          
          <h1 className={styles.title}>{article.title}</h1>
          <p className={styles.summary}>{article.summary}</p>
          
          <div className={styles.ctaWrapper}>
            <div className={styles.ctaButton}>
              READ FULL STORY
            </div>
          </div>
        </div>
      </article>
    </a>
  );
}
