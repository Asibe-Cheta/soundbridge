/**
 * Pure validation/branching logic for the notifications-interest survey.
 * Zero Supabase/Next imports on purpose, so this is unit-testable without
 * any server runtime (same reasoning as early-adopter-conversion.ts's
 * grace-period lazy-import: keep pure logic importable standalone).
 */

export const SURVEY_KEY = 'notifications_interest_2026_11';
export const FREE_TEXT_MAX_LENGTH = 120;

export const Q1_OPTIONS = [
  'WhatsApp',
  'Facebook',
  'LinkedIn',
  'Instagram',
  'Email',
  'SMS',
  'Push notifications from other apps',
] as const;

export const Q2_OPTIONS = ['Emails', 'App notifications', 'About equal', 'Neither'] as const;

export const Q3_OPTIONS = ['Yes', 'No', 'Not sure'] as const;

export const Q4_OPTIONS = [
  'Too many',
  'Mostly irrelevant',
  'Felt intrusive',
  "I didn't want to be tracked",
  'They interrupted my work or sleep',
  'They drained my battery',
  "I didn't know why it was asking",
  'Other',
] as const;

export const Q5_OPTIONS = [
  "Only if it's really important",
  'A daily limit',
  'It only shows what I chose',
  "It explains why it's sending something",
  'An easy way to mute or adjust',
  "It doesn't track my exact location",
  'Other',
] as const;

export const Q6_OPTIONS = ['Definitely', 'Probably', 'Not sure', 'Probably not', 'No'] as const;

export const Q7_POSITIVE_OPTIONS = ['1', '2 to 3', '4 to 5', 'More than 5'] as const;
// "same as Q5 plus Other" -- Q5 already ends in 'Other', so this is just Q5_OPTIONS.
export const Q7_NEGATIVE_OPTIONS = Q5_OPTIONS;

export type SurveyAnswers = {
  q1?: string[];
  q2?: string;
  q3?: string;
  q4?: string[];
  q4_other?: string;
  q5?: string[];
  q5_other?: string;
  q6?: string;
  q7?: string;
  q7_other?: string;
};

const ANSWER_KEYS = ['q1', 'q2', 'q3', 'q4', 'q4_other', 'q5', 'q5_other', 'q6', 'q7', 'q7_other'] as const;

export type QuestionStep = 'intro' | 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'finish';

/** Q4 only after a 'Yes' on Q3. Everything else is always shown. */
export function isQ4Visible(answers: SurveyAnswers): boolean {
  return answers.q3 === 'Yes';
}

/** Which option set Q7 validates against / renders, driven by Q6. */
export function getQ7Variant(answers: SurveyAnswers): 'positive' | 'negative' {
  return answers.q6 === 'Definitely' || answers.q6 === 'Probably' ? 'positive' : 'negative';
}

export function getQ7Options(answers: SurveyAnswers): readonly string[] {
  return getQ7Variant(answers) === 'positive' ? Q7_POSITIVE_OPTIONS : Q7_NEGATIVE_OPTIONS;
}

export function getQ7Prompt(answers: SurveyAnswers): string {
  return getQ7Variant(answers) === 'positive'
    ? "What's the most notifications a day you'd be happy to get?"
    : 'What would change your mind?';
}

/** Ordered visible question steps (excludes intro/finish), for progress numbering. */
export function getVisibleQuestionSteps(answers: SurveyAnswers): QuestionStep[] {
  const steps: QuestionStep[] = ['q1', 'q2', 'q3'];
  if (isQ4Visible(answers)) steps.push('q4');
  steps.push('q5', 'q6', 'q7');
  return steps;
}

/**
 * Total question count for the "X of N" label. Before Q3 is answered we
 * don't yet know whether Q4 will show, so default to 7 (the common case is
 * most people have NOT blocked notifications, but showing 7 and dropping to
 * 6 only once Q3 is answered 'Yes' reads oddly going the other direction --
 * defaulting optimistically to the Q4-visible total avoids the label ever
 * jumping backwards mid-survey).
 */
export function getEffectiveTotalQuestions(answers: SurveyAnswers): number {
  if (answers.q3 === undefined) return 7;
  return isQ4Visible(answers) ? 7 : 6;
}

export function getCurrentQuestionNumber(step: QuestionStep, answers: SurveyAnswers): number {
  const visible = getVisibleQuestionSteps(answers);
  const idx = visible.indexOf(step);
  return idx === -1 ? 0 : idx + 1;
}

