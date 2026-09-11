'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, type CSSProperties } from 'react';

import { ORBITS } from '@/shared/config/site';
import { useAmbientVideo } from '../lib/use-ambient-video';
import { useCosmos } from '../lib/use-cosmos';
import { useIntroSequence } from '../lib/use-intro-sequence';
import { IntroOverlay } from './intro-overlay';
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

  // Источник правды о фокусе — адрес страницы, а не клик. Тогда камера ведёт
  // себя одинаково при клике, при кнопке «назад» и при открытии зоны по прямой
  // ссылке; состояние сцены не может разойтись с тем, что видно на экране.
  const pathname = usePathname();
  const focused = ORBITS.find((orbit) => orbit.href === pathname);

  // Вступление показывается только на главной: попасть на страницу зоны по
  // прямой ссылке и упереться в заставку — не то, чего ждёт посетитель.
  const { phrase, finished } = useIntroSequence();
  const onHome = focused === undefined;

  const introActive = onHome && !finished;
  /*
   * Видимость слоя завязана на наличие реплики, а не на `finished`.
   * Разница принципиальная: на сервере реплики ещё нет, поэтому в статическом
   * HTML оверлей прозрачен, а навигация видна. Иначе посетитель без JavaScript
   * остался бы под тёмным слоем и без меню — убирать их было бы некому.
   */
  const introVisible = onHome && phrase !== null;

  const { registerItem, setHighlighted, ready } = useCosmos(
    canvasRef,
    videoRef,
    ORBITS,
    focused?.id ?? null,
    introActive,
  );
  useAmbientVideo(videoRef);

  return (
    <div className={styles.stage} data-ready={ready}>
      {/*
       * Видео — источник кадров для фона сцены, а не самостоятельный слой:
       * картинку рисует WebGL (`scene.background`), иначе капля в центре
       * преломляла бы пустоту. Сам элемент скрыт за холстом и от
       * вспомогательных технологий (§7); запуском занимается useAmbientVideo.
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

      <IntroOverlay phrase={phrase} visible={introVisible} />

      {/* Пока идёт вступление, объекты не видны и кликать по ним не по чему —
          прячем и от указателя, и от табуляции. */}
      <nav className={styles.nav} aria-label="Resume sections" data-dimmed={introVisible}>
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
                {/* Имя ссылки: видно постоянно, читается скринридером, служит
                    анкором для поисковика. */}
                <span className={styles.label}>{orbit.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
