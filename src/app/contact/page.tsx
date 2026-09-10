import type { Metadata } from 'next';

import { RESUME } from '@/domain/resume';
import { ZonePage } from '@/shared/ui';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with Artem Golubev, frontend developer in Valencia, Spain. ' +
    'Email is the preferred contact method.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  const { contacts, person } = RESUME;

  return (
    <ZonePage title="Contact" lead="Email is the fastest way to reach me.">
      <ul className={styles.list}>
        {contacts.map((contact) => (
          <li key={contact.id} className={styles.entry}>
            <span className={styles.label}>
              {contact.label}
              {contact.preferred ? <span className={styles.badge}>preferred</span> : null}
            </span>
            {contact.href === null ? (
              <span className={styles.value}>{contact.value}</span>
            ) : (
              <a className={styles.link} href={contact.href}>
                {contact.value}
              </a>
            )}
          </li>
        ))}
      </ul>

      <p className={styles.availability}>
        {person.workAuthorization}. {person.relocation}.
      </p>
    </ZonePage>
  );
}
