'use client';

import type { ReactNode } from 'react';

import { useScrollArea } from './use-scroll-area';
import styles from './scroll-area.module.css';

interface ScrollAreaProps {
  /** Имя области для скринридера: без него прокручиваемый регион безымянный. */
  readonly label: string;
  readonly children: ReactNode;
}

/**
 * Прокручиваемая область с собственной полосой вместо нативной.
 *
 * Нативная полоса скрыта, но сама прокрутка остаётся штатной: контейнер — это
 * обычный `overflow: auto`. Поэтому колесо мыши, тачпад, инерция на тач-экранах,
 * `scrollIntoView` и прокрутка к элементу в фокусе работают сами, без нашего кода.
 * Подменять эти механизмы вручную — верный способ сломать половину из них.
 *
 * `tabIndex` на области обязателен: прокручиваемый регион должен управляться
 * с клавиатуры (WCAG 2.1.1), а без него стрелки не работают, пока внутри нет
 * фокусируемого элемента.
 */
export function ScrollArea({ label, children }: ScrollAreaProps) {
  const {
    viewportRef,
    innerRef,
    trackRef,
    thumbRef,
    scrollable,
    dragging,
    onThumbPointerDown,
    onThumbPointerMove,
    onThumbPointerUp,
    onTrackPointerDown,
  } = useScrollArea();

  return (
    <div className={styles.root} data-dragging={dragging}>
      <div
        ref={viewportRef}
        className={styles.viewport}
        // Регион получает имя и фокус только когда его действительно можно
        // прокрутить — иначе в обход табуляции добавляется пустая остановка.
        {...(scrollable ? { tabIndex: 0, role: 'region', 'aria-label': label } : {})}
      >
        <div ref={innerRef}>{children}</div>
      </div>

      <div
        ref={trackRef}
        className={styles.track}
        data-scrollable={scrollable}
        onPointerDown={onTrackPointerDown}
        // Полоса — визуальный дубликат уже доступной прокрутки, для
        // вспомогательных технологий она лишний шум.
        aria-hidden="true"
      >
        <div
          ref={thumbRef}
          className={styles.thumb}
          onPointerDown={onThumbPointerDown}
          onPointerMove={onThumbPointerMove}
          onPointerUp={onThumbPointerUp}
          onPointerCancel={onThumbPointerUp}
        />
      </div>
    </div>
  );
}
