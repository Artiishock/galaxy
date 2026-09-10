import type { Metadata } from 'next';

import { RESUME } from '@/domain/resume';
import { ZonePage } from '@/shared/ui';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Education',
  description:
    'Education of Artem Golubev: Applied Programming diploma from P.G. Demidov ' +
    'Yaroslavl State University, plus Skillbox, Skyeng and IT School courses.',
  alternates: { canonical: '/education' },
};

export default function EducationPage() {
  const degrees = RESUME.credentials.filter((credential) => credential.kind === 'degree');
  const courses = RESUME.credentials.filter((credential) => credential.kind === 'course');

  return (
    <ZonePage
      title="Education"
      lead="A formal diploma in applied programming, kept current with focused courses."
    >
      <section className={styles.section} aria-labelledby="degree">
        <h2 id="degree" className={styles.heading}>
          Degree
        </h2>
        <ul className={styles.list}>
          {degrees.map((credential) => (
            <li key={credential.id} className={styles.entry}>
              <p className={styles.title}>{credential.title}</p>
              <p className={styles.issuer}>{credential.issuer}</p>
              <p className={styles.meta}>
                Graduated {credential.year}
                {credential.note === null ? null : ` · ${credential.note}`}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="courses">
        <h2 id="courses" className={styles.heading}>
          Certifications & courses
        </h2>
        <ul className={styles.list}>
          {courses.map((credential) => (
            <li key={credential.id} className={styles.entry}>
              <p className={styles.title}>{credential.title}</p>
              <p className={styles.issuer}>{credential.issuer}</p>
              <p className={styles.meta}>{credential.year}</p>
            </li>
          ))}
        </ul>
      </section>
    </ZonePage>
  );
}
