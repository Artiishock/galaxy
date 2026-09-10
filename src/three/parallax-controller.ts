import { MathUtils, Vector3, type PerspectiveCamera } from 'three';

import type { Disposable, FrameContext } from './types';

/** Скорость возврата камеры к цели. Подобрано так, чтобы движение было мягким, но не вязким. */
const DAMP_LAMBDA = 3.2;

export interface ParallaxOptions {
  /** Максимальное смещение камеры по горизонтали в мировых единицах. */
  readonly strengthX: number;
  readonly strengthY: number;
}

/**
 * Параллакс: камера смещается вслед за указателем и всегда смотрит в центр.
 *
 * Класс не подписывается на события DOM — координаты ему передают снаружи
 * (§3, SRP: ввод и реакция на ввод разделены). Благодаря этому его можно
 * тестировать без браузера.
 */
export class ParallaxController implements Disposable {
  readonly #camera: PerspectiveCamera;
  readonly #basePosition: Vector3;
  readonly #lookAt = new Vector3(0, 0, 0);
  readonly #strengthX: number;
  readonly #strengthY: number;

  #targetX = 0;
  #targetY = 0;
  #currentX = 0;
  #currentY = 0;

  constructor(camera: PerspectiveCamera, options: ParallaxOptions) {
    this.#camera = camera;
    this.#basePosition = camera.position.clone();
    this.#strengthX = options.strengthX;
    this.#strengthY = options.strengthY;
  }

  /**
   * @param nx нормализованная позиция указателя по X, [-1, 1]
   * @param ny нормализованная позиция указателя по Y, [-1, 1]
   */
  setPointer(nx: number, ny: number): void {
    this.#targetX = MathUtils.clamp(nx, -1, 1);
    this.#targetY = MathUtils.clamp(ny, -1, 1);
  }

  /** Возврат камеры в исходную точку — например, когда указатель ушёл с холста. */
  reset(): void {
    this.#targetX = 0;
    this.#targetY = 0;
  }

  update(ctx: FrameContext): void {
    if (!ctx.motionEnabled) {
      return;
    }

    this.#currentX = MathUtils.damp(this.#currentX, this.#targetX, DAMP_LAMBDA, ctx.delta);
    this.#currentY = MathUtils.damp(this.#currentY, this.#targetY, DAMP_LAMBDA, ctx.delta);

    this.#camera.position.set(
      this.#basePosition.x + this.#currentX * this.#strengthX,
      this.#basePosition.y + this.#currentY * this.#strengthY,
      this.#basePosition.z,
    );
    this.#camera.lookAt(this.#lookAt);
  }

  dispose(): void {
    this.#camera.position.copy(this.#basePosition);
    this.#camera.lookAt(this.#lookAt);
  }
}
