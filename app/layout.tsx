import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import TrendingBar from '../components/TrendingBar';

const inter = Inter({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit'
});

export const metadata: Metadata = {
  title: 'PIVOT | The World\'s Premier Gaming Intelligence',
  description: 'AI-curated breaking gaming news delivered with atmospheric utility.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        {/* Fix #12: The global ambient glow - will be targeted by CSS variables for dynamic tinting */}
        <div className="ambient-glow" />
        
        {/* PIVOT Minimalist Navigation */}
        <header className="container">
          <nav className="pivot-nav">
            <a href="/" className="pivot-brand">PIVOT</a>
            <div className="pivot-nav-actions">
              <form action="/search" method="GET" className="nav-search-form">
                <input 
                  type="text" 
                  name="q" 
                  placeholder="SEARCH INTEL..." 
                  className="nav-search-input"
                />
                <button type="submit" className="nav-search-btn">
                  <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              </form>
              <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </nav>
          
          <TrendingBar />
        </header>

        {children}

        {/* PIVOT Footer - Fix #9: Fully centered autonomous footer */}
        <footer className="nexus-footer">
          <div className="container nexus-footer-minimal">
            <a href="/" className="pivot-brand">PIVOT</a>
            <p className="footer-tagline">
              AI-curated gaming intelligence. Fully autonomous. Zero maintenance.<br/>
              Powered by Gemini 2.0 & Pollinations.ai.
            </p>
            <div className="footer-legal-row">
              <span>© 2026 PIVOT</span>
              <span>•</span>
              <span>Content refreshed daily via AI pipeline</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
