import type { Disposable } from './types';

export type PointerSink = (nx: number, ny: number) => void;

/**
 * Единственный владелец подписок на указатель (§3: явный жизненный цикл).
 *
 * Слушает окно, а не холст: холст перекрыт DOM-слоем ссылок, и события до него
 * просто не доходят. Координаты нормализуются в [-1, 1] относительно вьюпорта.
 */
export class PointerTracker implements Disposable {
  readonly #onMove: PointerSink;
  readonly #onLeave: () => void;

  constructor(onMove: PointerSink, onLeave: () => void) {
    this.#onMove = onMove;
    this.#onLeave = onLeave;

    window.addEventListener('pointermove', this.#handleMove, { passive: true });
    window.addEventListener('pointerleave', this.#handleLeave, { passive: true });
    window.addEventListener('blur', this.#handleLeave);
  }

  dispose(): void {
    window.removeEventListener('pointermove', this.#handleMove);
    window.removeEventListener('pointerleave', this.#handleLeave);
    window.removeEventListener('blur', this.#handleLeave);
  }

  // Стрелочные поля: ссылка на обработчик стабильна, снятие слушателя гарантировано.
  readonly #handleMove = (event: PointerEvent): void => {
    // Касания не двигают параллакс: на мобильном это выглядит как рывок сцены.
    if (event.pointerType === 'touch') {
      return;
    }
    const nx = (event.clientX / window.innerWidth) * 2 - 1;
    const ny = -((event.clientY / window.innerHeight) * 2 - 1);
    this.#onMove(nx, ny);
  };

  readonly #handleLeave = (): void => {
    this.#onLeave();
  };
}
