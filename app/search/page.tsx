'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Article } from '@prisma/client';
import styles from './search.module.css';

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');
  
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.articles || []);
      } catch (e) {
        console.error('Search failed:', e);
      } finally {
        setTimeout(() => setLoading(false), 800); // Artificial delay for aesthetic scan effect
      }
    };

    fetchResults();
  }, [query]);

  return (
    <main className="container animate-fade-in">
      <div className={styles.header}>
        <h1 className={styles.title}>
          {query ? query : 'Intelligence'}
        </h1>
        <p className={styles.count}>
          {loading ? 'Scanning Database...' : `${results.length} Matches Found`}
        </p>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.scanLine} />
          Uplink Active: Scanning Critical Data...
        </div>
      ) : results.length > 0 ? (
        <div className={styles.grid}>
          {results.map((article, idx) => (
            <Link 
              key={article.id} 
              href={`/article/${article.id}`} 
              className={styles.card}
              style={{ animationDelay: `${idx * 0.05}s` } as any}
            >
              <div className={styles.imageCol}>
                {article.imageUrl && (
                  <Image 
                    src={article.imageUrl} 
                    alt={article.title} 
                    fill 
                    className={styles.image}
                    unoptimized
                  />
                )}
              </div>
              <div className={styles.contentCol}>
                <span className={styles.category}>{article.category}</span>
                <h3 className={styles.articleTitle}>{article.title}</h3>
                <p className={styles.summary}>{article.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : query ? (
        <div className={styles.empty}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ width: '4rem', marginBottom: '1rem', opacity: 0.2 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p>No intelligence records match your search query.</p>
        </div>
      ) : null}
    </main>
  );
}

export default function SearchPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Suspense fallback={<div style={{ padding: '5rem', textAlign: 'center', color: 'var(--accent-electric)', letterSpacing: '0.2em' }}>INITIALIZING SCAN...</div>}>
        <SearchContent />
      </Suspense>
    </div>
  );
}
