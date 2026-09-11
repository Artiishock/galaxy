import {
  AmbientLight,
  IcosahedronGeometry,
  PointLight,
  SRGBColorSpace,
  SphereGeometry,
  Vector3,
  VideoTexture,
  type Texture,
} from 'three';

import { BokehField } from './bokeh-field';
import { CentralBody } from './central-body';
import { Engine } from './engine';
import { CameraRig } from './camera-rig';
import { OrbitalObject } from './orbital-object';
import { PointerTracker } from './pointer-tracker';
import { ResourceRegistry } from './resource-registry';
import { Starfield } from './starfield';
import { TextureLibrary } from './texture-library';
import { createBokehTexture, createGlowTexture } from './textures';
import type { OrbitDescriptor } from '@/shared/config/site';
import type { Disposable, FrameContext, ProjectedBody, ProjectionSink } from './types';

const CENTRAL_RADIUS = 1.15;
const STAR_COUNT = 420;

/** Опорная поза камеры. Параллакс смещает камеру относительно неё. */
const CAMERA_ORIGIN = new Vector3(0, 4.2, 15.5);
const SCENE_TARGET = new Vector3(0, 0, 0);

/** Палитра декора: та же бирюзово-золотая гамма, что у орбит. */
const DECOR_COLORS = [0x2ee6c5, 0x4ce0c8, 0x6fc9f0, 0x1f9c8a, 0xf0b429, 0xffd27a] as const;

interface ProjectionEntry {
  readonly object: OrbitalObject;
  readonly projected: ProjectedBody;
}

export interface CosmosSceneOptions {
  readonly canvas: HTMLCanvasElement;
  readonly orbits: readonly OrbitDescriptor[];
  /** Вызывается каждый кадр с экранными позициями тел для DOM-слоя. */
  readonly onProject: ProjectionSink;
  /**
   * Фон сцены. Обязателен именно как элемент WebGL: преломление капли берёт
   * картинку из буфера сцены, и HTML-слой за канвасом туда не попадает.
   */
  readonly backdrop: {
    readonly video: HTMLVideoElement;
    /** Кадр-заставка: показывается, пока видео не заиграло или выключено. */
    readonly posterUrl: string;
  };
}

/**
 * Composition root сцены (§3): единственное место, где создаются конкретные
 * объекты и связываются между собой. Всё остальное получает зависимости извне.
 *
 * Отвечает ещё и за проекцию 3D → экран: DOM-слой с настоящими ссылками
 * позиционируется по этим координатам, поэтому кнопки остаются кнопками
 * для клавиатуры и поисковика (§0.1, §7).
 */
export class CosmosScene implements Disposable {
  readonly #engine: Engine;
  readonly #registry = new ResourceRegistry();
  readonly #rig: CameraRig;
  readonly #pointer: PointerTracker;
  readonly #entries: ProjectionEntry[] = [];
  readonly #projectedList: ProjectedBody[] = [];
  readonly #onProject: ProjectionSink;
  readonly #canvas: HTMLCanvasElement;
  /** Слои декора: их раскладка привязана к границам кадра и переживает ресайз. */
  readonly #decorFields: BokehField[] = [];
  readonly #library: TextureLibrary;

  /** Соотношение сторон фона: нужно, чтобы вписать его «по обрезке». */
  #backdropAspect = 16 / 9;
  #detachBackdrop: (() => void) | null = null;

  /** Переиспользуемый буфер: в кадре не аллоцируем (§5.3). */
  readonly #worldPosition = new Vector3();

