import { prisma } from '../../../lib/prisma';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import ReadingProgress from '../../../components/ReadingProgress';
import styles from './article.module.css';
import { Metadata } from 'next';

export const revalidate = 60;

// Dinamik SEO ve OpenGraph Metadata Üretimi
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });

  if (!article) return { title: 'Not Found' };

  return {
    title: `${article.title} | PIVOT`,
    description: article.summary,
    openGraph: {
      title: article.title,
      description: article.summary,
      url: `/article/${article.id}`,
      siteName: 'PIVOT',
      images: [
        {
          url: article.imageUrl || '',
          width: 1200,
          height: 800,
        },
      ],
      type: 'article',
      publishedTime: article.createdAt.toISOString(),
      authors: [article.sourceName || 'PIVOT INTEL'],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.summary,
      images: [article.imageUrl || ''],
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) notFound();

  // UX Optimizasyonu (Zeigarnik Effect - Session Duration): İlgili rastgele/yeni içerikleri çek
  const relatedArticles = await prisma.article.findMany({
    where: { 
      id: { not: article.id }, // Kendisini hariç tut
      category: article.category 
    },
    take: 3,
    orderBy: { createdAt: 'desc' }
  });

  // Google News Zorunlu JSON-LD (NewsArticle) Schema Markup
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    image: [article.imageUrl],
    datePublished: article.createdAt.toISOString(),
    dateModified: article.createdAt.toISOString(),
    author: {
      '@type': 'Organization',
      name: article.sourceName || 'PIVOT INTEL',
    },
    publisher: {
      '@type': 'Organization',
      name: 'PIVOT',
      logo: {
        '@type': 'ImageObject',
        url: 'https://pivot-intel.vercel.app/favicon.ico', // Prodcution var ise domain verilir
      },
    },
    description: article.summary,
  };

  return (
    <main className={styles.page}>
      {/* Google Bot'larına sunucu tarafından render edilmiş gizli JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      
      {/* Session Length Predictability Bar (UX Hook) */}
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
          {/* Google News uyumlu tam time formati ISO 8601 */}
          <time dateTime={article.createdAt.toISOString()} className={styles.date}>
            {new Date(article.createdAt).toLocaleDateString(undefined, { 
              year: 'numeric', month: 'long', day: 'numeric' 
            })}
          </time>
        </div>

        <h1 className={styles.title} style={{ fontFamily: 'var(--font-outfit)', fontWeight: 900, fontSize: 'clamp(2rem, 5vw, 4rem)', lineHeight: 1.1, marginBottom: '1.5rem' }}>
          {article.title}
        </h1>
        
        {/* Fix #13: Surfacing the PIVOT Perspective */}
        {article.perspective && (
          <div className={styles.perspectiveBox} style={{ borderLeft: '4px solid var(--accent-electric)', paddingLeft: '2rem', margin: '3rem 0', background: 'rgba(0,212,255,0.03)' }}>
            <div className={styles.perspectiveLabel} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--accent-electric)', marginBottom: '0.5rem', letterSpacing: '0.2em' }}>THE PIVOT TAKE</div>
            <p className={styles.perspectiveText} style={{ fontSize: '1.2rem', fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.6 }}>{article.perspective}</p>
          </div>
        )}

        <div className={styles.summaryContainer}>
          <p className={styles.summary} style={{ fontSize: '1.25rem', lineHeight: 1.8, color: 'var(--text-secondary)', maxWidth: '800px' }}>{article.summary}</p>
        </div>

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.sourceLink}
        >
          Read Full Source @ {article.sourceName || 'Source'} →
        </a>

        {/* --- UX / SESSION DURATION HOOK (Zeigarnik Effect) --- */}
        {relatedArticles.length > 0 && (
          <div className={styles.relatedContentHook}>
            <h3 className={styles.relatedHeadline}>Classified Intel: Continue the Thread</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {relatedArticles.map((rel) => (
                <Link key={rel.id} href={`/article/${rel.id}`} passHref legacyBehavior>
                  <a style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    padding: '1rem', 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '8px',
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'border-color 0.2s ease'
                  }}>
                    {rel.imageUrl && (
                      <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0, borderRadius: '4px', overflow: 'hidden' }}>
                        <Image src={rel.imageUrl} alt={rel.title} fill style={{ objectFit: 'cover' }} />
                      </div>
                    )}
                    <div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--accent-electric)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>
                        {rel.category}
                      </span>
                      <h4 style={{ fontSize: '1rem', color: 'white', margin: '4px 0 0 0', lineHeight: 1.3 }}>
                        {rel.title}
                      </h4>
                    </div>
                  </a>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </main>
  );
}
