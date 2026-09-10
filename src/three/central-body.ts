import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineLoop,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Sprite,
  SpriteMaterial,
  type Texture,
} from 'three';

import type { ResourceRegistry } from './resource-registry';
import type { Disposable, FrameContext, SceneNode } from './types';

const RING_SEGMENTS = 128;
const CORE_COLOR = 0x1f9c8a;
const RIM_COLOR = 0x6ff2d8;

export interface CentralBodyOptions {
  readonly radius: number;
  readonly glowTexture: Texture;
}

/** Кольцо-обод вокруг ядра: тонкая линия в собственной плоскости. */
function createRing(radius: number, color: number, registry: ResourceRegistry): LineLoop {
  const positions = new Float32Array(RING_SEGMENTS * 3);
  for (let i = 0; i < RING_SEGMENTS; i += 1) {
    const theta = (i / RING_SEGMENTS) * Math.PI * 2;
    positions[i * 3] = Math.cos(theta) * radius;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = Math.sin(theta) * radius;
  }

  const geometry = registry.track(new BufferGeometry());
  geometry.setAttribute('position', new BufferAttribute(positions, 3));

  const material = registry.track(
    new LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );

  return new LineLoop(geometry, material);
}

/**
 * Центральный объект: светящееся ядро, каркасная оболочка и наклонные кольца.
 * Вращается медленно и независимо от орбит — задаёт «дыхание» сцены.
 */
export class CentralBody implements SceneNode, Disposable {
  readonly object3d: Group;

  readonly #core: Mesh;
  readonly #shell: Mesh;
  readonly #rings: Group;

  constructor(
    options: CentralBodyOptions,
    sphereGeometry: BufferGeometry,
    registry: ResourceRegistry,
  ) {
    const { radius, glowTexture } = options;

    const coreMaterial = registry.track(
      new MeshStandardMaterial({
        color: CORE_COLOR,
        emissive: CORE_COLOR,
        emissiveIntensity: 0.9,
        roughness: 0.4,
        metalness: 0.2,
      }),
    );
    this.#core = new Mesh(sphereGeometry, coreMaterial);
    this.#core.scale.setScalar(radius);

    // Каркас поверх ядра читается как «сетка планеты» и оживляет силуэт.
    const shellMaterial = registry.track(
      new MeshStandardMaterial({
        color: RIM_COLOR,
        emissive: RIM_COLOR,
        emissiveIntensity: 0.35,
        wireframe: true,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    );
    this.#shell = new Mesh(sphereGeometry, shellMaterial);
    this.#shell.scale.setScalar(radius * 1.04);

    const glowMaterial = registry.track(
      new SpriteMaterial({
        map: glowTexture,
        color: RIM_COLOR,
        transparent: true,
        opacity: 0.8,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    const glow = new Sprite(glowMaterial);
    glow.scale.setScalar(radius * 7);

    this.#rings = new Group();
    const inner = createRing(radius * 1.7, RIM_COLOR, registry);
    inner.rotation.set(MathUtils.degToRad(72), 0, MathUtils.degToRad(14));
    const outer = createRing(radius * 2.3, 0xf0b429, registry);
    outer.rotation.set(MathUtils.degToRad(-58), MathUtils.degToRad(40), 0);
    this.#rings.add(inner, outer);

    this.object3d = new Group();
    this.object3d.add(this.#core, this.#shell, glow, this.#rings);
  }

  update(ctx: FrameContext): void {
    if (!ctx.motionEnabled) {
      return;
    }
    this.#core.rotation.y += ctx.delta * 0.08;
    // Оболочка вращается в противофазе — появляется ощущение объёма.
    this.#shell.rotation.y -= ctx.delta * 0.05;
    this.#shell.rotation.x += ctx.delta * 0.02;
    this.#rings.rotation.y += ctx.delta * 0.06;
  }

  dispose(): void {
    this.object3d.clear();
  }
}
