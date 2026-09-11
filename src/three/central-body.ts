import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Euler,
  Group,
  LineBasicMaterial,
  LineLoop,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Sprite,
  SpriteMaterial,
  type BufferGeometry as Geometry,
  type Texture,
} from 'three';

import { MultiAxisSpin } from './axis-spin';
import type { ResourceRegistry } from './resource-registry';
import type { Disposable, FrameContext, SceneNode } from './types';

const RING_SEGMENTS = 128;
const RIM_COLOR = 0x6ff2d8;
/** Показатель преломления воды. Стекло было бы 1.5 и выглядело бы «твёрже». */
const WATER_IOR = 1.33;
/** Амплитуда колебания поверхности в долях радиуса. */
const WOBBLE = 0.014;

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
 * Центральный объект: капля воды, каркас внутри неё и наклонные кольца.
 *
 * Ядро — `MeshPhysicalMaterial` с преломлением. Важное следствие: преломлять
 * нечего, если за сферой в самой 3D-сцене пусто. Поэтому фон сцены обязан быть
 * `scene.background` — three рисует его и в буфер преломления тоже
 * (`background.render` внутри прохода). HTML-элемент за канвасом для WebGL
 * не существует и в преломлении не появится.
 *
 * Поверхность колышется смещением вершин вдоль нормали суммой синусов. Это
 * дешевле любого шума и для капли достаточно: важна плавная деформация силуэта,
 * а не достоверная физика.
 */
export class CentralBody implements SceneNode, Disposable {
  readonly object3d: Group;

  readonly #core: Mesh;
  readonly #shell: Mesh;
  readonly #rings: readonly { readonly ring: LineLoop; readonly spin: MultiAxisSpin }[];
  /** Живёт столько же, сколько материал: шейдер держит ссылку на этот объект. */
  readonly #time = { value: 0 };

  constructor(
    options: CentralBodyOptions,
    coreGeometry: Geometry,
    shellGeometry: Geometry,
    registry: ResourceRegistry,
  ) {
    const { radius, glowTexture } = options;

    const coreMaterial = registry.track(
      new MeshPhysicalMaterial({
        // Цвет здесь — это оттенок стекла, а не заливка: свет проходит насквозь.
        color: 0xbdf5ea,
        roughness: 0.08,
        metalness: 0,
        transmission: 1,
        thickness: radius * 1.6,
        ior: WATER_IOR,
        // Чем дальше луч идёт сквозь объём, тем сильнее окрашивается.
        attenuationColor: new Color(0x1f9c8a),
        attenuationDistance: radius * 2.4,
        // Преломление рисуется своим проходом; прозрачным материал помечать
        // не нужно, иначе он уйдёт в общую сортировку прозрачных объектов.
        transparent: false,
      }),
    );
    coreMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.#time;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float wobble =
             sin(position.x * 2.7 + uTime * 1.05) +
             sin(position.y * 3.1 - uTime * 0.85) +
             sin(position.z * 2.3 + uTime * 1.25);
           transformed += normal * wobble * ${WOBBLE.toFixed(4)};`,
        );
    };

    this.#core = new Mesh(coreGeometry, coreMaterial);
    this.#core.scale.setScalar(radius);

    // Каркас внутри капли: сквозь преломление он расходится и дрожит.
    const shellMaterial = registry.track(
      new MeshStandardMaterial({
        color: RIM_COLOR,
        emissive: RIM_COLOR,
        emissiveIntensity: 0.5,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    this.#shell = new Mesh(shellGeometry, shellMaterial);
    this.#shell.scale.setScalar(radius * 0.72);

    const glowMaterial = registry.track(
      new SpriteMaterial({
        map: glowTexture,
        color: RIM_COLOR,
        transparent: true,
        opacity: 0.55,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    );
    const glow = new Sprite(glowMaterial);
    glow.scale.setScalar(radius * 6);

    const inner = createRing(radius * 1.7, RIM_COLOR, registry);
    const outer = createRing(radius * 2.3, 0xf0b429, registry);

    // Скорости несоизмеримы: пока одно кольцо делает оборот, другое не успевает
    // завершить свой, и совпадающая картинка не повторяется.
    this.#rings = [
      {
        ring: inner,
        spin: new MultiAxisSpin(
          [
            { axis: 'x', speed: 0.11 },
            { axis: 'y', speed: 0.07 },
          ],
          new Euler(MathUtils.degToRad(72), 0, MathUtils.degToRad(14)),
        ),
      },
      {
        ring: outer,
        spin: new MultiAxisSpin(
          [
            { axis: 'y', speed: -0.048 },
            { axis: 'z', speed: 0.086 },
          ],
          new Euler(MathUtils.degToRad(-58), MathUtils.degToRad(40), 0),
        ),
      },
    ];

    for (const { ring, spin } of this.#rings) {
      spin.applyTo(ring);
    }

    this.object3d = new Group();
    this.object3d.add(this.#core, this.#shell, glow, inner, outer);
  }

  update(ctx: FrameContext): void {
    if (!ctx.motionEnabled) {
      return;
    }

    // Время шейдера идёт от накопленного времени кадра, а не от Date.now():
    // при остановленном цикле капля замирает, а не прыгает после возвращения.
    this.#time.value = ctx.elapsed;

    this.#shell.rotation.y -= ctx.delta * 0.05;
    this.#shell.rotation.x += ctx.delta * 0.02;

    for (const { ring, spin } of this.#rings) {
      spin.advance(ctx.delta, ring);
    }
  }

  dispose(): void {
    this.object3d.clear();
  }
}