export function nextStep(step: QuestionStep, answers: SurveyAnswers): QuestionStep {
  const order: QuestionStep[] = ['intro', ...getVisibleQuestionSteps(answers), 'finish'];
  const idx = order.indexOf(step);
  if (idx === -1 || idx === order.length - 1) return step;
  return order[idx + 1];
}

export function previousStep(step: QuestionStep, answers: SurveyAnswers): QuestionStep {
  const order: QuestionStep[] = ['intro', ...getVisibleQuestionSteps(answers), 'finish'];
  const idx = order.indexOf(step);
  if (idx <= 0) return order[0];
  return order[idx - 1];
}

export type ValidationResult =
  | { ok: true; cleaned: SurveyAnswers }
  | { ok: false; error: string };

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

function truncate(s: string): string {
  return s.slice(0, FREE_TEXT_MAX_LENGTH);
}

/**
 * Authoritative, server-side validation. Rejects unknown top-level answer
 * keys, unknown option values, and anything the wrong shape. Free text is
 * truncated (not rejected) to FREE_TEXT_MAX_LENGTH -- truncating rather than
 * rejecting keeps a slow typist's in-progress save from erroring out.
 */
export function validateSurveyAnswers(raw: unknown): ValidationResult {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return { ok: false, error: 'answers must be an object' };
  }
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!(ANSWER_KEYS as readonly string[]).includes(key)) {
      return { ok: false, error: `unknown field: ${key}` };
    }
  }

  const cleaned: SurveyAnswers = {};

  if (obj.q1 !== undefined) {
    if (!isStringArray(obj.q1) || obj.q1.some((v) => !(Q1_OPTIONS as readonly string[]).includes(v))) {
      return { ok: false, error: 'invalid q1' };
    }
    cleaned.q1 = obj.q1;
  }

  if (obj.q2 !== undefined) {
    if (typeof obj.q2 !== 'string' || !(Q2_OPTIONS as readonly string[]).includes(obj.q2)) {
      return { ok: false, error: 'invalid q2' };
    }
    cleaned.q2 = obj.q2;
  }

  if (obj.q3 !== undefined) {
    if (typeof obj.q3 !== 'string' || !(Q3_OPTIONS as readonly string[]).includes(obj.q3)) {
      return { ok: false, error: 'invalid q3' };
    }
    cleaned.q3 = obj.q3;
  }

  if (obj.q4 !== undefined) {
    if (!isStringArray(obj.q4) || obj.q4.some((v) => !(Q4_OPTIONS as readonly string[]).includes(v))) {
      return { ok: false, error: 'invalid q4' };
    }
    cleaned.q4 = obj.q4;
  }

  if (obj.q4_other !== undefined) {
    if (typeof obj.q4_other !== 'string') return { ok: false, error: 'invalid q4_other' };
    cleaned.q4_other = truncate(obj.q4_other);
  }

  if (obj.q5 !== undefined) {
    if (!isStringArray(obj.q5) || obj.q5.some((v) => !(Q5_OPTIONS as readonly string[]).includes(v))) {
      return { ok: false, error: 'invalid q5' };
    }
    cleaned.q5 = obj.q5;
  }

  if (obj.q5_other !== undefined) {
    if (typeof obj.q5_other !== 'string') return { ok: false, error: 'invalid q5_other' };
    cleaned.q5_other = truncate(obj.q5_other);
  }

  if (obj.q6 !== undefined) {
    if (typeof obj.q6 !== 'string' || !(Q6_OPTIONS as readonly string[]).includes(obj.q6)) {
      return { ok: false, error: 'invalid q6' };
    }
    cleaned.q6 = obj.q6;
  }

  if (obj.q7 !== undefined) {
    if (typeof obj.q7 !== 'string') return { ok: false, error: 'invalid q7' };
    const allowed = getQ7Options(cleaned);
    if (!allowed.includes(obj.q7)) return { ok: false, error: 'invalid q7 for current q6' };
    cleaned.q7 = obj.q7;
  }

  if (obj.q7_other !== undefined) {
    if (typeof obj.q7_other !== 'string') return { ok: false, error: 'invalid q7_other' };
    cleaned.q7_other = truncate(obj.q7_other);
  }

  return { ok: true, cleaned };
}
