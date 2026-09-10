import type { Metadata } from 'next';

import { RESUME } from '@/domain/resume';
import { ZonePage } from '@/shared/ui';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Skills',
  description:
    'Frontend stack of Artem Golubev: JavaScript, React, Redux, HTML5, CSS3, plus ' +
    'browser graphics with PixiJS, Three.js and Canvas, Git, Linux and deployment.',
  alternates: { canonical: '/skills' },
};

export default function SkillsPage() {
  return (
    <ZonePage
      title="Skills"
      lead="Core stack first, then the areas that surround it — graphics, infrastructure and everything picked up along the way."
    >
      {RESUME.skillGroups.map((group) => (
        <section key={group.id} className={styles.group} aria-labelledby={group.id}>
          <h2 id={group.id} className={styles.heading}>
            {group.title}
          </h2>
          <ul className={styles.items}>
            {group.items.map((item) => (
              <li key={item} className={styles.item}>
                {item}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </ZonePage>
  );
}
