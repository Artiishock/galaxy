import { formatDuration, formatPeriod, monthsInPeriod, type Position } from '@/domain/resume';
import styles from './position-card.module.css';

interface PositionCardProps {
  readonly position: Position;
  /** Момент отсчёта передаётся снаружи: компонент остаётся чистым и предсказуемым. */
  readonly now: Date;
}

export function PositionCard({ position, now }: PositionCardProps) {
  const duration = formatDuration(monthsInPeriod(position.period, now));

  return (
    <article className={styles.card}>
      <header className={styles.head}>
        <h3 className={styles.role}>{position.role}</h3>
        <p className={styles.company}>{position.company}</p>
        <p className={styles.meta}>
          <span>{formatPeriod(position.period)}</span>
          <span>{duration}</span>
          <span>{position.industry}</span>
        </p>
      </header>

      <ul className={styles.highlights}>
        {position.highlights.map((highlight) => (
          <li key={highlight}>{highlight}</li>
        ))}
      </ul>

      <ul className={styles.stack} aria-label={`Stack at ${position.company}`}>
        {position.stack.map((item) => (
          <li key={item} className={styles.chip}>
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}