  constructor(options: CosmosSceneOptions) {
    const { canvas, orbits, onProject } = options;
    this.#canvas = canvas;
    this.#onProject = onProject;

    // Половинный буфер преломления: оно размыто шероховатостью, разницы не видно,
    // а полноразмерный проход стоил бы заметной части кадра (§5.3).
    this.#engine = new Engine({ canvas, transmissionResolutionScale: 0.5 });
    this.#engine.camera.position.copy(CAMERA_ORIGIN);
    this.#engine.camera.lookAt(SCENE_TARGET);

    this.#library = new TextureLibrary(this.#registry, this.#engine.maxAnisotropy);
    this.#setUpBackdrop(options.backdrop);

    // Сфера, а не икосаэдр: у икосаэдра UV-развёртка склеена заплатками на шве,
    // и текстура на нём плывёт у полюсов.
    const bodyGeometry = this.#registry.track(new SphereGeometry(1, 48, 32));
    // Капле нужна плотная сетка: поверхность колышется смещением вершин.
    const coreGeometry = this.#registry.track(new SphereGeometry(1, 96, 64));
    // Каркас внутри капли, наоборот, должен оставаться крупной решёткой.
    const shellGeometry = this.#registry.track(new IcosahedronGeometry(1, 2));
    const glowTexture = createGlowTexture(this.#registry);

    /*
     * Свет намеренно почти нейтральный.
     *
     * Насыщенный цветной источник перекрашивает всё, что освещает: с прежними
     * синим ambient и бирюзовым point текстуры читались как бирюзовые, а не как
     * кора и сталь. Оттенок оставлен минимальный — только чтобы сцена не
     * выглядела стерильной; цвет зоны живёт на траектории, ореоле и подсветке.
     * Свет — без собственного жизненного цикла, добавляется в сцену напрямую.
     */
    const ambient = new AmbientLight(0xb9c6d2, 1.15);
    const core = new PointLight(0xfff4e6, 95, 60, 2);
    this.#engine.scene.add(ambient, core);

    const bokehTexture = createBokehTexture(this.#registry);

    this.#engine.add(
      new Starfield(
        { count: STAR_COUNT, innerRadius: 24, outerRadius: 70, glowTexture, seed: 20260910 },
        this.#registry,
      ),
    );

    // Дальний план: крупные тусклые огни далеко за орбитами. Смещаются при
    // параллаксе слабо — именно это и читается как «далеко».
    // Полоса заходит внутрь кадра (0.62), потому что на такой дистанции рамка
    // широкая и пятна всё равно остаются в стороне от орбит.
    this.#addDecor(
      new BokehField(
        {
          count: 16,
          colors: DECOR_COLORS,
          sizeRange: [2, 5],
          distanceRange: [32, 46],
          edgeBand: [0.62, 1.05],
          opacityRange: [0.12, 0.24],
          drift: 0.7,
          seed: 4821,
          texture: bokehTexture,
        },
        this.#registry,
      ),
    );

    this.#engine.add(
      new CentralBody(
        { radius: CENTRAL_RADIUS, glowTexture },
        coreGeometry,
        shellGeometry,
        this.#registry,
      ),
    );

    for (const descriptor of orbits) {
      const object = new OrbitalObject(descriptor, {
        sphereGeometry: bodyGeometry,
        glowTexture,
        registry: this.#registry,
        library: this.#library,
      });
      this.#engine.add(object);

      const projected: ProjectedBody = {
        id: descriptor.id,
        x: 0,
        y: 0,
        depth: 0.5,
        radius: 0,
        visible: false,
      };
      this.#entries.push({ object, projected });
      this.#projectedList.push(projected);
    }

