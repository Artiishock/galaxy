'use client';

import Link from 'next/link';
import { useRef, type CSSProperties } from 'react';

import { ORBITS } from '@/shared/config/site';
import { useAmbientVideo } from '../lib/use-ambient-video';
import { useCosmos } from '../lib/use-cosmos';
import styles from './cosmos-stage.module.css';

/**
 * Орбитальная навигация — постоянный фон приложения.
 *
 * Живёт в корневом layout и поэтому **не размонтируется при переходах между
 * страницами**: сцена не перезапускается, планеты продолжают свой ход, а
 * состояние движка сохраняется. Смена маршрута меняет только контент поверх.
 *
 * Компонент клиентский, но серверный рендер проходит: разметка `<nav>` со всеми
 * ссылками попадает в HTML, поэтому краулер и скринридер видят полноценное меню,
 * а не пустой холст (§0.1). Холст декоративен; 3D лишь двигает уже существующие
 * DOM-элементы (§5.4).
 */
export function CosmosStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { registerItem, setHighlighted, ready } = useCosmos(canvasRef, ORBITS);
  useAmbientVideo(videoRef);

  return (
    <div className={styles.stage} data-ready={ready}>
      {/*
       * Фон декоративен: скрыт от вспомогательных технологий и убран из
       * табуляции (§7). `preload="none"` — файл не конкурирует за канал с
       * первой отрисовкой; до запуска виден кадр из `poster`.
       * Запуском занимается useAmbientVideo, а не атрибут `autoplay`.
       */}
      <video
        ref={videoRef}
        className={styles.backdrop}
        poster="/media/galaxy-poster.webp"
        preload="none"
        muted
        loop
        playsInline
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="/media/galaxy-loop.mp4" type="video/mp4" />
      </video>
      <div className={styles.tint} aria-hidden="true" />

      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

      <nav className={styles.nav} aria-label="Resume sections">
        <ul className={styles.list}>
          {ORBITS.map((orbit, index) => (
            <li
              key={orbit.id}
              ref={registerItem(orbit.id)}
              className={styles.item}
              style={{ '--index': index, '--count': ORBITS.length } as CSSProperties}
            >
              <Link
                href={orbit.href}
                className={styles.link}
                // Фокус подсвечивает сферу так же, как наведение: клавиатура
                // получает ту же обратную связь, что и мышь (§7).
                onPointerEnter={() => setHighlighted(orbit.id, true)}
                onPointerLeave={() => setHighlighted(orbit.id, false)}
                onFocus={() => setHighlighted(orbit.id, true)}
                onBlur={() => setHighlighted(orbit.id, false)}
              >
                <span className={styles.hit} aria-hidden="true" />
                {/*
                 * Подпись остаётся в разметке — это имя ссылки для скринридера и
                 * анкор для поисковика. Визуально она скрыта и проявляется только
                 * при наведении или фокусе, чтобы сцена оставалась чистой.
                 */}
                <span className={styles.label}>{orbit.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
