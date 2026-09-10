import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Points,
  PointsMaterial,
  type Texture,
} from 'three';

import { createRandom } from './random';
import type { ResourceRegistry } from './resource-registry';
import type { FrameContext, SceneNode } from './types';

export interface StarfieldOptions {
  readonly count: number;
  readonly innerRadius: number;
  readonly outerRadius: number;
  readonly glowTexture: Texture;
  readonly seed: number;
}

/**
 * Звёздный фон. Один Points-объект на все звёзды — один draw call (§5.3).
 * Звёзды распределяются в сферической оболочке, чтобы у сцены была глубина,
 * а не плоский задник.
 */
export class Starfield implements SceneNode {
  readonly object3d: Points;

  constructor(options: StarfieldOptions, registry: ResourceRegistry) {
    const { count, innerRadius, outerRadius, glowTexture, seed } = options;
    const random = createRandom(seed);

    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      // Равномерно по сфере: косинус равномерен по [-1, 1], иначе точки
      // скапливаются у полюсов.
      const u = random() * 2 - 1;
      const theta = random() * Math.PI * 2;
      const r = innerRadius + random() * (outerRadius - innerRadius);
      const planar = Math.sqrt(1 - u * u);

      positions[i * 3] = r * planar * Math.cos(theta);
      positions[i * 3 + 1] = r * u;
      positions[i * 3 + 2] = r * planar * Math.sin(theta);
    }

    const geometry = registry.track(new BufferGeometry());
    geometry.setAttribute('position', new BufferAttribute(positions, 3));

    const material = registry.track(
      new PointsMaterial({
        size: 0.075,
        map: glowTexture,
        transparent: true,
        // Фоновый снимок уже полон звёзд: эти нужны только ради параллакса,
        // поэтому они на грани заметности и не спорят с фотографией.
        opacity: 0.5,
        blending: AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );

    this.object3d = new Points(geometry, material);
  }

  update(ctx: FrameContext): void {
    if (!ctx.motionEnabled) {
      return;
    }
    // Едва заметный дрейф: даёт жизнь фону, не отвлекая от орбит.
    this.object3d.rotation.y += ctx.delta * 0.006;
  }

  dispose(): void {
    this.object3d.clear();
  }
}
