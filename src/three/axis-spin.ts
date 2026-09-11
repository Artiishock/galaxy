import { Quaternion, Vector3, type Euler, type Object3D } from 'three';

const TAU = Math.PI * 2;

/** Именованные оси — чтобы в конфигурации не появлялись сырые векторы. */
const AXIS = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 1, 0),
  z: new Vector3(0, 0, 1),
} as const;

export type AxisName = keyof typeof AXIS;

export interface AxisRate {
  readonly axis: AxisName;
  /** Радиан в секунду; знак задаёт направление. */
  readonly speed: number;
}

/**
 * Вращение объекта одновременно вокруг нескольких мировых осей.
 *
 * Одна ось даёт предсказуемый круг: глаз быстро вычисляет период и движение
 * перестаёт читаться. Две-три оси с несоизмеримыми скоростями дают кувыркание,
 * которое не повторяет себя на обозримом промежутке.
 *
 * Углы копятся числами, а ориентация каждый кадр собирается заново из
 * кватернионов поверх исходного наклона. Прибавлять дельту к `rotation`
 * нельзя: за долгую сессию Эйлеровы углы накопят ошибку и наклон поплывёт.
 */
export class MultiAxisSpin {
  readonly #rates: readonly AxisRate[];
  readonly #angles: number[];
  readonly #base = new Quaternion();
  readonly #result = new Quaternion();
  readonly #step = new Quaternion();

  constructor(rates: readonly AxisRate[], baseRotation: Euler) {
    this.#rates = rates;
    this.#angles = rates.map(() => 0);
    this.#base.setFromEuler(baseRotation);
  }

  /** Ставит объект в стартовую ориентацию без анимации. */
  applyTo(target: Object3D): void {
    this.#result.copy(this.#base);

    for (const [index, rate] of this.#rates.entries()) {
      this.#step.setFromAxisAngle(AXIS[rate.axis], this.#angles[index] ?? 0);
      // premultiply — поворот вокруг мировой оси, а не собственной.
      this.#result.premultiply(this.#step);
    }

    target.quaternion.copy(this.#result);
  }

  advance(delta: number, target: Object3D): void {
    for (const [index, rate] of this.#rates.entries()) {
      this.#angles[index] = ((this.#angles[index] ?? 0) + rate.speed * delta) % TAU;
    }
    this.applyTo(target);
  }
}
