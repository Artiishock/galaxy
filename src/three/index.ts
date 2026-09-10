/**
 * Публичный API 3D-ядра (§2: импорт только через index слоя).
 * Наружу выходит composition root и типы — внутренние классы приватны.
 */
export { CosmosScene, type CosmosSceneOptions } from './cosmos-scene';
export type { Disposable, FrameContext, ProjectedBody, ProjectionSink, SceneNode } from './types';
