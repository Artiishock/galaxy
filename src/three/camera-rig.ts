import { MathUtils, Vector3, type PerspectiveCamera } from 'three';

import type { Disposable, FrameContext } from './types';

const WORLD_UP = new Vector3(0, 1, 0);
/** Скорость возврата параллакса: мягко, но не вязко. */
const PARALLAX_LAMBDA = 3.2;
/** Скорость подлёта к объекту и обратно. Выше — резче, ниже — «плывёт». */
const POSE_LAMBDA = 2.4;
/** Отлёт из вступления медленнее обычных переходов — это «открытие» сцены. */
const INTRO_LAMBDA = 1.15;
/** Ближе этого значения к цели считаем переход законченным. */
const SETTLED = 0.001;

/** Источник мировой позиции объекта, за которым следит камера. */
export interface FocusTarget {
  writeWorldPosition(target: Vector3): void;
}

export interface CameraRigOptions {
  /** Опорная позиция камеры в свободном режиме. */
  readonly origin: Vector3;
  /** Точка, на которую камера смотрит в свободном режиме. */
  readonly target: Vector3;
  readonly parallaxX: number;
  readonly parallaxY: number;
  /** Расстояние от камеры до объекта в режиме фокуса. */
  readonly focusDistance: number;
  /**
   * Насколько объект уходит влево от центра кадра, в долях полукадра.
   * 0.45 — объект примерно в левой четверти, правая половина свободна под текст.
   */
  readonly focusShift: number;
  /**
   * Расстояние до центра во вступлении. Настолько близко, что центральное тело
   * перекрывает кадр целиком и от сцены не видно ничего другого.
   */
  readonly introDistance: number;
}

/**
 * Единственный владелец камеры (§3).
 *
 * Раньше позицию писал ParallaxController, и стоило появиться второму режиму —
 * подлёту к объекту, — как два источника начали бы затирать друг друга.
 * Поэтому оба режима живут здесь: риг считает свободную позу и позу фокуса,
 * а затем смешивает их одним сглаженным коэффициентом. Камере присваивается
 * ровно один результат за кадр.
 *
 * Смешивание, а не переключение, даёт бесплатный перелёт: коэффициент плавно
 * идёт от 0 к 1, и камера сама проходит весь путь до объекта и обратно.
 */
export class CameraRig implements Disposable {
  readonly #camera: PerspectiveCamera;
  readonly #origin: Vector3;
  readonly #target: Vector3;
  readonly #parallaxX: number;
  readonly #parallaxY: number;
  readonly #focusDistance: number;
  readonly #focusShift: number;

  /** Направление от точки интереса к камере: подлетаем всегда с той же стороны. */
  readonly #viewDirection = new Vector3();

  // Переиспользуемые буферы: в кадре не аллоцируем (§5.3).
  readonly #objectPosition = new Vector3();
  readonly #focusPosition = new Vector3();
  readonly #focusTarget = new Vector3();
  readonly #freePosition = new Vector3();
  readonly #blendedPosition = new Vector3();
  readonly #blendedTarget = new Vector3();
  readonly #right = new Vector3();
  readonly #introPosition = new Vector3();

  #focus: FocusTarget | null = null;
  #focusAmount = 0;
  /** Начинается с 1: первый же кадр сцены рисуется уже вплотную к ядру. */
  #introAmount = 1;
  #introActive = true;
  #pointerTargetX = 0;
  #pointerTargetY = 0;
  #pointerX = 0;
  #pointerY = 0;

