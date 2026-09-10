'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

import type { OrbitDescriptor } from '@/shared/config/site';
import type { CosmosScene, ProjectedBody } from '@/three';

/** Ниже этого сдвига в пикселях DOM не трогаем — экономия на записи стилей. */
const POSITION_EPSILON = 0.4;

interface LastWrite {
  x: number;
  y: number;
  radius: number;
  depth: number;
}

export interface UseCosmosResult {
  /** ref-колбэк для элемента-кнопки; идентичность стабильна между рендерами. */
  registerItem: (id: string) => (element: HTMLElement | null) => void;
  setHighlighted: (id: string, active: boolean) => void;
  /** true, когда 3D-ядро загружено и сцена построена — для плавного появления. */
  ready: boolean;
}

/**
 * Мост React ↔ ООП-ядро (§5.4).
 *
 * Единственная точка связи: создаёт сцену один раз, отдаёт императивный API и
 * гарантированно вызывает `dispose()` в cleanup, включая двойной монтаж в
 * StrictMode.
 *
 * Ядро three.js подгружается динамическим `import()` уже после гидратации,
 * поэтому в основной бандл оно не попадает и не мешает LCP (§5.1).
 */
export function useCosmos(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  orbits: readonly OrbitDescriptor[],
): UseCosmosResult {
  const sceneRef = useRef<CosmosScene | null>(null);
  const nodesRef = useRef(new Map<string, HTMLElement>());
  const lastWriteRef = useRef(new Map<string, LastWrite>());
  const callbacksRef = useRef(new Map<string, (element: HTMLElement | null) => void>());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let cancelled = false;
    let scene: CosmosScene | null = null;

    const nodes = nodesRef.current;
    const lastWrites = lastWriteRef.current;

    const applyProjection = (bodies: readonly ProjectedBody[]): void => {
      for (const body of bodies) {
        const element = nodes.get(body.id);
        if (!element) {
          continue;
        }

        const last = lastWrites.get(body.id);
        const moved =
          last === undefined ||
          Math.abs(last.x - body.x) > POSITION_EPSILON ||
          Math.abs(last.y - body.y) > POSITION_EPSILON ||
          Math.abs(last.radius - body.radius) > POSITION_EPSILON ||
          Math.abs(last.depth - body.depth) > 0.002;

        if (!moved) {
          continue;
        }

        lastWrites.set(body.id, {
          x: body.x,
          y: body.y,
          radius: body.radius,
          depth: body.depth,
        });

        // Только transform и кастомные свойства: композитные изменения,
        // без пересчёта раскладки (§8).
        element.style.transform = `translate3d(${body.x}px, ${body.y}px, 0)`;
        element.style.setProperty('--body-radius', `${body.radius}px`);
        element.style.setProperty('--body-depth', body.depth.toFixed(3));
        element.style.visibility = body.visible ? 'visible' : 'hidden';
      }
    };

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotion = (): void => {
      scene?.setMotionEnabled(!motionQuery.matches);
    };

    void (async () => {
      const { CosmosScene: Scene } = await import('@/three');
      // Компонент могли размонтировать, пока грузился чанк.
      if (cancelled) {
        return;
      }

      scene = new Scene({ canvas, orbits, onProject: applyProjection });
      sceneRef.current = scene;
      syncMotion();
      motionQuery.addEventListener('change', syncMotion);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      motionQuery.removeEventListener('change', syncMotion);
      scene?.dispose();
      sceneRef.current = null;
      lastWrites.clear();
      setReady(false);
    };
  }, [canvasRef, orbits]);

  const registerItem = useCallback((id: string) => {
    const existing = callbacksRef.current.get(id);
    if (existing) {
      return existing;
    }

    const callback = (element: HTMLElement | null): void => {
      if (element) {
        nodesRef.current.set(id, element);
      } else {
        nodesRef.current.delete(id);
        lastWriteRef.current.delete(id);
      }
    };
    callbacksRef.current.set(id, callback);
    return callback;
  }, []);

  const setHighlighted = useCallback((id: string, active: boolean) => {
    sceneRef.current?.setHighlighted(id, active);
  }, []);

  return { registerItem, setHighlighted, ready };
}
