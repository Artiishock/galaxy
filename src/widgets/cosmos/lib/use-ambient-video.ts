'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Запуск фонового видео.
 *
 * Атрибута `autoplay` в разметке намеренно нет: воспроизведение начинается
 * только после проверки `prefers-reduced-motion` (§5.5). Иначе пользователь,
 * попросивший систему не двигать интерфейс, успевал бы увидеть движение до
 * того, как мы его остановим.
 *
 * Пока видео не запущено, виден кадр из атрибута `poster`, поэтому фон не
 * пустой ни при отключённом JS, ни при заблокированном автозапуске.
 */
export function useAmbientVideo(videoRef: RefObject<HTMLVideoElement | null>): void {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const sync = (): void => {
      if (motionQuery.matches) {
        video.pause();
        return;
      }
      // Автозапуск могут запретить настройки браузера или экономия трафика —
      // это не ошибка приложения, остаётся постер.
      void video.play().catch(() => undefined);
    };

    sync();
    motionQuery.addEventListener('change', sync);

    return () => {
      motionQuery.removeEventListener('change', sync);
      video.pause();
    };
  }, [videoRef]);
}
