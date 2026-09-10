import {
  AdditiveBlending,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Group,
  Sprite,
  SpriteMaterial,
  type BufferGeometry,
  type Texture,
} from 'three';

import type { ResourceRegistry } from './resource-registry';
import type { Disposable, FrameContext } from './types';

/** Во сколько раз ореол крупнее самой сферы. */
const GLOW_SCALE = 5.5;
/** Скорость затухания подсветки: чем больше, тем резче реакция на наведение. */
const HIGHLIGHT_LAMBDA = 9;

export interface OrbitBodyOptions {
  readonly size: number;
  readonly color: number;
  /** Единичная сфера, общая для всех тел: экономия памяти и draw-call'ов (§5.3). */
  readonly sphereGeometry: BufferGeometry;
  readonly glowTexture: Texture;
}

/**
 * Сфера-объект на орбите: тело, ореол и реакция на наведение/фокус.
 *
 * Класс отвечает только за внешний вид. Кинематикой владеет OrbitalObject —
 * одна причина для изменения на класс (§3, SRP).
 */
export class OrbitBody implements Disposable {
  readonly object3d: Group;

  readonly #material: MeshStandardMaterial;
  readonly #glowMaterial: SpriteMaterial;
  readonly #mesh: Mesh;
  readonly #baseSize: number;

  #highlight = 0;
  #highlightTarget = 0;

  constructor(options: OrbitBodyOptions, registry: ResourceRegistry) {
    const { size, color, sphereGeometry, glowTexture } = options;
    this.#baseSize = size;

    this.#material = registry.track(
      new MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.55,
        roughness: 0.35,
        metalness: 0.1,
      }),
    );

    this.#mesh = new Mesh(sphereGeometry, this.#material);
    this.#mesh.scale.setScalar(size);

    this.#glowMaterial = registry.track(
      new SpriteMaterial({
        map: glowTexture,
        color,
        transparent: true,
        opacity: 0.55,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );

    const glow = new Sprite(this.#glowMaterial);
    glow.scale.setScalar(size * GLOW_SCALE);

    this.object3d = new Group();
    this.object3d.add(this.#mesh, glow);
  }

  /** Экранный радиус зависит от подсветки — DOM-слой обязан знать актуальный размер. */
  get currentRadius(): number {
    return this.#baseSize * (1 + this.#highlight * 0.35);
  }

  /** Сглаженная степень подсветки [0, 1]: траектория реагирует синхронно со сферой. */
  get highlight(): number {
    return this.#highlight;
  }

  setHighlighted(active: boolean): void {
    this.#highlightTarget = active ? 1 : 0;
  }

  update(ctx: FrameContext): void {
    if (this.#highlight === this.#highlightTarget) {
      return;
    }

    // Кадронезависимое затухание: результат не зависит от FPS (§5.3).
    this.#highlight = MathUtils.damp(
      this.#highlight,
      this.#highlightTarget,
      HIGHLIGHT_LAMBDA,
      ctx.delta,
    );
    if (Math.abs(this.#highlight - this.#highlightTarget) < 0.001) {
      this.#highlight = this.#highlightTarget;
    }

    const k = this.#highlight;
    this.#mesh.scale.setScalar(this.#baseSize * (1 + k * 0.35));
    this.#material.emissiveIntensity = 0.55 + k * 1.5;
    this.#glowMaterial.opacity = 0.55 + k * 0.75;
  }

  dispose(): void {
    this.object3d.clear();
  }
}
