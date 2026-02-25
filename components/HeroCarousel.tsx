'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import type { Article } from '@prisma/client';
import styles from './Hero.module.css';

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Fix #11: Deterministic reading time from title hash (3-18 min) */
function getReadingTime(title: string): number {
  return (hashCode(title) % 16) + 3;
}

interface HeroCarouselProps {
  articles: Article[];
  intervalMs?: number;
}

export default function HeroCarousel({ articles, intervalMs = 8000 }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);

  const goToNext = useCallback(() => {
    setPrevIndex(activeIndex);
    setActiveIndex((prev) => (prev + 1) % articles.length);
  }, [activeIndex, articles.length]);

  useEffect(() => {
    if (articles.length <= 1) return;
    const timer = setInterval(goToNext, intervalMs);
    return () => clearInterval(timer);
  }, [goToNext, intervalMs, articles.length]);

  // Clear previous slide after crossfade completes
  useEffect(() => {
    if (prevIndex === null) return;
    const t = setTimeout(() => setPrevIndex(null), 800);
    return () => clearTimeout(t);
  }, [prevIndex]);

  if (!articles || articles.length === 0) return null;

  const article = articles[activeIndex];
  const readTime = getReadingTime(article.title);

  // Fix #12: Sync global ambient glow with current hero image
  useEffect(() => {
    if (article?.imageUrl) {
      if (typeof window === 'undefined') return;
      document.documentElement.style.setProperty('--dynamic-accent-soft', 'rgba(0, 212, 255, 0.12)');
      document.documentElement.style.setProperty('--dynamic-accent-muted', 'rgba(0, 180, 255, 0.08)');
      document.documentElement.style.setProperty('--dynamic-accent-trace', 'rgba(0, 150, 255, 0.03)');
    } else {
      if (typeof window === 'undefined') return;
      document.documentElement.style.setProperty('--dynamic-accent-soft', 'rgba(80, 40, 120, 0.08)');
      document.documentElement.style.setProperty('--dynamic-accent-muted', 'rgba(30, 60, 120, 0.05)');
      document.documentElement.style.setProperty('--dynamic-accent-trace', 'rgba(0, 212, 255, 0.02)');
    }
  }, [article?.imageUrl]);

  return (
    <div className={styles.carouselWrapper}>
      {/* Fix #4: Previous slide fades out underneath current */}
      {prevIndex !== null && (
        <div className={`${styles.slideLayer} ${styles.slideFadeOut}`} aria-hidden="true" style={{ zIndex: 1 }}>
          <SlideContent article={articles[prevIndex]} readTime={getReadingTime(articles[prevIndex].title)} />
        </div>
      )}

      {/* Current slide */}
      <div className={`${styles.slideLayer} ${styles.slideFadeIn}`} key={activeIndex} style={{ zIndex: 2 }}>
        <a href={`/article/${article.id}`} className={styles.heroLink}>
          <SlideContent article={article} readTime={readTime} />
        </a>
      </div>

      {/* Fix #8: Single bleed div instead of 4 */}
      {article.imageUrl && (
        <div
          className={styles.atmosphericBleed}
          style={{ backgroundImage: `url(${article.imageUrl})` }}
          aria-hidden="true"
        />
      )}

      {/* Progress indicators */}
      {articles.length > 1 && (
        <div className={styles.indicators}>
          {articles.map((_, i) => (
            <div
              key={i}
              className={`${styles.dot} ${i === activeIndex ? styles.dotActive : ''}`}
            >
              {i === activeIndex && <div className={styles.dotProgress} style={{ animationDuration: `${intervalMs}ms` }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Inner slide component to avoid duplication */
function SlideContent({ article, readTime }: { article: Article; readTime: number }) {
  return (
    <article className={styles.hero}>
      <div className={styles.imageLayer}>
        {article.imageUrl ? (
          <Image
            src={article.imageUrl}
            alt={article.title}
            fill
            sizes="(max-width: 1024px) 100vw, 70vw"
            className={styles.image}
            priority
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
          <div className={styles.ctaButton}>READ FULL STORY</div>
        </div>
      </div>
    </article>
  );
}
