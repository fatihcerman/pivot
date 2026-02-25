import type { Article } from '@prisma/client';
import styles from './NewsList.module.css';

export default function NewsList({ articles }: { articles: Article[] }) {
  if (!articles || articles.length === 0) return null;
  // Limit to exactly 5 headlines for the tightly stacked breaking news rail
  const recentArticles = articles.slice(0, 5);

  return (
    <aside className={`${styles.rail} animate-fade-in`}>
      <div className={styles.list}>
        {recentArticles.map((article, index) => (
          <a 
            key={article.id} 
            href={`/article/${article.id}`} 
            className={styles.itemLink}
            style={{ animationDelay: `${0.1 + index * 0.05}s` }}
          >
            <article className={styles.item}>
              <div className={styles.meta}>
                <span className={styles.timecode}>
                  {new Date(article.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={styles.category}>{article.category}</span>
                {article.isUrgent && <span className={styles.urgent}>Priority</span>}
              </div>
              <h3 className={styles.title}>{article.title}</h3>
            </article>
          </a>
        ))}
      </div>
    </aside>
  );
}
