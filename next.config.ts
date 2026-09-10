import type { NextConfig } from 'next';

/**
 * Заголовки безопасности уровня приложения.
 * CSP намеренно не задаётся здесь: корректная политика для Next требует nonce,
 * а nonce переводит страницу в динамический рендеринг и бьёт по статике/SEO.
 * См. задачу в README — политика настраивается на уровне доставки (edge/CDN).
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
] as const;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Без явного корня Turbopack поднимается до домашнего каталога: рядом лежит
  // чужой lock-файл, и в трассировку попадают лишние директории.
  turbopack: { root: import.meta.dirname },

  headers() {
    return Promise.resolve([{ source: '/:path*', headers: [...securityHeaders] }]);
  },
};

export default nextConfig;
