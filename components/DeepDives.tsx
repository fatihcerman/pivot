'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Article } from '@prisma/client';
import styles from './DeepDives.module.css';

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Fix #11: Deterministic reading time from title hash */
function getReadingTime(title: string): number {
  return (hashCode(title) % 12) + 4;
}

export default function DeepDives({ articles }: { articles: Article[] }) {
  if (!articles || articles.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionKicker}>FEATURED INTEL</span>
        <h2 className={styles.sectionTitle}>Deep Dives & Analysis</h2>
      </div>
      
      <div className={styles.grid}>
        {articles.map((article, index) => (
          <DeepDiveCard key={article.id} article={article} index={index} />
        ))}
      </div>
    </section>
  );
}

function DeepDiveCard({ article, index }: { article: Article; index: number }) {
  const [imgError, setImgError] = useState(false);
  const readTime = getReadingTime(article.title);

  return (
    <a 
      href={`/article/${article.id}`} 
      className={styles.card} 
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className={styles.imageWrapper}>
        {article.imageUrl && !imgError ? (
          <Image 
            src={article.imageUrl} 
            alt={article.title} 
            fill 
            sizes="(max-width: 768px) 100vw, 25vw"
            className={styles.image}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={styles.placeholder}>
             <div className={styles.placeholderGlow} />
          </div>
        )}
        {article.isUrgent && <span className={styles.badge}>PRO</span>}
      </div>
      <div className={styles.content}>
        <span className={styles.category}>{article.category}</span>
        <h3 className={styles.title}>{article.title}</h3>
        <p className={styles.summary}>{article.summary}</p>
        <div className={styles.meta}>
          <span>pivot intel</span>
          <span>•</span>
          <span>{readTime} min read</span>
          <span>•</span>
          <span>{new Date(article.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>
    </a>
  );
}
