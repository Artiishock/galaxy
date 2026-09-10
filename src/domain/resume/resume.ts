import type { Resume } from './types';

/**
 * Единственный источник правды о содержании резюме.
 *
 * Осознанно не публикуются пол и точная дата рождения: для найма они не нужны,
 * а в ЕС их указание считается плохой практикой. Разрешение на работу и локация,
 * напротив, для работодателя в Испании существенны — они здесь есть.
 */
export const RESUME: Resume = {
  person: {
    name: 'Artem Golubev',
    headline: 'Frontend Developer',
    location: 'Valencia, Spain',
    citizenship: 'Russia',
    workAuthorization: 'Spanish residence permit — authorised to work in Spain',
    relocation: 'Open to relocation and travel',
  },

  targetRole: 'Frontend Developer (Middle)',
  employment: 'Full-time · on-site, remote or hybrid',

  summary: [
    'Frontend developer with 3+ years of commercial experience. Core stack: JavaScript, ' +
      'React, Redux, HTML5 and CSS3.',
    'Built and maintained web services in the travel industry, browser-based games for the ' +
      'iGaming sector with PixiJS and Three.js, and delivered end-to-end client projects — ' +
      'from markup through to hosting setup and deployment.',
    'In my most recent role as Middle Frontend Developer I coordinated the team and made ' +
      'technical decisions on project implementation. I have also taught frontend development, ' +
      'so explaining technical decisions and running code reviews is familiar ground.',
  ],

  positions: [
    {
      id: 'olivia-travel',
      role: 'Frontend Developer',
      company: 'Olivia Travel LLC',
      industry: 'Travel & Leisure',
      period: { start: '2022-10', end: null },
      highlights: [
        "Development and maintenance of the company's web infrastructure: frontend of both " +
          'customer-facing and internal services.',
        'Optimisation and refactoring of existing systems — improved interface performance ' +
          'and stability.',
        'Codebase maintenance: bug fixing, feature development and release support.',
      ],
      stack: ['JavaScript', 'React', 'HTML5', 'CSS3', 'Git'],
    },
    {
      id: 'freelance',
      role: 'Frontend Developer — self-employed',
      company: 'Sole proprietorship / Freelance',
      industry: 'Project-based work',
      period: { start: '2023-07', end: null },
      highlights: [
        'End-to-end website development, both from supplied designs and from scratch — ' +
          'prototype through to launch.',
        'Design and implementation of databases to fit project requirements.',
        'Hosting and server configuration, deployment and ongoing project support.',
        'Website administration and technical support, feature development on client request.',
      ],
      stack: [
        'JavaScript',
        'React',
        'HTML5',
        'CSS3',
        'Git',
        'Linux',
        'Databases',
        'Hosting & deployment',
      ],
    },
    {
      id: 'magnetic-studio',
      role: 'Middle Frontend Developer',
      company: 'Magnetic Studio',
      industry: 'Software Development · iGaming',
      period: { start: '2025-12', end: '2026-07' },
      highlights: [
        'Development and maintenance of browser-based games for the iGaming sector.',
        '2D and 3D browser graphics with PixiJS, Three.js and Canvas — animations and ' +
          'interactive scenes.',
        "Coordinated the team's work and made technical decisions on project implementation.",
      ],
      stack: ['JavaScript', 'React', 'Redux', 'PixiJS', 'Three.js', 'Canvas', 'Git'],
    },
    {
      id: 'kiberone',
      role: 'Frontend Curriculum Tutor',
      company: 'KIBERone — International School of Programming and Digital Creativity',
      industry: 'Education',
      period: { start: '2025-03', end: '2025-11' },
      highlights: [
        'Taught frontend development classes: React, JavaScript, HTML and CSS.',
        'Worked through practical assignments with students, reviewed their projects and ' +
          'gave feedback.',
        'Explained complex technical topics in plain language, adapting material to each ' +
          "group's level.",
      ],
      stack: ['JavaScript', 'React', 'HTML', 'CSS'],
    },
    {
      id: 'tensor',
      role: 'Junior Frontend Developer',
      company: 'Tensor',
      industry: 'Software Development',
      period: { start: '2024-06', end: '2025-03' },
      highlights: [
        "Feature development and maintenance of the frontend of the company's products.",
        'Bug fixing, interface testing and user support.',
      ],
      stack: ['JavaScript', 'HTML', 'CSS', 'Git'],
    },
  ],

  skillGroups: [
    {
      id: 'frontend',
      title: 'Frontend',
      items: [
        'JavaScript',
        'React',
        'Redux',
        'HTML5',
        'CSS3',
        'Semantic markup',
        'Responsive layout',
        'Cross-browser compatibility',
      ],
    },
    {
      id: 'graphics',
      title: 'Graphics & browser games',
      items: ['PixiJS', 'Three.js', 'Canvas', 'Animation', 'Interactive scenes'],
    },
    {
      id: 'infrastructure',
      title: 'Tools & infrastructure',
      items: ['Git', 'Linux', 'Hosting & deployment', 'Website administration', 'Databases'],
    },
    {
      id: 'additional',
      title: 'Additional',
      items: [
        'C++',
        'Pascal',
        '1C: Accounting',
        '1C programming',
        'Teaching & mentoring',
        'Team coordination',
        'Document management',
      ],
    },
  ],

  credentials: [
    {
      id: 'yarsu',
      title: 'Applied Programming — college diploma',
      issuer: 'P.G. Demidov Yaroslavl State University, Yaroslavl, Russia',
      year: 2023,
      kind: 'degree',
      note: 'Vocational secondary education',
    },
    {
      id: 'skillbox',
      title: 'Web Developer, frontend track',
      issuer: 'Skillbox',
      year: 2025,
      kind: 'course',
      note: null,
    },
    {
      id: 'skyeng',
      title: 'English for Programming',
      issuer: 'Skyeng',
      year: 2025,
      kind: 'course',
      note: null,
    },
    {
      id: 'it-school',
      title: 'C++ Developer',
      issuer: 'IT School',
      year: 2023,
      kind: 'course',
      note: null,
    },
  ],

  languages: [
    { name: 'Russian', level: 'Native', note: null },
    { name: 'English', level: 'B1 — Intermediate', note: 'Skyeng, "English for Programming"' },
  ],

  contacts: [
    {
      id: 'email',
      label: 'Email',
      value: 'artiishock@gmail.com',
      href: 'mailto:artiishock@gmail.com',
      preferred: true,
    },
    {
      id: 'phone-es',
      label: 'Phone — Spain',
      value: '+34 634 154 013',
      href: 'tel:+34634154013',
      preferred: false,
    },
    {
      id: 'phone-ru',
      label: 'Phone — Russia',
      value: '+7 999 233-23-00',
      href: 'tel:+79992332300',
      preferred: false,
    },
    {
      id: 'location',
      label: 'Location',
      value: 'Valencia, Spain',
      href: null,
      preferred: false,
    },
  ],
};
