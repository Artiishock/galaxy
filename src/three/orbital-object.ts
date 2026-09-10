import { Group, MathUtils, type BufferGeometry, type Texture, type Vector3 } from 'three';

import { OrbitBody } from './orbit-body';
import { OrbitPath } from './orbit-path';
import type { ResourceRegistry } from './resource-registry';
import type { OrbitDescriptor } from '@/shared/config/site';
import type { FrameContext, SceneNode } from './types';

const TAU = Math.PI * 2;

export interface OrbitalObjectDeps {
  readonly sphereGeometry: BufferGeometry;
  readonly glowTexture: Texture;
  readonly registry: ResourceRegistry;
}

/**
 * Объект на орбите: кинематика + composition двух визуальных частей —
 * траектории и тела (§3: композиция вместо наследования).
 *
 * Класс владеет углом и его продвижением; как это выглядит — знают OrbitPath
 * и OrbitBody, а они друг о друге не знают.
 */
export class OrbitalObject implements SceneNode {
  readonly id: string;
  readonly object3d: Group;

  readonly #body: OrbitBody;
  readonly #path: OrbitPath;
  readonly #semiMajor: number;
  readonly #semiMinor: number;
  readonly #focusOffset: number;
  readonly #angularSpeed: number;

  #angle: number;

  constructor(descriptor: OrbitDescriptor, deps: OrbitalObjectDeps) {
    const { sphereGeometry, glowTexture, registry } = deps;

    this.id = descriptor.id;
    this.#semiMajor = descriptor.radius;
    this.#semiMinor = descriptor.radius * Math.sqrt(1 - descriptor.eccentricity ** 2);
    this.#focusOffset = descriptor.radius * descriptor.eccentricity;
    this.#angularSpeed = descriptor.angularSpeed;
    this.#angle = MathUtils.degToRad(descriptor.phaseDeg);

    this.#path = new OrbitPath(
      {
        semiMajor: descriptor.radius,
        eccentricity: descriptor.eccentricity,
        color: descriptor.color,
      },
      registry,
    );

    this.#body = new OrbitBody(
      {
        size: descriptor.size,
        color: descriptor.color,
        sphereGeometry,
        glowTexture,
      },
      registry,
    );

    // Группа задаёт плоскость орбиты; объект внутри всегда движется в локальном XZ.
    this.object3d = new Group();
    this.object3d.rotation.set(
      MathUtils.degToRad(descriptor.inclinationDeg),
      MathUtils.degToRad(descriptor.nodeDeg),
      0,
    );
    this.object3d.add(this.#path.object3d, this.#body.object3d);

    // Стартовая позиция обязана быть корректной и при отключённой анимации (§5.5).
    this.#applyAngle();
  }

  get radius(): number {
    return this.#body.currentRadius;
  }

  setHighlighted(active: boolean): void {
    this.#body.setHighlighted(active);
  }

  /** Пишет мировую позицию тела в переданный вектор — вызывающий владеет буфером (§5.3). */
  writeWorldPosition(target: Vector3): void {
    this.#body.object3d.getWorldPosition(target);
  }

  update(ctx: FrameContext): void {
    if (ctx.motionEnabled) {
      this.#angle = (this.#angle + this.#angularSpeed * ctx.delta) % TAU;
      this.#applyAngle();
    }
    this.#body.update(ctx);
    this.#path.setHighlight(this.#body.highlight);
  }

  dispose(): void {
    this.#body.dispose();
    this.#path.dispose();
    this.object3d.clear();
  }

  #applyAngle(): void {
    const x = Math.cos(this.#angle) * this.#semiMajor - this.#focusOffset;
    const z = Math.sin(this.#angle) * this.#semiMinor;
    this.#body.object3d.position.set(x, 0, z);
  }
}
