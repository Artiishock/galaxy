import type { MetadataRoute } from 'next';

import { SITE } from '@/shared/config/site';

/** См. sitemap.ts: при статическом экспорте маршрут объявляет себя статическим. */
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: new URL('/sitemap.xml', SITE.url).toString(),
    host: SITE.url,
  };
}
