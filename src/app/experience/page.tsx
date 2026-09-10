import type { Metadata } from 'next';

import {
  RESUME,
  formatDuration,
  sortPositionsByRecency,
  totalExperienceMonths,
} from '@/domain/resume';
import { PositionCard } from '@/entities/position';
import { ZonePage } from '@/shared/ui';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Experience',
  description:
    'Commercial frontend experience of Artem Golubev: travel web services, iGaming ' +
    'browser games with PixiJS and Three.js, teaching, and end-to-end freelance projects.',
  alternates: { canonical: '/experience' },
};

export default function ExperiencePage() {
  const now = new Date();
  const positions = sortPositionsByRecency(RESUME.positions);
  // Пересекающиеся периоды не складываются: фриланс шёл параллельно основной работе.
  const total = formatDuration(
    totalExperienceMonths(
      RESUME.positions.map((position) => position.period),
      now,
    ),
  );

  return (
    <ZonePage
      title="Experience"
      lead={`${total} of commercial frontend work across ${RESUME.positions.length} roles — product teams, an iGaming studio, teaching and independent client projects.`}
    >
      <ol className={styles.list}>
        {positions.map((position) => (
          <li key={position.id}>
            <PositionCard position={position} now={now} />
          </li>
        ))}
      </ol>
    </ZonePage>
  );
}
