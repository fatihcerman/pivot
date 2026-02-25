import { prisma } from '../lib/prisma';
import styles from './TrendingBar.module.css';

export default async function TrendingBar() {
  // Fix #14: Dynamic Category Strip instead of static links
  const categoriesRaw = await prisma.article.groupBy({
    by: ['category'],
    _count: { category: true },
    orderBy: { _count: { category: 'desc' } },
    take: 8
  });

  const categories = categoriesRaw.map(c => c.category);

  return (
    <div className="nexus-category-strip">
      <span className="trending-label">🔥 TRENDING</span>
      {categories.length > 0 ? (
        categories.map(cat => (
          <a key={cat} href={`/search?q=${encodeURIComponent(cat)}`}>{cat}</a>
        ))
      ) : (
        <>
          <a href="#">Elden Ring</a>
          <a href="#">PS5 Pro</a>
          <a href="#">GTA VI</a>
          <a href="#">Nintendo</a>
        </>
      )}
    </div>
  );
}
