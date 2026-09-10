import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';

import { SITE } from '@/shared/config/site';
import { CosmosStage } from '@/widgets/cosmos';
import './globals.css';

// Шрифт самохостится сборкой: внешних запросов в рантайме нет (§6).
const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
};

export const viewport: Viewport = {
  themeColor: '#04070d',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang={SITE.lang} className={manrope.variable}>
      <body>
        <a className="skipLink" href="#main">
          Skip to content
        </a>
        {/*
         * Сцена живёт в layout, а не на странице: при навигации layout не
         * размонтируется, поэтому движок не перезапускается и планеты
         * продолжают движение с того же места.
         */}
        <CosmosStage />
        {children}
      </body>
    </html>
  );
}
