import type { Question } from '../types'
import { drawBalanced, shuffle, type Rng } from './draw'

/** Days before a card comes back, for boxes 1 to 5. */
export const BOX_INTERVALS = [1, 3, 7, 15, 30] as const
export const MAX_BOX = BOX_INTERVALS.length
/** Maximum number of cards in one daily review session. */
export const SESSION_SIZE = 20

export interface CardState {
  /** Leitner box, 1 to 5. */
  box: number
  /** Next review day, YYYY-MM-DD (local time). */
  due: string
  /** True when the last counted answer was wrong. */
  failed: boolean
  /** Counted right and wrong answers, for the success rate per theme. */
  right: number
  wrong: number
}

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number)
  return dayKey(new Date(y, m - 1, d + days))
}

/**
 * New state of a card after a counted answer.
 * Wrong: back to box 1. Right: next box (a new card enters box 1).
 * Either way the card is not due again before tomorrow.
 */
export function reviewCard(card: CardState | undefined, correct: boolean, today: string): CardState {
  const box = correct ? Math.min((card?.box ?? 0) + 1, MAX_BOX) : 1
  return {
    box,
    due: addDays(today, BOX_INTERVALS[box - 1]),
    failed: !correct,
    right: (card?.right ?? 0) + (correct ? 1 : 0),
    wrong: (card?.wrong ?? 0) + (correct ? 0 : 1),
  }
}

export interface SessionOptions {
  size?: number
  /** How many never-seen questions may still be introduced today. */
  newAllowed?: number
  rng?: Rng
}

/**
 * Cards of a review session, in order:
 * failed "grave" questions, other failed questions, other due questions,
 * then new questions spread over the themes, up to the session size.
 */
export function buildSession(
  questions: readonly Question[],
  cards: Readonly<Record<string, CardState>>,
  today: string,
  { size = SESSION_SIZE, newAllowed = SESSION_SIZE, rng = Math.random }: SessionOptions = {},
): Question[] {
  const due: Question[] = []
  const fresh: Question[] = []
  for (const q of questions) {
    const card = cards[q.id]
    if (!card) fresh.push(q)
    else if (card.due <= today) due.push(q)
  }

  const rank = (q: Question) => (cards[q.id].failed ? (q.grave ? 0 : 1) : 2)
  // Shuffle first so themes are mixed inside each priority group (sort is stable).
  const session = shuffle(due, rng)
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, size)

  const room = Math.min(size - session.length, Math.max(0, newAllowed))
  if (room > 0) session.push(...drawBalanced(fresh, room, rng))
  return session
}
