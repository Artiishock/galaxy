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

import { OrbitLabel } from './orbit-label';
import type { OrbitTextures } from '@/shared/config/site';
import type { ResourceRegistry } from './resource-registry';
import type { TextureLibrary } from './texture-library';
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
  readonly textures: OrbitTextures;
  readonly roughness: number;
  readonly metalness: number;
  readonly library: TextureLibrary;
  /** Подпись, лежащая на поверхности тела. */
  readonly label: string;
}

/**
 * Сфера-объект на орбите: тело, ореол и реакция на наведение/фокус.
 *
 * На наведение тело отвечает только размером. Свечение постоянно — оно задаёт
 * вид объекта, а не подсвечивает его.
 *
 * Класс отвечает только за внешний вид. Кинематикой владеет OrbitalObject —
 * одна причина для изменения на класс (§3, SRP).
 */
export class OrbitBody implements Disposable {
  readonly object3d: Group;

  readonly #mesh: Mesh;
  readonly #label: OrbitLabel;
  readonly #baseSize: number;

  #highlight = 0;
  #highlightTarget = 0;

  constructor(options: OrbitBodyOptions, registry: ResourceRegistry) {
    const {
      size,
      color,
      sphereGeometry,
      glowTexture,
      textures,
      roughness,
      metalness,
      library,
      label,
    } = options;
    this.#baseSize = size;

    const textured = textures.color !== undefined;

    const material = registry.track(
      new MeshStandardMaterial({
        // С текстурой цвет материала работает множителем: любой оттенок, кроме
        // белого, перекрасил бы снимок поверхности. Цвет зоны остаётся на
        // траектории и ореоле — там он и нужен для узнавания.
        color: textured ? 0xffffff : color,
        emissive: color,
        // Свечение постоянно и не реагирует на наведение. Текстурированному телу
        // оно не нужно вовсе: любое значение подмешало бы цвет зоны и увело
        // поверхность от её настоящего цвета.
        emissiveIntensity: textured ? 0 : 0.55,
        roughness,
        metalness,
      }),
    );

    if (textures.color !== undefined) {
      material.map = library.color(textures.color);
    }
    if (textures.normal !== undefined) {
      material.normalMap = library.data(textures.normal);
      // Сфера занимает на экране десятки пикселей: в полную силу рельеф
      // превратился бы в шум, а не в фактуру.
      material.normalScale.setScalar(0.6);
    }
    if (textures.orm !== undefined) {
      // Один файл на обе карты: three читает шероховатость из зелёного канала,
      // а металличность из синего — это и есть упаковка ORM.
      const orm = library.data(textures.orm);
      material.roughnessMap = orm;
      material.metalnessMap = orm;
    }
    if (textures.roughness !== undefined) {
      material.roughnessMap = library.data(textures.roughness);
    }
    if (textures.metalness !== undefined) {
      material.metalnessMap = library.data(textures.metalness);
    }

    this.#mesh = new Mesh(sphereGeometry, material);
    this.#mesh.scale.setScalar(size);

    const glowMaterial = registry.track(
      new SpriteMaterial({
        map: glowTexture,
        color,
        transparent: true,
        // Постоянная плотность: ореол не разгорается под курсором.
        opacity: textured ? 0.16 : 0.55,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );

    const glow = new Sprite(glowMaterial);
    glow.scale.setScalar(size * GLOW_SCALE);

    this.#label = new OrbitLabel({ text: label, radius: size }, registry);

    this.object3d = new Group();
    this.object3d.add(this.#mesh, glow, this.#label.object3d);
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
    // Подпись обновляется до выхода по «подсветка не менялась»: пока она видна,
    // её всё равно нужно доворачивать к камере — объект идёт по орбите, а камера
    // летает, и без этого текст уехал бы за горизонт сферы.
    this.#label.update(ctx.camera, this.currentRadius, this.#highlight);

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

    // Единственная реакция тела на наведение — размер. Свечение и ореол
    // постоянны: разгораясь, они забивали бы цвет текстуры ровно в тот момент,
    // когда на объект смотрят внимательнее всего.
    this.#mesh.scale.setScalar(this.#baseSize * (1 + this.#highlight * 0.35));
  }

  dispose(): void {
    this.#label.dispose();
    this.object3d.clear();
  }
}
