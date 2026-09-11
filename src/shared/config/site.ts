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

/**
 * Карты поверхности объекта. Отсутствующая карта — не пропуск, а осознанный
 * выбор: если исходная текстура оказалась однородной, число в материале даёт
 * тот же результат без лишнего файла и запроса.
 */
export interface OrbitTextures {
  readonly color?: string;
  readonly normal?: string;
  readonly roughness?: string;
  readonly metalness?: string;
  /** Один файл на шероховатость и металличность: каналы G и B (упаковка glTF). */
  readonly orm?: string;
}

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
  /** Угловая скорость движения по эллипсу, радиан/сек. Отрицательная — обратное вращение. */
  readonly angularSpeed: number;
  /** Радиус сферы в мировых единицах. */
  readonly size: number;
  /** Цвет траектории и свечения зоны (hex). */
  readonly color: number;
  readonly textures: OrbitTextures;
  /** Множитель шероховатости; при наличии карты держим 1, иначе задаём число. */
  readonly roughness: number;
  /** То же для металличности. */
  readonly metalness: number;
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
    // Кора: органика, «кто я». Дерево не металл — металличность нулевая.
    textures: {
      color: '/media/textures/about-color.webp',
      normal: '/media/textures/about-normal.webp',
      roughness: '/media/textures/about-roughness.webp',
    },
    roughness: 1,
    metalness: 0,
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
    // Тяжёлая коррозия — самый детальный набор из пяти, и он на самой крупной
    // сфере: все четыре карты содержат реальный рельеф (проверено выборкой).
    // Металличность здесь именно карта: ржавчина не металл, оголённый металл — да.
    textures: {
      color: '/media/textures/experience-color.webp',
      normal: '/media/textures/experience-normal.webp',
      roughness: '/media/textures/experience-roughness.webp',
      metalness: '/media/textures/experience-metalness.webp',
    },
    roughness: 1,
    metalness: 1,
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
    // Кварцит. Карта нормалей в наборе проверенно плоская — не подключаем.
    textures: {
      color: '/media/textures/skills-color.webp',
      orm: '/media/textures/skills-orm.webp',
    },
    roughness: 1,
    metalness: 1,
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
    size: 0.52,
    color: 0xffd27a,
    // Утрамбованная земля: основание. ORM в наборе нет, шероховатость отдельно.
    textures: {
      color: '/media/textures/education-color.webp',
      normal: '/media/textures/education-normal.webp',
      roughness: '/media/textures/education-roughness.webp',
    },
    roughness: 1,
    metalness: 0,
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
    // Шлифованная сталь. Её карты нормалей и ORM проверенно однородны, поэтому
    // заменены числами — на самой мелкой сфере бедность набора и не видна.
    textures: { color: '/media/textures/contact-color.webp' },
    roughness: 0.22,
    metalness: 0.98,
  },
];