  constructor(camera: PerspectiveCamera, options: CameraRigOptions) {
    this.#camera = camera;
    this.#origin = options.origin.clone();
    this.#target = options.target.clone();
    this.#parallaxX = options.parallaxX;
    this.#parallaxY = options.parallaxY;
    this.#focusDistance = options.focusDistance;
    this.#focusShift = options.focusShift;

    this.#viewDirection.subVectors(this.#origin, this.#target).normalize();

    // Поза вступления неподвижна, поэтому считается один раз.
    this.#introPosition
      .copy(this.#target)
      .addScaledVector(this.#viewDirection, options.introDistance);

    // Пока фокуса не было, поза фокуса совпадает со свободной — переход
    // «из ниоткуда» не даст рывка на первом же кадре.
    this.#focusPosition.copy(this.#origin);
    this.#focusTarget.copy(this.#target);
  }

  /** @param nx,ny положение указателя в [-1, 1] относительно вьюпорта. */
  setPointer(nx: number, ny: number): void {
    this.#pointerTargetX = MathUtils.clamp(nx, -1, 1);
    this.#pointerTargetY = MathUtils.clamp(ny, -1, 1);
  }

  resetPointer(): void {
    this.#pointerTargetX = 0;
    this.#pointerTargetY = 0;
  }

  /** `null` — вернуться к общему плану. */
  focusOn(target: FocusTarget | null): void {
    this.#focus = target;
  }

  /** false — вступление закончено, камера отлетает к общему плану. */
  setIntroActive(active: boolean): void {
    this.#introActive = active;
  }

  update(ctx: FrameContext): void {
    const wantFocus = this.#focus === null ? 0 : 1;
    const wantIntro = this.#introActive ? 1 : 0;

    if (ctx.motionEnabled) {
      this.#introAmount = MathUtils.damp(this.#introAmount, wantIntro, INTRO_LAMBDA, ctx.delta);
      this.#focusAmount = MathUtils.damp(this.#focusAmount, wantFocus, POSE_LAMBDA, ctx.delta);
      this.#pointerX = MathUtils.damp(
        this.#pointerX,
        this.#pointerTargetX,
        PARALLAX_LAMBDA,
        ctx.delta,
      );
      this.#pointerY = MathUtils.damp(
        this.#pointerY,
        this.#pointerTargetY,
        PARALLAX_LAMBDA,
        ctx.delta,
      );
    } else {
      // Без анимации переходы мгновенные, но кадр всё равно должен быть верным.
      this.#introAmount = wantIntro;
      this.#focusAmount = wantFocus;
      this.#pointerX = 0;
      this.#pointerY = 0;
    }

    if (Math.abs(this.#focusAmount - wantFocus) < SETTLED) {
      this.#focusAmount = wantFocus;
    }
    if (Math.abs(this.#introAmount - wantIntro) < SETTLED) {
      this.#introAmount = wantIntro;
    }

    this.#updateFreePose();
    // При снятии фокуса цель обнуляется, но последняя поза фокуса сохраняется:
    // именно из неё камера отлетает обратно.
    if (this.#focus !== null) {
      this.#updateFocusPose(this.#focus);
    }

    this.#blendedPosition.lerpVectors(this.#freePosition, this.#focusPosition, this.#focusAmount);
    this.#blendedTarget.lerpVectors(this.#target, this.#focusTarget, this.#focusAmount);

    // Вступление накладывается последним и перекрывает остальное: пока оно идёт,
    // никакая другая поза не должна отрывать камеру от ядра.
    if (this.#introAmount > 0) {
      this.#blendedPosition.lerp(this.#introPosition, this.#introAmount);
      this.#blendedTarget.lerp(this.#target, this.#introAmount);
    }

    this.#camera.position.copy(this.#blendedPosition);
    this.#camera.lookAt(this.#blendedTarget);
  }

  dispose(): void {
    this.#focus = null;
    this.#camera.position.copy(this.#origin);
    this.#camera.lookAt(this.#target);
  }

  #updateFreePose(): void {
    this.#freePosition.set(
      this.#origin.x + this.#pointerX * this.#parallaxX,
      this.#origin.y + this.#pointerY * this.#parallaxY,
      this.#origin.z,
    );
  }

  #updateFocusPose(focus: FocusTarget): void {
    focus.writeWorldPosition(this.#objectPosition);

    this.#focusPosition
      .copy(this.#objectPosition)
      .addScaledVector(this.#viewDirection, this.#focusDistance);

    // Камера смотрит правее объекта — значит, объект оказывается левее центра.
    // Величина сдвига считается из фактического кадра, поэтому доля экрана
    // сохраняется на любом соотношении сторон.
    // Порядок аргументов важен: viewDirection смотрит от цели К камере, поэтому
    // «вправо» даёт cross(up, viewDirection), а обратный порядок дал бы «влево»
    // и объект уехал бы под панель.
    this.#right.crossVectors(WORLD_UP, this.#viewDirection).normalize();

    const halfHeight = Math.tan((this.#camera.fov * Math.PI) / 360) * this.#focusDistance;
    const halfWidth = halfHeight * this.#camera.aspect;
    // На узком экране панель занимает всю ширину, и сдвигать объект некуда:
    // он поднимается вверх кадра, а текст ложится под ним.
    const portrait = this.#camera.aspect < 1;
    const shiftX = portrait ? 0 : this.#focusShift * halfWidth;
    const shiftY = portrait ? -this.#focusShift * halfHeight : 0;

    this.#focusTarget
      .copy(this.#objectPosition)
      .addScaledVector(this.#right, shiftX)
      .addScaledVector(WORLD_UP, shiftY);
  }
}
