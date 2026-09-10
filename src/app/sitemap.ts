import type { MetadataRoute } from 'next';

import { ORBITS, SITE } from '@/shared/config/site';

/** Карта сайта генерируется из конфигурации — руками её не поддерживают (§6). */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return [
    {
      url: SITE.url,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
    },
    ...ORBITS.map((orbit) => ({
      url: new URL(orbit.href, SITE.url).toString(),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
