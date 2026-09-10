import type { Period } from './types';

/**
 * Длительности считаются из дат, а не хранятся текстом.
 *
 * Иначе «3 yrs 10 mos» в резюме устаревает молча: через полгода цифра неверна,
 * а заметить это некому. Единственный источник правды — сами даты.
 */

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Разбирает `YYYY-MM` в UTC-дату первого числа месяца. */
function parseMonth(value: string): Date {
  const [year, month] = value.split('-');
  if (year === undefined || month === undefined) {
    throw new RangeError(`Ожидался формат YYYY-MM, получено: ${value}`);
  }
  return new Date(Date.UTC(Number(year), Number(month) - 1, 1));
}

/** Полных месяцев между началом и концом, включая начальный месяц. */
export function monthsInPeriod(period: Period, now: Date): number {
  const start = parseMonth(period.start);
  const end = period.end === null ? now : parseMonth(period.end);

  const months =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth()) +
    1;

  return Math.max(months, 1);
}

export function formatDuration(months: number): string {
  const years = Math.floor(months / 12);
  const rest = months % 12;

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? 'yr' : 'yrs'}`);
  }
  if (rest > 0 || years === 0) {
    parts.push(`${rest} ${rest === 1 ? 'mo' : 'mos'}`);
  }

  return parts.join(' ');
}

export function formatPeriod(period: Period): string {
  const start = MONTH_FORMATTER.format(parseMonth(period.start));
  const end = period.end === null ? 'Present' : MONTH_FORMATTER.format(parseMonth(period.end));
  return `${start} — ${end}`;
}

/**
 * Суммарный стаж без двойного счёта пересекающихся позиций:
 * фриланс параллельно основной работе не должен удваивать опыт.
 */
export function totalExperienceMonths(periods: readonly Period[], now: Date): number {
  const ranges = periods
    .map((period) => ({
      start: parseMonth(period.start).getTime(),
      end: (period.end === null ? now : parseMonth(period.end)).getTime(),
    }))
    .sort((a, b) => a.start - b.start);

  let months = 0;
  let cursorStart = Number.NaN;
  let cursorEnd = Number.NaN;

  for (const range of ranges) {
    if (Number.isNaN(cursorStart)) {
      cursorStart = range.start;
      cursorEnd = range.end;
      continue;
    }
    if (range.start <= cursorEnd) {
      cursorEnd = Math.max(cursorEnd, range.end);
      continue;
    }
    months += monthsBetweenTimestamps(cursorStart, cursorEnd);
    cursorStart = range.start;
    cursorEnd = range.end;
  }

  if (!Number.isNaN(cursorStart)) {
    months += monthsBetweenTimestamps(cursorStart, cursorEnd);
  }

  return months;
}

function monthsBetweenTimestamps(start: number, end: number): number {
  const from = new Date(start);
  const to = new Date(end);
  return (
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth()) + 1
  );
}
