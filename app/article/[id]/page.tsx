import { prisma } from '../../../lib/prisma';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import ReadingProgress from '../../../components/ReadingProgress';
import styles from './article.module.css';

export const revalidate = 60;

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) notFound();

  return (
    <main className={styles.page}>
      <ReadingProgress />
      {/* Atmospheric hero image */}
      <div className={styles.heroImage}>
        {article.imageUrl && (
          <Image
            src={article.imageUrl}
            alt={article.title}
            fill
            sizes="100vw"
            className={styles.image}
            priority
          />
        )}
        <div className={styles.overlay} />
        
        {article.imageUrl && (
          <div
            className={styles.bleed}
            style={{ backgroundImage: `url(${article.imageUrl})` }}
            aria-hidden="true"
          />
        )}
      </div>

      <article className={styles.content}>
        <div className={styles.meta}>
          <span className={styles.category}>{article.category}</span>
          <span className={styles.source}>{article.sourceName || 'PIVOT INTEL'}</span>
          <span className={styles.date}>
            {new Date(article.createdAt).toLocaleDateString(undefined, { 
              year: 'numeric', month: 'long', day: 'numeric' 
            })}
          </span>
        </div>

        <h1 className={styles.title}>{article.title}</h1>
        
        {/* Fix #13: Surfacing the PIVOT Perspective */}
        {article.perspective && (
          <div className={styles.perspectiveBox}>
            <div className={styles.perspectiveLabel}>THE PIVOT TAKE</div>
            <p className={styles.perspectiveText}>{article.perspective}</p>
          </div>
        )}

        <div className={styles.summaryContainer}>
          <p className={styles.summary}>{article.summary}</p>
        </div>

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.sourceLink}
        >
          Read Full Source @ {article.sourceName || 'Source'} →
        </a>
      </article>
    </main>
  );
}
