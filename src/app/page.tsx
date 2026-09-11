import { RESUME } from '@/domain/resume';
import { JsonLd } from '@/shared/lib/json-ld';
import { ORBITS, SITE } from '@/shared/config/site';

/**
 * Главная страница.
 *
 * Сама сцена находится в layout и переживает навигацию; странице остаётся центр
 * композиции — имя и роль. Всё это серверная разметка: попадает в HTML до
 * какого-либо JavaScript (§0.1).
 */
export default function HomePage() {
  const { person, skillGroups, credentials, languages, contacts } = RESUME;
  const degree = credentials.find((credential) => credential.kind === 'degree');
  const email = contacts.find((contact) => contact.id === 'email');

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE.url}/#website`,
        name: SITE.name,
        url: SITE.url,
        description: SITE.description,
        inLanguage: SITE.lang,
        about: { '@id': `${SITE.url}/#person` },
        hasPart: ORBITS.map((orbit) => ({
          '@type': 'WebPage',
          name: orbit.label,
          description: orbit.summary,
          url: new URL(orbit.href, SITE.url).toString(),
        })),
      },
      {
        '@type': 'Person',
        '@id': `${SITE.url}/#person`,
        name: person.name,
        jobTitle: person.headline,
        url: SITE.url,
        email: email?.value,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Valencia',
          addressCountry: 'ES',
        },
        hasOccupation: {
          '@type': 'Occupation',
          name: RESUME.targetRole,
          occupationalCategory: 'Web Development',
        },
        // Плоский список технологий: поисковику нужны сами термины, не группы.
        knowsAbout: skillGroups.flatMap((group) => [...group.items]),
        knowsLanguage: languages.map((language) => ({
          '@type': 'Language',
          name: language.name,
        })),
        alumniOf:
          degree === undefined
            ? undefined
            : { '@type': 'CollegeOrUniversity', name: degree.issuer },
        worksFor: RESUME.positions
          .filter((position) => position.period.end === null)
          .map((position) => ({ '@type': 'Organization', name: position.company })),
      },
    ],
  };

  return (
    <main id="main">
      <JsonLd data={graph} />

      {/*
       * Главная не показывает текста вовсе: вся её содержательная часть —
       * орбитальная навигация, а она живёт в layout.
       *
       * Имя и роль остаются в разметке скрытыми: `<h1>` — главный сигнал для
       * поиска по имени владельца резюме, и страница не должна оставаться без
       * заголовка первого уровня (§6).
       */}
      <h1 className="visuallyHidden">{person.name}</h1>
      <p className="visuallyHidden">{person.headline}</p>
    </main>
  );
}
