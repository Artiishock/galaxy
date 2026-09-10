/**
 * Единственный источник правды о структуре сайта.
 *
 * Орбитальная навигация целиком описывается массивом `ORBITS`: добавление зоны =
 * добавление объекта в массив. Оттуда она попадает в 3D-сцену, в DOM-навигацию,
 * в `sitemap.xml` и в микроразметку. Ни движок, ни разметка про конкретные зоны
 * не знают.
 */

export const SITE = {
  name: 'Artem Golubev',
  tagline: 'Frontend Developer',
  description:
    'Artem Golubev — frontend developer in Valencia, Spain. 3+ years of commercial ' +
    'experience with JavaScript, React and Redux, plus browser graphics with ' +
    'PixiJS, Three.js and Canvas.',
  /** Меняется на боевой домен перед деплоем; используется в canonical, OG и sitemap. */
  url: 'https://takomi.life',
  locale: 'en_US',
  lang: 'en',
} as const;

/** Описание одной зоны — орбитального объекта-кнопки. */
export interface OrbitDescriptor {
  /** Стабильный идентификатор: ключ React, связь DOM ↔ 3D-тело. */
  readonly id: string;
  /** Видимая подпись и текст ссылки (важна для SEO — осмысленный анкор). */
  readonly label: string;
  /** Пояснение под подписью на сцене. */
  readonly summary: string;
  readonly href: string;
  /** Большая полуось орбиты в мировых единицах. */
  readonly radius: number;
  /** Эксцентриситет [0, 0.9): 0 — окружность. */
  readonly eccentricity: number;
  /** Наклон плоскости орбиты, градусы. */
  readonly inclinationDeg: number;
  /** Поворот плоскости орбиты вокруг вертикали, градусы. */
  readonly nodeDeg: number;
  /** Начальная фаза, градусы — разводит объекты, чтобы не слипались. */
  readonly phaseDeg: number;
  /** Угловая скорость, радиан/сек. Отрицательная — обратное вращение. */
  readonly angularSpeed: number;
  /** Радиус сферы в мировых единицах. */
  readonly size: number;
  /** Цвет тела и его траектории (hex). */
  readonly color: number;
}

/**
 * Пять зон резюме.
 *
 * Порядок орбит — от ближней к дальней — повторяет порядок чтения резюме:
 * кто это → что делал → что умеет → чему учился → как связаться.
 */
export const ORBITS: readonly OrbitDescriptor[] = [
  {
    id: 'about',
    label: 'About',
    summary: 'Profile and work status',
    href: '/about',
    radius: 3.4,
    eccentricity: 0.12,
    inclinationDeg: 18,
    nodeDeg: 10,
    phaseDeg: 0,
    angularSpeed: 0.22,
    size: 0.3,
    color: 0x2ee6c5,
  },
  {
    id: 'experience',
    label: 'Experience',
    summary: 'Five roles since 2022',
    href: '/experience',
    radius: 4.6,
    eccentricity: 0.2,
    inclinationDeg: -26,
    nodeDeg: 55,
    phaseDeg: 72,
    angularSpeed: -0.17,
    size: 0.34,
    color: 0xf0b429,
  },
  {
    id: 'skills',
    label: 'Skills',
    summary: 'Stack and tooling',
    href: '/skills',
    radius: 5.9,
    eccentricity: 0.08,
    inclinationDeg: 34,
    nodeDeg: 120,
    phaseDeg: 144,
    angularSpeed: 0.13,
    size: 0.28,
    color: 0x4ce0c8,
  },
  {
    id: 'education',
    label: 'Education',
    summary: 'Diploma and courses',
    href: '/education',
    radius: 7.2,
    eccentricity: 0.26,
    inclinationDeg: -12,
    nodeDeg: 200,
    phaseDeg: 216,
    angularSpeed: -0.1,
    size: 0.26,
    color: 0xffd27a,
  },
  {
    id: 'contact',
    label: 'Contact',
    summary: 'Email, phone, location',
    href: '/contact',
    radius: 8.6,
    eccentricity: 0.15,
    inclinationDeg: 44,
    nodeDeg: 285,
    phaseDeg: 288,
    angularSpeed: 0.08,
    size: 0.24,
    color: 0x6fc9f0,
  },
];
