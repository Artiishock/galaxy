import type { Disposable } from './types';

/**
 * Единая точка учёта GPU-ресурсов (§5.2).
 *
 * Геометрии, материалы и текстуры не освобождаются автоматически при удалении
 * из сцены — утечка видеопамяти при уходе со страницы считается блокером (§5.3).
 * Всё, что создано, регистрируется здесь и освобождается одним вызовом.
 */
export class ResourceRegistry implements Disposable {
  readonly #resources = new Set<Disposable>();

  /** Регистрирует ресурс и возвращает его же — удобно оборачивать создание по месту. */
  track<T extends Disposable>(resource: T): T {
    this.#resources.add(resource);
    return resource;
  }

  get size(): number {
    return this.#resources.size;
  }

  dispose(): void {
    for (const resource of this.#resources) {
      resource.dispose();
    }
    this.#resources.clear();
  }
}
