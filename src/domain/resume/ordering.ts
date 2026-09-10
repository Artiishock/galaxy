import type { Position } from './types';

/** Ключ сортировки: текущая позиция считается закончившейся «сейчас». */
function endKey(position: Position): string {
  return position.period.end ?? '9999-99';
}

/**
 * Обратный хронологический порядок — по дате окончания, при равенстве по началу.
 * Порядок задаётся правилом, а не тем, как элементы легли в массив данных.
 */
export function sortPositionsByRecency(positions: readonly Position[]): readonly Position[] {
  return [...positions].sort((a, b) => {
    const byEnd = endKey(b).localeCompare(endKey(a));
    return byEnd === 0 ? b.period.start.localeCompare(a.period.start) : byEnd;
  });
}
