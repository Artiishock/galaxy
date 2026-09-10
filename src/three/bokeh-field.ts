import {
  AdditiveBlending,
  Group,
  Sprite,
  SpriteMaterial,
  Vector3,
  type ColorRepresentation,
  type PerspectiveCamera,
  type Texture,
} from 'three';

import { createRandom, randomInRange, randomItem } from './random';
import type { ResourceRegistry } from './resource-registry';
import type { FrameContext, SceneNode } from './types';

const WORLD_UP = new Vector3(0, 1, 0);

export interface BokehFieldOptions {
  readonly count: number;
  readonly colors: readonly ColorRepresentation[];
  /** Диапазон радиуса спрайта в мировых единицах. */
  readonly sizeRange: readonly [number, number];
  /** Расстояние от камеры вдоль взгляда: малое — передний план, большое — фон. */
  readonly distanceRange: readonly [number, number];
  /**
   * Полоса вдоль границы кадра в долях полурамки: 1 — точно на краю,
   * меньше 1 — внутрь, больше 1 — за край, частично вне экрана.
   */
  readonly edgeBand: readonly [number, number];
  readonly opacityRange: readonly [number, number];
  /** Амплитуда собственного дрейфа в мировых единицах. */
  readonly drift: number;
  readonly seed: number;
  readonly texture: Texture;
}

/** Одно пятно. Позиция на краю кадра хранится в углах, а не в координатах. */
interface Mote {
  readonly sprite: Sprite;
  /** Угол вдоль периметра кадра. */
  readonly angle: number;
  /** Смещение поперёк границы кадра, доля полурамки. */
  readonly band: number;
  readonly distance: number;
  readonly amplitudeX: number;
  readonly amplitudeY: number;
  readonly speed: number;
  readonly phase: number;
  /** Мировая позиция, пересчитываемая при изменении кадра. */
  readonly base: Vector3;
}

/**
 * Слой декоративных расфокусированных объектов по краям кадра (§5.2).
 *
 * Глубина сцены создаётся не постобработкой, а размещением: крупные мягкие
 * спрайты у камеры читаются как пятна вне фокуса, мелкие и тусклые вдали — как
 * далёкие огни. Параллакс возникает сам: слои стоят на разной глубине, поэтому
 * ближние пятна уезжают за камерой заметно сильнее дальних.
 *
 * Положение задаётся не мировыми координатами, а углом и полосой вдоль границы
 * **видимого кадра**: «край сцены» зависит от соотношения сторон, поэтому при
 * ресайзе раскладка пересчитывается (`layout`). Центр кадра остаётся свободным —
 * там живут орбиты и заголовок.
 *
 * Один класс описывает любой слой; передний он или фоновый — решает конфигурация
 * в composition root, а не сам класс.
 */
export class BokehField implements SceneNode {
  readonly object3d: Group;

  readonly #motes: Mote[] = [];

  // Переиспользуемые буферы: пересчёт раскладки не аллоцирует (§5.3).
  readonly #forward = new Vector3();
  readonly #right = new Vector3();
  readonly #up = new Vector3();

  constructor(options: BokehFieldOptions, registry: ResourceRegistry) {
    const {
      count,
      colors,
      sizeRange,
      distanceRange,
      edgeBand,
      opacityRange,
      drift,
      seed,
      texture,
    } = options;

    const random = createRandom(seed);
    this.object3d = new Group();

    for (let i = 0; i < count; i += 1) {
      const material = registry.track(
        new SpriteMaterial({
          map: texture,
          color: randomItem(random, colors),
          transparent: true,
          opacity: randomInRange(random, opacityRange[0], opacityRange[1]),
          blending: AdditiveBlending,
          // Декор не должен перекрывать сцену по глубине: он только светится.
          depthWrite: false,
        }),
      );

      const sprite = new Sprite(material);
      sprite.scale.setScalar(randomInRange(random, sizeRange[0], sizeRange[1]));

      // Углы распределяются по секторам, а не совсем свободно: иначе половина
      // пятен сбивается в один угол и «рамка» получается однобокой.
      const sector = (i / count) * Math.PI * 2;
      const angle = sector + randomInRange(random, -0.35, 0.35);

      this.#motes.push({
        sprite,
        angle,
        band: randomInRange(random, edgeBand[0], edgeBand[1]),
        distance: randomInRange(random, distanceRange[0], distanceRange[1]),
        amplitudeX: drift * randomInRange(random, 0.4, 1),
        amplitudeY: drift * randomInRange(random, 0.3, 0.9),
        speed: randomInRange(random, 0.05, 0.14),
        phase: random() * Math.PI * 2,
        base: new Vector3(),
      });

      this.object3d.add(sprite);
    }
  }

  /**
   * Расставляет пятна по границе видимого кадра.
   *
   * Вызывается при создании сцены и на каждый ресайз. Базис строится от опорной
   * позиции камеры, а не от текущей: иначе раскладка «съезжала» бы на величину
   * параллакса в момент ресайза.
   */
  layout(camera: PerspectiveCamera, origin: Vector3, target: Vector3): void {
    this.#forward.subVectors(target, origin).normalize();
    this.#right.crossVectors(this.#forward, WORLD_UP).normalize();
    this.#up.crossVectors(this.#right, this.#forward).normalize();

    const halfFov = (camera.fov * Math.PI) / 360;

    for (const mote of this.#motes) {
      const halfHeight = Math.tan(halfFov) * mote.distance;
      const halfWidth = halfHeight * camera.aspect;

      const cos = Math.cos(mote.angle);
      const sin = Math.sin(mote.angle);
      // Растяжение окружности до периметра прямоугольника: без него пятна
      // липнут к серединам сторон, а углы кадра остаются пустыми.
      const toBorder = 1 / Math.max(Math.abs(cos), Math.abs(sin));

      const offsetX = cos * toBorder * mote.band * halfWidth;
      const offsetY = sin * toBorder * mote.band * halfHeight;

      mote.base
        .copy(origin)
        .addScaledVector(this.#forward, mote.distance)
        .addScaledVector(this.#right, offsetX)
        .addScaledVector(this.#up, offsetY);

      mote.sprite.position.copy(mote.base);
    }
  }

  update(ctx: FrameContext): void {
    if (!ctx.motionEnabled) {
      return;
    }

    for (const mote of this.#motes) {
      const t = ctx.elapsed * mote.speed + mote.phase;
      // Разные периоды по осям дают эллиптический ход вместо кругового —
      // движение не читается как повторяющийся узор.
      mote.sprite.position.x = mote.base.x + Math.sin(t) * mote.amplitudeX;
      mote.sprite.position.y = mote.base.y + Math.cos(t * 0.7) * mote.amplitudeY;
    }
  }

  dispose(): void {
    this.#motes.length = 0;
    this.object3d.clear();
  }
}
