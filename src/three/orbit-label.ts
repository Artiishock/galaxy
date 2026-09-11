import {
  CanvasTexture,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  SphereGeometry,
  type Camera,
} from 'three';

import type { ResourceRegistry } from './resource-registry';
import type { Disposable } from './types';

/** Ширина пояса по долготе, радианы (~109°). */
const PHI_LENGTH = 1.9;
/** Высота пояса по широте, радианы (~32°). */
const THETA_LENGTH = 0.56;
/**
 * Холст под текст. Пропорция подогнана под пояс: дуга шириной `PHI_LENGTH`
 * и высотой `THETA_LENGTH` даёт отношение ≈3.4 — иначе буквы растянет.
 */
const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 150;
/** Чуть выше поверхности: вплотную началось бы z-fighting с телом. */
const LIFT = 1.015;

function createLabelTexture(text: string, registry: ResourceRegistry): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D-контекст недоступен: не удалось нарисовать подпись объекта');
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Свойство молодое; в браузерах без него присваивание просто игнорируется.
  ctx.letterSpacing = '3px';

  const caption = text.toUpperCase();
  const setFont = (size: number): number => {
    ctx.font = `700 ${size}px system-ui, -apple-system, sans-serif`;
    return ctx.measureText(caption).width;
  };

  // Подгоняем кегль под ширину холста: «Experience» и «Skills» должны занимать
  // пояс одинаково уверенно.
  let size = 104;
  while (size > 28 && setFont(size) > CANVAS_WIDTH * 0.86) {
    size -= 2;
  }
  setFont(size);

  // Обводка под заливкой — тот же приём, что и в DOM: иначе штрих съедает
  // половину толщины букв.
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.2;
  ctx.strokeStyle = 'rgba(2, 4, 8, 0.82)';
  ctx.strokeText(caption, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

  ctx.fillStyle = '#f2fbf9';
  ctx.fillText(caption, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;

  return registry.track(texture);
}

export interface OrbitLabelOptions {
  readonly text: string;
  readonly radius: number;
}

/**
 * Подпись, лежащая на поверхности объекта (§5.2).
 *
 * Это не плоская табличка поверх сферы, а сегмент сферы того же радиуса:
 * текст изгибается вместе с поверхностью, как надпись на глобусе.
 *
 * Сегмент строится так, что его центр смотрит в +Z, поэтому `lookAt` на камеру
 * разворачивает надпись к зрителю, не ломая кривизну. Без этого текст уезжал бы
 * за горизонт сферы — объект движется по орбите, а камера ещё и летает.
 *
 * Материал намеренно `MeshBasicMaterial`: подпись должна читаться одинаково и на
 * освещённой стороне, и на теневой. Это надпись, а не краска на корпусе.
 *
 * В покое надписи нет: она проявляется при наведении или фокусе с клавиатуры,
 * поэтому сцена остаётся чистой, а текстуры объектов ничем не перекрыты.
 */
export class OrbitLabel implements Disposable {
  readonly object3d: Mesh;

  readonly #material: MeshBasicMaterial;

  constructor(options: OrbitLabelOptions, registry: ResourceRegistry) {
    const { text, radius } = options;

    // Центр пояса приходится на +Z: при theta = π/2 координата z максимальна
    // именно при phi = π/2.
    const geometry = registry.track(
      new SphereGeometry(
        1,
        48,
        12,
        Math.PI / 2 - PHI_LENGTH / 2,
        PHI_LENGTH,
        Math.PI / 2 - THETA_LENGTH / 2,
        THETA_LENGTH,
      ),
    );

    this.#material = registry.track(
      new MeshBasicMaterial({
        map: createLabelTexture(text, registry),
        transparent: true,
        // В покое надписи нет — она проявляется при наведении и фокусе.
        opacity: 0,
        // Текст лежит снаружи тела, поэтому по глубине он проходит; писать в
        // буфер ему незачем — иначе он начнёт спорить с ореолом.
        depthWrite: false,
      }),
    );

    this.object3d = new Mesh(geometry, this.#material);
    this.object3d.scale.setScalar(radius * LIFT);
    this.object3d.visible = false;
    // Рисуем после тела: подпись обязана оказаться поверх поверхности.
    this.object3d.renderOrder = 1;
  }

  /**
   * Разворачивает пояс к камере, подстраивает масштаб под текущий радиус тела
   * и проявляет надпись.
   *
   * @param amount степень проявления [0, 1]; приходит уже сглаженной от тела,
   * чтобы текст и сфера реагировали одним движением.
   */
  update(camera: Camera, bodyRadius: number, amount: number): void {
    // Полностью прозрачный меш всё равно попадает в проход прозрачных объектов.
    // Пока надписи нет, дешевле не рисовать её вовсе.
    this.object3d.visible = amount > 0.001;
    if (!this.object3d.visible) {
      return;
    }

    this.#material.opacity = amount;
    this.object3d.scale.setScalar(bodyRadius * LIFT);
    this.object3d.lookAt(camera.position);
  }

  dispose(): void {
    this.object3d.clear();
  }
}
