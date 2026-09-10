/**
 * Детерминированный генератор (mulberry32).
 *
 * Декоративная сцена не должна пересобираться заново при каждой перезагрузке:
 * с фиксированным seed композиция стабильна, её можно осознанно подбирать,
 * а расхождение вида между заходами не выдаётся за «живость».
 */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Равномерное значение в диапазоне. */
export function randomInRange(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}

/** Элемент массива; массив обязан быть непустым. */
export function randomItem<T>(random: () => number, items: readonly T[]): T {
  const item = items[Math.floor(random() * items.length)];
  if (item === undefined) {
    throw new RangeError('randomItem: передан пустой массив');
  }
  return item;
}
