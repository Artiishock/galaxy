'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

/** Ниже этого размера ползунок перестаёт быть удобной целью для мыши. */
const MIN_THUMB = 28;
/** Разница высот меньше пикселя — это округление, а не прокручиваемый контент. */
const OVERFLOW_EPSILON = 1;
/** Доля видимой высоты за один клик по дорожке. */
const PAGE_FRACTION = 0.9;

interface DragState {
  readonly startY: number;
  readonly startScrollTop: number;
}

export interface ScrollAreaApi {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  innerRef: React.RefObject<HTMLDivElement | null>;
  trackRef: React.RefObject<HTMLDivElement | null>;
  thumbRef: React.RefObject<HTMLDivElement | null>;
  /** false — контент помещается целиком, полосу показывать не за чем. */
  scrollable: boolean;
  dragging: boolean;
  onThumbPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onThumbPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onThumbPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onTrackPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
}

/**
 * Логика собственной полосы прокрутки.
 *
 * Прокруткой по-прежнему занимается сам браузер: контейнер остаётся обычным
 * `overflow: auto`, поэтому колесо, тачпад, клавиатура, тач-инерция и
 * `scrollIntoView` работают без единой строки нашего кода. Мы лишь прячем
 * нативную полосу и рисуем свою поверх.
 *
 * Положение ползунка пишется напрямую в стиль по ref: при прокрутке это
 * происходит десятки раз в секунду, и гонять через состояние React означало бы
 * перерисовывать поддерево на каждый кадр (§5.3). Через состояние идёт только
 * `scrollable` — оно меняется редко.
 */
export function useScrollArea(): ScrollAreaApi {
  const viewportRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const [scrollable, setScrollable] = useState(false);
  const [dragging, setDragging] = useState(false);

  const sync = useCallback(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!viewport || !track || !thumb) {
      return;
    }

    const overflow = viewport.scrollHeight - viewport.clientHeight;
    if (overflow <= OVERFLOW_EPSILON) {
      setScrollable(false);
      return;
    }
    setScrollable(true);

    const trackHeight = track.clientHeight;
    const thumbHeight = Math.max(
      MIN_THUMB,
      (viewport.clientHeight / viewport.scrollHeight) * trackHeight,
    );
    const maxOffset = trackHeight - thumbHeight;
    const offset = maxOffset <= 0 ? 0 : (viewport.scrollTop / overflow) * maxOffset;

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${offset}px)`;
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const inner = innerRef.current;
    if (!viewport || !inner) {
      return;
    }

    viewport.addEventListener('scroll', sync, { passive: true });
    // Наблюдаем и за окном прокрутки, и за содержимым: меняется любое из двух —
    // меняется и размер ползунка.
    const observer = new ResizeObserver(sync);
    observer.observe(viewport);
    observer.observe(inner);
    sync();

    return () => {
      viewport.removeEventListener('scroll', sync);
      observer.disconnect();
    };
  }, [sync]);

  const onThumbPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }
    // Иначе браузер начнёт выделять текст под курсором во время перетаскивания.
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { startY: event.clientY, startScrollTop: viewport.scrollTop };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onThumbPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!drag || !viewport || !track || !thumb) {
      return;
    }

    const overflow = viewport.scrollHeight - viewport.clientHeight;
    const maxOffset = track.clientHeight - thumb.offsetHeight;
    if (maxOffset <= 0) {
      return;
    }

    // Пиксель хода ползунка стоит (overflow / maxOffset) пикселей прокрутки.
    const delta = event.clientY - drag.startY;
    viewport.scrollTop = drag.startScrollTop + (delta / maxOffset) * overflow;
  }, []);

  const onThumbPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onTrackPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    // Нажатие на сам ползунок — это перетаскивание, его обрабатывает другой хендлер.
    if (event.target !== event.currentTarget) {
      return;
    }
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!viewport || !track || !thumb) {
      return;
    }

    const thumbRect = thumb.getBoundingClientRect();
    const direction = event.clientY < thumbRect.top ? -1 : 1;

    viewport.scrollBy({
      top: direction * viewport.clientHeight * PAGE_FRACTION,
      behavior: 'smooth',
    });
  }, []);

  return {
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
  };
}
