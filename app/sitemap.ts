import { MetadataRoute } from 'next';
import { prisma } from '../lib/prisma';

export const revalidate = 1800; // Revalidate every 30 mins

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL
    : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  const articles = await prisma.article.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  const articleUrls: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${baseUrl}/article/${article.id}`,
    lastModified: article.createdAt,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1.0,
    },
    ...articleUrls,
  ];
}
