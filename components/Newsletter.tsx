'use client';
import { useState } from 'react';
import styles from './Newsletter.module.css';

export default function Newsletter() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    // Fix #6: Honest fake behavior (simulating a 1s delay then success)
    setTimeout(() => {
      setStatus('success');
    }, 1200);
  };

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* Fix #9: Branding NEXUS -> PIVOT */}
        <span className={styles.label}>PIVOT INTEL DIRECT</span>
        
        {status === 'success' ? (
          <div className={styles.successState}>
            <h2 className={styles.title}>Welcome to the Inner Circle.</h2>
            <p className={styles.subtitle}>You're on the list. High-grade intelligence will follow soon.</p>
          </div>
        ) : (
          <>
            <h2 className={styles.title}>The sharpest gaming intel,<br/>delivered daily.</h2>
            <p className={styles.subtitle}>Join 200,000+ players who never miss an update.</p>
            
            <form className={styles.form} onSubmit={handleSubmit}>
              <input 
                type="email" 
                placeholder="your@email.com" 
                className={styles.input}
                required
                disabled={status === 'loading'}
              />
              <button type="submit" className={styles.button} disabled={status === 'loading'}>
                {status === 'loading' ? 'JOINING...' : (
                  <>
                    JOIN 
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
