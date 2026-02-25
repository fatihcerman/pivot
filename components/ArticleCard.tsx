import type { Article } from '@prisma/client';
import Image from 'next/image';
import styles from './ArticleCard.module.css';

interface ArticleCardProps {
  article: Article;
  index?: number;
}

export default function ArticleCard({ article, index = 0 }: ArticleCardProps) {
  return (
    <a 
      href={`/article/${article.id}`} 
      className={`${styles.cardLink} animate-fade-in`} 
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <article className={`${styles.card} glass-panel`}>
        <div className={styles.imageWrapper}>
          {article.imageUrl ? (
            <Image 
              src={article.imageUrl} 
              alt={article.title} 
              fill 
              sizes="(max-width: 768px) 100vw, 33vw"
              className={styles.image}
              unoptimized
            />
          ) : (
            <div className={styles.imagePlaceholder}>
              <div className={styles.placeholderGlow} />
            </div>
          )}
          
          {article.isUrgent && (
            <div className={styles.urgentBadgeContainer}>
              <div className={styles.urgentGlow} />
              <span className={styles.urgentBadge}>Live</span>
            </div>
          )}
        </div>

        <div className={styles.content}>
          <div className={styles.meta}>
            <span className={styles.category}>{article.category}</span>
            <span className={styles.date}>
              {new Date(article.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h3 className={styles.title}>{article.title}</h3>
          <p className={styles.summary}>{article.summary}</p>
          
          <div className={styles.readMore}>
            <span>Initialize Uplink</span>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </article>
    </a>
  );
}
