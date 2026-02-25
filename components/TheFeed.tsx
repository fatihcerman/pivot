'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Article } from '@prisma/client';
import styles from './TheFeed.module.css';

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getReadingTime(title: string): number {
  return (hashCode(title) % 10) + 3;
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function TheFeed({ articles }: { articles: Article[] }) {
  if (!articles || articles.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.sectionKicker}>LATEST</span>
          <h2 className={styles.sectionTitle}>The Feed</h2>
        </div>
      </div>
      
      <div className={styles.feedList}>
        {articles.map((article, index) => (
          <FeedItem key={article.id} article={article} index={index} />
        ))}
      </div>
    </section>
  );
}

function FeedItem({ article, index }: { article: Article; index: number }) {
  const [imgError, setImgError] = useState(false);
  const readTime = getReadingTime(article.title);

  return (
    <a href={`/article/${article.id}`} className={styles.feedItem}>
      <div className={styles.numberCol}>
        {(index + 1).toString().padStart(2, '0')}
      </div>
      
      <div className={styles.imageCol}>
        {article.imageUrl && !imgError ? (
          <Image 
            src={article.imageUrl} 
            alt={article.title} 
            fill 
            sizes="(max-width: 768px) 100vw, 200px"
            className={styles.image}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.placeholder}>
            <div className={styles.placeholderGlow} />
          </div>
        )}
      </div>
      
      <div className={styles.contentCol}>
        <div className={styles.metaTop}>
          <span className={styles.category}>{article.category}</span>
          <span className={styles.separator}>|</span>
          <span className={styles.time}>{getTimeAgo(article.createdAt)}</span>
        </div>
        
        <h3 className={styles.title}>{article.title}</h3>
        <p className={styles.summary}>{article.summary}</p>
        
        <div className={styles.metaBottom}>
          <span>pivot team</span>
          <span>•</span>
          <span>{readTime} min read</span>
        </div>
      </div>
      
      <div className={styles.arrowCol}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </a>
  );
}
