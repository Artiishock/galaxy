import type { Object3D, PerspectiveCamera } from 'three';

/** Всё, что захватывает ресурсы GPU или подписки, обязано уметь освобождаться (CLAUDE.md §3). */
export interface Disposable {
  dispose(): void;
}

/** Данные кадра. Передаются по ссылке и мутируются движком — в кадре не аллоцируем (§5.3). */
export interface FrameContext {
  /** Секунд с прошлого кадра, ограничено сверху для защиты от прыжков после сворачивания вкладки. */
  delta: number;
  /** Секунд с запуска. */
  elapsed: number;
  /** false при `prefers-reduced-motion: reduce` — узлы обязаны замереть (§5.5). */
  motionEnabled: boolean;
  /** Камера этого кадра: нужна узлам, которые разворачиваются к зрителю. */
  camera: PerspectiveCamera;
}

/** Узел сцены: объект + собственный жизненный цикл. */
export interface SceneNode extends Disposable {
  readonly object3d: Object3D;
  update(ctx: FrameContext): void;
}

/** Позиция 3D-объекта, спроецированная в координаты вьюпорта, для DOM-слоя. */
export interface ProjectedBody {
  id: string;
  /** Пиксели от левого края канваса. */
  x: number;
  /** Пиксели от верхнего края канваса. */
  y: number;
  /** Нормализованная глубина: 0 — ближе к камере, 1 — дальше. */
  depth: number;
  /** Экранный радиус тела в пикселях — размер зоны клика. */
  radius: number;
  /** false, если объект за камерой или вне кадра. */
  visible: boolean;
}

/** Приёмник спроецированных позиций. Массив переиспользуется — не сохранять ссылку. */
export type ProjectionSink = (bodies: readonly ProjectedBody[]) => void;
