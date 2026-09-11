import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  LineLoop,
  MathUtils,
} from 'three';

import type { ResourceRegistry } from './resource-registry';
import type { Disposable } from './types';

/** Точек на эллипс. 256 — визуально гладко и дёшево для линии. */
const SEGMENTS = 256;
/** Заметность траектории в покое: видно, но не спорит с самим объектом. */
const BASE_OPACITY = 0.42;
/** Прозрачность при наведении на соответствующую ссылку. */
const HIGHLIGHT_OPACITY = 0.5;

export interface OrbitPathOptions {
  /** Большая полуось. */
  readonly semiMajor: number;
  readonly eccentricity: number;
  readonly color: number;
}

/**
 * Видимая траектория орбиты (§5.2).
 *
 * Орбита детерминирована, поэтому рисуется целиком, одной линией и одним цветом.
 * Никакого подвижного «хвоста»: сегмент другого цвета, ползущий за объектом,
 * читается как дефект — будто траектория состоит из разных кусков.
 *
 * Единственное допустимое изменение вида — реакция на наведение или фокус:
 * линия становится ярче. Это отвечает на действие пользователя, а не живёт
 * само по себе.
 */
export class OrbitPath implements Disposable {
  readonly object3d: LineLoop;

  readonly #material: LineBasicMaterial;

  #highlight = -1;

  constructor(options: OrbitPathOptions, registry: ResourceRegistry) {
    const { semiMajor, eccentricity, color } = options;
    const semiMinor = semiMajor * Math.sqrt(1 - eccentricity * eccentricity);
    // Центральное тело стоит в фокусе эллипса, а не в его центре — иначе орбита
    // с эксцентриситетом выглядит «съехавшей».
    const focusOffset = semiMajor * eccentricity;

    const positions = new Float32Array(SEGMENTS * 3);
    for (let i = 0; i < SEGMENTS; i += 1) {
      const theta = (i / SEGMENTS) * Math.PI * 2;
      positions[i * 3] = Math.cos(theta) * semiMajor - focusOffset;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = Math.sin(theta) * semiMinor;
    }

    const geometry = registry.track(new BufferGeometry());
    geometry.setAttribute('position', new BufferAttribute(positions, 3));

    this.#material = registry.track(
      new LineBasicMaterial({
        color,
        transparent: true,
        opacity: BASE_OPACITY,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );

    this.object3d = new LineLoop(geometry, this.#material);
  }

  /**
   * @param amount степень подсветки [0, 1]; приходит уже сглаженной от тела,
   * чтобы линия и сфера реагировали синхронно.
   */
  setHighlight(amount: number): void {
    if (amount === this.#highlight) {
      return;
    }
    this.#highlight = amount;
    this.#material.opacity = MathUtils.lerp(BASE_OPACITY, HIGHLIGHT_OPACITY, amount);
  }

  dispose(): void {
    // Геометрия и материал принадлежат ResourceRegistry; здесь только связи сцены.
    this.object3d.clear();
  }
}
