import { QUESTIONS, TOTAL, TYPE_ORDER, type TypeKey } from './quiz-data';

export type Scores = Record<TypeKey, number>;

export function isValidAnswers(answers: unknown): answers is number[] {
  return Array.isArray(answers) && answers.length === TOTAL && answers.every((a) => Number.isInteger(a) && a >= 0 && a <= 3);
}

/** One point per answer to the mapped type. Ties resolve in D, I, S, C order. */
export function scoreAnswers(answers: number[]): { scores: Scores; primary: TypeKey } {
  const scores: Scores = { D: 0, I: 0, S: 0, C: 0 };
  answers.forEach((a, q) => {
    const k = QUESTIONS[q]?.key[a] as TypeKey | undefined;
    if (k) scores[k]++;
  });
  let primary: TypeKey = 'D';
  for (const k of TYPE_ORDER) if (scores[k] > scores[primary]) primary = k;
  return { scores, primary };
}

export function percentages(scores: Scores): Scores {
  const total = TYPE_ORDER.reduce((n, k) => n + scores[k], 0) || 1;
  const out = {} as Scores;
  for (const k of TYPE_ORDER) out[k] = Math.round((scores[k] / total) * 100);
  return out;
}
