import { RESUME } from '@/domain/resume';

export interface IntroPhrase {
  readonly id: string;
  readonly text: string;
  /** Сколько миллисекунд фраза остаётся на экране вместе с проявлением. */
  readonly duration: number;
}

/** Короткая реплика: успевает проявиться и прочитаться. */
const SHORT = 1500;
/** Длинная фраза требует больше времени — иначе её физически не дочитать. */
const LONG = 3200;

/**
 * Реплики вступления. Имя и роль берутся из резюме, а не дублируются строкой:
 * менять их в двух местах — верный способ однажды разойтись.
 */
export const INTRO_PHRASES: readonly IntroPhrase[] = [
  { id: 'hello', text: 'Hello!', duration: SHORT },
  { id: 'name', text: `I’m ${RESUME.person.name}`, duration: SHORT },
  { id: 'role', text: `I’m a ${RESUME.person.headline}`, duration: SHORT },
  {
    id: 'welcome',
    text: 'Welcome to my resume website, presented as an interactive 3D scene.',
    duration: LONG,
  },
];
