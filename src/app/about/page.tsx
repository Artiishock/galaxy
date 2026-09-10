import type { Metadata } from 'next';

import { RESUME } from '@/domain/resume';
import { ZonePage } from '@/shared/ui';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Artem Golubev — frontend developer based in Valencia, Spain, with a Spanish ' +
    'residence permit and 3+ years of commercial experience in JavaScript and React.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  const { person, summary, targetRole, employment, languages } = RESUME;

  return (
    <ZonePage title="About" lead={person.headline}>
      <section className={styles.section} aria-labelledby="profile">
        <h2 id="profile" className={styles.heading}>
          Profile
        </h2>
        {summary.map((paragraph) => (
          <p key={paragraph} className={styles.paragraph}>
            {paragraph}
          </p>
        ))}
      </section>

      <section className={styles.section} aria-labelledby="status">
        <h2 id="status" className={styles.heading}>
          Status
        </h2>
        <dl className={styles.facts}>
          <div className={styles.fact}>
            <dt>Target role</dt>
            <dd>{targetRole}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Employment</dt>
            <dd>{employment}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Location</dt>
            <dd>{person.location}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Citizenship</dt>
            <dd>{person.citizenship}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Work authorisation</dt>
            <dd>{person.workAuthorization}</dd>
          </div>
          <div className={styles.fact}>
            <dt>Mobility</dt>
            <dd>{person.relocation}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="languages">
        <h2 id="languages" className={styles.heading}>
          Languages
        </h2>
        <dl className={styles.facts}>
          {languages.map((language) => (
            <div key={language.name} className={styles.fact}>
              <dt>{language.name}</dt>
              <dd>
                {language.level}
                {language.note === null ? null : (
                  <span className={styles.note}> — {language.note}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </ZonePage>
  );
}
