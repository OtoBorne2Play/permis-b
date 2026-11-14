import type { Question } from '../types'
import { EXAM_QUESTION_COUNT } from './scoring'

/** Returns a number in [0, 1). Math.random by default; tests pass a seeded one. */
export type Rng = () => number

/** Fisher–Yates shuffle. Returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Draws questions spread over the themes: one question per theme in turn until
 * the count is reached, so every theme is covered as evenly as the data allows,
 * and no question appears twice.
 * Returns fewer questions if the pool is smaller than the count.
 */
export function drawBalanced(questions: readonly Question[], count: number, rng: Rng = Math.random): Question[] {
  const byTheme = new Map<string, Question[]>()
  const seen = new Set<string>()
  for (const q of questions) {
    if (seen.has(q.id)) continue
    seen.add(q.id)
    const pile = byTheme.get(q.theme)
    if (pile) pile.push(q)
    else byTheme.set(q.theme, [q])
  }

  const piles = shuffle([...byTheme.values()], rng).map((pile) => shuffle(pile, rng))
  const picked: Question[] = []
  let tookOne = true
  while (picked.length < count && tookOne) {
    tookOne = false
    for (const pile of piles) {
      if (picked.length >= count) break
      const q = pile.pop()
      if (q) {
        picked.push(q)
        tookOne = true
      }
    }
  }
  return shuffle(picked, rng)
}

/** Draws the questions of a mock exam: all themes covered, no question twice. */
export function drawExam(
  questions: readonly Question[],
  count: number = EXAM_QUESTION_COUNT,
  rng: Rng = Math.random,
): Question[] {
  return drawBalanced(questions, count, rng)
}
