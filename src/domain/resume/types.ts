/**
 * Модель резюме (§2: `domain/` не знает ни о React, ни о DOM).
 * Все структуры неизменяемы — это данные, а не состояние (§3).
 */

/** Период работы. Даты в формате `YYYY-MM`; `end: null` — по настоящее время. */
export interface Period {
  readonly start: string;
  readonly end: string | null;
}

export interface Position {
  readonly id: string;
  readonly role: string;
  readonly company: string;
  readonly industry: string;
  readonly period: Period;
  /** Что именно делал: по одному пункту на смысловой блок. */
  readonly highlights: readonly string[];
  readonly stack: readonly string[];
}

export interface SkillGroup {
  readonly id: string;
  readonly title: string;
  readonly items: readonly string[];
}

export interface Credential {
  readonly id: string;
  readonly title: string;
  readonly issuer: string;
  readonly year: number;
  readonly kind: 'degree' | 'course';
  readonly note: string | null;
}

export interface LanguageSkill {
  readonly name: string;
  readonly level: string;
  readonly note: string | null;
}

export interface ContactChannel {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  /** `null` для справочных строк без действия (например, локация). */
  readonly href: string | null;
  readonly preferred: boolean;
}

export interface Person {
  readonly name: string;
  readonly headline: string;
  readonly location: string;
  readonly citizenship: string;
  readonly workAuthorization: string;
  readonly relocation: string;
}

export interface Resume {
  readonly person: Person;
  readonly summary: readonly string[];
  readonly targetRole: string;
  readonly employment: string;
  readonly positions: readonly Position[];
  readonly skillGroups: readonly SkillGroup[];
  readonly credentials: readonly Credential[];
  readonly languages: readonly LanguageSkill[];
  readonly contacts: readonly ContactChannel[];
}
