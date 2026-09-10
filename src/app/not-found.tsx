import type { Metadata } from 'next';

import { ZonePage } from '@/shared/ui';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <ZonePage title="Off the map" lead="There is no such object in this system.">
      <p>
        The page you were looking for does not exist. Head back to the orbit and pick a section.
      </p>
    </ZonePage>
  );
}
