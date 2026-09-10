import { ACESFilmicToneMapping, Clock, PerspectiveCamera, Scene, WebGLRenderer } from 'three';

import type { Disposable, FrameContext, SceneNode } from './types';

/** Потолок дельты: после возврата на вкладку иначе прилетает скачок в секунды. */
const MAX_DELTA = 0.05;
/** Выше 2 разница не видна, а стоимость кадра растёт квадратично (§5.3). */
const MAX_PIXEL_RATIO = 2;

export interface EngineOptions {
  readonly canvas: HTMLCanvasElement;
  readonly fov?: number;
  readonly near?: number;
  readonly far?: number;
}

/**
 * Ядро рендеринга (§5.2).
 *
 * Владеет рендерером, сценой, камерой, часами и циклом кадров — и ничего не знает
 * о содержимом сцены. Узлы добавляются снаружи, в composition root.
 *
 * Цикл останавливается, когда вкладка скрыта или холст ушёл из вьюпорта (§5.5):
 * фоновая вкладка не обязана греть GPU.
 */
export class Engine implements Disposable {
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;

  readonly #renderer: WebGLRenderer;
  readonly #canvas: HTMLCanvasElement;
  readonly #clock = new Clock(false);
  readonly #nodes: SceneNode[] = [];
  readonly #frame: FrameContext = { delta: 0, elapsed: 0, motionEnabled: true };

  readonly #resizeObserver: ResizeObserver;
  readonly #intersectionObserver: IntersectionObserver;

  #afterUpdate: ((ctx: FrameContext) => void) | null = null;
  #onResize: (() => void) | null = null;
  #running = false;
  #documentVisible = true;
  #inViewport = true;
  #disposed = false;

  constructor(options: EngineOptions) {
    const { canvas, fov = 45, near = 0.1, far = 200 } = options;
    this.#canvas = canvas;

    this.#renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      // Прозрачный фон: за холстом остаётся CSS-градиент, он дешевле любого шейдера.
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.#renderer.setClearColor(0x000000, 0);
    this.#renderer.toneMapping = ACESFilmicToneMapping;
    this.#renderer.toneMappingExposure = 1.15;

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(fov, 1, near, far);

    this.#resizeObserver = new ResizeObserver(this.#handleResize);
    this.#resizeObserver.observe(canvas);

    this.#intersectionObserver = new IntersectionObserver(this.#handleIntersection);
    this.#intersectionObserver.observe(canvas);

    document.addEventListener('visibilitychange', this.#handleVisibility);

    this.#applySize();
  }

  add(node: SceneNode): void {
    this.#nodes.push(node);
    this.scene.add(node.object3d);
  }

  /** Хук после обновления узлов и до отрисовки: используется для проекции в DOM. */
  setAfterUpdate(callback: ((ctx: FrameContext) => void) | null): void {
    this.#afterUpdate = callback;
  }

  /**
   * Хук после пересчёта размеров и матрицы проекции.
   * Нужен узлам, чья раскладка привязана к границам кадра: соотношение сторон
   * поменялось — «край сцены» находится в другом месте.
   */
  setOnResize(callback: (() => void) | null): void {
    this.#onResize = callback;
  }

  /** false — сцена замирает: `prefers-reduced-motion` и слабые устройства (§5.5). */
  setMotionEnabled(enabled: boolean): void {
    this.#frame.motionEnabled = enabled;
    // Один кадр нужен всё равно: иначе при выключенной анимации экран пустой.
    if (!enabled) {
      this.#renderOnce();
    }
  }

  start(): void {
    if (this.#running || this.#disposed) {
      return;
    }
    this.#running = true;
    this.#clock.start();
    this.#renderer.setAnimationLoop(this.#tick);
  }

  stop(): void {
    if (!this.#running) {
      return;
    }
    this.#running = false;
    this.#clock.stop();
    this.#renderer.setAnimationLoop(null);
  }

  dispose(): void {
    if (this.#disposed) {
      return;
    }
    this.#disposed = true;

    this.stop();
    document.removeEventListener('visibilitychange', this.#handleVisibility);
    this.#resizeObserver.disconnect();
    this.#intersectionObserver.disconnect();

    for (const node of this.#nodes) {
      this.scene.remove(node.object3d);
      node.dispose();
    }
    this.#nodes.length = 0;

    this.scene.clear();
    // Освобождает контекст WebGL; без этого браузер держит его до сборки мусора
    // и упирается в лимит одновременных контекстов.
    this.#renderer.dispose();
    this.#renderer.forceContextLoss();
  }

  readonly #tick = (): void => {
    const delta = Math.min(this.#clock.getDelta(), MAX_DELTA);
    this.#frame.delta = delta;
    this.#frame.elapsed += delta;

    for (const node of this.#nodes) {
      node.update(this.#frame);
    }
    this.#afterUpdate?.(this.#frame);

    this.#renderer.render(this.scene, this.camera);
  };

  #renderOnce(): void {
    this.#frame.delta = 0;
    for (const node of this.#nodes) {
      node.update(this.#frame);
    }
    this.#afterUpdate?.(this.#frame);
    this.#renderer.render(this.scene, this.camera);
  }

  #applySize(): void {
    const width = this.#canvas.clientWidth || 1;
    const height = this.#canvas.clientHeight || 1;

    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    // updateStyle = false: размером холста управляет CSS, инлайновые стили не нужны.
    this.#renderer.setSize(width, height, false);

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  #syncRunState(): void {
    if (this.#disposed) {
      return;
    }
    if (this.#documentVisible && this.#inViewport) {
      this.start();
    } else {
      this.stop();
    }
  }

  readonly #handleResize = (): void => {
    this.#applySize();
    this.#onResize?.();
    if (!this.#running) {
      this.#renderOnce();
    }
  };

  readonly #handleVisibility = (): void => {
    this.#documentVisible = document.visibilityState === 'visible';
    this.#syncRunState();
  };

  readonly #handleIntersection = (entries: readonly IntersectionObserverEntry[]): void => {
    const entry = entries[entries.length - 1];
    if (!entry) {
      return;
    }
    this.#inViewport = entry.isIntersecting;
    this.#syncRunState();
  };
}