    // Передний план добавляется последним — он ближе к камере, чем всё остальное.
    // Крупный мягкий спрайт у камеры и есть «вне фокуса»: резкости у него нет
    // по построению, поэтому постобработка не нужна.
    // Полоса от 0.95 до 1.3 — пятна сидят на самой границе и частично уходят
    // за неё, вплывая в кадр углом. Центр остаётся чистым под заголовок (§7).
    this.#addDecor(
      new BokehField(
        {
          count: 7,
          colors: DECOR_COLORS,
          sizeRange: [1.1, 2.4],
          distanceRange: [5, 10],
          edgeBand: [0.95, 1.3],
          opacityRange: [0.08, 0.16],
          drift: 0.45,
          seed: 1307,
          texture: bokehTexture,
        },
        this.#registry,
      ),
    );

    // Раскладка декора зависит от соотношения сторон, поэтому пересчитывается
    // и сейчас, и на каждый ресайз.
    this.#layoutDecor();
    this.#engine.setOnResize(this.#layoutDecor);

    this.#rig = new CameraRig(this.#engine.camera, {
      origin: CAMERA_ORIGIN,
      target: SCENE_TARGET,
      parallaxX: 2.6,
      parallaxY: 1.5,
      focusDistance: 5.2,
      focusShift: 0.45,
      // Радиус ядра 1.15: с такой дистанции его диаметр перекрывает высоту
      // кадра примерно в полтора раза — на экране не остаётся ничего другого.
      introDistance: 1.8,
    });
    this.#pointer = new PointerTracker(
      (nx, ny) => this.#rig.setPointer(nx, ny),
      () => this.#rig.resetPointer(),
    );

    this.#engine.setAfterUpdate(this.#afterUpdate);
    this.#engine.start();
  }

  setMotionEnabled(enabled: boolean): void {
    this.#engine.setMotionEnabled(enabled);
  }

  /** false — вступление закончено, камера отлетает к общему плану. */
  setIntroActive(active: boolean): void {
    this.#rig.setIntroActive(active);
  }

  #addDecor(field: BokehField): void {
    this.#decorFields.push(field);
    this.#engine.add(field);
  }

  readonly #layoutDecor = (): void => {
    for (const field of this.#decorFields) {
      field.layout(this.#engine.camera, CAMERA_ORIGIN, SCENE_TARGET);
    }
    this.#fitBackdrop();
  };

  /**
   * Фон сцены.
   *
   * Сначала ставится кадр-заставка: он уже скачан ради атрибута `poster`, и
   * с ним фон не бывает чёрным — ни до запуска видео, ни при выключенной
   * анимации, когда ролик так и остаётся на паузе.
   * Видео подменяет его, только когда действительно заиграло.
   */
  #setUpBackdrop(backdrop: CosmosSceneOptions['backdrop']): void {
    const poster = this.#library.color(backdrop.posterUrl);
    this.#engine.scene.background = poster;
    this.#fitBackdrop();

    const { video } = backdrop;

    const useVideo = (): void => {
      if (video.videoWidth > 0) {
        this.#backdropAspect = video.videoWidth / video.videoHeight;
      }
      const texture = this.#registry.track(new VideoTexture(video));
      texture.colorSpace = SRGBColorSpace;
      this.#engine.scene.background = texture;
      this.#fitBackdrop();
    };

    video.addEventListener('playing', useVideo, { once: true });
    this.#detachBackdrop = () => {
      video.removeEventListener('playing', useVideo);
    };
  }

  /**
   * Вписывает фон «по обрезке», как `object-fit: cover`.
   * Фоновая текстура в three растягивается на весь кадр, поэтому без правки
   * `repeat`/`offset` картинка сплющивается на любом соотношении, кроме своего.
   */
  #fitBackdrop(): void {
    const background = this.#engine.scene.background;
    if (background === null || !(background as Texture).isTexture) {
      return;
    }

    const texture = background as Texture;
    const width = this.#canvas.clientWidth;
    const height = this.#canvas.clientHeight;
    if (width === 0 || height === 0) {
      return;
    }

    const ratio = this.#backdropAspect / (width / height);
    if (ratio > 1) {
      texture.repeat.set(1 / ratio, 1);
      texture.offset.set((1 - 1 / ratio) / 2, 0);
    } else {
      texture.repeat.set(1, ratio);
      texture.offset.set(0, (1 - ratio) / 2);
    }
  }

  /**
   * Подлёт камеры к объекту зоны; `null` — возврат к общему плану.
   * Камера следует за объектом, пока тот продолжает движение по орбите.
   */
  focusOn(id: string | null): void {
    if (id === null) {
      this.#rig.focusOn(null);
      return;
    }
    for (const entry of this.#entries) {
      if (entry.object.id === id) {
        this.#rig.focusOn(entry.object);
        return;
      }
    }
    // Неизвестный id — не молчим и не гадаем: общий план честнее случайной зоны.
    this.#rig.focusOn(null);
  }

  /** Подсветка тела при наведении или фокусе на соответствующей ссылке. */
  setHighlighted(id: string, active: boolean): void {
    for (const entry of this.#entries) {
      if (entry.object.id === id) {
        entry.object.setHighlighted(active);
        return;
      }
    }
  }

  dispose(): void {
    this.#pointer.dispose();
    this.#rig.dispose();
    this.#detachBackdrop?.();
    this.#detachBackdrop = null;
    this.#engine.scene.background = null;
    this.#engine.setAfterUpdate(null);
    this.#engine.setOnResize(null);
    this.#decorFields.length = 0;
    this.#engine.dispose();
    // Последним: узлы уже отцеплены, освобождаем GPU-память.
    this.#registry.dispose();
    this.#entries.length = 0;
    this.#projectedList.length = 0;
  }

  /**
   * Порядок здесь существенный: сначала камера занимает позицию этого кадра,
   * и только потом считается проекция. Иначе DOM-кнопки отставали бы от
   * картинки ровно на кадр, и при подлёте это было бы заметно.
   */
  readonly #afterUpdate = (ctx: FrameContext): void => {
    this.#rig.update(ctx);
    this.#project();
  };

  /**
   * Проекция мировых координат в пиксели холста.
   * Записывает результат в заранее созданные объекты — новых не создаёт.
   */
  readonly #project = (): void => {
    const camera = this.#engine.camera;
    const width = this.#canvas.clientWidth;
    const height = this.#canvas.clientHeight;
    if (width === 0 || height === 0) {
      return;
    }

    // Пиксели на мировую единицу на расстоянии 1 — множитель для экранного радиуса.
    const focalPx = height / (2 * Math.tan((camera.fov * Math.PI) / 360));

    for (const entry of this.#entries) {
      entry.object.writeWorldPosition(this.#worldPosition);
      const distance = camera.position.distanceTo(this.#worldPosition);

      this.#worldPosition.project(camera);
      const ndcX = this.#worldPosition.x;
      const ndcY = this.#worldPosition.y;
      const ndcZ = this.#worldPosition.z;

      const projected = entry.projected;
      projected.x = (ndcX * 0.5 + 0.5) * width;
      projected.y = (-ndcY * 0.5 + 0.5) * height;
      projected.depth = (ndcZ + 1) * 0.5;
      projected.radius = (entry.object.radius / distance) * focalPx;
      // ndcZ > 1 — объект за дальней плоскостью либо за спиной камеры.
      projected.visible = ndcZ < 1;
    }

    this.#onProject(this.#projectedList);
  };
}
