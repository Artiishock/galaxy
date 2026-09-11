'use client';

import { useCallback, useEffect, useState } from 'react';

import { INTRO_PHRASES, type IntroPhrase } from './intro-phrases';

/** Индекс до начала последовательности. */
const NOT_STARTED = -1;
/** Индекс за последней репликой — признак завершения. */
const DONE = INTRO_PHRASES.length;

export interface IntroSequence {
  /** null — вступление ещё не началось или уже закончилось. */
  phrase: IntroPhrase | null;
  finished: boolean;
  /** Досрочно завершить: клик, клавиша, прокрутка. */
  skip: () => void;
}

/**
 * Таймлайн вступительных реплик.
 *
 * Единственное состояние — номер реплики; «закончилось» вычисляется из него,
 * а не хранится вторым флагом, который может с ним разойтись.
 *
 * Старт происходит по таймеру, а не в теле эффекта: синхронный `setState`
 * в эффекте вызывает лишний каскад рендеров. Заодно это означает, что на
 * сервере вступления нет — в статическом HTML нет и перекрывающего слоя, и без
 * JavaScript посетитель сразу видит сайт, а не застревает под оверлеем.
 *
 * При `prefers-reduced-motion: reduce` вступление пропускается целиком (§5.5):
 * это анимация ради впечатления, а не содержание.
 */
export function useIntroSequence(): IntroSequence {
  const [index, setIndex] = useState(NOT_STARTED);
  const finished = index >= DONE;

  const skip = useCallback(() => {
    setIndex(DONE);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => {
      setIndex(reduced ? DONE : 0);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const phrase = index < 0 ? undefined : INTRO_PHRASES[index];
    if (!phrase) {
      return;
    }

    const timer = window.setTimeout(() => {
      setIndex((current) => current + 1);
    }, phrase.duration);

    return () => {
      window.clearTimeout(timer);
    };
  }, [index]);

  useEffect(() => {
    if (finished) {
      return;
    }

    // Любое намерение действовать прекращает вступление: заставлять человека
    // досматривать заставку — плохой тон.
    window.addEventListener('pointerdown', skip);
    window.addEventListener('keydown', skip);
    window.addEventListener('wheel', skip, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', skip);
      window.removeEventListener('keydown', skip);
      window.removeEventListener('wheel', skip);
    };
  }, [finished, skip]);

  return {
    phrase: index < 0 || index >= DONE ? null : (INTRO_PHRASES[index] ?? null),
    finished,
    skip,
  };
}
